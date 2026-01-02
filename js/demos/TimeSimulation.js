/**
 * Time & Simulation Visualizer
 * Fixed vs variable timestep comparison with complex physics simulation
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

class Particle {
    constructor(x, y, vx, vy, radius, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
        this.trail = [];
        this.maxTrailLength = 20;
    }

    update(dt, gravity, bounce, width, height) {
        // Update velocity
        this.vy += gravity * dt;

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Bounce off walls
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -bounce;
        }
        if (this.x + this.radius > width) {
            this.x = width - this.radius;
            this.vx *= -bounce;
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -bounce;
        }
        if (this.y + this.radius > height) {
            this.y = height - this.radius;
            this.vy *= -bounce;
        }

        // Add to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    draw(ctx, showTrail = false) {
        // Draw trail
        if (showTrail && this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Draw particle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

export class TimeSimulation {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.fixedParticles = [];
        this.variableParticles = [];
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedTimestep = 1 / 60; // 60 FPS
        this.desyncTime = 0;
        this.frameCount = 0;
        this.fps = 60;

        this.init();
    }

    init() {
        // Controls
        this.framework.addToggle('useFixed', 'Use Fixed Timestep', true);
        this.framework.addToggle('showTrails', 'Show Trails', true);
        this.framework.addToggle('showDesync', 'Show Desync Visualization', true);
        this.framework.addSlider('timestep', 'Fixed Timestep (ms)', 1, 100, 16.67, 0.1);
        this.framework.addSlider('gravity', 'Gravity', 0, 1000, 500, 10);
        this.framework.addSlider('bounce', 'Bounce Damping', 0, 1, 0.8, 0.1);
        this.framework.addSlider('numParticles', 'Number of Particles', 5, 30, 15, 1);

        this.framework.on('onShowCode', () => {
            const code = this.generateCode();
            this.framework.showCodeView(code);
        });
        this.framework.on('onSeedChange', (seed) => this.regenerate(seed));
        this.framework.on('onReset', () => this.regenerate(this.framework.getSeed()));
        this.framework.on('onParamChange', (name) => {
            if (name === 'numParticles') {
                this.regenerate(this.framework.getSeed());
            }
        });

        this.regenerate(this.framework.getSeed());
        this.render();

        // Animation loop
        let lastTime = performance.now();
        const animate = () => {
            const currentTime = performance.now();
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            
            // Calculate FPS
            this.frameCount++;
            if (this.frameCount % 60 === 0) {
                this.fps = Math.round(1 / deltaTime);
            }

            this.update(currentTime / 1000);
            this.render();
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    regenerate(seed) {
        const random = new SeededRandom(seed);
        const params = this.framework.getParams();
        const numParticles = Math.floor(params.numParticles || 15);
        const halfWidth = this.canvas.width / 2;

        this.fixedParticles = [];
        this.variableParticles = [];
        this.lastTime = performance.now() / 1000;
        this.accumulator = 0;
        this.desyncTime = 0;

        const colors = [
            '#4ade80', '#4a9eff', '#fbbf24', '#f87171', '#a78bfa',
            '#fb7185', '#34d399', '#60a5fa', '#f472b6', '#818cf8'
        ];

        for (let i = 0; i < numParticles; i++) {
            const x = 50 + (i % 5) * 60;
            const y = 50 + Math.floor(i / 5) * 80;
            const vx = (random.random() - 0.5) * 200;
            const vy = random.random() * 100;
            const radius = 8 + random.random() * 7;
            const color = colors[i % colors.length];

            this.fixedParticles.push(new Particle(x, y, vx, vy, radius, color));
            this.variableParticles.push(new Particle(x, y, vx, vy, radius, color));
        }
    }

    update(currentTime) {
        const params = this.framework.getParams();
        const useFixed = params.useFixed !== false;
        const timestep = (params.timestep || 16.67) / 1000;
        const gravity = (params.gravity || 500) / 1000;
        const bounce = params.bounce || 0.8;
        const halfWidth = this.canvas.width / 2;

        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            return;
        }

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (useFixed) {
            // Fixed timestep with accumulator
            this.accumulator += deltaTime;
            const fixedDt = timestep;

            while (this.accumulator >= fixedDt) {
                for (const particle of this.fixedParticles) {
                    particle.update(fixedDt, gravity, bounce, halfWidth, this.canvas.height);
                }
                this.accumulator -= fixedDt;
            }

            // Update variable timestep for comparison
            for (const particle of this.variableParticles) {
                particle.update(deltaTime, gravity, bounce, halfWidth, this.canvas.height);
            }

            // Calculate desync
            if (params.showDesync) {
                let totalDesync = 0;
                for (let i = 0; i < this.fixedParticles.length; i++) {
                    const dx = this.variableParticles[i].x - this.fixedParticles[i].x;
                    const dy = this.variableParticles[i].y - this.fixedParticles[i].y;
                    totalDesync += Math.sqrt(dx * dx + dy * dy);
                }
                this.desyncTime = totalDesync / this.fixedParticles.length;
            }
        } else {
            // Variable timestep only
            for (const particle of this.variableParticles) {
                particle.update(deltaTime, gravity, bounce, this.canvas.width, this.canvas.height);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const params = this.framework.getParams();
        const useFixed = params.useFixed !== false;
        const showTrails = params.showTrails !== false;
        const showDesync = params.showDesync !== false;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw divider
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.canvas.width / 2, 0);
        ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        ctx.stroke();

        // Draw labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(useFixed ? 'Fixed Timestep' : 'Variable Timestep', this.canvas.width / 4, 25);
        ctx.fillText(useFixed ? 'Variable Timestep (comparison)' : 'Variable Timestep', this.canvas.width * 3 / 4, 25);

        // Draw FPS and info
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${this.fps}`, 10, this.canvas.height - 60);
        
        if (useFixed) {
            ctx.fillText(`Timestep: ${(params.timestep || 16.67).toFixed(2)}ms`, 10, this.canvas.height - 40);
            ctx.fillText(`Accumulator: ${this.accumulator.toFixed(4)}s`, 10, this.canvas.height - 20);
            
            if (showDesync) {
                ctx.textAlign = 'right';
                ctx.fillStyle = this.desyncTime > 5 ? '#f87171' : '#4ade80';
                ctx.fillText(`Desync: ${this.desyncTime.toFixed(2)}px`, this.canvas.width - 10, this.canvas.height - 20);
            }
        }

        const halfWidth = this.canvas.width / 2;

        // Draw fixed timestep particles (left side)
        if (useFixed) {
            for (const particle of this.fixedParticles) {
                particle.draw(ctx, showTrails);
            }

            // Draw variable timestep particles (right side, offset)
            ctx.save();
            ctx.translate(halfWidth, 0);
            for (let i = 0; i < this.variableParticles.length; i++) {
                const particle = this.variableParticles[i];
                const fixedParticle = this.fixedParticles[i];
                
                // Draw desync indicator
                if (showDesync) {
                    const dx = particle.x - fixedParticle.x;
                    const dy = particle.y - fixedParticle.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 2) {
                        ctx.strokeStyle = 'rgba(248, 113, 113, 0.5)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([2, 2]);
                        ctx.beginPath();
                        ctx.moveTo(fixedParticle.x, fixedParticle.y);
                        ctx.lineTo(particle.x, particle.y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
                
                // Draw with slight transparency to show difference
                ctx.globalAlpha = 0.7;
                particle.draw(ctx, showTrails);
                ctx.globalAlpha = 1.0;
            }
            ctx.restore();
        } else {
            // Variable timestep only - draw on both sides
            for (const particle of this.variableParticles) {
                particle.draw(ctx, showTrails);
            }
            
            ctx.save();
            ctx.translate(halfWidth, 0);
            for (const particle of this.variableParticles) {
                particle.draw(ctx, showTrails);
            }
            ctx.restore();
        }

        // Draw desync heatmap overlay
        if (useFixed && showDesync && this.desyncTime > 0) {
            ctx.fillStyle = `rgba(248, 113, 113, ${Math.min(0.3, this.desyncTime / 50)})`;
            ctx.fillRect(halfWidth, 0, halfWidth, this.canvas.height);
        }
    }

    generateCode() {
        const params = this.framework.getParams();
        const seed = this.framework.getSeed();
        const numParticles = Math.floor(params.numParticles || 15);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Time & Simulation - Generated Code</title>
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
    <h1>Time & Simulation - Fixed vs Variable Timestep</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        <div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="${seed}"></label>
            <button onclick="regenerate()">Regenerate</button>
        </div>
        <div class="control-group">
            <label>Number of Particles: <span id="numParticlesValue">${numParticles}</span></label>
            <input type="range" id="numParticles" min="5" max="30" step="1" value="${numParticles}" oninput="updateNumParticles(this.value)">
        </div>
        <div class="control-group">
            <label>Gravity: <span id="gravityValue">${params.gravity || 500}</span></label>
            <input type="range" id="gravity" min="0" max="1000" step="10" value="${params.gravity || 500}" oninput="updateGravity(this.value)">
        </div>
        <div class="control-group">
            <label>Bounce Damping: <span id="bounceValue">${params.bounce || 0.8}</span></label>
            <input type="range" id="bounce" min="0" max="1" step="0.1" value="${params.bounce || 0.8}" oninput="updateBounce(this.value)">
        </div>
        <div class="control-group">
            <label>Fixed Timestep (ms): <span id="timestepValue">${params.timestep || 16.67}</span></label>
            <input type="range" id="timestep" min="1" max="100" step="0.1" value="${params.timestep || 16.67}" oninput="updateTimestep(this.value)">
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showTrails" ${params.showTrails !== false ? 'checked' : ''} onchange="updateShowTrails(this.checked)"> Show Trails</label>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showDesync" ${params.showDesync !== false ? 'checked' : ''} onchange="updateShowDesync(this.checked)"> Show Desync Visualization</label>
        </div>
        <div class="control-group">
            <label>FPS: <span id="fps">60</span></label>
        </div>
    </div>

    <script>
        class SeededRandom {
            constructor(seed) { this.seed = seed; }
            random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        }

        class Particle {
            constructor(x, y, vx, vy) {
                this.x = x; this.y = y; this.vx = vx; this.vy = vy;
                this.trail = [];
            }
            update(dt, gravity, bounce, width, height) {
                this.vy += gravity * dt;
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                if (this.x < 0 || this.x > width) { this.vx *= -bounce; this.x = Math.max(0, Math.min(width, this.x)); }
                if (this.y < 0 || this.y > height) { this.vy *= -bounce; this.y = Math.max(0, Math.min(height, this.y)); }
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 20) this.trail.shift();
            }
            draw(ctx, showTrail) {
                if (showTrail) {
                    ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let i = 0; i < this.trail.length - 1; i++) {
                        ctx.moveTo(this.trail[i].x, this.trail[i].y);
                        ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
                    }
                    ctx.stroke();
                }
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const halfWidth = canvas.width / 2;
        let fixedParticles = [];
        let variableParticles = [];
        let accumulator = 0;
        let lastTime = performance.now();
        let fps = 60;
        let params = {
            numParticles: ${numParticles},
            gravity: ${params.gravity || 500},
            bounce: ${params.bounce || 0.8},
            timestep: ${params.timestep || 16.67},
            showTrails: ${params.showTrails !== false},
            showDesync: ${params.showDesync !== false}
        };

        function regenerate() {
            const random = new SeededRandom(parseInt(document.getElementById('seed').value) || ${seed});
            fixedParticles = [];
            variableParticles = [];
            for (let i = 0; i < params.numParticles; i++) {
                const x = random.random() * halfWidth;
                const y = random.random() * canvas.height;
                const vx = (random.random() - 0.5) * 200;
                const vy = (random.random() - 0.5) * 200;
                fixedParticles.push(new Particle(x, y, vx, vy));
                variableParticles.push(new Particle(x + halfWidth, y, vx, vy));
            }
        }

        function update() {
            const currentTime = performance.now();
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;
            fps = 1 / deltaTime;
            document.getElementById('fps').textContent = Math.round(fps);

            const fixedDt = params.timestep / 1000;
            accumulator += deltaTime;
            while (accumulator >= fixedDt) {
                for (const particle of fixedParticles) {
                    particle.update(fixedDt, params.gravity, params.bounce, halfWidth, canvas.height);
                }
                accumulator -= fixedDt;
            }

            for (const particle of variableParticles) {
                particle.update(deltaTime, params.gravity, params.bounce, halfWidth, canvas.height);
            }
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(halfWidth, 0);
            ctx.lineTo(halfWidth, canvas.height);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Fixed Timestep', halfWidth / 2, 20);
            ctx.fillText('Variable Timestep', halfWidth + halfWidth / 2, 20);

            ctx.save();
            ctx.translate(0, 0);
            for (const particle of fixedParticles) {
                particle.draw(ctx, params.showTrails);
            }
            ctx.restore();

            ctx.save();
            ctx.translate(halfWidth, 0);
            for (const particle of variableParticles) {
                particle.draw(ctx, params.showTrails);
            }
            ctx.restore();
        }

        function animate() {
            update();
            render();
            requestAnimationFrame(animate);
        }

        function updateNumParticles(val) { params.numParticles = parseInt(val); document.getElementById('numParticlesValue').textContent = val; regenerate(); }
        function updateGravity(val) { params.gravity = parseInt(val); document.getElementById('gravityValue').textContent = val; }
        function updateBounce(val) { params.bounce = parseFloat(val); document.getElementById('bounceValue').textContent = val; }
        function updateTimestep(val) { params.timestep = parseFloat(val); document.getElementById('timestepValue').textContent = val; }
        function updateShowTrails(val) { params.showTrails = val; }
        function updateShowDesync(val) { params.showDesync = val; }

        regenerate();
        animate();
    </script>
</body>
</html>`;
    }
}
