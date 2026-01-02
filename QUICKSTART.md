# Quick Start Guide

## 🚀 Running the Site

**You MUST use a web server - do NOT open HTML files directly!**

### Windows Users:
1. Double-click `server.bat`
2. Open browser to: http://localhost:8000

### Mac/Linux Users:
1. Run: `python3 server.py`
2. Open browser to: http://localhost:8000

### Why?
The demos use ES6 modules which require HTTP protocol. Opening files directly causes CORS errors.

## ✅ Troubleshooting

**Problem:** "CORS policy" errors in console
**Solution:** Use the server script, don't open files directly

**Problem:** "Module not found" errors
**Solution:** Make sure you're accessing via http://localhost:8000, not file://

**Problem:** Visualizations are blank
**Solution:** Check browser console for errors, ensure server is running

## 📁 Project Structure

- `index.html` - Main landing page
- `demos/` - All demo pages
- `js/framework/` - Reusable demo framework
- `js/demos/` - Individual demo implementations
- `css/` - Stylesheets

All demos are interactive - adjust parameters and see real-time changes!

