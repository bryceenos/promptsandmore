/**
 * Probability & Randomness Visualizer
 * Weighted RNG, distribution graphs, and fairness visualization
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

export class ProbabilityRandomness {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.distribution = [];
        this.history = [];
        this.maxHistory = 1000;
        this.bins = 20;

        this.init();
    }

    init() {
        // Controls
        this.framework.addSlider('weight1', 'Weight 1', 0, 100, 10, 1);
        this.framework.addSlider('weight2', 'Weight 2', 0, 100, 20, 1);
        this.framework.addSlider('weight3', 'Weight 3', 0, 100, 30, 1);
        this.framework.addSlider('weight4', 'Weight 4', 0, 100, 40, 1);
        this.framework.addToggle('usePoisson', 'Use Poisson Disk', false);
        this.framework.addSlider('poissonRadius', 'Poisson Radius', 5, 50, 20, 1);
        this.framework.addSlider('samples', 'Samples per Frame', 1, 100, 10, 1);

        this.framework.on('onSeedChange', (seed) => this.reset());
        this.framework.on('onReset', () => this.reset());
        this.framework.on('onParamChange', () => this.reset());
        this.framework.on('onShowCode', () => {
            const code = this.generateCode();
            this.framework.showCodeView(code);
        });

        this.reset();
        this.render();

        // Animation loop
        this.framework.startAnimation(() => {
            if (!this.framework.isPaused) {
                this.update();
                this.render();
            }
        });
    }

    reset() {
        this.distribution = new Array(this.bins).fill(0);
        this.history = [];
    }

    weightedRandom() {
        const params = this.framework.getParams();
        const weights = [
            params.weight1 || 10,
            params.weight2 || 20,
            params.weight3 || 30,
            params.weight4 || 40
        ];
        const total = weights.reduce((a, b) => a + b, 0);
        const random = new SeededRandom(this.framework.getSeed() + this.history.length);
        let r = random.random() * total;

        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return i;
        }
        return weights.length - 1;
    }

    poissonDiskSample() {
        const params = this.framework.getParams();
        const radius = params.poissonRadius || 20;
        const random = new SeededRandom(this.framework.getSeed() + this.history.length);
        
        // Simple Poisson disk sampling
        const attempts = 30;
        for (let i = 0; i < attempts; i++) {
            const x = random.random() * this.canvas.width;
            const y = random.random() * this.canvas.height;
            
            let valid = true;
            for (const point of this.history) {
                const dx = x - point.x;
                const dy = y - point.y;
                if (Math.sqrt(dx * dx + dy * dy) < radius) {
                    valid = false;
                    break;
                }
            }
            
            if (valid) {
                return { x, y };
            }
        }
        
        return null;
    }

    update() {
        const params = this.framework.getParams();
        const samples = Math.floor(params.samples || 10);
        const usePoisson = params.usePoisson || false;

        if (usePoisson) {
            for (let i = 0; i < samples && this.history.length < this.maxHistory; i++) {
                const point = this.poissonDiskSample();
                if (point) {
                    this.history.push(point);
                }
            }
        } else {
            for (let i = 0; i < samples; i++) {
                const value = this.weightedRandom();
                const bin = Math.floor((value / 4) * this.bins);
                this.distribution[Math.min(bin, this.bins - 1)]++;
                
                this.history.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    value: value
                });
                
                if (this.history.length > this.maxHistory) {
                    this.history.shift();
                }
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const params = this.framework.getParams();
        const usePoisson = params.usePoisson || false;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (usePoisson) {
            // Draw Poisson disk points
            ctx.fillStyle = '#4ade80';
            for (const point of this.history) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw radius circles
            ctx.strokeStyle = 'rgba(74, 158, 255, 0.2)';
            ctx.lineWidth = 1;
            const radius = params.poissonRadius || 20;
            for (const point of this.history) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else {
            // Draw distribution histogram
            const maxCount = Math.max(...this.distribution, 1);
            const barWidth = this.canvas.width / this.bins;
            const colors = ['#4ade80', '#4a9eff', '#fbbf24', '#f87171'];

            for (let i = 0; i < this.bins; i++) {
                const height = (this.distribution[i] / maxCount) * (this.canvas.height * 0.8);
                const x = i * barWidth;
                const colorIndex = Math.floor((i / this.bins) * 4);
                
                ctx.fillStyle = colors[colorIndex] || '#ffffff';
                ctx.fillRect(x, this.canvas.height - height, barWidth - 2, height);
            }

            // Draw expected distribution
            const weights = [
                params.weight1 || 10,
                params.weight2 || 20,
                params.weight3 || 30,
                params.weight4 || 40
            ];
            const total = weights.reduce((a, b) => a + b, 0);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            
            for (let i = 0; i < 4; i++) {
                const expected = (weights[i] / total) * maxCount;
                const height = (expected / maxCount) * (this.canvas.height * 0.8);
                const x = (i / 4) * this.canvas.width + barWidth / 2;
                const y = this.canvas.height - height;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw sample points
            const pointColors = ['#4ade80', '#4a9eff', '#fbbf24', '#f87171'];
            for (const point of this.history.slice(-500)) {
                ctx.fillStyle = pointColors[point.value] || '#ffffff';
                ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
            }

            // Draw statistics
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px monospace';
            ctx.textAlign = 'left';
            const totalSamples = this.distribution.reduce((a, b) => a + b, 0);
            ctx.fillText(`Samples: ${totalSamples}`, 10, 20);
            
            for (let i = 0; i < 4; i++) {
                const binStart = Math.floor((i / 4) * this.bins);
                const binEnd = Math.floor(((i + 1) / 4) * this.bins);
                const count = this.distribution.slice(binStart, binEnd).reduce((a, b) => a + b, 0);
                const expected = (weights[i] / total) * totalSamples;
                const error = Math.abs(count - expected) / expected * 100;
                ctx.fillText(`Option ${i + 1}: ${count} (expected: ${expected.toFixed(1)}, error: ${error.toFixed(1)}%)`, 10, 40 + i * 20);
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
    <title>Probability & Randomness - Generated Code</title>
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
    <h1>Probability & Randomness - Weighted RNG</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        <div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="${seed}"></label>
            <button onclick="reset()">Reset</button>
        </div>
        <div class="control-group">
            <label>Weight 1: <span id="weight1Value">${params.weight1 || 10}</span></label>
            <input type="range" id="weight1" min="0" max="100" step="1" value="${params.weight1 || 10}" oninput="updateWeight1(this.value)">
        </div>
        <div class="control-group">
            <label>Weight 2: <span id="weight2Value">${params.weight2 || 20}</span></label>
            <input type="range" id="weight2" min="0" max="100" step="1" value="${params.weight2 || 20}" oninput="updateWeight2(this.value)">
        </div>
        <div class="control-group">
            <label>Weight 3: <span id="weight3Value">${params.weight3 || 30}</span></label>
            <input type="range" id="weight3" min="0" max="100" step="1" value="${params.weight3 || 30}" oninput="updateWeight3(this.value)">
        </div>
        <div class="control-group">
            <label>Weight 4: <span id="weight4Value">${params.weight4 || 40}</span></label>
            <input type="range" id="weight4" min="0" max="100" step="1" value="${params.weight4 || 40}" oninput="updateWeight4(this.value)">
        </div>
        <div class="control-group">
            <label>Samples per Frame: <span id="samplesValue">${params.samples || 10}</span></label>
            <input type="range" id="samples" min="1" max="100" step="1" value="${params.samples || 10}" oninput="updateSamples(this.value)">
        </div>
    </div>

    <script>
        class SeededRandom {
            constructor(seed) { this.seed = seed; }
            random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const bins = 4;
        let distribution = new Array(bins).fill(0);
        let history = [];
        let random = new SeededRandom(${seed});
        let params = {
            weight1: ${params.weight1 || 10},
            weight2: ${params.weight2 || 20},
            weight3: ${params.weight3 || 30},
            weight4: ${params.weight4 || 40},
            samples: ${params.samples || 10}
        };

        function weightedRandom() {
            const weights = [params.weight1, params.weight2, params.weight3, params.weight4];
            const total = weights.reduce((a, b) => a + b, 0);
            if (total === 0) return 0;
            let r = random.random() * total;
            for (let i = 0; i < weights.length; i++) {
                r -= weights[i];
                if (r <= 0) return i;
            }
            return bins - 1;
        }

        function reset() {
            random = new SeededRandom(parseInt(document.getElementById('seed').value) || ${seed});
            distribution = new Array(bins).fill(0);
            history = [];
        }

        function update() {
            for (let i = 0; i < params.samples; i++) {
                const value = weightedRandom();
                distribution[value]++;
                history.push({
                    x: random.random() * canvas.width,
                    y: random.random() * canvas.height,
                    value: value
                });
                if (history.length > 1000) history.shift();
            }
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const maxDist = Math.max(...distribution, 1);
            const barWidth = canvas.width / bins;
            const colors = ['#4ade80', '#4a9eff', '#fbbf24', '#f87171'];

            for (let i = 0; i < bins; i++) {
                const height = (distribution[i] / maxDist) * canvas.height * 0.8;
                ctx.fillStyle = colors[i] || '#ffffff';
                ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 2, height);

                ctx.fillStyle = '#ffffff';
                ctx.font = '16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(\`\${distribution[i]}\`, i * barWidth + barWidth / 2, canvas.height - height - 10);
            }

            const pointColors = ['#4ade80', '#4a9eff', '#fbbf24', '#f87171'];
            for (const point of history.slice(-500)) {
                ctx.fillStyle = pointColors[point.value] || '#ffffff';
                ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
            }
        }

        function animate() {
            update();
            render();
            requestAnimationFrame(animate);
        }

        function updateWeight1(val) { params.weight1 = parseInt(val); document.getElementById('weight1Value').textContent = val; reset(); }
        function updateWeight2(val) { params.weight2 = parseInt(val); document.getElementById('weight2Value').textContent = val; reset(); }
        function updateWeight3(val) { params.weight3 = parseInt(val); document.getElementById('weight3Value').textContent = val; reset(); }
        function updateWeight4(val) { params.weight4 = parseInt(val); document.getElementById('weight4Value').textContent = val; reset(); }
        function updateSamples(val) { params.samples = parseInt(val); document.getElementById('samplesValue').textContent = val; }

        reset();
        animate();
    </script>
</body>
</html>`;
    }
}

