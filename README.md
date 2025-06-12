# Bav'ArtS Collection - Calabash Lamp E-commerce Site

A modern e-commerce website showcasing handcrafted African calabash lamps, built with Eleventy (11ty) and featuring a dynamic shopping cart system.

## Synopsis

This project presents an elegant online storefront for Bav'ArtS Collection, specializing in authentic handcrafted calabash lamps from Africa. The site features a responsive design with smooth scrolling navigation, dynamic product loading, and a fully functional shopping cart with checkout capabilities.

## Architecture

**Frontend Stack:**
- **Static Site Generator**: Eleventy (11ty) with Nunjucks templating
- **Styling**: Tailwind CSS for responsive design
- **JavaScript**: ES6 modules with esbuild bundling
- **Build System**: npm scripts for development and production

**Key Components:**
- **Modular Templates**: Separate includes for navigation, hero, about, products, contact, and cart
- **JavaScript Modules**: 
  - `app.js` - Main application coordinator
  - `navigation.js` - Mobile menu and scroll behavior
  - `products.js` - Dynamic product loading and display
  - `cart.js` - Shopping cart functionality with localStorage persistence
- **Responsive Design**: Mobile-first approach with Tailwind utilities
- **Asset Pipeline**: Optimized CSS/JS bundling and asset copying

## Running the Project

### Prerequisites
- Node.js (v22 or higher)
- npm

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/bavarts-collection.git
   cd bavarts-collection
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server with hot reload:
   ```bash
   npm run dev
   ```

4. Visit `http://localhost:8080` to view the site.

### Production Build

1. Build optimized site for production:
   ```bash
   npm run build
   ```

2. Preview production build:
   ```bash
   npm run preview
   ```

## Deployment to GitHub Pages

### Automatic Deployment

1. Push your code to the `main` branch
2. GitHub Actions will automatically build and deploy to GitHub Pages


The site will be available at: `https://sakkelaaksonen.github.io/bavarts/`

### Project Structure

```
src/
├── _includes/          # Nunjucks templates
│   ├── base.njk       # Base layout with footer
│   ├── navigation.njk # Site navigation
│   ├── hero.njk       # Hero section
│   ├── about.njk      # About section
│   ├── products.njk   # Products section
│   ├── contact.njk    # Contact section
│   └── cart.njk       # Shopping cart UI
├── js/
│   ├── main.js        # Entry point
│   └── modules/       # Feature modules
├── css/
│   └── main.css       # Tailwind styles
├── assets/            # Images and static files
└── index.njk          # Homepage template
```

## Features

- **Responsive Design**: Mobile-first approach with smooth animations
- **Dynamic Shopping Cart**: Add/remove items with localStorage persistence
- **Accordion UI**: Collapsible cart sections for better UX
- **Form Validation**: Checkout form with terms acceptance
- **Email Integration**: Order processing via email
- **Smooth Scrolling**: Navigation with active section highlighting
- **Image Optimization**: Optimized asset loading and display
- **GitHub Pages Ready**: Automated deployment with GitHub Actions


## Analytics

https://dashboard.simpleanalytics.com/sakkelaaksonen.github.io


TODO update to production url when ready