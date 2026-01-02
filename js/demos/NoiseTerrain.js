/**
 * Noise & Terrain Visualizer
 * Demonstrates Perlin/Simplex noise with heightmap and 3D terrain visualization
 */

// Simple seeded random number generator
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

// Simplified Perlin noise implementation
class PerlinNoise {
    constructor(seed = 0) {
        this.random = new SeededRandom(seed);
        this.permutation = [];
        this.p = [];
        
        // Generate permutation table
        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }
        
        // Shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(this.random.random() * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }
        
        // Duplicate permutation
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

    octaveNoise(x, y, octaves = 4, persistence = 0.5, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return value / maxValue;
    }
}

export class NoiseTerrain {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.noise = null;
        this.heightmap = null;
        this.viewMode = 'heightmap'; // 'heightmap', '3d', 'flow'
        
        this.init();
    }

    init() {
        // Add view mode toggle
        this.framework.addToggle('view3d', '3D View', false);
        this.framework.addToggle('showFlow', 'Show Flow Field', false);
        
        // Noise parameters
        this.framework.addSlider('scale', 'Noise Scale', 0.01, 0.5, 0.1, 0.01);
        this.framework.addSlider('octaves', 'Octaves', 1, 8, 4, 1);
        this.framework.addSlider('persistence', 'Persistence', 0.1, 1.0, 0.5, 0.1);
        this.framework.addSlider('lacunarity', 'Lacunarity', 1.0, 4.0, 2.0, 0.1);
        
        // Terrain parameters
        this.framework.addSlider('heightScale', 'Height Scale', 0, 200, 100, 1);
        this.framework.addSlider('seaLevel', 'Sea Level', 0, 255, 128, 1);
        
        // Color parameters
        this.framework.addToggle('useColor', 'Colored Terrain', true);
        this.framework.addSlider('colorIntensity', 'Color Intensity', 0, 2, 1, 0.1);

        // Setup callbacks
        this.framework.on('onSeedChange', (seed) => {
            this.regenerate(seed);
            this.render();
        });
        this.framework.on('onParamChange', () => {
            this.generateHeightmap();
            this.render();
        });
        this.framework.on('onReset', () => {
            this.regenerate(this.framework.getSeed());
            this.render();
        });
        this.framework.on('onShowCode', () => {
            const code = this.generateCode();
            this.framework.showCodeView(code);
        });

        // Initial generation
        this.regenerate(this.framework.getSeed());
        this.render();
    }

    generateCode() {
        const params = this.framework.getParams();
        const seed = this.framework.getSeed();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Noise & Terrain - Generated Code</title>
    <style>
        body { margin: 0; padding: 20px; background: #0a0a0a; color: #e0e0e0; font-family: monospace; }
        canvas { border: 1px solid #333; display: block; margin: 20px auto; }
        .controls { max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a1a; border-radius: 8px; }
        .control-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; color: #4a9eff; }
        input[type="range"] { width: 100%; }
        input[type="number"] { width: 100px; padding: 5px; background: #2a2a2a; border: 1px solid #333; color: #e0e0e0; }
        button { padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
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
            <label>Lacunarity: <span id="lacunarityValue">${params.lacunarity || 2.0}</span></label>
            <input type="range" id="lacunarity" min="1.0" max="4.0" step="0.1" value="${params.lacunarity || 2.0}" oninput="updateLacunarity(this.value)">
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
        class SeededRandom {
            constructor(seed) { this.seed = seed; }
            random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        }

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
                for (let i = 0; i < 512; i++) this.permutation[i] = this.p[i & 255];
            }
            fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
            lerp(a, b, t) { return a + t * (b - a); }
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
                    this.lerp(this.grad(this.permutation[AA], x, y), this.grad(this.permutation[BA], x - 1, y), u),
                    this.lerp(this.grad(this.permutation[AB], x, y - 1), this.grad(this.permutation[BB], x - 1, y - 1), u),
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
            lacunarity: ${params.lacunarity || 2.0},
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
                    let value = 0, amplitude = 1, frequency = params.scale, maxValue = 0;
                    for (let i = 0; i < params.octaves; i++) {
                        value += noise.noise(x * frequency, y * frequency) * amplitude;
                        maxValue += amplitude;
                        amplitude *= params.persistence;
                        frequency *= params.lacunarity;
                    }
                    heightmap[y][x] = Math.floor((value / maxValue + 1) * 127.5);
                }
            }
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (params.view3d) render3D();
            else if (params.showFlow) renderFlowField();
            else renderHeightmap();
        }

        function renderHeightmap() {
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            const data = imageData.data;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    const h = heightmap[y][x];
                    if (params.useColor) {
                        if (h < params.seaLevel * 0.3) { data[idx] = 0; data[idx + 1] = 50; data[idx + 2] = 100; }
                        else if (h < params.seaLevel * 0.6) { data[idx] = 0; data[idx + 1] = 100; data[idx + 2] = 150; }
                        else if (h < params.seaLevel * 0.8) { data[idx] = 194; data[idx + 1] = 178; data[idx + 2] = 128; }
                        else if (h < params.seaLevel * 1.2) { data[idx] = 34; data[idx + 1] = 139; data[idx + 2] = 34; }
                        else if (h < params.seaLevel * 1.5) { data[idx] = 128; data[idx + 1] = 128; data[idx + 2] = 128; }
                        else { data[idx] = 255; data[idx + 1] = 255; data[idx + 2] = 255; }
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
            const cellSize = 4, cols = Math.floor(canvas.width / cellSize), rows = Math.floor(canvas.height / cellSize);
            const angle = Math.PI / 6, cos = Math.cos(angle), sin = Math.sin(angle);
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = col * cellSize, y = row * cellSize;
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
                    const dx = (h3 - h1) / 255, dy = (h2 - h1) / 255;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len > 0.01) {
                        const nx = dx / len, ny = dy / len;
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

        function updateScale(val) { params.scale = parseFloat(val); document.getElementById('scaleValue').textContent = val; generateHeightmap(); render(); }
        function updateOctaves(val) { params.octaves = parseInt(val); document.getElementById('octavesValue').textContent = val; generateHeightmap(); render(); }
        function updatePersistence(val) { params.persistence = parseFloat(val); document.getElementById('persistenceValue').textContent = val; generateHeightmap(); render(); }
        function updateLacunarity(val) { params.lacunarity = parseFloat(val); document.getElementById('lacunarityValue').textContent = val; generateHeightmap(); render(); }
        function updateHeightScale(val) { params.heightScale = parseInt(val); document.getElementById('heightScaleValue').textContent = val; render(); }
        function updateSeaLevel(val) { params.seaLevel = parseInt(val); document.getElementById('seaLevelValue').textContent = val; render(); }
        function updateUseColor(val) { params.useColor = val; render(); }
        function updateView3d(val) { params.view3d = val; render(); }
        function updateShowFlow(val) { params.showFlow = val; render(); }

        generateHeightmap();
        render();
    </script>
</body>
</html>`;
    }

    regenerate(seed) {
        this.noise = new PerlinNoise(seed);
        this.generateHeightmap();
    }

    generateHeightmap() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const params = this.framework.getParams();
        
        this.heightmap = new Array(height);
        for (let y = 0; y < height; y++) {
            this.heightmap[y] = new Array(width);
            for (let x = 0; x < width; x++) {
                const scale = params.scale || 0.1;
                const octaves = Math.floor(params.octaves || 4);
                const persistence = params.persistence || 0.5;
                
                let value = 0;
                let amplitude = 1;
                let frequency = scale;
                let maxValue = 0;

                for (let i = 0; i < octaves; i++) {
                    value += this.noise.noise(x * frequency, y * frequency) * amplitude;
                    maxValue += amplitude;
                    amplitude *= persistence;
                    frequency *= (params.lacunarity || 2.0);
                }

                value = value / maxValue;
                // Normalize to 0-255
                this.heightmap[y][x] = Math.floor((value + 1) * 127.5);
            }
        }
    }


    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const params = this.framework.getParams();
        const show3d = params.view3d || false;
        const showFlow = params.showFlow || false;
        const useColor = params.useColor !== false;

        ctx.clearRect(0, 0, width, height);

        if (show3d) {
            this.render3D();
        } else if (showFlow) {
            this.renderFlowField();
        } else {
            this.renderHeightmap(useColor);
        }
    }

    renderHeightmap(useColor) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const params = this.framework.getParams();
        const seaLevel = params.seaLevel || 128;

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const h = this.heightmap[y][x];

                if (useColor) {
                    // Terrain coloring: deep water -> shallow water -> sand -> grass -> rock -> snow
                    if (h < seaLevel * 0.3) {
                        // Deep water
                        data[idx] = 0;
                        data[idx + 1] = 50;
                        data[idx + 2] = 100;
                    } else if (h < seaLevel * 0.6) {
                        // Shallow water
                        data[idx] = 0;
                        data[idx + 1] = 100;
                        data[idx + 2] = 150;
                    } else if (h < seaLevel * 0.8) {
                        // Sand
                        data[idx] = 194;
                        data[idx + 1] = 178;
                        data[idx + 2] = 128;
                    } else if (h < seaLevel * 1.2) {
                        // Grass
                        data[idx] = 34;
                        data[idx + 1] = 139;
                        data[idx + 2] = 34;
                    } else if (h < seaLevel * 1.5) {
                        // Rock
                        data[idx] = 128;
                        data[idx + 1] = 128;
                        data[idx + 2] = 128;
                    } else {
                        // Snow
                        data[idx] = 255;
                        data[idx + 1] = 255;
                        data[idx + 2] = 255;
                    }
                } else {
                    // Grayscale
                    data[idx] = h;
                    data[idx + 1] = h;
                    data[idx + 2] = h;
                }
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    render3D() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const params = this.framework.getParams();
        const heightScale = params.heightScale || 100;
        const seaLevel = params.seaLevel || 128;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, width, height);

        const cellSize = 4;
        const cols = Math.floor(width / cellSize);
        const rows = Math.floor(height / cellSize);

        // Simple isometric projection
        const angle = Math.PI / 6;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * cellSize;
                const y = row * cellSize;
                const h = this.heightmap[Math.floor(y)][Math.floor(x)];
                const z = ((h - seaLevel) / 255) * heightScale;

                // Project to isometric
                const px = (x - y) * cos + width / 2;
                const py = (x + y) * sin - z + height / 2;

                // Color based on height
                let color;
                if (h < seaLevel * 0.3) {
                    color = '#003264';
                } else if (h < seaLevel * 0.6) {
                    color = '#0066cc';
                } else if (h < seaLevel * 0.8) {
                    color = '#c2b280';
                } else if (h < seaLevel * 1.2) {
                    color = '#228b22';
                } else if (h < seaLevel * 1.5) {
                    color = '#808080';
                } else {
                    color = '#ffffff';
                }

                ctx.fillStyle = color;
                ctx.fillRect(px - cellSize / 2, py - cellSize / 2, cellSize, cellSize);
            }
        }
    }

    renderFlowField() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // First render heightmap as background
        this.renderHeightmap(true);

        // Overlay flow vectors
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        const step = 20;
        for (let y = step; y < height - step; y += step) {
            for (let x = step; x < width - step; x += step) {
                const h1 = this.heightmap[y][x];
                const h2 = this.heightmap[Math.min(y + 1, height - 1)][x];
                const h3 = this.heightmap[y][Math.min(x + 1, width - 1)];

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
}

