/**
 * Code Template Helper
 * Generates complete HTML files with embedded code for demos
 */

export class CodeTemplate {
    static generateHTML(title, seed, params, codeBody) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Generated Code</title>
    <style>
        body { margin: 0; padding: 20px; background: #0a0a0a; color: #e0e0e0; font-family: monospace; }
        canvas { border: 1px solid #333; display: block; margin: 20px auto; }
        .controls { max-width: 400px; margin: 0 auto; padding: 20px; background: #1a1a1a; border-radius: 8px; }
        .control-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; color: #4a9eff; }
        input[type="range"] { width: 100%; }
        input[type="number"], input[type="text"] { width: 100px; padding: 5px; background: #2a2a2a; border: 1px solid #333; color: #e0e0e0; }
        button { padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="controls">
        ${CodeTemplate.generateControls(seed, params)}
    </div>

    <script>
        ${codeBody}
    </script>
</body>
</html>`;
    }

    static generateControls(seed, params) {
        let controls = `<div class="control-group">
            <label>Random Seed: <input type="number" id="seed" value="${seed}"></label>
            <button onclick="regenerate()">Regenerate</button>
        </div>`;
        
        // This will be customized per demo
        return controls;
    }
}

