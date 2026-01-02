/**
 * Code Generator Utility
 * Generates complete, runnable code for demos with current settings
 */

export class CodeGenerator {
    static generateNoiseTerrain(framework, demo) {
        const params = framework.getParams();
        const seed = framework.getSeed();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Noise & Terrain - Generated Code</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #0a0a0a;
            color: #e0e0e0;
            font-family: monospace;
        }
        canvas {
            border: 1px solid #333;
            display: block;
            margin: 20px auto;
        }
        .controls {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #1a1a1a;
            border-radius: 8px;
        }
        .control-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #4a9eff;
        }
        input[type="range"] {
            width: 100%;
        }
        input[type="number"] {
            width: 100px;
            padding: 5px;
            background: #2a2a2a;
            border: 1px solid #333;
            color: #e0e0e0;
        }
        button {
            padding: 10px 20px;
            background: #4a9eff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <h1>Noise & Terrain Visualizer</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        <div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="${seed}"></label>
            <button onclick="regenerate()">Regenerate</button>
        </div>
        <div class="control-group">
            <label>Noise Scale: <span id="scaleValue">${params.scale || 0.1}</span></label>
            <input type="range" id="scale" min="0.01" max="0.5" step="0.01" value="${params.scale || 0.1}" oninput="updateScale(this.value)">
        </div>
        <div class="control-group">
            <label>Octaves: <span id="octavesValue">${params.octaves || 4}</span></label>
            <input type="range" id="octaves" min="1" max="8" step="1" value="${params.octaves || 4}" oninput="updateOctaves(this.value)">
        </div>
        <div class="control-group">
            <label>Persistence: <span id="persistenceValue">${params.persistence || 0.5}</span></label>
            <input type="range" id="persistence" min="0.1" max="1.0" step="0.1" value="${params.persistence || 0.5}" oninput="updatePersistence(this.value)">
        </div>
        <div class="control-group">
            <label>Height Scale: <span id="heightScaleValue">${params.heightScale || 100}</span></label>
            <input type="range" id="heightScale" min="0" max="200" step="1" value="${params.heightScale || 100}" oninput="updateHeightScale(this.value)">
        </div>
        <div class="control-group">
            <label>Sea Level: <span id="seaLevelValue">${params.seaLevel || 128}</span></label>
            <input type="range" id="seaLevel" min="0" max="255" step="1" value="${params.seaLevel || 128}" oninput="updateSeaLevel(this.value)">
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="useColor" ${params.useColor !== false ? 'checked' : ''} onchange="updateUseColor(this.checked)"> Colored Terrain</label>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="view3d" ${params.view3d ? 'checked' : ''} onchange="updateView3d(this.checked)"> 3D View</label>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showFlow" ${params.showFlow ? 'checked' : ''} onchange="updateShowFlow(this.checked)"> Show Flow Field</label>
        </div>
    </div>

    <script>
        // Seeded Random
        class SeededRandom {
            constructor(seed) {
                this.seed = seed;
            }
            random() {
                this.seed = (this.seed * 9301 + 49297) % 233280;
                return this.seed / 233280;
            }
        }

        // Perlin Noise
        class PerlinNoise {
            constructor(seed = 0) {
                this.random = new SeededRandom(seed);
                this.permutation = [];
                this.p = [];
                for (let i = 0; i < 256; i++) this.p[i] = i;
                for (let i = 255; i > 0; i--) {
                    const j = Math.floor(this.random.random() * (i + 1));
                    [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
                }
                for (let i = 0; i < 512; i++) {
                    this.permutation[i] = this.p[i & 255];
                }
            }
            fade(t) {
                return t * t * t * (t * (t * 6 - 15) + 10);
            }
            lerp(a, b, t) {
                return a + t * (b - a);
            }
            grad(hash, x, y) {
                const h = hash & 15;
                const u = h < 8 ? x : y;
                const v = h < 4 ? y : (h === 12 || h === 14 ? x : 0);
                return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
            }
            noise(x, y) {
                const X = Math.floor(x) & 255;
                const Y = Math.floor(y) & 255;
                x -= Math.floor(x);
                y -= Math.floor(y);
                const u = this.fade(x);
                const v = this.fade(y);
                const A = this.permutation[X] + Y;
                const AA = this.permutation[A];
                const AB = this.permutation[A + 1];
                const B = this.permutation[X + 1] + Y;
                const BA = this.permutation[B];
                const BB = this.permutation[B + 1];
                return this.lerp(
                    this.lerp(
                        this.grad(this.permutation[AA], x, y),
                        this.grad(this.permutation[BA], x - 1, y),
                        u
                    ),
                    this.lerp(
                        this.grad(this.permutation[AB], x, y - 1),
                        this.grad(this.permutation[BB], x - 1, y - 1),
                        u
                    ),
                    v
                );
            }
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let noise = new PerlinNoise(${seed});
        let heightmap = [];
        let params = {
            scale: ${params.scale || 0.1},
            octaves: ${params.octaves || 4},
            persistence: ${params.persistence || 0.5},
            heightScale: ${params.heightScale || 100},
            seaLevel: ${params.seaLevel || 128},
            useColor: ${params.useColor !== false},
            view3d: ${params.view3d || false},
            showFlow: ${params.showFlow || false}
        };

        function generateHeightmap() {
            heightmap = [];
            for (let y = 0; y < canvas.height; y++) {
                heightmap[y] = [];
                for (let x = 0; x < canvas.width; x++) {
                    let value = 0;
                    let amplitude = 1;
                    let frequency = params.scale;
                    let maxValue = 0;
                    for (let i = 0; i < params.octaves; i++) {
                        value += noise.noise(x * frequency, y * frequency) * amplitude;
                        maxValue += amplitude;
                        amplitude *= params.persistence;
                        frequency *= 2;
                    }
                    heightmap[y][x] = Math.floor((value / maxValue + 1) * 127.5);
                }
            }
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (params.view3d) {
                render3D();
            } else if (params.showFlow) {
                renderFlowField();
            } else {
                renderHeightmap();
            }
        }

        function renderHeightmap() {
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            const data = imageData.data;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    const h = heightmap[y][x];
                    if (params.useColor) {
                        if (h < params.seaLevel * 0.3) {
                            data[idx] = 0; data[idx + 1] = 50; data[idx + 2] = 100;
                        } else if (h < params.seaLevel * 0.6) {
                            data[idx] = 0; data[idx + 1] = 100; data[idx + 2] = 150;
                        } else if (h < params.seaLevel * 0.8) {
                            data[idx] = 194; data[idx + 1] = 178; data[idx + 2] = 128;
                        } else if (h < params.seaLevel * 1.2) {
                            data[idx] = 34; data[idx + 1] = 139; data[idx + 2] = 34;
                        } else if (h < params.seaLevel * 1.5) {
                            data[idx] = 128; data[idx + 1] = 128; data[idx + 2] = 128;
                        } else {
                            data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255;
                        }
                    } else {
                        data[idx] = data[idx + 1] = data[idx + 2] = h;
                    }
                    data[idx + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }

        function render3D() {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const cellSize = 4;
            const cols = Math.floor(canvas.width / cellSize);
            const rows = Math.floor(canvas.height / cellSize);
            const angle = Math.PI / 6;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = col * cellSize;
                    const y = row * cellSize;
                    const h = heightmap[Math.floor(y)][Math.floor(x)];
                    const z = ((h - params.seaLevel) / 255) * params.heightScale;
                    const px = (x - y) * cos + canvas.width / 2;
                    const py = (x + y) * sin - z + canvas.height / 2;
                    let color;
                    if (h < params.seaLevel * 0.3) color = '#003264';
                    else if (h < params.seaLevel * 0.6) color = '#0066cc';
                    else if (h < params.seaLevel * 0.8) color = '#c2b280';
                    else if (h < params.seaLevel * 1.2) color = '#228b22';
                    else if (h < params.seaLevel * 1.5) color = '#808080';
                    else color = '#ffffff';
                    ctx.fillStyle = color;
                    ctx.fillRect(px - cellSize / 2, py - cellSize / 2, cellSize, cellSize);
                }
            }
        }

        function renderFlowField() {
            renderHeightmap();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            const step = 20;
            for (let y = step; y < canvas.height - step; y += step) {
                for (let x = step; x < canvas.width - step; x += step) {
                    const h1 = heightmap[y][x];
                    const h2 = heightmap[Math.min(y + 1, canvas.height - 1)][x];
                    const h3 = heightmap[y][Math.min(x + 1, canvas.width - 1)];
                    const dx = (h3 - h1) / 255;
                    const dy = (h2 - h1) / 255;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len > 0.01) {
                        const nx = dx / len;
                        const ny = dy / len;
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + nx * 10, y + ny * 10);
                        ctx.stroke();
                    }
                }
            }
        }

        function regenerate() {
            const seed = parseInt(document.getElementById('seed').value) || 0;
            noise = new PerlinNoise(seed);
            generateHeightmap();
            render();
        }

        function updateScale(val) {
            params.scale = parseFloat(val);
            document.getElementById('scaleValue').textContent = val;
            generateHeightmap();
            render();
        }

        function updateOctaves(val) {
            params.octaves = parseInt(val);
            document.getElementById('octavesValue').textContent = val;
            generateHeightmap();
            render();
        }

        function updatePersistence(val) {
            params.persistence = parseFloat(val);
            document.getElementById('persistenceValue').textContent = val;
            generateHeightmap();
            render();
        }

        function updateHeightScale(val) {
            params.heightScale = parseInt(val);
            document.getElementById('heightScaleValue').textContent = val;
            render();
        }

        function updateSeaLevel(val) {
            params.seaLevel = parseInt(val);
            document.getElementById('seaLevelValue').textContent = val;
            render();
        }

        function updateUseColor(val) {
            params.useColor = val;
            render();
        }

        function updateView3d(val) {
            params.view3d = val;
            render();
        }

        function updateShowFlow(val) {
            params.showFlow = val;
            render();
        }

        generateHeightmap();
        render();
    </script>
</body>
</html>`;
    }
}

