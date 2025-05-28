/**
 * Application initialization and utilities
 */

import { initializeProducts } from './products.js';
import { initializeCart } from './cart.js';
import { initializeNavigation } from './navigation.js';

/**
 * Initialize the application
 */
export function initializeApp() {
  console.log('App initialized successfully!');
  
  // Initialize product functionality
  initializeProducts();
  
  // Initialize shopping cart
  initializeCart();
  
  // Initialize navigation
  initializeNavigation();
}

