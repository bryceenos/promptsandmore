# promptsandmore.com

A free, open, developer-focused website dedicated to non-linear systems, procedural generation, and algorithm-driven game design, with a strong emphasis on live, interactive visualizers.

## Core Principles

- **Algorithms over content** - Understanding how systems work, not just what they produce
- **Systems over scripts** - Emergent behavior from simple rules
- **Emergence over linear design** - Non-linear, procedural approaches
- **Interactive over descriptive** - Touch parameters, see results immediately
- **Visualization over abstraction** - See algorithms in action
- **Creation over consumption** - Build, don't just browse
- **No monetization** - Free and open forever
- **No backend** - Everything runs client-side
- **No build step** - Pure HTML/CSS/JS, hostable on GitHub Pages/Netlify

## Tech Stack

- HTML / CSS / JavaScript
- Canvas + WebGL
- p5.js (for 2D visualizations)
- Three.js (for 3D demos)
- Modular ES modules
- Interactive controls (sliders, toggles, seed inputs, pause/step/reset)

## Project Structure

```
promptsandmore/
├── index.html              # Main landing page
├── css/
│   └── main.css           # Global styles
├── js/
│   ├── framework/
│   │   └── DemoFramework.js  # Reusable demo framework
│   └── demos/
│       └── NoiseTerrain.js   # Noise & terrain visualizer
└── demos/
    └── noise-fields.html  # Noise & Fields demo page
```

## System Categories

1. **Noise & Fields** - Perlin, Simplex, Voronoi, Flow fields, Terrain generation
2. **Spatial Partitioning** - Voronoi, Delaunay, Lloyd relaxation, Biome generation
3. **Growth & Natural Forms** - L-systems, Phyllotaxis, Procedural plants
4. **Constraint Systems** - Wave Function Collapse, Entropy visualization
5. **Emergent Simulation** - Cellular automata, Reaction-diffusion, Cave generation
6. **Agent-Based Systems** - Boids, Flow-field following, Predator/prey
7. **Probability & Randomness** - Weighted RNG, Poisson disk, Blue noise
8. **Graphs & Topology** - Pathfinding, MSTs, Quest graphs
9. **3D Generative Worlds** - Heightfields, Voxels, SDFs, Planetary generation
10. **Time & Simulation** - Fixed vs variable timestep, Event queues, Determinism

## Getting Started

**IMPORTANT:** This project uses ES6 modules, which require a web server. You cannot open the HTML files directly in a browser due to CORS restrictions.

### Quick Start (Recommended)

**Windows:**
```bash
# Double-click server.bat, or run:
python server.py
```

**Mac/Linux:**
```bash
# Make executable and run:
chmod +x server.sh
./server.sh

# Or directly:
python3 server.py
```

Then open your browser to: **http://localhost:8000**

### Alternative Server Options

If you prefer a different server:

```bash
# Python (built-in)
python -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

### Why a Server is Required

ES6 modules (`import`/`export`) require HTTP/HTTPS protocol. Opening files directly with `file://` protocol causes CORS errors. This is a browser security feature, not a bug in the code.

## Demo Framework

The `DemoFramework` class provides a standardized interface for all demos:

- Canvas management
- Parameter controls (sliders, toggles, inputs)
- Seed-based randomization
- Pause/step/reset controls
- Event callbacks

See `js/framework/DemoFramework.js` for documentation.

## Contributing

This is an open project focused on algorithmic game design. Contributions should:

- Add interactive visualizations
- Explain system behavior
- Show failure modes
- Demonstrate scaling behavior
- Include system-thinking prompts

## License

Free and open. Use as you wish.

