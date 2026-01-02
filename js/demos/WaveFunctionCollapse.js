/**
 * Constraint Systems - Wave Function Collapse
 * Entropy-based tile placement with constraint visualization
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

export class WaveFunctionCollapse {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.grid = [];
        this.cellSize = 20;
        this.cols = 0;
        this.rows = 0;
        this.tiles = [' ', '║', '═', '╔', '╗', '╚', '╝', '╠', '╣', '╦', '╩', '╬'];
        this.tileColors = {
            ' ': '#0a0a0a',
            '║': '#4a9eff',
            '═': '#4a9eff',
            '╔': '#4ade80',
            '╗': '#4ade80',
            '╚': '#4ade80',
            '╝': '#4ade80',
            '╠': '#fbbf24',
            '╣': '#fbbf24',
            '╦': '#fbbf24',
            '╩': '#fbbf24',
            '╬': '#f87171'
        };
        this.constraints = this.buildConstraints();
        this.entropy = [];
        this.collapsed = false;
        this.conflicts = []; // Track cells with constraint conflicts

        this.init();
    }

    init() {
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);

        // Controls
        this.framework.addSlider('speed', 'Collapse Speed', 1, 100, 10, 1);
        this.framework.addToggle('showEntropy', 'Show Entropy Heatmap', true);
        this.framework.addToggle('showConstraints', 'Show Constraint Conflicts', false);

        this.framework.on('onSeedChange', (seed) => {
            this.regenerate(seed);
            this.render();
        });
        this.framework.on('onReset', () => {
            this.regenerate(this.framework.getSeed());
            this.render();
        });
        this.framework.on('onStep', () => {
            if (!this.collapsed) {
                this.collapseStep();
                this.render();
            }
        });
        this.framework.on('onParamChange', (name) => {
            if (name === 'showEntropy' || name === 'showConstraints') {
                this.render();
            }
        });
        this.framework.on('onShowCode', () => {
            const code = this.generateCode();
            this.framework.showCodeView(code);
        });

        this.regenerate(this.framework.getSeed());
        this.render();

        // Auto-collapse
        let lastTime = performance.now();
        const animate = () => {
            const currentTime = performance.now();
            const params = this.framework.getParams();
            const speed = params.speed || 10;
            const interval = 1000 / speed;

            if (currentTime - lastTime >= interval) {
                if (!this.framework.isPaused && !this.collapsed) {
                    this.collapseStep();
                    this.render();
                }
                lastTime = currentTime;
            }
            
            if (!this.collapsed || !this.framework.isPaused) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    buildConstraints() {
        // Define which tiles can be adjacent
        const constraints = {};
        for (const tile of this.tiles) {
            constraints[tile] = { top: [], right: [], bottom: [], left: [] };
        }

        // Simple constraints: tiles connect if they have matching edges
        const hasTop = (t) => ['║', '╔', '╗', '╠', '╣', '╦', '╬'].includes(t);
        const hasRight = (t) => ['═', '╔', '╚', '╠', '╦', '╩', '╬'].includes(t);
        const hasBottom = (t) => ['║', '╚', '╝', '╠', '╣', '╩', '╬'].includes(t);
        const hasLeft = (t) => ['═', '╗', '╝', '╣', '╦', '╩', '╬'].includes(t);

        for (const tile1 of this.tiles) {
            for (const tile2 of this.tiles) {
                if (hasBottom(tile1) === hasTop(tile2)) {
                    constraints[tile1].bottom.push(tile2);
                    constraints[tile2].top.push(tile1);
                }
                if (hasRight(tile1) === hasLeft(tile2)) {
                    constraints[tile1].right.push(tile2);
                    constraints[tile2].left.push(tile1);
                }
            }
        }

        return constraints;
    }

    regenerate(seed) {
        this.grid = [];
        this.entropy = [];
        this.collapsed = false;
        this.conflicts = [];

        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            this.entropy[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = {
                    possible: [...this.tiles],
                    collapsed: false,
                    value: null
                };
                this.entropy[y][x] = this.tiles.length;
            }
        }
    }

    getLowestEntropy() {
        let min = Infinity;
        const candidates = [];
        let stepCount = 0;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                if (cell.collapsed) continue;

                const entropy = cell.possible.length;
                if (entropy === 0) continue; // Skip cells with no possibilities
                
                if (entropy < min) {
                    min = entropy;
                    candidates.length = 0;
                    candidates.push({ x, y });
                } else if (entropy === min) {
                    candidates.push({ x, y });
                }
            }
        }

        if (candidates.length === 0) return null;
        
        // Use a deterministic random based on step count
        const random = new SeededRandom(this.framework.getSeed() + this.getStepCount());
        return candidates[Math.floor(random.random() * candidates.length)];
    }
    
    getStepCount() {
        let count = 0;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x].collapsed) count++;
            }
        }
        return count;
    }

    collapseCell(x, y) {
        const cell = this.grid[y][x];
        if (cell.collapsed || cell.possible.length === 0) return false;

        // Use deterministic random based on position and step count
        const stepCount = this.getStepCount();
        const random = new SeededRandom(this.framework.getSeed() + x * 1000 + y * 100 + stepCount);
        const choice = cell.possible[Math.floor(random.random() * cell.possible.length)];
        
        cell.value = choice;
        cell.possible = [choice];
        cell.collapsed = true;
        this.entropy[y][x] = 0;

        return true;
    }

    propagate(x, y) {
        const cell = this.grid[y][x];
        if (!cell.collapsed) return;

        const tile = cell.value;
        const changed = [];

        // Check neighbors
        const neighbors = [
            { x, y: y - 1, dir: 'top', opposite: 'bottom' },
            { x: x + 1, y, dir: 'right', opposite: 'left' },
            { x, y: y + 1, dir: 'bottom', opposite: 'top' },
            { x: x - 1, y, dir: 'left', opposite: 'right' }
        ];

        for (const neighbor of neighbors) {
            if (neighbor.x < 0 || neighbor.x >= this.cols || neighbor.y < 0 || neighbor.y >= this.rows) continue;

            const nCell = this.grid[neighbor.y][neighbor.x];
            if (nCell.collapsed) continue;

            const allowed = this.constraints[tile][neighbor.dir];
            const before = nCell.possible.length;
            nCell.possible = nCell.possible.filter(t => allowed.includes(t));
            const after = nCell.possible.length;

            if (after < before) {
                this.entropy[neighbor.y][neighbor.x] = after;
                changed.push(neighbor);
            }

            if (nCell.possible.length === 0) {
                // Contradiction detected - mark it for visualization
                const conflictKey = `${neighbor.x},${neighbor.y}`;
                if (!this.conflicts.includes(conflictKey)) {
                    this.conflicts.push(conflictKey);
                }
                // Reset this cell to allow algorithm to continue
                nCell.possible = [...this.tiles];
                this.entropy[neighbor.y][neighbor.x] = this.tiles.length;
            } else {
                // Remove from conflicts if it's no longer a conflict
                const conflictKey = `${neighbor.x},${neighbor.y}`;
                const index = this.conflicts.indexOf(conflictKey);
                if (index > -1) {
                    this.conflicts.splice(index, 1);
                }
            }
        }

        // Recursively propagate changes
        for (const change of changed) {
            this.propagate(change.x, change.y);
        }
    }

    collapseStep() {
        const lowest = this.getLowestEntropy();
        if (!lowest) {
            this.collapsed = true;
            return;
        }

        this.collapseCell(lowest.x, lowest.y);
        this.propagate(lowest.x, lowest.y);
    }

    render() {
        const ctx = this.ctx;
        const params = this.framework.getParams();
        const showEntropy = params.showEntropy !== false;
        const showConstraints = params.showConstraints || false;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw entropy heatmap
        if (showEntropy) {
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.cols; x++) {
                    const entropy = this.entropy[y][x];
                    const maxEntropy = this.tiles.length;
                    const intensity = entropy / maxEntropy;
                    
                    const r = Math.floor(255 * intensity);
                    const g = 0;
                    const b = Math.floor(255 * (1 - intensity));
                    
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

        // Draw constraint conflicts overlay
        if (showConstraints) {
            for (const conflictKey of this.conflicts) {
                const [x, y] = conflictKey.split(',').map(Number);
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
            }
            
            // Also highlight cells with very few possibilities (highly constrained)
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.cols; x++) {
                    const cell = this.grid[y][x];
                    if (cell.collapsed) continue;
                    
                    // Show cells with 1-2 possibilities as potentially problematic
                    if (cell.possible.length > 0 && cell.possible.length <= 2) {
                        ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x * this.cellSize + 1, y * this.cellSize + 1, this.cellSize - 2, this.cellSize - 2);
                    }
                }
            }
        }

        // Draw tiles
        ctx.font = `${this.cellSize * 0.8}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                const px = x * this.cellSize + this.cellSize / 2;
                const py = y * this.cellSize + this.cellSize / 2;

                if (cell.collapsed && cell.value) {
                    ctx.fillStyle = this.tileColors[cell.value] || '#ffffff';
                    ctx.fillText(cell.value, px, py);
                } else if (cell.possible.length === 1) {
                    ctx.fillStyle = this.tileColors[cell.possible[0]] || '#ffffff';
                    ctx.fillText(cell.possible[0], px, py);
                }
            }
        }

        // Draw grid
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let x = 0; x <= this.cols; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(this.canvas.width, y * this.cellSize);
            ctx.stroke();
        }
    }
}

