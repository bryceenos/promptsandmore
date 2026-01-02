/**
 * Agent-Based Systems - Boids
 * Flocking behavior with force vectors
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

export class Boids {
    constructor(framework) {
        this.framework = framework;
        this.ctx = framework.getContext();
        this.canvas = framework.getCanvas();
        this.boids = [];
        this.numBoids = 50;

        this.init();
    }

    init() {
        // Controls
        this.framework.addSlider('numBoids', 'Number of Boids', 10, 200, 50, 10);
        this.framework.addSlider('alignment', 'Alignment Force', 0, 2, 1, 0.1);
        this.framework.addSlider('cohesion', 'Cohesion Force', 0, 2, 1, 0.1);
        this.framework.addSlider('separation', 'Separation Force', 0, 2, 1.5, 0.1);
        this.framework.addSlider('perceptionRadius', 'Perception Radius', 10, 200, 50, 5);
        this.framework.addSlider('maxSpeed', 'Max Speed', 1, 10, 3, 0.5);
        this.framework.addSlider('maxForce', 'Max Force', 0.1, 2, 0.5, 0.1);
        this.framework.addToggle('showPerception', 'Show Perception Cones', false);
        this.framework.addToggle('showForces', 'Show Force Vectors', false);

        this.framework.on('onSeedChange', (seed) => this.regenerate(seed));
        this.framework.on('onParamChange', (name) => {
            if (name === 'numBoids') {
                this.regenerate(this.framework.getSeed());
            }
        });
        this.framework.on('onReset', () => this.regenerate(this.framework.getSeed()));
        this.framework.on('onShowCode', () => {
            const code = this.generateCode();
            this.framework.showCodeView(code);
        });

        this.regenerate(this.framework.getSeed());
        this.render();

        // Animation loop
        this.framework.startAnimation(() => {
            if (!this.framework.isPaused) {
                this.update();
                this.render();
            }
        });
    }

    regenerate(seed) {
        const random = new SeededRandom(seed);
        const params = this.framework.getParams();
        this.numBoids = Math.floor(params.numBoids || 50);

        this.boids = [];
        for (let i = 0; i < this.numBoids; i++) {
            this.boids.push({
                x: random.random() * this.canvas.width,
                y: random.random() * this.canvas.height,
                vx: (random.random() - 0.5) * 2,
                vy: (random.random() - 0.5) * 2,
                angle: random.random() * Math.PI * 2
            });
        }
    }

    distance(b1, b2) {
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getNeighbors(boid) {
        const params = this.framework.getParams();
        const radius = params.perceptionRadius || 50;
        const neighbors = [];

        for (const other of this.boids) {
            if (other === boid) continue;
            const dist = this.distance(boid, other);
            if (dist < radius) {
                neighbors.push(other);
            }
        }

        return neighbors;
    }

    align(boid, neighbors) {
        if (neighbors.length === 0) return { x: 0, y: 0 };

        let avgVx = 0, avgVy = 0;
        for (const neighbor of neighbors) {
            avgVx += neighbor.vx;
            avgVy += neighbor.vy;
        }
        avgVx /= neighbors.length;
        avgVy /= neighbors.length;

        const mag = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
        if (mag > 0) {
            avgVx = (avgVx / mag) * (this.framework.getParams().maxSpeed || 3);
            avgVy = (avgVy / mag) * (this.framework.getParams().maxSpeed || 3);
        }

        return {
            x: avgVx - boid.vx,
            y: avgVy - boid.vy
        };
    }

    cohesion(boid, neighbors) {
        if (neighbors.length === 0) return { x: 0, y: 0 };

        let avgX = 0, avgY = 0;
        for (const neighbor of neighbors) {
            avgX += neighbor.x;
            avgY += neighbor.y;
        }
        avgX /= neighbors.length;
        avgY /= neighbors.length;

        const dx = avgX - boid.x;
        const dy = avgY - boid.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        
        if (mag > 0) {
            const maxSpeed = this.framework.getParams().maxSpeed || 3;
            return {
                x: (dx / mag) * maxSpeed - boid.vx,
                y: (dy / mag) * maxSpeed - boid.vy
            };
        }

        return { x: 0, y: 0 };
    }

    separation(boid, neighbors) {
        if (neighbors.length === 0) return { x: 0, y: 0 };

        let steerX = 0, steerY = 0;
        for (const neighbor of neighbors) {
            const dx = boid.x - neighbor.x;
            const dy = boid.y - neighbor.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                steerX += dx / (dist * dist);
                steerY += dy / (dist * dist);
            }
        }

        const mag = Math.sqrt(steerX * steerX + steerY * steerY);
        if (mag > 0) {
            const maxSpeed = this.framework.getParams().maxSpeed || 3;
            steerX = (steerX / mag) * maxSpeed;
            steerY = (steerY / mag) * maxSpeed;
            return {
                x: steerX - boid.vx,
                y: steerY - boid.vy
            };
        }

        return { x: 0, y: 0 };
    }

    limit(vector, max) {
        const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (mag > max && mag > 0) {
            return {
                x: (vector.x / mag) * max,
                y: (vector.y / mag) * max
            };
        }
        return vector;
    }

    update() {
        const params = this.framework.getParams();
        const maxForce = params.maxForce || 0.5;
        const maxSpeed = params.maxSpeed || 3;

        for (const boid of this.boids) {
            const neighbors = this.getNeighbors(boid);

            const alignForce = this.align(boid, neighbors);
            const cohesionForce = this.cohesion(boid, neighbors);
            const separationForce = this.separation(boid, neighbors);

            // Apply forces with weights
            let accelX = alignForce.x * (params.alignment || 1) +
                        cohesionForce.x * (params.cohesion || 1) +
                        separationForce.x * (params.separation || 1.5);
            let accelY = alignForce.y * (params.alignment || 1) +
                        cohesionForce.y * (params.cohesion || 1) +
                        separationForce.y * (params.separation || 1.5);

            const accel = this.limit({ x: accelX, y: accelY }, maxForce);
            boid.vx += accel.x;
            boid.vy += accel.y;

            const vel = this.limit({ x: boid.vx, y: boid.vy }, maxSpeed);
            boid.vx = vel.x;
            boid.vy = vel.y;

            boid.x += boid.vx;
            boid.y += boid.vy;

            // Wrap around edges
            if (boid.x < 0) boid.x = this.canvas.width;
            if (boid.x > this.canvas.width) boid.x = 0;
            if (boid.y < 0) boid.y = this.canvas.height;
            if (boid.y > this.canvas.height) boid.y = 0;

            boid.angle = Math.atan2(boid.vy, boid.vx);
        }
    }

    render() {
        const ctx = this.ctx;
        const params = this.framework.getParams();
        const showPerception = params.showPerception || false;
        const showForces = params.showForces || false;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const boid of this.boids) {
            const neighbors = this.getNeighbors(boid);

            // Draw perception radius
            if (showPerception) {
                ctx.strokeStyle = 'rgba(74, 158, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(boid.x, boid.y, params.perceptionRadius || 50, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw force vectors
            if (showForces && neighbors.length > 0) {
                const alignForce = this.align(boid, neighbors);
                const cohesionForce = this.cohesion(boid, neighbors);
                const separationForce = this.separation(boid, neighbors);

                ctx.strokeStyle = '#4ade80';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(boid.x, boid.y);
                ctx.lineTo(boid.x + alignForce.x * 10, boid.y + alignForce.y * 10);
                ctx.stroke();

                ctx.strokeStyle = '#4a9eff';
                ctx.beginPath();
                ctx.moveTo(boid.x, boid.y);
                ctx.lineTo(boid.x + cohesionForce.x * 10, boid.y + cohesionForce.y * 10);
                ctx.stroke();

                ctx.strokeStyle = '#f87171';
                ctx.beginPath();
                ctx.moveTo(boid.x, boid.y);
                ctx.lineTo(boid.x + separationForce.x * 10, boid.y + separationForce.y * 10);
                ctx.stroke();
            }

            // Draw boid
            ctx.save();
            ctx.translate(boid.x, boid.y);
            ctx.rotate(boid.angle);

            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-6, 4);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#4a9eff';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }
    }

    generateCode() {
        const params = this.framework.getParams();
        const seed = this.framework.getSeed();
        const numBoids = Math.floor(params.numBoids || 50);
        return \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boids - Generated Code</title>
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
    <h1>Boids - Flocking Simulation</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        <div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="\${seed}"></label>
            <button onclick="regenerate()">Regenerate</button>
        </div>
        <div class="control-group">
            <label>Number of Boids: <span id="numBoidsValue">\${numBoids}</span></label>
            <input type="range" id="numBoids" min="10" max="200" step="10" value="\${numBoids}" oninput="updateNumBoids(this.value)">
        </div>
        <div class="control-group">
            <label>Alignment Force: <span id="alignmentValue">\${params.alignment || 1}</span></label>
            <input type="range" id="alignment" min="0" max="2" step="0.1" value="\${params.alignment || 1}" oninput="updateAlignment(this.value)">
        </div>
        <div class="control-group">
            <label>Cohesion Force: <span id="cohesionValue">\${params.cohesion || 1}</span></label>
            <input type="range" id="cohesion" min="0" max="2" step="0.1" value="\${params.cohesion || 1}" oninput="updateCohesion(this.value)">
        </div>
        <div class="control-group">
            <label>Separation Force: <span id="separationValue">\${params.separation || 1.5}</span></label>
            <input type="range" id="separation" min="0" max="2" step="0.1" value="\${params.separation || 1.5}" oninput="updateSeparation(this.value)">
        </div>
        <div class="control-group">
            <label>Perception Radius: <span id="perceptionRadiusValue">\${params.perceptionRadius || 50}</span></label>
            <input type="range" id="perceptionRadius" min="10" max="200" step="5" value="\${params.perceptionRadius || 50}" oninput="updatePerceptionRadius(this.value)">
        </div>
        <div class="control-group">
            <label>Max Speed: <span id="maxSpeedValue">\${params.maxSpeed || 3}</span></label>
            <input type="range" id="maxSpeed" min="1" max="10" step="0.5" value="\${params.maxSpeed || 3}" oninput="updateMaxSpeed(this.value)">
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showPerception" \${params.showPerception ? 'checked' : ''} onchange="updateShowPerception(this.checked)"> Show Perception Cones</label>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="showForces" \${params.showForces ? 'checked' : ''} onchange="updateShowForces(this.checked)"> Show Force Vectors</label>
        </div>
    </div>

    <script>
        class SeededRandom {
            constructor(seed) { this.seed = seed; }
            random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        }

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let boids = [];
        let params = {
            numBoids: \${numBoids},
            alignment: \${params.alignment || 1},
            cohesion: \${params.cohesion || 1},
            separation: \${params.separation || 1.5},
            perceptionRadius: \${params.perceptionRadius || 50},
            maxSpeed: \${params.maxSpeed || 3},
            maxForce: \${params.maxForce || 0.5},
            showPerception: \${params.showPerception || false},
            showForces: \${params.showForces || false}
        };

        function regenerate() {
            const random = new SeededRandom(parseInt(document.getElementById('seed').value) || \${seed});
            boids = [];
            for (let i = 0; i < params.numBoids; i++) {
                boids.push({
                    x: random.random() * canvas.width,
                    y: random.random() * canvas.height,
                    vx: (random.random() - 0.5) * 2,
                    vy: (random.random() - 0.5) * 2,
                    angle: random.random() * Math.PI * 2
                });
            }
        }

        function distance(b1, b2) {
            const dx = b2.x - b1.x, dy = b2.y - b1.y;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function getNeighbors(boid) {
            const neighbors = [];
            for (const other of boids) {
                if (other === boid) continue;
                if (distance(boid, other) < params.perceptionRadius) {
                    neighbors.push(other);
                }
            }
            return neighbors;
        }

        function align(boid, neighbors) {
            if (neighbors.length === 0) return { x: 0, y: 0 };
            let avgVx = 0, avgVy = 0;
            for (const neighbor of neighbors) {
                avgVx += neighbor.vx;
                avgVy += neighbor.vy;
            }
            avgVx /= neighbors.length;
            avgVy /= neighbors.length;
            const mag = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
            if (mag > 0) {
                avgVx = (avgVx / mag) * params.maxSpeed;
                avgVy = (avgVy / mag) * params.maxSpeed;
            }
            return { x: avgVx - boid.vx, y: avgVy - boid.vy };
        }

        function cohesion(boid, neighbors) {
            if (neighbors.length === 0) return { x: 0, y: 0 };
            let avgX = 0, avgY = 0;
            for (const neighbor of neighbors) {
                avgX += neighbor.x;
                avgY += neighbor.y;
            }
            avgX /= neighbors.length;
            avgY /= neighbors.length;
            const dx = avgX - boid.x, dy = avgY - boid.y;
            const mag = Math.sqrt(dx * dx + dy * dy);
            if (mag > 0) {
                return { x: (dx / mag) * params.maxSpeed - boid.vx, y: (dy / mag) * params.maxSpeed - boid.vy };
            }
            return { x: 0, y: 0 };
        }

        function separation(boid, neighbors) {
            if (neighbors.length === 0) return { x: 0, y: 0 };
            let steerX = 0, steerY = 0;
            for (const neighbor of neighbors) {
                const dx = boid.x - neighbor.x, dy = boid.y - neighbor.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    steerX += dx / (dist * dist);
                    steerY += dy / (dist * dist);
                }
            }
            const mag = Math.sqrt(steerX * steerX + steerY * steerY);
            if (mag > 0) {
                steerX = (steerX / mag) * params.maxSpeed;
                steerY = (steerY / mag) * params.maxSpeed;
                return { x: steerX - boid.vx, y: steerY - boid.vy };
            }
            return { x: 0, y: 0 };
        }

        function limit(vector, max) {
            const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
            if (mag > max && mag > 0) {
                return { x: (vector.x / mag) * max, y: (vector.y / mag) * max };
            }
            return vector;
        }

        function update() {
            for (const boid of boids) {
                const neighbors = getNeighbors(boid);
                const alignForce = align(boid, neighbors);
                const cohesionForce = cohesion(boid, neighbors);
                const separationForce = separation(boid, neighbors);
                let accelX = alignForce.x * params.alignment + cohesionForce.x * params.cohesion + separationForce.x * params.separation;
                let accelY = alignForce.y * params.alignment + cohesionForce.y * params.cohesion + separationForce.y * params.separation;
                const accel = limit({ x: accelX, y: accelY }, params.maxForce);
                boid.vx += accel.x;
                boid.vy += accel.y;
                const vel = limit({ x: boid.vx, y: boid.vy }, params.maxSpeed);
                boid.vx = vel.x;
                boid.vy = vel.y;
                boid.x += boid.vx;
                boid.y += boid.vy;
                if (boid.x < 0) boid.x = canvas.width;
                if (boid.x > canvas.width) boid.x = 0;
                if (boid.y < 0) boid.y = canvas.height;
                if (boid.y > canvas.height) boid.y = 0;
                boid.angle = Math.atan2(boid.vy, boid.vx);
            }
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (const boid of boids) {
                if (params.showPerception) {
                    ctx.strokeStyle = 'rgba(74, 158, 255, 0.2)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(boid.x, boid.y, params.perceptionRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                const neighbors = getNeighbors(boid);
                if (params.showForces && neighbors.length > 0) {
                    const alignForce = align(boid, neighbors);
                    const cohesionForce = cohesion(boid, neighbors);
                    const separationForce = separation(boid, neighbors);
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(boid.x, boid.y);
                    ctx.lineTo(boid.x + alignForce.x * 10, boid.y + alignForce.y * 10);
                    ctx.stroke();
                    ctx.strokeStyle = '#4a9eff';
                    ctx.beginPath();
                    ctx.moveTo(boid.x, boid.y);
                    ctx.lineTo(boid.x + cohesionForce.x * 10, boid.y + cohesionForce.y * 10);
                    ctx.stroke();
                    ctx.strokeStyle = '#f87171';
                    ctx.beginPath();
                    ctx.moveTo(boid.x, boid.y);
                    ctx.lineTo(boid.x + separationForce.x * 10, boid.y + separationForce.y * 10);
                    ctx.stroke();
                }

                ctx.save();
                ctx.translate(boid.x, boid.y);
                ctx.rotate(boid.angle);
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(-6, -4);
                ctx.lineTo(-6, 4);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#4a9eff';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }

        function animate() {
            update();
            render();
            requestAnimationFrame(animate);
        }

        function updateNumBoids(val) { params.numBoids = parseInt(val); document.getElementById('numBoidsValue').textContent = val; regenerate(); }
        function updateAlignment(val) { params.alignment = parseFloat(val); document.getElementById('alignmentValue').textContent = val; }
        function updateCohesion(val) { params.cohesion = parseFloat(val); document.getElementById('cohesionValue').textContent = val; }
        function updateSeparation(val) { params.separation = parseFloat(val); document.getElementById('separationValue').textContent = val; }
        function updatePerceptionRadius(val) { params.perceptionRadius = parseInt(val); document.getElementById('perceptionRadiusValue').textContent = val; }
        function updateMaxSpeed(val) { params.maxSpeed = parseFloat(val); document.getElementById('maxSpeedValue').textContent = val; }
        function updateShowPerception(val) { params.showPerception = val; }
        function updateShowForces(val) { params.showForces = val; }

        regenerate();
        animate();
    </script>
</body>
</html>\`;
    }
}

