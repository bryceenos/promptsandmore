/**
 * Spatial Partitioning Visualizer
 * Voronoi diagrams with interactive point placement and Lloyd relaxation
 */

class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

export class SpatialPartitioning {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.points = [];
        this.voronoiCells = [];
        this.delaunayTriangles = [];
        this.showDelaunay = false;
        this.showBiomes = false;
        this.isDragging = false;
        this.dragIndex = -1;
        this.updatePending = false;
        this.isRelaxing = false;
        this.currentRelaxationStep = 0;
        this.targetRelaxationSteps = 0;
        this.relaxationAnimationId = null;
        this.originalPoints = []; // Store original points for reverse
        this.relaxationHistory = []; // Store point positions at each step for reverse
        this.isReversing = false;
        this.loopMode = false;

        this.init();
    }

    init() {
        // Controls
        this.framework.addSlider('numPoints', 'Number of Points', 5, 50, 20, 1);
        // Store reference to numPoints slider for updating when points are added
        // Find it after it's been added to the DOM
        setTimeout(() => {
            const groups = this.framework.controlsPanel.querySelectorAll('.control-group');
            for (const group of groups) {
                const h3 = group.querySelector('h3');
                if (h3 && h3.textContent === 'Number of Points') {
                    this.numPointsSlider = group.querySelector('input[type="range"]');
                    this.numPointsLabel = group.querySelector('label');
                    break;
                }
            }
        }, 0);
        this.framework.addToggle('showDelaunay', 'Show Delaunay Triangulation', false);
        this.framework.addToggle('showBiomes', 'Show Biome Colors', true);
        this.framework.addToggle('lloydRelaxation', 'Animate Lloyd Relaxation', false);
        this.framework.addToggle('loopMode', 'Loop Mode (Forward/Backward)', false);
        this.framework.addSlider('relaxationSteps', 'Relaxation Steps', 1, 20, 5, 1);
        
        // Setup callbacks
        this.framework.on('onSeedChange', (seed) => {
            this.regenerate(seed);
            this.render();
        });
        this.framework.on('onParamChange', (name, value) => {
            if (name === 'numPoints') {
                // Always regenerate when number of points changes
                this.stopRelaxation();
                this.currentRelaxationStep = 0;
                this.relaxationHistory = [];
                this.regenerate(this.framework.getSeed());
            } else if (name === 'lloydRelaxation') {
                const params = this.framework.getParams();
                if (params.lloydRelaxation) {
                    this.startRelaxation();
                } else {
                    this.stopRelaxation();
                }
            } else if (name === 'loopMode') {
                const params = this.framework.getParams();
                this.loopMode = params.loopMode || false;
            } else if (name === 'relaxationSteps') {
                const params = this.framework.getParams();
                this.targetRelaxationSteps = Math.floor(params.relaxationSteps || 5);
                if (this.isRelaxing) {
                    // Restart with new target
                    this.stopRelaxation();
                    this.startRelaxation();
                }
            } else {
                this.render();
            }
        });
        this.framework.on('onPause', (isPaused) => {
            if (isPaused) {
                // Pause relaxation
                if (this.relaxationAnimationId) {
                    clearTimeout(this.relaxationAnimationId);
                    this.relaxationAnimationId = null;
                }
            } else {
                // Resume relaxation if it was running
                const params = this.framework.getParams();
                if (params.lloydRelaxation && this.isRelaxing) {
                    this.startRelaxation();
                }
            }
        });
        this.framework.on('onStep', () => {
            // Single step of relaxation
            if (this.isReversing) {
                this.stepBackward();
            } else {
                this.stepForward();
            }
        });
        this.framework.on('onReset', () => {
            this.stopRelaxation();
            this.currentRelaxationStep = 0;
            this.relaxationHistory = [];
            this.isReversing = false;
            this.regenerate(this.framework.getSeed());
            this.render();
        });
        this.framework.on('onShowCode', () => {
            const code = this.generateCode();
            this.framework.showCodeView(code);
        });

        // Mouse interaction
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        this.regenerate(this.framework.getSeed());
        this.render();
    }

    regenerate(seed) {
        const random = new SeededRandom(seed);
        const params = this.framework.getParams();
        const numPoints = Math.floor(params.numPoints || 20);
        
        // Always regenerate all points from scratch
        this.points = [];
        for (let i = 0; i < numPoints; i++) {
            this.points.push({
                x: random.random() * this.canvas.width,
                y: random.random() * this.canvas.height
            });
        }
        
        // Store original points for reverse
        this.originalPoints = this.points.map(p => ({ x: p.x, y: p.y }));
        this.relaxationHistory = [this.originalPoints.map(p => ({ x: p.x, y: p.y }))];
        
        this.computeVoronoi();
        this.computeDelaunay();
        this.render();
        
        // Start relaxation animation if enabled
        const params2 = this.framework.getParams();
        if (params2.lloydRelaxation) {
            this.startRelaxation();
        }
    }

    computeVoronoi() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.voronoiCells = [];

        // Use adaptive resolution: coarse during dragging, fine otherwise
        const resolution = this.isDragging ? 8 : 3;

        for (let i = 0; i < this.points.length; i++) {
            const cell = {
                point: this.points[i],
                vertices: [],
                neighbors: []
            };

            // Simple Voronoi using distance to all points
            // For each point, find the region where it's closest
            for (let y = 0; y < height; y += resolution) {
                for (let x = 0; x < width; x += resolution) {
                    let minDist = Infinity;
                    let closestIdx = -1;
                    
                    for (let j = 0; j < this.points.length; j++) {
                        const dx = x - this.points[j].x;
                        const dy = y - this.points[j].y;
                        const dist = dx * dx + dy * dy;
                        
                        if (dist < minDist) {
                            minDist = dist;
                            closestIdx = j;
                        }
                    }
                    
                    if (closestIdx === i) {
                        cell.vertices.push({ x, y });
                    }
                }
            }

            this.voronoiCells.push(cell);
        }
    }

    computeDelaunay() {
        // Simplified Delaunay triangulation
        // For demo purposes, we'll compute a basic triangulation
        this.delaunayTriangles = [];
        
        for (let i = 0; i < this.points.length; i++) {
            for (let j = i + 1; j < this.points.length; j++) {
                for (let k = j + 1; k < this.points.length; k++) {
                    const p1 = this.points[i];
                    const p2 = this.points[j];
                    const p3 = this.points[k];
                    
                    // Check if triangle is valid (no other points inside circumcircle)
                    const center = this.circumcenter(p1, p2, p3);
                    const radius = this.distance(center, p1);
                    
                    let valid = true;
                    for (let l = 0; l < this.points.length; l++) {
                        if (l !== i && l !== j && l !== k) {
                            if (this.distance(center, this.points[l]) < radius - 0.1) {
                                valid = false;
                                break;
                            }
                        }
                    }
                    
                    if (valid) {
                        this.delaunayTriangles.push([i, j, k]);
                    }
                }
            }
        }
    }

    circumcenter(p1, p2, p3) {
        const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
        const ux = ((p1.x * p1.x + p1.y * p1.y) * (p2.y - p3.y) + 
                   (p2.x * p2.x + p2.y * p2.y) * (p3.y - p1.y) + 
                   (p3.x * p3.x + p3.y * p3.y) * (p1.y - p2.y)) / d;
        const uy = ((p1.x * p1.x + p1.y * p1.y) * (p3.x - p2.x) + 
                   (p2.x * p2.x + p2.y * p2.y) * (p1.x - p3.x) + 
                   (p3.x * p3.x + p3.y * p3.y) * (p2.x - p1.x)) / d;
        return { x: ux, y: uy };
    }

    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    stepForward() {
        // Compute centroids of Voronoi cells
        const centroids = [];
        for (const cell of this.voronoiCells) {
            if (cell.vertices.length === 0) {
                centroids.push(cell.point);
                continue;
            }
            
            let sumX = 0, sumY = 0;
            for (const v of cell.vertices) {
                sumX += v.x;
                sumY += v.y;
            }
            centroids.push({
                x: sumX / cell.vertices.length,
                y: sumY / cell.vertices.length
            });
        }
        
        // Move points to centroids
        for (let i = 0; i < this.points.length; i++) {
            this.points[i] = centroids[i];
        }
        
        // Store in history
        this.relaxationHistory.push(this.points.map(p => ({ x: p.x, y: p.y })));
        
        this.computeVoronoi();
        this.computeDelaunay();
        this.render();
        
        this.currentRelaxationStep++;
    }
    
    stepBackward() {
        if (this.relaxationHistory.length > 1) {
            // Remove current state
            this.relaxationHistory.pop();
            // Restore previous state
            const previous = this.relaxationHistory[this.relaxationHistory.length - 1];
            for (let i = 0; i < this.points.length; i++) {
                this.points[i] = { x: previous[i].x, y: previous[i].y };
            }
            
            this.computeVoronoi();
            this.computeDelaunay();
            this.render();
            
            this.currentRelaxationStep--;
        }
    }
    
    startRelaxation() {
        if (this.isRelaxing && !this.framework.isPaused) return;
        
        const params = this.framework.getParams();
        this.isRelaxing = true;
        this.targetRelaxationSteps = Math.floor(params.relaxationSteps || 5);
        
        // Reset if starting fresh
        if (this.currentRelaxationStep === 0 && this.relaxationHistory.length <= 1) {
            this.relaxationHistory = [this.points.map(p => ({ x: p.x, y: p.y }))];
        }
        
        const relaxStep = () => {
            if (this.framework.isPaused) {
                // Paused, don't continue
                this.relaxationAnimationId = setTimeout(relaxStep, 100);
                return;
            }
            
            if (!this.isRelaxing) {
                return;
            }
            
            if (this.isReversing) {
                // Going backward
                if (this.currentRelaxationStep <= 0) {
                    // Reached start, switch to forward if looping
                    if (this.loopMode) {
                        this.isReversing = false;
                        this.relaxationAnimationId = setTimeout(relaxStep, 200);
                    } else {
                        this.stopRelaxation();
                    }
                    return;
                }
                this.stepBackward();
            } else {
                // Going forward
                if (this.currentRelaxationStep >= this.targetRelaxationSteps) {
                    // Reached end, switch to backward if looping
                    if (this.loopMode) {
                        this.isReversing = true;
                        this.relaxationAnimationId = setTimeout(relaxStep, 200);
                    } else {
                        this.stopRelaxation();
                    }
                    return;
                }
                this.stepForward();
            }
            
            this.relaxationAnimationId = setTimeout(relaxStep, 200); // 200ms per step
        };
        
        relaxStep();
    }
    
    stopRelaxation() {
        this.isRelaxing = false;
        this.isReversing = false;
        if (this.relaxationAnimationId) {
            clearTimeout(this.relaxationAnimationId);
            this.relaxationAnimationId = null;
        }
    }
    
    updateRelaxation() {
        // Legacy method - now handled by startRelaxation/stopRelaxation
        const params = this.framework.getParams();
        if (params.lloydRelaxation) {
            this.startRelaxation();
        } else {
            this.stopRelaxation();
        }
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Scale to canvas coordinates
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        
        this.points.push({ x: canvasX, y: canvasY });
        
        // Update numPoints slider and params to reflect actual number of points
        const newNumPoints = this.points.length;
        this.framework.params.numPoints = newNumPoints;
        
        // Find slider if not already found
        if (!this.numPointsSlider) {
            const groups = this.framework.controlsPanel.querySelectorAll('.control-group');
            for (const group of groups) {
                const h3 = group.querySelector('h3');
                if (h3 && h3.textContent === 'Number of Points') {
                    this.numPointsSlider = group.querySelector('input[type="range"]');
                    this.numPointsLabel = group.querySelector('label');
                    break;
                }
            }
        }
        
        if (this.numPointsSlider) {
            this.numPointsSlider.value = newNumPoints;
            if (this.numPointsLabel) {
                this.numPointsLabel.textContent = `Number of Points: ${newNumPoints}`;
            }
        }
        
        this.computeVoronoi();
        this.computeDelaunay();
        this.render();
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        // Find closest point
        let minDist = Infinity;
        for (let i = 0; i < this.points.length; i++) {
            const dist = this.distance({ x, y }, this.points[i]);
            if (dist < minDist && dist < 20) {
                minDist = dist;
                this.dragIndex = i;
            }
        }
        
        if (this.dragIndex >= 0) {
            this.isDragging = true;
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging || this.dragIndex < 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        this.points[this.dragIndex].x = Math.max(0, Math.min(this.canvas.width, x));
        this.points[this.dragIndex].y = Math.max(0, Math.min(this.canvas.height, y));
        
        // Throttle updates during dragging using requestAnimationFrame
        if (!this.updatePending) {
            this.updatePending = true;
            requestAnimationFrame(() => {
                this.computeVoronoi();
                this.computeDelaunay();
                this.render();
                this.updatePending = false;
            });
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.dragIndex = -1;
        
        // Final high-quality render when drag ends
        this.computeVoronoi();
        this.computeDelaunay();
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const params = this.framework.getParams();
        const showDelaunay = params.showDelaunay || false;
        const showBiomes = params.showBiomes !== false;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        // Draw Voronoi cells
        const colors = [
            '#4a9eff', '#4ade80', '#fbbf24', '#f87171', '#a78bfa',
            '#fb7185', '#34d399', '#60a5fa', '#f472b6', '#818cf8'
        ];

        for (let i = 0; i < this.voronoiCells.length; i++) {
            const cell = this.voronoiCells[i];
            
            if (cell.vertices.length === 0) continue;
            
            ctx.beginPath();
            ctx.fillStyle = showBiomes ? colors[i % colors.length] : '#2a2a2a';
            ctx.strokeStyle = '#4a9eff';
            ctx.lineWidth = 1;
            
            ctx.moveTo(cell.vertices[0].x, cell.vertices[0].y);
            for (let j = 1; j < cell.vertices.length; j++) {
                ctx.lineTo(cell.vertices[j].x, cell.vertices[j].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Draw Delaunay triangulation
        if (showDelaunay) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            for (const triangle of this.delaunayTriangles) {
                const p1 = this.points[triangle[0]];
                const p2 = this.points[triangle[1]];
                const p3 = this.points[triangle[2]];
                
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.stroke();
            }
        }

        // Draw points
        ctx.fillStyle = '#ffffff';
        for (const point of this.points) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#4a9eff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    generateCode() {
        const params = this.framework.getParams();
        const seed = this.framework.getSeed();
        const numPoints = Math.floor(params.numPoints || 20);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spatial Partitioning - Generated Code</title>
    <style>
        body { margin: 0; padding: 20px; background: #0a0a0a; color: #e0e0e0; font-family: monospace; }
        canvas { border: 1px solid #333; display: block; margin: 20px auto; cursor: crosshair; }
        .controls { max-width: 400px; margin: 0 auto; padding: 20px; background: #1a1a1a; border-radius: 8px; }
        .control-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; color: #4a9eff; }
        input[type="range"] { width: 100%; }
        button { padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
    </style>
</head>
<body>
    <h1>Spatial Partitioning - Voronoi Diagrams</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        <div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="${seed}"></label>
            <button onclick="regenerate()">Regenerate</button>
        </div>
        <div class="control-group">
            <label>Number of Points: <span id="numPointsValue">${numPoints}</span></label>
            <input type="range" id="numPoints" min="5" max="50" step="1" value="${numPoints}" oninput="updateNumPoints(this.value)">
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showDelaunay" ${params.showDelaunay ? 'checked' : ''} onchange="updateShowDelaunay(this.checked)"> Show Delaunay Triangulation</label>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showBiomes" ${params.showBiomes !== false ? 'checked' : ''} onchange="updateShowBiomes(this.checked)"> Show Biome Colors</label>
        </div>
        <p style="color: #666; font-size: 12px;">Click canvas to add points, drag to move them</p>
    </div>

    <script>
        class SeededRandom {
            constructor(seed) { this.seed = seed; }
            random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let points = [];
        let voronoiCells = [];
        let delaunayTriangles = [];
        let params = {
            numPoints: ${numPoints},
            showDelaunay: ${params.showDelaunay || false},
            showBiomes: ${params.showBiomes !== false}
        };

        function regenerate() {
            const seedInput = document.getElementById('seed');
            const seedValue = seedInput ? parseInt(seedInput.value) : ${seed};
            const random = new SeededRandom(seedValue || ${seed});
            points = [];
            for (let i = 0; i < params.numPoints; i++) {
                points.push({
                    x: random.random() * canvas.width,
                    y: random.random() * canvas.height
                });
            }
            computeVoronoi();
            computeDelaunay();
            render();
        }

        function computeVoronoi() {
            const resolution = 3;
            voronoiCells = [];
            for (let i = 0; i < points.length; i++) {
                const cell = { point: points[i], vertices: [] };
                for (let y = 0; y < canvas.height; y += resolution) {
                    for (let x = 0; x < canvas.width; x += resolution) {
                        let minDist = Infinity, closestIdx = -1;
                        for (let j = 0; j < points.length; j++) {
                            const dx = x - points[j].x, dy = y - points[j].y;
                            const dist = dx * dx + dy * dy;
                            if (dist < minDist) { minDist = dist; closestIdx = j; }
                        }
                        if (closestIdx === i) cell.vertices.push({ x, y });
                    }
                }
                voronoiCells.push(cell);
            }
        }

        function computeDelaunay() {
            delaunayTriangles = [];
            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    for (let k = j + 1; k < points.length; k++) {
                        const p1 = points[i], p2 = points[j], p3 = points[k];
                        const center = circumcenter(p1, p2, p3);
                        const radius = distance(center, p1);
                        let valid = true;
                        for (let l = 0; l < points.length; l++) {
                            if (l !== i && l !== j && l !== k) {
                                if (distance(center, points[l]) < radius - 0.1) {
                                    valid = false;
                                    break;
                                }
                            }
                        }
                        if (valid) delaunayTriangles.push([i, j, k]);
                    }
                }
            }
        }

        function circumcenter(p1, p2, p3) {
            const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
            const ux = ((p1.x * p1.x + p1.y * p1.y) * (p2.y - p3.y) + (p2.x * p2.x + p2.y * p2.y) * (p3.y - p1.y) + (p3.x * p3.x + p3.y * p3.y) * (p1.y - p2.y)) / d;
            const uy = ((p1.x * p1.x + p1.y * p1.y) * (p3.x - p2.x) + (p2.x * p2.x + p2.y * p2.y) * (p1.x - p3.x) + (p3.x * p3.x + p3.y * p3.y) * (p2.x - p1.x)) / d;
            return { x: ux, y: uy };
        }

        function distance(p1, p2) {
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const colors = ['#4a9eff', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#fb7185', '#34d399', '#60a5fa', '#f472b6', '#818cf8'];
            for (let i = 0; i < voronoiCells.length; i++) {
                const cell = voronoiCells[i];
                if (cell.vertices.length === 0) continue;
                ctx.beginPath();
                ctx.fillStyle = params.showBiomes ? colors[i % colors.length] : '#2a2a2a';
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 1;
                ctx.moveTo(cell.vertices[0].x, cell.vertices[0].y);
                for (let j = 1; j < cell.vertices.length; j++) {
                    ctx.lineTo(cell.vertices[j].x, cell.vertices[j].y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            if (params.showDelaunay) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                for (const triangle of delaunayTriangles) {
                    const p1 = points[triangle[0]], p2 = points[triangle[1]], p3 = points[triangle[2]];
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineTo(p3.x, p3.y);
                    ctx.closePath();
                    ctx.stroke();
                }
            }

            ctx.fillStyle = '#ffffff';
            for (const point of points) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            points.push({ x, y });
            // Update numPoints slider and params
            params.numPoints = points.length;
            const numPointsSlider = document.getElementById('numPoints');
            const numPointsValue = document.getElementById('numPointsValue');
            if (numPointsSlider) {
                numPointsSlider.value = points.length;
            }
            if (numPointsValue) {
                numPointsValue.textContent = points.length;
            }
            computeVoronoi();
            computeDelaunay();
            render();
        });

        function updateNumPoints(val) {
            params.numPoints = parseInt(val);
            document.getElementById('numPointsValue').textContent = val;
            regenerate();
        }

        function updateShowDelaunay(val) { params.showDelaunay = val; render(); }
        function updateShowBiomes(val) { params.showBiomes = val; render(); }

        regenerate();
    </script>
</body>
</html>`;
    }
}

