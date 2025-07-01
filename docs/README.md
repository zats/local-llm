# Native Foundation Models Documentation & Website

The project website and interactive documentation for Native Foundation Models.

## Overview

This directory contains the static website hosted at [https://zats.github.io/native-foundation-models/](https://zats.github.io/native-foundation-models/). It serves as the landing page, documentation hub, and interactive demo for the project.

## Features

- 🎨 **Modern Design** - Gradient backgrounds, smooth animations, and responsive layout
- 🧪 **Live Demos** - Interactive API testing directly in the browser
- 📚 **Code Examples** - Syntax-highlighted examples with Prism.js
- 📱 **Mobile Responsive** - Optimized for all screen sizes
- 🔍 **SEO Optimized** - Open Graph meta tags for social sharing
- ⚡ **Fast Loading** - Static site with minimal dependencies

## Structure

```
docs/
├── index.html         # Main website
├── prism.css         # Syntax highlighting styles
├── prism.js          # Syntax highlighting library
├── nfm.png           # Logo image
└── thumbnail.png     # Social media preview image
```

## Development

### Local Testing

1. Start a local web server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

2. Open http://localhost:8000 in your browser

### Making Changes

The website is a single HTML file with embedded CSS and JavaScript for simplicity and performance.

#### Key Sections

1. **Hero Section**
   - Animated logo with glow effects
   - Download button with OS requirements
   - Tagline and description

2. **Features Grid**
   - Six feature cards with icons
   - Hover animations
   - Responsive grid layout

3. **Live Demo Section**
   - Interactive buttons to test the API
   - Real-time console output
   - Connection status indicators

4. **Code Examples**
   - Four example snippets
   - Syntax highlighting
   - API usage patterns

5. **Footer**
   - Social media links
   - Copyright information

### Styling

The site uses:
- CSS Grid for layouts
- CSS custom properties for theming
- Media queries for responsiveness
- Gradient backgrounds and shadows
- Smooth transitions and animations

### Interactive Features

The demo section includes three test functions:
- `testAvailability()` - Checks native host connection
- `testCompletion()` - Generates a single completion
- `testStreaming()` - Demonstrates streaming responses

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the main branch.

### Manual Deployment

1. Ensure all changes are committed
2. Push to the main branch
3. GitHub Actions will deploy to GitHub Pages

### Custom Domain

To use a custom domain:
1. Add a `CNAME` file with your domain
2. Configure DNS to point to GitHub Pages
3. Enable HTTPS in repository settings

## Performance Optimization

- Inline critical CSS
- Minimal JavaScript
- Optimized images
- No external dependencies (except Prism.js)
- Efficient animations using CSS transforms

## Browser Support

Tested and working on:
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android)

## Social Media Preview

The site includes Open Graph and Twitter Card meta tags:
- Title: "Native Foundation Models - Native AI Integration for the Web"
- Description: Focus on zero latency, privacy, and native performance
- Image: Brain logo with gradient background (985x628px)

## Contributing

When updating the website:
1. Test locally first
2. Check mobile responsiveness
3. Verify interactive demos work
4. Test social media preview
5. Ensure fast load times

## Analytics

Currently no analytics are implemented to respect user privacy. If needed in the future, consider privacy-focused solutions like:
- Plausible
- Fathom
- Self-hosted Matomo

## License

MIT License - see [LICENSE](../LICENSE) for details.