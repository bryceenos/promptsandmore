/**
 * Emergent Simulation - Cellular Automata
 * Interactive rule-based grid simulation
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

export class CellularAutomata {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.grid = [];
        this.nextGrid = [];
        this.cellSize = 4;
        this.cols = 0;
        this.rows = 0;
        this.generation = 0;
        this.generationDisplay = null;

        this.init();
    }

    init() {
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);

        // Controls
        this.framework.addSlider('density', 'Initial Density', 0, 100, 30, 1);
        this.framework.addSlider('birthMin', 'Birth Min Neighbors', 0, 8, 3, 1);
        this.framework.addSlider('birthMax', 'Birth Max Neighbors', 0, 8, 3, 1);
        this.framework.addSlider('surviveMin', 'Survive Min Neighbors', 0, 8, 2, 1);
        this.framework.addSlider('surviveMax', 'Survive Max Neighbors', 0, 8, 3, 1);
        this.framework.addToggle('wrapEdges', 'Wrap Edges', true);
        this.framework.addSlider('speed', 'Update Speed', 1, 60, 10, 1);

        this.framework.on('onSeedChange', (seed) => {
            this.regenerate(seed);
            this.render();
        });
        this.framework.on('onParamChange', (name) => {
            if (name === 'density') {
                this.regenerate(this.framework.getSeed());
                this.render();
            }
            // Other parameters don't require regeneration, just continue with current grid
        });
        this.framework.on('onReset', () => {
            this.regenerate(this.framework.getSeed());
            this.render();
        });
        this.framework.on('onStep', () => {
            this.update();
            this.render();
        });
        this.framework.on('onShowCode', () => {
            const code = this.generateCode();
            this.framework.showCodeView(code);
        });

        // Add generation display next to seed
        this.addGenerationDisplay();

        this.regenerate(this.framework.getSeed());
        this.render();

        // Animation loop
        let lastTime = performance.now();
        const animate = () => {
            const currentTime = performance.now();
            const params = this.framework.getParams();
            const speed = params.speed || 10;
            const interval = 1000 / speed;

            if (currentTime - lastTime >= interval) {
                if (!this.framework.isPaused) {
                    this.update();
                    this.render();
                }
                lastTime = currentTime;
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    regenerate(seed) {
        const random = new SeededRandom(seed);
        const params = this.framework.getParams();
        const density = params.density || 30;

        this.grid = [];
        this.nextGrid = [];
        this.generation = 0;

        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            this.nextGrid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = random.random() * 100 < density ? 1 : 0;
                this.nextGrid[y][x] = 0;
            }
        }
    }

    countNeighbors(x, y) {
        const params = this.framework.getParams();
        const wrap = params.wrapEdges !== false;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;

                let nx = x + dx;
                let ny = y + dy;

                if (wrap) {
                    nx = (nx + this.cols) % this.cols;
                    ny = (ny + this.rows) % this.rows;
                } else {
                    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
                }

                count += this.grid[ny][nx];
            }
        }

        return count;
    }

    update() {
        const params = this.framework.getParams();
        const birthMin = Math.floor(params.birthMin || 3);
        const birthMax = Math.floor(params.birthMax || 3);
        const surviveMin = Math.floor(params.surviveMin || 2);
        const surviveMax = Math.floor(params.surviveMax || 3);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const neighbors = this.countNeighbors(x, y);
                const alive = this.grid[y][x];

                if (alive) {
                    // Survival rules
                    this.nextGrid[y][x] = (neighbors >= surviveMin && neighbors <= surviveMax) ? 1 : 0;
                } else {
                    // Birth rules
                    this.nextGrid[y][x] = (neighbors >= birthMin && neighbors <= birthMax) ? 1 : 0;
                }
            }
        }

        // Swap grids
        const temp = this.grid;
        this.grid = this.nextGrid;
        this.nextGrid = temp;
        this.generation++;
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        ctx.fillStyle = '#4ade80';
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x]) {
                    ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

        // Update generation display in controls
        if (this.generationDisplay) {
            this.generationDisplay.textContent = `Generation: ${this.generation}`;
        }
    }

    addGenerationDisplay() {
        // Find the seed group and add generation display next to it
        const controlsPanel = this.framework.controlsPanel;
        if (!controlsPanel) return;

        const seedGroup = controlsPanel.querySelector('.control-group');
        if (!seedGroup) return;

        // Find the seed container (the flex container with input and button)
        const seedContainer = seedGroup.querySelector('div[style*="display: flex"]');
        if (seedContainer) {
            // Add generation display after the randomize button
            const genDisplay = document.createElement('span');
            genDisplay.style.marginLeft = '1rem';
            genDisplay.style.color = 'var(--text-secondary)';
            genDisplay.style.fontSize = '0.9rem';
            genDisplay.textContent = `Generation: ${this.generation}`;
            seedContainer.appendChild(genDisplay);
            this.generationDisplay = genDisplay;
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
    <title>Cellular Automata - Generated Code</title>
    <style>
        body { margin: 0; padding: 20px; background: #0a0a0a; color: #e0e0e0; font-family: monospace; }
        canvas { border: 1px solid #333; display: block; margin: 20px auto; }
        .controls { max-width: 400px; margin: 0 auto; padding: 20px; background: #1a1a1a; border-radius: 8px; }
        .control-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; color: #4a9eff; }
        input[type="range"] { width: 100%; }
        button { padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
    </style>
</head>
<body>
    <h1>Cellular Automata - Game of Life Variant</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        <div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="${seed}"></label>
            <button onclick="regenerate()">Regenerate</button>
            <button onclick="step()">Step</button>
            <button onclick="togglePause()" id="pauseBtn">Pause</button>
        </div>
        <div class="control-group">
            <label>Initial Density: <span id="densityValue">${params.density || 30}</span>%</label>
            <input type="range" id="density" min="0" max="100" step="1" value="${params.density || 30}" oninput="updateDensity(this.value)">
        </div>
        <div class="control-group">
            <label>Birth Min Neighbors: <span id="birthMinValue">${params.birthMin || 3}</span></label>
            <input type="range" id="birthMin" min="0" max="8" step="1" value="${params.birthMin || 3}" oninput="updateBirthMin(this.value)">
        </div>
        <div class="control-group">
            <label>Birth Max Neighbors: <span id="birthMaxValue">${params.birthMax || 3}</span></label>
            <input type="range" id="birthMax" min="0" max="8" step="1" value="${params.birthMax || 3}" oninput="updateBirthMax(this.value)">
        </div>
        <div class="control-group">
            <label>Survive Min Neighbors: <span id="surviveMinValue">${params.surviveMin || 2}</span></label>
            <input type="range" id="surviveMin" min="0" max="8" step="1" value="${params.surviveMin || 2}" oninput="updateSurviveMin(this.value)">
        </div>
        <div class="control-group">
            <label>Survive Max Neighbors: <span id="surviveMaxValue">${params.surviveMax || 3}</span></label>
            <input type="range" id="surviveMax" min="0" max="8" step="1" value="${params.surviveMax || 3}" oninput="updateSurviveMax(this.value)">
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="wrapEdges" ${params.wrapEdges !== false ? 'checked' : ''} onchange="updateWrapEdges(this.checked)"> Wrap Edges</label>
        </div>
        <div class="control-group">
            <label>Update Speed: <span id="speedValue">${params.speed || 10}</span></label>
            <input type="range" id="speed" min="1" max="60" step="1" value="${params.speed || 10}" oninput="updateSpeed(this.value)">
        </div>
        <div class="control-group">
            <label>Generation: <span id="generation">0</span></label>
        </div>
    </div>

    <script>
        class SeededRandom {
            constructor(seed) { this.seed = seed; }
            random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const cellSize = 4;
        const cols = Math.floor(canvas.width / cellSize);
        const rows = Math.floor(canvas.height / cellSize);
        let grid = [];
        let nextGrid = [];
        let generation = 0;
        let paused = false;
        let params = {
            density: ${params.density || 30},
            birthMin: ${params.birthMin || 3},
            birthMax: ${params.birthMax || 3},
            surviveMin: ${params.surviveMin || 2},
            surviveMax: ${params.surviveMax || 3},
            wrapEdges: ${params.wrapEdges !== false},
            speed: ${params.speed || 10}
        };

        function regenerate() {
            const random = new SeededRandom(parseInt(document.getElementById('seed').value) || ${seed});
            grid = [];
            nextGrid = [];
            generation = 0;
            for (let y = 0; y < rows; y++) {
                grid[y] = [];
                nextGrid[y] = [];
                for (let x = 0; x < cols; x++) {
                    grid[y][x] = random.random() * 100 < params.density ? 1 : 0;
                    nextGrid[y][x] = 0;
                }
            }
            render();
        }

        function countNeighbors(x, y) {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    let nx = x + dx, ny = y + dy;
                    if (params.wrapEdges) {
                        nx = (nx + cols) % cols;
                        ny = (ny + rows) % rows;
                    } else {
                        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
                    }
                    count += grid[ny][nx];
                }
            }
            return count;
        }

        function update() {
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const neighbors = countNeighbors(x, y);
                    const alive = grid[y][x];
                    if (alive) {
                        nextGrid[y][x] = (neighbors >= params.surviveMin && neighbors <= params.surviveMax) ? 1 : 0;
                    } else {
                        nextGrid[y][x] = (neighbors >= params.birthMin && neighbors <= params.birthMax) ? 1 : 0;
                    }
                }
            }
            const temp = grid;
            grid = nextGrid;
            nextGrid = temp;
            generation++;
            document.getElementById('generation').textContent = generation;
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#4ade80';
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (grid[y][x]) {
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }
            }
        }

        function step() {
            update();
            render();
        }

        function togglePause() {
            paused = !paused;
            document.getElementById('pauseBtn').textContent = paused ? 'Resume' : 'Pause';
        }

        let lastTime = performance.now();
        function animate() {
            const currentTime = performance.now();
            const interval = 1000 / params.speed;
            if (currentTime - lastTime >= interval) {
                if (!paused) {
                    update();
                    render();
                }
                lastTime = currentTime;
            }
            requestAnimationFrame(animate);
        }

        function updateDensity(val) { params.density = parseInt(val); document.getElementById('densityValue').textContent = val; regenerate(); }
        function updateBirthMin(val) { params.birthMin = parseInt(val); document.getElementById('birthMinValue').textContent = val; }
        function updateBirthMax(val) { params.birthMax = parseInt(val); document.getElementById('birthMaxValue').textContent = val; }
        function updateSurviveMin(val) { params.surviveMin = parseInt(val); document.getElementById('surviveMinValue').textContent = val; }
        function updateSurviveMax(val) { params.surviveMax = parseInt(val); document.getElementById('surviveMaxValue').textContent = val; }
        function updateWrapEdges(val) { params.wrapEdges = val; }
        function updateSpeed(val) { params.speed = parseInt(val); document.getElementById('speedValue').textContent = val; }

        regenerate();
        animate();
    </script>
</body>
</html>`;
    }
}

