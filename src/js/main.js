/**
 * Main application entry point
 * Demonstrates ES module usage with esbuild bundling
 */

import { initializeApp } from './modules/app.js';

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('Hello World from main.js!');
  
  
  initializeApp();
}); 