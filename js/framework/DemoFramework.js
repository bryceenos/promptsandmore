/**
 * Reusable Demo Framework
 * Provides standardized controls and canvas management for all demos
 */
export class DemoFramework {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            showControls: options.showControls !== false,
            showSeed: options.showSeed !== false,
            showPause: options.showPause !== false,
            showStep: options.showStep !== false,
            showReset: options.showReset !== false,
            ...options
        };

        this.params = {};
        this.callbacks = {};
        this.isPaused = false;
        this.animationId = null;
        this.seed = Math.floor(Math.random() * 1000000);

        this.init();
    }

    init() {
        this.createCanvas();
        if (this.options.showControls) {
            this.createControls();
        }
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
    }

    createControls() {
        const controlsPanel = document.createElement('div');
        controlsPanel.className = 'controls-panel';
        controlsPanel.id = 'controls-panel';

        // Seed control
        if (this.options.showSeed) {
            const seedGroup = this.createControlGroup('Random Seed');
            const seedContainer = document.createElement('div');
            seedContainer.style.display = 'flex';
            seedContainer.style.gap = '0.5rem';
            seedContainer.style.alignItems = 'center';
            
            const seedInput = document.createElement('input');
            seedInput.type = 'number';
            seedInput.value = this.seed;
            seedInput.min = 0;
            seedInput.max = 9999999;
            seedInput.style.flex = '1';
            seedInput.addEventListener('input', (e) => {
                this.setSeed(parseInt(e.target.value) || 0);
            });
            
            const randomizeBtn = document.createElement('button');
            randomizeBtn.textContent = 'Randomize';
            randomizeBtn.className = 'control-buttons';
            randomizeBtn.style.flex = '0 0 auto';
            randomizeBtn.style.padding = '0.5rem 1rem';
            randomizeBtn.addEventListener('click', () => {
                const newSeed = Math.floor(Math.random() * 1000000);
                this.setSeed(newSeed);
            });
            
            seedContainer.appendChild(seedInput);
            seedContainer.appendChild(randomizeBtn);
            seedGroup.appendChild(seedContainer);
            controlsPanel.appendChild(seedGroup);
            
            // Store seed input reference for external updates
            this.seedInput = seedInput;
        }

        // Control buttons
        if (this.options.showPause || this.options.showStep || this.options.showReset) {
            const buttonGroup = this.createControlGroup('Simulation');
            const buttons = document.createElement('div');
            buttons.className = 'control-buttons';

            if (this.options.showPause) {
                const pauseBtn = document.createElement('button');
                pauseBtn.textContent = 'Pause';
                pauseBtn.addEventListener('click', () => this.togglePause());
                buttons.appendChild(pauseBtn);
                this.pauseButton = pauseBtn;
            }

            if (this.options.showStep) {
                const stepBtn = document.createElement('button');
                stepBtn.textContent = 'Step';
                stepBtn.addEventListener('click', () => this.step());
                buttons.appendChild(stepBtn);
            }

            if (this.options.showReset) {
                const resetBtn = document.createElement('button');
                resetBtn.textContent = 'Reset';
                resetBtn.addEventListener('click', () => this.reset());
                buttons.appendChild(resetBtn);
            }

            buttonGroup.appendChild(buttons);
            controlsPanel.appendChild(buttonGroup);
        }

        // Store controls panel reference
        this.controlsPanel = controlsPanel;
        
        // Add Show Code button
        if (this.options.showCode !== false) {
            const codeGroup = this.createControlGroup('Code');
            const codeButton = document.createElement('button');
            codeButton.textContent = 'Show Code';
            codeButton.className = 'control-buttons';
            codeButton.style.width = '100%';
            codeButton.addEventListener('click', () => {
                if (this.codeContainer && this.codeContainer.style.display !== 'none') {
                    this.hideCodeView();
                } else {
                    if (this.callbacks.onShowCode) {
                        this.callbacks.onShowCode();
                    }
                }
            });
            codeGroup.appendChild(codeButton);
            controlsPanel.appendChild(codeGroup);
            this.codeButton = codeButton;
        }
    }

    createControlGroup(title) {
        const group = document.createElement('div');
        group.className = 'control-group';
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        group.appendChild(titleEl);

        return group;
    }

    addSlider(name, label, min, max, value, step = 1) {
        if (!this.controlsPanel) return;

        const group = this.createControlGroup(label || name);
        const item = document.createElement('div');
        item.className = 'control-item';

        const labelEl = document.createElement('label');
        labelEl.textContent = `${label || name}: ${value}`;
        item.appendChild(labelEl);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = value;
        slider.step = step;
        
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.params[name] = val;
            labelEl.textContent = `${label || name}: ${val.toFixed(2)}`;
            if (this.callbacks.onParamChange) {
                this.callbacks.onParamChange(name, val);
            }
        });

        item.appendChild(slider);
        group.appendChild(item);
        this.controlsPanel.appendChild(group);

        this.params[name] = value;
        return slider;
    }

    addToggle(name, label, value = false) {
        if (!this.controlsPanel) return;

        const group = this.createControlGroup(label || name);
        const item = document.createElement('div');
        item.className = 'control-item';

        const labelEl = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        
        checkbox.addEventListener('change', (e) => {
            this.params[name] = e.target.checked;
            if (this.callbacks.onParamChange) {
                this.callbacks.onParamChange(name, e.target.checked);
            }
        });

        labelEl.appendChild(checkbox);
        labelEl.appendChild(document.createTextNode(` ${label || name}`));
        item.appendChild(labelEl);
        group.appendChild(item);
        this.controlsPanel.appendChild(group);

        this.params[name] = value;
        return checkbox;
    }

    addInput(name, label, value, type = 'text') {
        if (!this.controlsPanel) return;

        const group = this.createControlGroup(label || name);
        const item = document.createElement('div');
        item.className = 'control-item';

        const labelEl = document.createElement('label');
        labelEl.textContent = label || name;
        item.appendChild(labelEl);

        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        
        input.addEventListener('input', (e) => {
            this.params[name] = e.target.value;
            if (this.callbacks.onParamChange) {
                this.callbacks.onParamChange(name, e.target.value);
            }
        });

        item.appendChild(input);
        group.appendChild(item);
        this.controlsPanel.appendChild(group);

        this.params[name] = value;
        return input;
    }

    setSeed(seed) {
        this.seed = seed;
        if (this.seedInput) {
            this.seedInput.value = seed;
        }
        if (this.callbacks.onSeedChange) {
            this.callbacks.onSeedChange(seed);
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.pauseButton) {
            this.pauseButton.textContent = this.isPaused ? 'Resume' : 'Pause';
            this.pauseButton.classList.toggle('active', this.isPaused);
        }
        if (this.callbacks.onPause) {
            this.callbacks.onPause(this.isPaused);
        }
    }

    step() {
        if (this.callbacks.onStep) {
            this.callbacks.onStep();
        }
    }

    reset() {
        this.isPaused = false;
        if (this.pauseButton) {
            this.pauseButton.textContent = 'Pause';
            this.pauseButton.classList.remove('active');
        }
        if (this.callbacks.onReset) {
            this.callbacks.onReset();
        }
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }
    
    showCodeView(code) {
        // Hide canvas
        this.canvas.style.display = 'none';
        
        // Create code editor container
        if (!this.codeContainer) {
            this.codeContainer = document.createElement('div');
            this.codeContainer.id = 'code-container';
            this.codeContainer.style.cssText = `
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 600px;
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 4px;
                overflow: hidden;
            `;
            
            // Button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                padding: 10px;
                background: #2a2a2a;
                border-bottom: 1px solid #333;
                z-index: 10;
                display: flex;
                gap: 10px;
            `;
            
            // Copy button
            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy All';
            copyButton.style.cssText = `
                padding: 8px 16px;
                background: #4a9eff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;
            copyButton.addEventListener('click', () => {
                this.codeTextarea.select();
                document.execCommand('copy');
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy All';
                }, 2000);
            });
            buttonContainer.appendChild(copyButton);
            
            // Close button
            const closeButton = document.createElement('button');
            closeButton.textContent = 'Close';
            closeButton.style.cssText = `
                padding: 8px 16px;
                background: #666;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                margin-left: auto;
            `;
            closeButton.addEventListener('click', () => {
                this.hideCodeView();
            });
            buttonContainer.appendChild(closeButton);
            this.codeContainer.appendChild(buttonContainer);
            
            // Textarea
            this.codeTextarea = document.createElement('textarea');
            this.codeTextarea.style.cssText = `
                width: 100%;
                height: 100%;
                padding: 60px 20px 20px 20px;
                background: #1a1a1a;
                color: #e0e0e0;
                border: none;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.6;
                resize: none;
                outline: none;
                box-sizing: border-box;
            `;
            this.codeTextarea.readOnly = true;
            this.codeContainer.appendChild(this.codeTextarea);
            
            this.container.appendChild(this.codeContainer);
        }
        
        this.codeTextarea.value = code;
        this.codeContainer.style.display = 'block';
        if (this.codeButton) {
            this.codeButton.textContent = 'Hide Code';
        }
    }
    
    hideCodeView() {
        if (this.codeContainer) {
            this.codeContainer.style.display = 'none';
        }
        this.canvas.style.display = 'block';
        if (this.codeButton) {
            this.codeButton.textContent = 'Show Code';
        }
    }

    startAnimation(updateFn) {
        const animate = () => {
            if (!this.isPaused) {
                updateFn();
            }
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    getContext() {
        return this.ctx;
    }

    getCanvas() {
        return this.canvas;
    }

    getParams() {
        return this.params;
    }

    getSeed() {
        return this.seed;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

