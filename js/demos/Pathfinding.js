/**
 * Graphs & Topology - Pathfinding
 * A* pathfinding with step-by-step visualization
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

class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.g = 0; // Cost from start
        this.h = 0; // Heuristic to goal
        this.f = 0; // Total cost
        this.parent = null;
        this.walkable = true;
    }
}

export class Pathfinding {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.grid = [];
        this.cellSize = 20;
        this.cols = 0;
        this.rows = 0;
        this.start = null;
        this.goal = null;
        this.path = [];
        this.openSet = [];
        this.closedSet = [];
        this.current = null;
        this.finished = false;
        this.showStepByStep = false;

        this.init();
    }

    init() {
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);

        // Controls
        this.framework.addSlider('obstacleDensity', 'Obstacle Density', 0, 50, 20, 1);
        this.framework.addToggle('showStepByStep', 'Step-by-Step Mode', true);
        this.framework.addSlider('heuristicWeight', 'Heuristic Weight', 0, 2, 1, 0.1);

        this.framework.on('onSeedChange', (seed) => {
            this.regenerate(seed);
            this.render();
        });
        this.framework.on('onReset', () => {
            this.regenerate(this.framework.getSeed());
            this.render();
        });
        this.framework.on('onStep', () => {
            if (this.showStepByStep && !this.finished) {
                this.pathfindingStep();
                this.render();
            }
        });
        this.framework.on('onShowCode', () => {
            const code = this.generateCode();
            this.framework.showCodeView(code);
        });
        this.framework.on('onParamChange', (name) => {
            if (name === 'obstacleDensity') {
                // Regenerate grid with new density
                this.regenerate(this.framework.getSeed());
                this.render();
            } else if (name === 'heuristicWeight') {
                // If pathfinding is in progress, recalculate heuristics
                // Otherwise regenerate
                if (this.openSet.length > 0 || this.closedSet.length > 0) {
                    this.recalculateHeuristics();
                    // Re-sort open set by f value
                    this.openSet.sort((a, b) => a.f - b.f);
                    this.render();
                } else {
                    // Restart pathfinding with new heuristic weight
                    this.regenerate(this.framework.getSeed());
                    this.render();
                }
            } else if (name === 'showStepByStep') {
                // Just update the display
                this.render();
            }
        });

        this.regenerate(this.framework.getSeed());
        this.render();

        // Auto pathfinding
        let lastTime = performance.now();
        const animate = () => {
            const currentTime = performance.now();
            const params = this.framework.getParams();
            this.showStepByStep = params.showStepByStep !== false;

            if (!this.framework.isPaused && !this.showStepByStep && !this.finished) {
                if (currentTime - lastTime >= 50) {
                    this.pathfindingStep();
                    this.render();
                    lastTime = currentTime;
                }
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    regenerate(seed) {
        const random = new SeededRandom(seed);
        const params = this.framework.getParams();
        const density = params.obstacleDensity || 20;

        this.grid = [];
        this.path = [];
        this.openSet = [];
        this.closedSet = [];
        this.finished = false;

        // Create grid
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                const node = new Node(x, y);
                node.walkable = random.random() * 100 > density;
                this.grid[y][x] = node;
            }
        }

        // Set start and goal
        this.start = this.grid[Math.floor(this.rows / 4)][Math.floor(this.cols / 4)];
        this.goal = this.grid[Math.floor(this.rows * 3 / 4)][Math.floor(this.cols * 3 / 4)];
        this.start.walkable = true;
        this.goal.walkable = true;

        // Initialize A*
        this.start.g = 0;
        this.start.h = this.heuristic(this.start, this.goal);
        this.start.f = this.start.h;
        this.openSet = [this.start];
    }

    heuristic(a, b) {
        const params = this.framework.getParams();
        const weight = params.heuristicWeight || 1;
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        return (dx + dy) * weight; // Manhattan distance
    }
    
    recalculateHeuristics() {
        // Recalculate all heuristics with current weight
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const node = this.grid[y][x];
                if (node !== this.start && node !== this.goal) {
                    if (this.goal) {
                        node.h = this.heuristic(node, this.goal);
                        node.f = node.g + node.h;
                    }
                }
            }
        }
        if (this.start && this.goal) {
            this.start.h = this.heuristic(this.start, this.goal);
            this.start.f = this.start.g + this.start.h;
        }
    }

    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, { x: 1, y: 0 },
            { x: 0, y: 1 }, { x: -1, y: 0 }
        ];

        for (const dir of directions) {
            const x = node.x + dir.x;
            const y = node.y + dir.y;
            if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
                neighbors.push(this.grid[y][x]);
            }
        }

        return neighbors;
    }

    pathfindingStep() {
        if (this.finished || this.openSet.length === 0) {
            this.finished = true;
            return;
        }

        // Find node with lowest f
        let lowestIndex = 0;
        for (let i = 1; i < this.openSet.length; i++) {
            if (this.openSet[i].f < this.openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }

        this.current = this.openSet[lowestIndex];

        // Check if reached goal
        if (this.current === this.goal) {
            this.finished = true;
            this.reconstructPath();
            return;
        }

        // Move current from open to closed
        this.openSet.splice(lowestIndex, 1);
        this.closedSet.push(this.current);

        // Check neighbors
        const neighbors = this.getNeighbors(this.current);
        for (const neighbor of neighbors) {
            if (!neighbor.walkable || this.closedSet.includes(neighbor)) {
                continue;
            }

            const tentativeG = this.current.g + 1;
            const inOpenSet = this.openSet.includes(neighbor);

            if (!inOpenSet || tentativeG < neighbor.g) {
                neighbor.parent = this.current;
                neighbor.g = tentativeG;
                neighbor.h = this.heuristic(neighbor, this.goal);
                neighbor.f = neighbor.g + neighbor.h;

                if (!inOpenSet) {
                    this.openSet.push(neighbor);
                }
            }
        }
    }

    reconstructPath() {
        this.path = [];
        let current = this.goal;
        while (current) {
            this.path.push(current);
            current = current.parent;
        }
        this.path.reverse();
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const node = this.grid[y][x];
                const px = x * this.cellSize;
                const py = y * this.cellSize;

                // Obstacles
                if (!node.walkable) {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(px, py, this.cellSize, this.cellSize);
                }

                // Closed set
                if (this.closedSet.includes(node)) {
                    ctx.fillStyle = 'rgba(248, 113, 113, 0.3)';
                    ctx.fillRect(px, py, this.cellSize, this.cellSize);
                }

                // Open set
                if (this.openSet.includes(node)) {
                    ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
                    ctx.fillRect(px, py, this.cellSize, this.cellSize);
                }

                // Current
                if (node === this.current) {
                    ctx.fillStyle = 'rgba(74, 158, 255, 0.5)';
                    ctx.fillRect(px, py, this.cellSize, this.cellSize);
                }

                // Path
                if (this.path.includes(node)) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
                }

                // Start
                if (node === this.start) {
                    ctx.fillStyle = '#4ade80';
                    ctx.beginPath();
                    ctx.arc(px + this.cellSize / 2, py + this.cellSize / 2, this.cellSize / 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Goal
                if (node === this.goal) {
                    ctx.fillStyle = '#f87171';
                    ctx.beginPath();
                    ctx.arc(px + this.cellSize / 2, py + this.cellSize / 2, this.cellSize / 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Grid lines
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, this.cellSize, this.cellSize);
            }
        }
    }

    generateCode() {
        const params = this.framework.getParams();
        const seed = this.framework.getSeed();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A* Pathfinding - Generated Code</title>
    <style>
        body { margin: 0; padding: 20px; background: #0a0a0a; color: #e0e0e0; font-family: monospace; }
        canvas { border: 1px solid #333; display: block; margin: 20px auto; }
        .controls { max-width: 400px; margin: 0 auto; padding: 20px; background: #1a1a1a; border-radius: 8px; }
        .control-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; color: #4a9eff; }
        input[type="range"] { width: 100%; }
        button { padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>A* Pathfinding Algorithm</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        <div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="${seed}"></label>
            <button onclick="regenerate()">Regenerate</button>
            <button onclick="step()">Step</button>
        </div>
        <div class="control-group">
            <label>Obstacle Density: <span id="obstacleDensityValue">${params.obstacleDensity || 20}</span>%</label>
            <input type="range" id="obstacleDensity" min="0" max="50" step="1" value="${params.obstacleDensity || 20}" oninput="updateObstacleDensity(this.value)">
        </div>
        <div class="control-group">
            <label>Heuristic Weight: <span id="heuristicWeightValue">${params.heuristicWeight || 1}</span></label>
            <input type="range" id="heuristicWeight" min="0" max="2" step="0.1" value="${params.heuristicWeight || 1}" oninput="updateHeuristicWeight(this.value)">
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showStepByStep" ${params.showStepByStep !== false ? 'checked' : ''} onchange="updateShowStepByStep(this.checked)"> Step-by-Step Mode</label>
        </div>
    </div>

    <script>
        class SeededRandom {
            constructor(seed) { this.seed = seed; }
            random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const cellSize = 20;
        const cols = Math.floor(canvas.width / cellSize);
        const rows = Math.floor(canvas.height / cellSize);
        let grid = [];
        let start = { x: 0, y: 0 };
        let end = { x: cols - 1, y: rows - 1 };
        let openSet = [];
        let closedSet = [];
        let path = [];
        let finished = false;
        let params = {
            obstacleDensity: ${params.obstacleDensity || 20},
            heuristicWeight: ${params.heuristicWeight || 1},
            showStepByStep: ${params.showStepByStep !== false}
        };

        function regenerate() {
            const random = new SeededRandom(parseInt(document.getElementById('seed').value) || ${seed});
            grid = [];
            for (let y = 0; y < rows; y++) {
                grid[y] = [];
                for (let x = 0; x < cols; x++) {
                    grid[y][x] = random.random() * 100 < params.obstacleDensity ? 1 : 0;
                }
            }
            start = { x: 0, y: 0 };
            end = { x: cols - 1, y: rows - 1 };
            grid[start.y][start.x] = 0;
            grid[end.y][end.x] = 0;
            openSet = [{ x: start.x, y: start.y, g: 0, h: 0, f: 0, parent: null }];
            closedSet = [];
            path = [];
            finished = false;
        }

        function heuristic(a, b) {
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        }

        function pathfindingStep() {
            if (finished || openSet.length === 0) return;
            let current = openSet[0];
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < current.f) current = openSet[i];
            }
            openSet = openSet.filter(n => n !== current);
            closedSet.push(current);
            if (current.x === end.x && current.y === end.y) {
                finished = true;
                let temp = current;
                while (temp) {
                    path.push(temp);
                    temp = temp.parent;
                }
                return;
            }
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];
            for (const neighbor of neighbors) {
                if (neighbor.x < 0 || neighbor.x >= cols || neighbor.y < 0 || neighbor.y >= rows) continue;
                if (grid[neighbor.y][neighbor.x] === 1) continue;
                if (closedSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) continue;
                const g = current.g + 1;
                const h = heuristic(neighbor, end) * params.heuristicWeight;
                const f = g + h;
                const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
                if (!existing) {
                    openSet.push({ x: neighbor.x, y: neighbor.y, g, h, f, parent: current });
                } else if (g < existing.g) {
                    existing.g = g;
                    existing.f = f;
                    existing.parent = current;
                }
            }
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const px = x * cellSize;
                    const py = y * cellSize;
                    if (grid[y][x] === 1) {
                        ctx.fillStyle = '#333';
                        ctx.fillRect(px, py, cellSize, cellSize);
                    }
                    if (x === start.x && y === start.y) {
                        ctx.fillStyle = '#4ade80';
                        ctx.fillRect(px, py, cellSize, cellSize);
                    }
                    if (x === end.x && y === end.y) {
                        ctx.fillStyle = '#f87171';
                        ctx.fillRect(px, py, cellSize, cellSize);
                    }
                    if (closedSet.find(n => n.x === x && n.y === y)) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                        ctx.fillRect(px, py, cellSize, cellSize);
                    }
                    if (openSet.find(n => n.x === x && n.y === y)) {
                        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                        ctx.fillRect(px, py, cellSize, cellSize);
                    }
                    ctx.strokeStyle = '#222';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px, py, cellSize, cellSize);
                }
            }

            if (path.length > 0) {
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = path.length - 1; i >= 0; i--) {
                    const node = path[i];
                    const px = node.x * cellSize + cellSize / 2;
                    const py = node.y * cellSize + cellSize / 2;
                    if (i === path.length - 1) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
        }

        function step() {
            if (!finished && openSet.length > 0) {
                pathfindingStep();
                render();
            }
        }

        let lastTime = performance.now();
        function animate() {
            const currentTime = performance.now();
            if (currentTime - lastTime >= 50) {
                if (!params.showStepByStep && !finished && openSet.length > 0) {
                    pathfindingStep();
                }
                render();
                lastTime = currentTime;
            }
            requestAnimationFrame(animate);
        }

        function updateObstacleDensity(val) { params.obstacleDensity = parseInt(val); document.getElementById('obstacleDensityValue').textContent = val; regenerate(); }
        function updateHeuristicWeight(val) { params.heuristicWeight = parseFloat(val); document.getElementById('heuristicWeightValue').textContent = val; regenerate(); }
        function updateShowStepByStep(val) { params.showStepByStep = val; }

        regenerate();
        animate();
    </script>
</body>
</html>`;
    }
}

