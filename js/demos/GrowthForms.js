/**
 * Growth & Natural Forms Visualizer
 * L-systems with step-based growth and phyllotaxis patterns
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

export class GrowthForms {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.lsystem = {
            axiom: 'F',
            rules: { 'F': 'F[+F]F[-F]F' },
            angle: 25,
            length: 50,
            iterations: 0,
            maxIterations: 3
        };
        this.phyllotaxisPoints = [];
        this.mode = 'lsystem'; // 'lsystem' or 'phyllotaxis'

        this.init();
    }

    init() {
        // Mode selection
        this.framework.addToggle('showPhyllotaxis', 'Show Phyllotaxis', false);
        
        // L-system parameters
        this.framework.addSlider('iterations', 'L-system Iterations', 0, 5, 2, 1);
        this.framework.addSlider('angle', 'Branch Angle', 0, 90, 25, 1);
        this.framework.addSlider('length', 'Branch Length', 10, 100, 50, 1);
        this.framework.addSlider('thickness', 'Branch Thickness', 1, 10, 3, 1);
        
        // Phyllotaxis parameters
        this.framework.addSlider('phylloCount', 'Phyllotaxis Points', 50, 500, 200, 10);
        this.framework.addSlider('phylloAngle', 'Phyllotaxis Angle', 0, 360, 137.5, 0.1);
        this.framework.addSlider('phylloScale', 'Phyllotaxis Scale', 0.1, 2, 0.5, 0.1);

        this.framework.on('onParamChange', () => this.render());
        this.framework.on('onReset', () => this.render());
        this.framework.on('onStep', () => {
            const params = this.framework.getParams();
            if (params.iterations < 5) {
                this.framework.params.iterations = (params.iterations || 0) + 1;
                this.render();
            }
        });
        this.framework.on('onShowCode', () => {
            try {
                const code = this.generateCode();
                this.framework.showCodeView(code);
            } catch (error) {
                console.error('Error generating code:', error);
                alert('Error generating code. Check console for details.');
            }
        });

        this.render();
    }

    generateCode() {
        const params = this.framework.getParams();
        const seed = this.framework.getSeed();
        return this.generateLSystemCode(params, seed);
    }

    generateLSystemCode(params, seed) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Growth & Natural Forms - Generated Code</title>
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
    <h1>Growth & Natural Forms - L-systems & Phyllotaxis</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        <div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="${seed}"></label>
            <button onclick="regenerate()">Regenerate</button>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showPhyllotaxis" ${params.showPhyllotaxis ? 'checked' : ''} onchange="updateShowPhyllotaxis(this.checked)"> Show Phyllotaxis</label>
        </div>
        <div class="control-group">
            <label>L-system Iterations: <span id="iterationsValue">${params.iterations || 2}</span></label>
            <input type="range" id="iterations" min="0" max="5" step="1" value="${params.iterations || 2}" oninput="updateIterations(this.value)">
        </div>
        <div class="control-group">
            <label>Branch Angle: <span id="angleValue">${params.angle || 25}</span></label>
            <input type="range" id="angle" min="0" max="90" step="1" value="${params.angle || 25}" oninput="updateAngle(this.value)">
        </div>
        <div class="control-group">
            <label>Branch Length: <span id="lengthValue">${params.length || 50}</span></label>
            <input type="range" id="length" min="10" max="100" step="1" value="${params.length || 50}" oninput="updateLength(this.value)">
        </div>
        <div class="control-group">
            <label>Phyllotaxis Points: <span id="phylloCountValue">${params.phylloCount || 200}</span></label>
            <input type="range" id="phylloCount" min="50" max="500" step="10" value="${params.phylloCount || 200}" oninput="updatePhylloCount(this.value)">
        </div>
        <div class="control-group">
            <label>Phyllotaxis Angle: <span id="phylloAngleValue">${params.phylloAngle || 137.5}</span></label>
            <input type="range" id="phylloAngle" min="0" max="360" step="0.1" value="${params.phylloAngle || 137.5}" oninput="updatePhylloAngle(this.value)">
        </div>
    </div>

    <script>
        class SeededRandom {
            constructor(seed) { this.seed = seed; }
            random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let params = {
            showPhyllotaxis: ${params.showPhyllotaxis || false},
            iterations: ${params.iterations || 2},
            angle: ${params.angle || 25},
            length: ${params.length || 50},
            thickness: ${params.thickness || 3},
            phylloCount: ${params.phylloCount || 200},
            phylloAngle: ${params.phylloAngle || 137.5},
            phylloScale: ${params.phylloScale || 0.5}
        };

        function generateLSystem() {
            let current = 'F';
            const rules = { 'F': 'F[+F]F[-F]F' };
            for (let i = 0; i < params.iterations; i++) {
                let next = '';
                for (const char of current) {
                    next += rules[char] || char;
                }
                current = next;
            }
            return current;
        }

        function drawLSystem() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const command = generateLSystem();
            const angle = params.angle * Math.PI / 180;
            const length = params.length;
            const stack = [];
            let x = canvas.width / 2;
            let y = canvas.height;
            let currentAngle = -Math.PI / 2;
            let currentThickness = params.thickness;

            ctx.strokeStyle = '#4ade80';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (const char of command) {
                if (char === 'F') {
                    const newX = x + Math.cos(currentAngle) * length;
                    const newY = y + Math.sin(currentAngle) * length;
                    ctx.lineWidth = currentThickness;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(newX, newY);
                    ctx.stroke();
                    x = newX;
                    y = newY;
                    currentThickness *= 0.8;
                } else if (char === '+') {
                    currentAngle += angle;
                } else if (char === '-') {
                    currentAngle -= angle;
                } else if (char === '[') {
                    stack.push({ x, y, angle: currentAngle, thickness: currentThickness });
                } else if (char === ']') {
                    const state = stack.pop();
                    if (state) {
                        x = state.x;
                        y = state.y;
                        currentAngle = state.angle;
                        currentThickness = state.thickness;
                    }
                }
            }
        }

        function drawPhyllotaxis() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const angle = params.phylloAngle * Math.PI / 180;
            const scale = params.phylloScale;

            ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
            ctx.lineWidth = 1;
            const points = [];
            for (let i = 0; i < params.phylloCount; i++) {
                const r = scale * Math.sqrt(i);
                const theta = i * angle;
                const x = centerX + r * Math.cos(theta);
                const y = centerY + r * Math.sin(theta);
                points.push({ x, y });
                if (i > 0) {
                    ctx.beginPath();
                    ctx.moveTo(points[i - 1].x, points[i - 1].y);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            }

            ctx.fillStyle = '#4ade80';
            for (const point of points) {
                const size = 3 + (points.indexOf(point) / points.length) * 5;
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function render() {
            if (params.showPhyllotaxis) {
                drawPhyllotaxis();
            } else {
                drawLSystem();
            }
        }

        function regenerate() {
            render();
        }

        function updateShowPhyllotaxis(val) { params.showPhyllotaxis = val; render(); }
        function updateIterations(val) { params.iterations = parseInt(val); document.getElementById('iterationsValue').textContent = val; render(); }
        function updateAngle(val) { params.angle = parseInt(val); document.getElementById('angleValue').textContent = val; render(); }
        function updateLength(val) { params.length = parseInt(val); document.getElementById('lengthValue').textContent = val; render(); }
        function updateThickness(val) { params.thickness = parseInt(val); document.getElementById('thicknessValue').textContent = val; render(); }
        function updatePhylloCount(val) { params.phylloCount = parseInt(val); document.getElementById('phylloCountValue').textContent = val; render(); }
        function updatePhylloAngle(val) { params.phylloAngle = parseFloat(val); document.getElementById('phylloAngleValue').textContent = val; render(); }
        function updatePhylloScale(val) { params.phylloScale = parseFloat(val); document.getElementById('phylloScaleValue').textContent = val; render(); }

        render();
    </script>
</body>
</html>`;
    }
}

    generateLSystem() {
        const params = this.framework.getParams();
        let current = this.lsystem.axiom;
        const iterations = Math.floor(params.iterations || 0);
        const rules = this.lsystem.rules;

        for (let i = 0; i < iterations; i++) {
            let next = '';
            for (const char of current) {
                next += rules[char] || char;
            }
            current = next;
        }

        return current;
    }

    drawLSystem() {
        const ctx = this.ctx;
        const params = this.framework.getParams();
        const angle = (params.angle || 25) * Math.PI / 180;
        const length = params.length || 50;
        const thickness = params.thickness || 3;

        const command = this.generateLSystem();
        const stack = [];
        let x = this.canvas.width / 2;
        let y = this.canvas.height;
        let currentAngle = -Math.PI / 2; // Point up
        let currentThickness = thickness;

        ctx.strokeStyle = '#4ade80';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const char of command) {
            if (char === 'F') {
                // Draw forward
                const newX = x + Math.cos(currentAngle) * length;
                const newY = y + Math.sin(currentAngle) * length;

                ctx.lineWidth = currentThickness;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(newX, newY);
                ctx.stroke();

                x = newX;
                y = newY;
                currentThickness *= 0.8; // Branches get thinner
            } else if (char === '+') {
                // Turn right
                currentAngle += angle;
            } else if (char === '-') {
                // Turn left
                currentAngle -= angle;
            } else if (char === '[') {
                // Save state
                stack.push({ x, y, angle: currentAngle, thickness: currentThickness });
            } else if (char === ']') {
                // Restore state
                const state = stack.pop();
                if (state) {
                    x = state.x;
                    y = state.y;
                    currentAngle = state.angle;
                    currentThickness = state.thickness;
                }
            }
        }
    }

    generatePhyllotaxis() {
        const params = this.framework.getParams();
        const count = Math.floor(params.phylloCount || 200);
        const angle = (params.phylloAngle || 137.5) * Math.PI / 180;
        const scale = params.phylloScale || 0.5;

        this.phyllotaxisPoints = [];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        for (let i = 0; i < count; i++) {
            const r = scale * Math.sqrt(i);
            const theta = i * angle;
            const x = centerX + r * Math.cos(theta);
            const y = centerY + r * Math.sin(theta);
            this.phyllotaxisPoints.push({ x, y, index: i });
        }
    }

    drawPhyllotaxis() {
        const ctx = this.ctx;
        this.generatePhyllotaxis();

        // Draw connections
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < this.phyllotaxisPoints.length; i++) {
            const p1 = this.phyllotaxisPoints[i - 1];
            const p2 = this.phyllotaxisPoints[i];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        // Draw points
        ctx.fillStyle = '#4ade80';
        for (const point of this.phyllotaxisPoints) {
            const size = 3 + (point.index / this.phyllotaxisPoints.length) * 5;
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    render() {
        const ctx = this.ctx;
        const params = this.framework.getParams();
        const showPhyllotaxis = params.showPhyllotaxis || false;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (showPhyllotaxis) {
            this.drawPhyllotaxis();
        } else {
            this.drawLSystem();
        }
    }
}

