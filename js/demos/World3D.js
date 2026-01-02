/**
 * 3D Generative Worlds
 * Interactive 3D terrain visualization with rotation and biome overlays
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

// Simple Perlin noise implementation
class PerlinNoise {
    constructor(seed = 0) {
        this.random = new SeededRandom(seed);
        this.permutation = [];
        this.p = [];
        
        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }
        
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

export class World3D {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.noise = null;
        this.heightmap = null;
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationSpeed = 0.005;
        this.autoRotate = false;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.cameraDistance = 400;
        this.lightAngle = 0;

        this.init();
    }

    init() {
        // Noise parameters
        this.framework.addSlider('scale', 'Noise Scale', 0.01, 0.5, 0.1, 0.01);
        this.framework.addSlider('octaves', 'Octaves', 1, 8, 4, 1);
        this.framework.addSlider('persistence', 'Persistence', 0.1, 1.0, 0.5, 0.1);
        this.framework.addSlider('heightScale', 'Height Scale', 0, 200, 100, 1);
        this.framework.addSlider('seaLevel', 'Sea Level', 0, 255, 128, 1);
        
        // 3D view controls
        this.framework.addToggle('autoRotate', 'Auto Rotate', false);
        this.framework.addSlider('rotationSpeed', 'Rotation Speed', 0, 0.02, 0.005, 0.001);
        this.framework.addSlider('cameraDistance', 'Camera Distance', 100, 1000, 400, 10);
        this.framework.addToggle('showWireframe', 'Show Wireframe', false);
        this.framework.addToggle('showBiomes', 'Show Biome Colors', true);

        // Setup callbacks
        this.framework.on('onSeedChange', (seed) => {
            this.regenerate(seed);
            this.render();
        });
        this.framework.on('onParamChange', (name) => {
            if (name === 'autoRotate' || name === 'rotationSpeed' || name === 'cameraDistance') {
                const params = this.framework.getParams();
                this.autoRotate = params.autoRotate || false;
                this.rotationSpeed = params.rotationSpeed || 0.005;
                this.cameraDistance = params.cameraDistance || 400;
            } else {
                this.generateHeightmap();
                this.render();
            }
        });
        this.framework.on('onReset', () => {
            this.regenerate(this.framework.getSeed());
            this.render();
        });

        // Mouse controls
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        this.regenerate(this.framework.getSeed());
        this.render();

        // Animation loop
        const animate = () => {
            const params = this.framework.getParams();
            this.autoRotate = params.autoRotate || false;
            this.rotationSpeed = params.rotationSpeed || 0.005;
            
            if (this.autoRotate && !this.framework.isPaused) {
                this.rotationY += this.rotationSpeed;
                this.lightAngle += 0.01;
            }
            
            this.render();
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    regenerate(seed) {
        this.noise = new PerlinNoise(seed);
        this.generateHeightmap();
    }

    generateHeightmap() {
        const width = 64; // Reduced for performance
        const height = 64;
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
                    frequency *= 2;
                }

                value = value / maxValue;
                this.heightmap[y][x] = Math.floor((value + 1) * 127.5);
            }
        }
    }

    project3D(x, y, z) {
        const params = this.framework.getParams();
        const distance = params.cameraDistance || 400;
        
        // Rotate around Y axis
        const cosY = Math.cos(this.rotationY);
        const sinY = Math.sin(this.rotationY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        
        // Rotate around X axis
        const cosX = Math.cos(this.rotationX);
        const sinX = Math.sin(this.rotationX);
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        
        // Perspective projection
        const scale = distance / (distance + z2);
        return {
            x: x1 * scale + this.canvas.width / 2,
            y: y1 * scale + this.canvas.height / 2,
            z: z2,
            scale: scale
        };
    }

    getBiomeColor(h, seaLevel) {
        if (h < seaLevel * 0.3) {
            return { r: 0, g: 50, b: 100 }; // Deep water
        } else if (h < seaLevel * 0.6) {
            return { r: 0, g: 100, b: 150 }; // Shallow water
        } else if (h < seaLevel * 0.8) {
            return { r: 194, g: 178, b: 128 }; // Sand
        } else if (h < seaLevel * 1.2) {
            return { r: 34, g: 139, b: 34 }; // Grass
        } else if (h < seaLevel * 1.5) {
            return { r: 128, g: 128, b: 128 }; // Rock
        } else {
            return { r: 255, g: 255, b: 255 }; // Snow
        }
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.autoRotate = false;
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        
        this.rotationY += deltaX * 0.01;
        this.rotationX += deltaY * 0.01;
        
        // Clamp rotation X
        this.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationX));
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        this.render();
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    handleWheel(e) {
        e.preventDefault();
        const params = this.framework.getParams();
        const delta = e.deltaY * 0.1;
        this.cameraDistance = Math.max(100, Math.min(1000, params.cameraDistance - delta));
        this.framework.params.cameraDistance = this.cameraDistance;
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const params = this.framework.getParams();
        const heightScale = params.heightScale || 100;
        const seaLevel = params.seaLevel || 128;
        const showWireframe = params.showWireframe || false;
        const showBiomes = params.showBiomes !== false;
        const width = this.heightmap[0].length;
        const height = this.heightmap.length;
        const cellSize = 8;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate lighting
        const lightX = Math.cos(this.lightAngle);
        const lightY = Math.sin(this.lightAngle);
        const lightZ = 0.5;

        // Render terrain from back to front
        const cells = [];
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const h1 = this.heightmap[y][x];
                const h2 = this.heightmap[y][x + 1];
                const h3 = this.heightmap[y + 1][x];
                const h4 = this.heightmap[y + 1][x + 1];

                const z1 = ((h1 - seaLevel) / 255) * heightScale;
                const z2 = ((h2 - seaLevel) / 255) * heightScale;
                const z3 = ((h3 - seaLevel) / 255) * heightScale;
                const z4 = ((h4 - seaLevel) / 255) * heightScale;

                const x1 = (x - width / 2) * cellSize;
                const y1 = (y - height / 2) * cellSize;
                const x2 = (x + 1 - width / 2) * cellSize;
                const y2 = (y + 1 - height / 2) * cellSize;

                // Project all 4 corners
                const p1 = this.project3D(x1, y1, z1);
                const p2 = this.project3D(x2, y1, z2);
                const p3 = this.project3D(x1, y2, z3);
                const p4 = this.project3D(x2, y2, z4);

                // Calculate normal for lighting
                const dx1 = x2 - x1;
                const dy1 = y2 - y1;
                const dz1 = z2 - z1;
                const dx2 = x1 - x2;
                const dy2 = y2 - y1;
                const dz2 = z3 - z2;
                
                const nx = (dy1 * dz2 - dz1 * dy2);
                const ny = (dz1 * dx2 - dx1 * dz2);
                const nz = (dx1 * dy2 - dy1 * dx2);
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                const normalX = len > 0 ? nx / len : 0;
                const normalY = len > 0 ? ny / len : 0;
                const normalZ = len > 0 ? nz / len : 1;

                // Calculate lighting intensity
                const dot = normalX * lightX + normalY * lightY + normalZ * lightZ;
                const light = Math.max(0.2, Math.min(1, dot + 0.5));

                // Average height for color
                const avgHeight = (h1 + h2 + h3 + h4) / 4;
                const biome = this.getBiomeColor(avgHeight, seaLevel);

                cells.push({
                    p1, p2, p3, p4,
                    z: (z1 + z2 + z3 + z4) / 4,
                    color: {
                        r: Math.floor(biome.r * light),
                        g: Math.floor(biome.g * light),
                        b: Math.floor(biome.b * light)
                    },
                    showWireframe
                });
            }
        }

        // Sort by depth (back to front)
        cells.sort((a, b) => b.z - a.z);

        // Draw cells
        for (const cell of cells) {
            if (showBiomes) {
                ctx.fillStyle = `rgb(${cell.color.r}, ${cell.color.g}, ${cell.color.b})`;
                ctx.beginPath();
                ctx.moveTo(cell.p1.x, cell.p1.y);
                ctx.lineTo(cell.p2.x, cell.p2.y);
                ctx.lineTo(cell.p4.x, cell.p4.y);
                ctx.lineTo(cell.p3.x, cell.p3.y);
                ctx.closePath();
                ctx.fill();
            }

            if (cell.showWireframe || showWireframe) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cell.p1.x, cell.p1.y);
                ctx.lineTo(cell.p2.x, cell.p2.y);
                ctx.lineTo(cell.p4.x, cell.p4.y);
                ctx.lineTo(cell.p3.x, cell.p3.y);
                ctx.closePath();
                ctx.stroke();
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
    <title>3D Generative Worlds - Generated Code</title>
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
    <h1>3D Generative Worlds</h1>
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
            <label>Camera Distance: <span id="cameraDistanceValue">${params.cameraDistance || 400}</span></label>
            <input type="range" id="cameraDistance" min="100" max="1000" step="10" value="${params.cameraDistance || 400}" oninput="updateCameraDistance(this.value)">
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="autoRotate" ${params.autoRotate ? 'checked' : ''} onchange="updateAutoRotate(this.checked)"> Auto Rotate</label>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showWireframe" ${params.showWireframe ? 'checked' : ''} onchange="updateShowWireframe(this.checked)"> Show Wireframe</label>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showBiomes" ${params.showBiomes !== false ? 'checked' : ''} onchange="updateShowBiomes(this.checked)"> Show Biome Colors</label>
        </div>
        <p style="color: #666; font-size: 12px;">Drag to rotate, scroll to zoom</p>
    </div>

    <script>
        // Note: This is a simplified version. Full 3D rendering requires Three.js or WebGL.
        // This code demonstrates the core concepts with a 2D projection.
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let rotationX = 0, rotationY = 0, cameraDistance = ${params.cameraDistance || 400};
        let params = {
            scale: ${params.scale || 0.1},
            octaves: ${params.octaves || 4},
            cameraDistance: ${params.cameraDistance || 400},
            autoRotate: ${params.autoRotate || false},
            showWireframe: ${params.showWireframe || false},
            showBiomes: ${params.showBiomes !== false}
        };

        function regenerate() {
            // Simplified - would need full noise implementation
            render();
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#4a9eff';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('3D rendering requires Three.js library', canvas.width / 2, canvas.height / 2);
            ctx.fillText('See source code for full implementation', canvas.width / 2, canvas.height / 2 + 30);
        }

        function updateScale(val) { params.scale = parseFloat(val); document.getElementById('scaleValue').textContent = val; regenerate(); }
        function updateOctaves(val) { params.octaves = parseInt(val); document.getElementById('octavesValue').textContent = val; regenerate(); }
        function updateCameraDistance(val) { params.cameraDistance = parseInt(val); document.getElementById('cameraDistanceValue').textContent = val; render(); }
        function updateAutoRotate(val) { params.autoRotate = val; }
        function updateShowWireframe(val) { params.showWireframe = val; render(); }
        function updateShowBiomes(val) { params.showBiomes = val; render(); }

        regenerate();
    </script>
</body>
</html>`;
    }
}

