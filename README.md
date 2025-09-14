# Three.js Water Shader - Simple Version

## Overview

A beautiful water shader demo built with Three.js, featuring realistic water waves, caustics effects, and an interactive UI for real-time parameter tweaking.

### Features

- **Realistic Water Simulation**: Procedural waves using simplex noise with configurable amplitude, frequency, and other wave parameters
- **Caustics Effects**: Animated caustic patterns on the ocean floor  
- **Environment Mapping**: Cube map reflections for realistic water appearance
- **Interactive Controls**: Real-time parameter adjustment using Tweakpane
- **Orbit Camera**: Smooth camera controls for viewing from different angles

## Simple Deployment Setup

This project has been restructured for **easy deployment without any build process**. It consists of just 3 files:

- `index.html` - Main HTML page with CDN dependencies
- `script.js` - All JavaScript code including shaders and logic  
- `styles.css` - Basic styling for the page

## Getting Started

### Local Development
Simply serve the files with any HTTP server:
```bash
python3 -m http.server 8000
# or
npx serve .
```

### GitHub Pages Deployment
1. Push to any branch (main, gh-pages, etc.)
2. Go to Settings → Pages
3. Select your branch as source
4. No workflow needed - it works immediately!

### Direct Web Deployment
Upload the files to any web server and it will work immediately.

## File Structure

```
/
├── index.html          # Main HTML page
├── script.js          # All JavaScript code and shaders
├── styles.css         # Styling
├── px.png, nx.png     # Environment map textures
├── py.png, ny.png     # (cube map faces)
├── pz.png, nz.png     #
└── ocean_floor.png    # Floor texture
```

## Technical Details

The water shader uses:
- **Vertex Displacement**: Procedural wave generation using fractal noise
- **Normal Calculation**: Dynamic normal computation for proper lighting
- **Fragment Shading**: Fresnel reflections, environment mapping, and color mixing
- **Caustics**: Animated light patterns using 3D simplex noise

## Interactive Controls

Use the right-side panel to adjust:
- **Geometry**: Water resolution
- **Waves**: Amplitude, frequency, speed, iterations
- **Color**: Water colors for different wave heights
- **Fresnel**: Reflection properties  
- **Caustics**: Floor light effects

## Browser Compatibility

Works in all modern browsers with WebGL support. No build tools or Node.js required!

## Links

- [Original Tutorial](https://youtu.be/jK4uXGY07vA)
