/**
 * Product management module
 * Handles product display, cart interactions, and product data
 */

import Mustache from 'mustache';


const TEMPLATE_PRODUCT = `
   {{#products}}   
        <div class="product-card bg-amber-100 p-4 rounded" data-product-id="{{id}}">
            <div class="product-image-container w-full aspect-square bg-gray-200 rounded overflow-hidden relative mb-4">
                <img src="{{image}}" alt="{{name}}" class="absolute inset-0 w-full h-full object-cover">
            </div>
            <h3 class="text-2xl font-bold mt-2 text-amber-900">{{name}}</h3>
            <p class="text-xl mt-1 text-slate-700">{{#price}}€{{/price}}{{price}}{{^price}}Ask for price{{/price}}</p>
            <p class="text-xl mt-1 text-slate-700 mb-10">{{description}}{{^description}}No description available{{/description}}</p>
            <p class="text-center mb-10">
                <button class="add-to-cart-btn ">
                    Add to Cart
                </button>
            </p>
        </div>
        {{/products}}
`;

/**
 * @typedef {Object} Product
 * @property {string} id - Unique identifier for the product
 * @property {string} name - Product name
 * @property {string} description - Product description
 * @property {number} price - Product price
 * @property {string} image - Product image URL
 */

export class ProductCard {
    /**
     * @type {Product[]}
     */
    static products = [
        {
            name: "Calabash Lamp 1",
            price: 200,
            id: "1",
            description: "This is the first product",
            image: "assets/lamp1-night.jpg"
        },
        {
            name: "Calabash Lamp 2",
            price: 200,
            id: "2",
            description: "This is the second product",
            image: "assets/lamp2-day.jpg"
        },
        {
            name: "Calabash Lamp 3",
            price: 200,
            id: "3",
            description: "This is the third product",
            image: "assets/lamp3-day.jpg"
        }
    ];

    /**
     * Find a product by its ID
     * @param {string} id - Product ID to find
     * @returns {Product|undefined} Found product or undefined
     */
    static findProductById(id) {
        return this.products.find(p => p.id === id);
    }

    /**
     * Normalize product data for cart
     * @param {Product} product - Product to normalize
     * @returns {Product} Normalized product copy
     */
    static normalizeProduct(product) {
        const normalized = JSON.parse(JSON.stringify(product));
        normalized.id = String(normalized.id);
        if (normalized.price) {
            normalized.price = parseFloat(normalized.price);
        }
        return normalized;
    }

    /**
     * Initialize product cards and bind event handlers
     */
    static init() {
        // Get all product cards
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            const addToCartBtn = card.querySelector('.add-to-cart-btn');
            const productId = card.dataset.productId;
            
            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', () => {
                    this.addToCart(productId);
                });
            }
        });
    }

    /**
     * Add product to cart by ID
     * @param {string} productId - Product ID to add to cart
     */
    static addToCart(productId) {
        const product = this.findProductById(productId);
        
        if (!product) {
            console.error(`Product with ID ${productId} not found`);
            return;
        }

        // Create a normalized copy of the product
        const productCopy = this.normalizeProduct(product);
        
        // Dispatch custom event with product copy
        const event = new CustomEvent('cart:add', {
            detail: { product: productCopy }
        });
        document.dispatchEvent(event);
        
        console.log(`Added product ${product.name} to cart`);
    }
}

/**
 * Render products using Mustache template and initialize functionality
 */
function renderProducts() {
    const productContainer = document.getElementById('js-products');
    
    if ( !productContainer) {
        console.warn('Product template or container not found');
        return;
    }
    
    productContainer.innerHTML = Mustache.render(TEMPLATE_PRODUCT, { products: ProductCard.products });
    ProductCard.init(); // Initialize after rendering
}

/**
 * Initialize product functionality
 * Called when products are rendered on the page
 */
export function initializeProducts() {
    console.log('Initializing product functionality...');
    renderProducts();
}