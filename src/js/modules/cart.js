/**
 * Shopping cart functionality
 * Handles cart management, UI updates, and checkout process
 */

import Mustache from 'mustache';
import { EmailService } from './email.js';

/**
 * @constant
 * @description Configuration constants for the shopping cart
 */

export const CART_ADD_EVENT = 'cart:add';


const TEMPLATE_CART = `  {{#items}}
        <div class="flex items-center space-x-4 p-2 bg-gray-50 rounded">
            <img src="{{image}}" alt="{{name}}" class="w-16 h-16 object-cover rounded">
            <div class="flex-1">
                <h3 class="font-bold">{{name}}</h3>
                {{#price}}
                <p class="text-gray-600">
                    €{{price}} × {{quantity}} = €{{total}}
                </p>
                {{/price}}
                {{^price}}
                <p class="text-gray-600">Price on request</p>
                {{/price}}
                <div class="flex items-center space-x-2 mt-1">
                    <button data-action="update-quantity" data-product-id="{{id}}" data-change="-1"
                        class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">-</button>
                    <span>{{quantity}}</span>
                    <button data-action="update-quantity" data-product-id="{{id}}" data-change="1"
                        class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">+</button>
                </div>
            </div>
            <button data-action="remove-item" data-product-id="{{id}}" 
                class="text-red-500 hover:text-red-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>
        </div>
        {{/items}}
        {{^items}}
        <p class="text-gray-500 text-center py-4">Your cart is empty</p>
        {{/items}}
`;

const CART_CONFIG = {
    /** @type {Object} DOM element IDs */
    ELEMENTS: {
        CART_PANEL: 'cart-panel',
        CART_BUTTON: 'cart-button',
        CART_BUTTON_MOBILE: 'cart-button-mobile',
        CLOSE_CART: 'close-cart',
        CLEAR_CART: 'clear-cart',
        CHECKOUT_BUTTON: 'checkout-btn',
        CART_COUNT: 'cart-count',
        CART_COUNT_MOBILE: 'cart-count-mobile',
        CART_ITEMS: 'cart-items',
        CART_TOTAL: 'cart-total',
        // Form elements
        CHECKOUT_FORM: 'checkout-form',
        CUSTOMER_NAME: 'cart-customer-name',
        CUSTOMER_EMAIL: 'cart-customer-email',
        ACCEPT_TOS: 'cart-accept-tos',
        // Address fields
        ADDRESS_STREET: 'cart-address-street',
        ADDRESS_CITY: 'cart-address-city',
        ADDRESS_POSTAL: 'cart-address-postal',
        ADDRESS_COUNTRY: 'cart-address-country',
        // Order complete elements
        RECOPY_ORDER_BTN: 'recopy-order-btn',
        START_NEW_ORDER_BTN: 'start-new-order-btn',
        ORDER_COMPLETE_ACCORDION: 'order-complete-accordion'
    },
    /** @type {Object} CSS classes */
    CLASSES: {
        TRANSLATE_FULL: 'translate-x-full'
    },
    /** @type {Object} Storage keys */
    STORAGE: {
        CART_ITEMS: 'cart'
    },
    /** @type {Object} Currency formatting */
    CURRENCY: {
        SYMBOL: '€',
        DECIMALS: 2
    }
};

/**
 * @class ShoppingCart
 * @description Manages shopping cart functionality including item management, UI updates, and checkout process
 */
export class ShoppingCart {
    /**
     * @constructor
     * @description Initializes a new shopping cart instance
     */
    constructor() {
        /** @type {Array<{id: string, name: string, price: number|undefined, quantity: number, image: string}>} */
        this.items = [];
        /** @type {Object} Customer information */
        this.customerInfo = this.createDefaultCustomerInfo();
        /** @type {EmailService} Email service instance */
        this.emailService = new EmailService();
        /** @type {string} Stored order text for recopying */
        this.storedOrderText = '';
        this.elements = {
            form: document.getElementById(CART_CONFIG.ELEMENTS.CHECKOUT_FORM),
            nameField: document.getElementById(CART_CONFIG.ELEMENTS.CUSTOMER_NAME),
            emailField: document.getElementById(CART_CONFIG.ELEMENTS.CUSTOMER_EMAIL),
            tosField: document.getElementById(CART_CONFIG.ELEMENTS.ACCEPT_TOS),
            submitButton: document.getElementById(CART_CONFIG.ELEMENTS.CHECKOUT_BUTTON),
            streetField: document.getElementById(CART_CONFIG.ELEMENTS.ADDRESS_STREET),
            cityField: document.getElementById(CART_CONFIG.ELEMENTS.ADDRESS_CITY),
            postalField: document.getElementById(CART_CONFIG.ELEMENTS.ADDRESS_POSTAL),
            countryField: document.getElementById(CART_CONFIG.ELEMENTS.ADDRESS_COUNTRY)
        };
        // Cache template
        this.cartTemplate = TEMPLATE_CART;
        this.init();
    }

    /**
     * @description Get the total price of all items in the cart
     * @returns {number}
     */
    get total() {
        return this.items.reduce((sum, item) => {
            return sum + (item.price ? item.price * item.quantity : 0);
        }, 0);
    }

    /**
     * @description Get the total number of items in the cart
     * @returns {number}
     */
    get count() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * @description Initializes the cart by loading saved items and setting up event listeners
     * @private
     */
    init() {
        this.loadCart();
        this.setupEventListeners();
        this.setupFormValidation();
        this.setupAccordions();
    }

    /**
     * @description Sets up form validation event listeners
     * @private
     */
    setupFormValidation() {
        const form = this.elements.form;
        const nameField = this.elements.nameField;
        const emailField = this.elements.emailField;
        const tosField = this.elements.tosField;
        const submitButton = this.elements.submitButton;
        
        // Address fields
        const streetField = this.elements.streetField;
        const cityField = this.elements.cityField;
        const postalField = this.elements.postalField;
        const countryField = this.elements.countryField;

        if (!form || !nameField || !emailField || !tosField || !submitButton ||
            !streetField || !cityField || !postalField || !countryField) {
            console.error('Form elements not found');
            return;
        }

        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Clear previous validation messages
            this.clearValidationMessages();
            
            // Validate form
            const isValid = this.validateForm();
            
            if (isValid) {
                // Update customer info
                this.customerInfo.name = nameField.value.trim();
                this.customerInfo.email = emailField.value.trim();
                this.customerInfo.acceptedTos = tosField.checked;
                
                // Ensure address object exists
                if (!this.customerInfo.address) {
                    this.customerInfo.address = {};
                }
                
                this.customerInfo.address.street = streetField.value.trim();
                this.customerInfo.address.city = cityField.value.trim();
                this.customerInfo.address.postal = postalField.value.trim();
                this.customerInfo.address.country = countryField.value;
                
                this.submitOrder();
            } else {
                // Show validation errors
                this.showValidationErrors();
            }
        });

        // Real-time validation
        [nameField, emailField, streetField, cityField, postalField, countryField].forEach(field => {
            field.addEventListener('input', () => {
                this.updateSubmitButtonState();
            });
        });

        tosField.addEventListener('change', () => {
            this.updateSubmitButtonState();
        });

        // Initial button state
        this.updateSubmitButtonState();
    }

    /**
     * @description Updates the submit button state based on form validity
     * @private
     */
    updateSubmitButtonState() {
        const form = this.elements.form;
        const submitButton = this.elements.submitButton;
        
        if (!form || !submitButton) return;

        const isFormValid = form.checkValidity();
        const hasItems = this.items.length > 0;
        
        submitButton.disabled = !isFormValid || !hasItems;
        
        // Update button text based on state
        const submitText = submitButton.querySelector('.checkout-btn-text');
        const submitLoading = submitButton.querySelector('.checkout-btn-loading');
        if (submitText) {
            if (!hasItems) {
                submitText.textContent = 'Cart is Empty';
            } else if (!isFormValid) {
                submitText.textContent = 'Complete Form';
            } else {
                submitText.textContent = 'Send Order';
            }
        }
    }

    /**
     * @description Validates a single form field
     * @param {HTMLElement} field - The form field to validate
     * @private
     */
    validateField(field) {
        const isValid = field.checkValidity();
        
        // Update visual state based on validation
        if (field.value.trim() === '') {
            // Don't show invalid state for empty fields until form submission
            field.classList.remove('invalid');
        } else {
            // Show validation state for fields with content
            if (isValid) {
                field.classList.remove('invalid');
            } else {
                field.classList.add('invalid');
            }
        }
    }

    /**
     * @description Validates the checkout form
     * @returns {boolean} True if form is valid
     * @private
     */
    validateForm() {
        const nameField = this.elements.nameField;
        const emailField = this.elements.emailField;
        const tosField = this.elements.tosField;
        const streetField = this.elements.streetField;
        const cityField = this.elements.cityField;
        const postalField = this.elements.postalField;
        const countryField = this.elements.countryField;

        let isValid = true;
        const errors = [];

        // Validate name
        if (!nameField.value.trim() || nameField.value.trim().length < 2) {
            isValid = false;
            errors.push('Name must be at least 2 characters long');
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailField.value.trim() || !emailRegex.test(emailField.value.trim())) {
            isValid = false;
            errors.push('Please enter a valid email address');
        }

        // Validate address fields
        if (!streetField.value.trim() || streetField.value.trim().length < 5) {
            isValid = false;
            errors.push('Street address must be at least 5 characters long');
        }

        if (!cityField.value.trim() || cityField.value.trim().length < 2) {
            isValid = false;
            errors.push('City must be at least 2 characters long');
        }

        if (!postalField.value.trim() || postalField.value.trim().length < 4) {
            isValid = false;
            errors.push('Postal code must be at least 4 characters long');
        }

        if (!countryField.value) {
            isValid = false;
            errors.push('Please select a country');
        }

        // Validate terms of service
        if (!tosField.checked) {
            isValid = false;
            errors.push('You must accept the Terms of Service');
        }

        // Store errors for display
        this.validationErrors = errors;

        return isValid;
    }

    /**
     * @description Clears validation messages from the UI
     * @private
     */
    clearValidationMessages() {
        const validationMessages = document.getElementById('cart-validation-messages');
        const successMessage = document.getElementById('cart-success-message');
        
        if (validationMessages) {
            validationMessages.classList.add('hidden');
        }
        
        if (successMessage) {
            successMessage.classList.add('hidden');
        }
    }

    /**
     * @description Shows validation errors in the UI
     * @private
     */
    showValidationErrors() {
        const validationMessages = document.getElementById('cart-validation-messages');
        const validationList = document.getElementById('cart-validation-list');
        
        if (validationMessages && validationList && this.validationErrors) {
            // Clear existing errors
            validationList.innerHTML = '';
            
            // Add each error as a list item
            this.validationErrors.forEach(error => {
                const li = document.createElement('li');
                li.textContent = error;
                validationList.appendChild(li);
            });
            
            // Show the validation messages container
            validationMessages.classList.remove('hidden');
        }
    }

    /**
     * @description Sets up event listeners for cart functionality
     * @private
     */
    setupEventListeners() {
        // Cart panel controls - add null checks
        const cartButton = document.getElementById(CART_CONFIG.ELEMENTS.CART_BUTTON);
        const cartButtonMobile = document.getElementById(CART_CONFIG.ELEMENTS.CART_BUTTON_MOBILE);
        const closeCartButton = document.getElementById(CART_CONFIG.ELEMENTS.CLOSE_CART);
        const clearCartButton = document.getElementById(CART_CONFIG.ELEMENTS.CLEAR_CART);

        if (cartButton) cartButton.onclick = () => this.togglePanel();
        if (cartButtonMobile) cartButtonMobile.onclick = () => this.togglePanel();
        if (closeCartButton) closeCartButton.onclick = () => this.togglePanel();
        if (clearCartButton) clearCartButton.onclick = () => this.clearCart();

        // Cart item actions - with null check
        const cartItemsContainer = document.getElementById(CART_CONFIG.ELEMENTS.CART_ITEMS);
        if (cartItemsContainer) {
            cartItemsContainer.addEventListener('click', (e) => {
                const button = e.target.closest('button[data-action]');
                if (!button) return;

                const action = button.dataset.action;
                const productId = button.dataset.productId;

                switch (action) {
                    case 'update-quantity':
                        const change = parseInt(button.dataset.change, 10);
                        const item = this.items.find(item => item.id === productId);
                        if (item) {
                            this.updateQuantity(productId, item.quantity, change);
                        }
                        break;
                    case 'remove-item':
                        this.removeItem(productId);
                        break;
                }
            });
        }

        // Add to cart event
        document.addEventListener('cart:add', (event) => {
            const { product } = event.detail;
            this.addItem(product);
        });

        // Order complete buttons
        const recopyOrderBtn = document.getElementById(CART_CONFIG.ELEMENTS.RECOPY_ORDER_BTN);
        const startNewOrderBtn = document.getElementById(CART_CONFIG.ELEMENTS.START_NEW_ORDER_BTN);

        if (recopyOrderBtn) {
            recopyOrderBtn.addEventListener('click', () => this.recopyOrder());
        }

        if (startNewOrderBtn) {
            startNewOrderBtn.addEventListener('click', () => this.startNewOrder());
        }

        // Close cart on escape key - with null check
        document.addEventListener('keydown', (e) => {
            const cartPanel = document.getElementById(CART_CONFIG.ELEMENTS.CART_PANEL);
            if (e.key === 'Escape' && cartPanel && !cartPanel.classList.contains(CART_CONFIG.CLASSES.TRANSLATE_FULL)) {
                this.togglePanel();
            }
        });
    }

    /**
     * @description Toggles the visibility of the cart panel
     * @public
     */
    togglePanel() {
        const panel = document.getElementById(CART_CONFIG.ELEMENTS.CART_PANEL);
        
        if (!panel) {
            console.error('Cart panel not found');
            return;
        }
        
        panel.classList.toggle(CART_CONFIG.CLASSES.TRANSLATE_FULL);
    }

    /**
     * @description Adds an item to the cart or increments its quantity if it already exists
     * @param {Object} product - The product to add to the cart
     * @param {string} product.id - Product unique identifier
     * @param {string} product.name - Product name
     * @param {number|undefined} product.price - Product price
     * @param {string} product.image - Product image URL
     * @public
     */
    addItem(product) {
        if (!product || typeof product !== 'object') return;
        if (!product.id || !product.name || !product.image) {
            console.error('Invalid product data:', product);
            return;
        }

        const normalizedProduct = {
            ...product,
            id: String(product.id),
            price: product.price ? Number(product.price) : undefined
        };

        const existingItem = this.items.find(item => item.id === normalizedProduct.id);

        if (existingItem) {
            // Simply increment by 1, no need to check for undefined since we always initialize with 1
            existingItem.quantity += 1;
        } else {
            // Initialize new items with quantity 1
            normalizedProduct.quantity = 1;
            this.items.push(normalizedProduct);
        }

        this.updateCart();
    }

    /**
     * @description Removes an item from the cart
     * @param {string} productId - ID of the product to remove
     * @public
     */
    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.updateCart();
    }

    /**
     * @description Updates the quantity of an item in the cart
     * @param {string} productId - ID of the product to update
     * @param {number} currentQty - Current quantity of the product
     * @param {number} change - Amount to change the quantity by (positive or negative)
     * @public
     */
    updateQuantity(productId, currentQty, change) {
        if (typeof productId !== 'string' || typeof currentQty !== 'number' || typeof change !== 'number') {
            console.error('Invalid arguments to updateQuantity');
            return;
        }

        const item = this.items.find(item => item.id === productId);
        if (!item) return;

        const newQty = currentQty + change;
        if (newQty <= 0) {
            this.removeItem(productId);
        } else {
            item.quantity = newQty;
            this.updateCart();
        }
    }

    /**
     * @description Clears all items from the cart
     */
    clearCart() {
        this.items = [];
        this.updateCart();
    }

    /**
     * @private
     * @description Updates cart state and triggers UI update
     */
    updateCart() {
        // Update UI elements
        document.getElementById(CART_CONFIG.ELEMENTS.CART_COUNT).textContent = this.count;
        document.getElementById(CART_CONFIG.ELEMENTS.CART_COUNT_MOBILE).textContent = this.count;
        
        // Update cart count badge in accordion
        const cartCountBadge = document.getElementById('cart-count-badge');
        if (cartCountBadge) {
            cartCountBadge.textContent = this.count;
        }
        
        document.getElementById(CART_CONFIG.ELEMENTS.CART_TOTAL).textContent = 
            `${CART_CONFIG.CURRENCY.SYMBOL}${this.total.toFixed(CART_CONFIG.CURRENCY.DECIMALS)}`;

        // Render items
        const cartItems = document.getElementById(CART_CONFIG.ELEMENTS.CART_ITEMS);
        const itemsWithTotals = this.items.map(item => ({
            ...item,
            total: item.price ? (item.price * item.quantity).toFixed(2) : undefined
        }));
        cartItems.innerHTML = Mustache.render(this.cartTemplate, { items: itemsWithTotals });

        // Update checkout button state
        const proceedToCheckoutBtn = document.getElementById('proceed-to-checkout');
        if (proceedToCheckoutBtn) {
            proceedToCheckoutBtn.disabled = this.items.length === 0;
        }

        // Update submit button state
        this.updateSubmitButtonState();

        // Save to localStorage
        localStorage.setItem(CART_CONFIG.STORAGE.CART_ITEMS, JSON.stringify(this.items));
    }

    /**
     * @private
     * @description Loads saved cart items from localStorage
     */
    loadCart() {
        try {
            const saved = localStorage.getItem(CART_CONFIG.STORAGE.CART_ITEMS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    this.items = parsed;
                    this.updateCart();
                }
            }
        } catch (error) {
            console.error('Failed to load cart:', error);
            this.items = [];
        }
    }

    /**
     * @description Sets up accordion functionality for cart sections
     * @private
     */
    setupAccordions() {
        // Get accordion elements with null checks
        const cartItemsToggle = document.getElementById('cart-items-toggle');
        const checkoutFormToggle = document.getElementById('checkout-form-toggle');
        const orderCompleteToggle = document.getElementById('order-complete-toggle');
        const proceedToCheckoutBtn = document.getElementById('proceed-to-checkout');

        // Only set up event listeners if elements exist
        if (cartItemsToggle) {
            cartItemsToggle.addEventListener('click', () => {
                this.setActiveAccordion('cart-items');
            });
        }

        if (checkoutFormToggle) {
            checkoutFormToggle.addEventListener('click', () => {
                this.setActiveAccordion('checkout-form');
            });
        }

        if (orderCompleteToggle) {
            orderCompleteToggle.addEventListener('click', () => {
                this.setActiveAccordion('order-complete');
            });
        }

        if (proceedToCheckoutBtn) {
            proceedToCheckoutBtn.addEventListener('click', () => {
                this.setActiveAccordion('checkout-form');
            });
        }

        // Set initial state - only if accordion elements exist
        const cartItemsAccordion = document.getElementById('cart-items-accordion');
        const checkoutFormAccordion = document.getElementById('checkout-form-accordion');
        
        if (cartItemsAccordion && checkoutFormAccordion) {
            this.setActiveAccordion('cart-items');
        }
    }

    /**
     * @description Sets the active accordion section
     * @param {string} section - The section to activate ('cart-items', 'checkout-form', or 'order-complete')
     * @private
     */
    setActiveAccordion(section) {
        // Get all accordion sections
        const accordions = document.querySelectorAll('[data-accordion]');
        
        // Get only the accordion toggle buttons (direct children of accordion headers)
        const accordionToggleButtons = document.querySelectorAll('.accordion-header > button');
        
        accordions.forEach(accordion => {
            const accordionId = accordion.dataset.accordion;
            const content = document.getElementById(`${accordionId}-content`);
            const chevron = document.getElementById(`${accordionId}-chevron`);
            const toggleButton = accordion.querySelector('button');
            
            if (accordionId === section) {
                // Activate this section
                accordion.classList.add('active');
                accordion.classList.remove('hidden');
                if (content) content.classList.remove('hidden');
                if (chevron) chevron.classList.add('rotate-180');
            } else {
                // Deactivate other sections
                accordion.classList.remove('active');
                if (content) content.classList.add('hidden');
                if (chevron) chevron.classList.remove('rotate-180');
                
                // Hide order complete accordion when not active
                if (accordionId === 'order-complete') {
                    accordion.classList.add('hidden');
                }
            }
        });
        
        // Disable/enable only accordion toggle buttons based on active section
        accordionToggleButtons.forEach(button => {
            if (section === 'order-complete') {
                // Disable all accordion toggles when order is complete
                button.disabled = true;
                button.classList.add('cursor-not-allowed', 'opacity-50');
            } else {
                // Enable accordion toggles for normal operation
                button.disabled = false;
                button.classList.remove('cursor-not-allowed', 'opacity-50');
            }
        });
    }

    /**
     * @description Submits the order via EmailService and shows order complete panel
     * This is the main checkout method used by the form submission
     * @private
     */
    submitOrder() {
        const submitButton = this.elements.submitButton;
        const submitText = submitButton.querySelector('.checkout-btn-text');
        const submitLoading = submitButton.querySelector('.checkout-btn-loading');

        // Show loading state
        submitButton.disabled = true;
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');

        // Prepare order data for email service
        const orderData = {
            items: this.items,
            customer: this.customerInfo,
            total: this.total,
            timestamp: new Date().toISOString()
        };

        // Store the formatted order text using EmailService formatting
        this.storedOrderText = this.emailService.formatOrderEmail(orderData);

        // Send email with order details using EmailService
        this.emailService.sendOrderEmail(orderData)
            .then(() => {
                // Reset button state
                submitButton.disabled = false;
                submitText.classList.remove('hidden');
                submitLoading.classList.add('hidden');

                // Show order complete panel instead of success message
                this.showOrderComplete();

                console.log('Order submitted successfully:', orderData);
            })
            .catch((error) => {
                // Reset button state on error
                submitButton.disabled = false;
                submitText.classList.remove('hidden');
                submitLoading.classList.add('hidden');

                // Show error message
                alert('Failed to send order. Please try again or contact us directly.');
                console.error('Order submission failed:', error);
            });
    }

    createDefaultCustomerInfo() {
        return {
            name: '', email: '', acceptedTos: false,
            address: { street: '', city: '', postal: '', country: '' }
        };
    }

    /**
     * @description Shows the order complete panel and clears form/cart
     * @private
     */
    showOrderComplete() {
        // Clear form
        const form = this.elements.form;
        if (form) {
            form.reset();
        }

        // Reset customer info
        this.customerInfo = this.createDefaultCustomerInfo();

        // Clear cart items
        this.clearCart();

        // Show order complete accordion
        this.setActiveAccordion('order-complete');
    }

    /**
     * @description Copies the last order text to clipboard again
     * @public
     */
    recopyOrder() {
        
        if (!this.storedOrderText) {
            alert('No order text available to copy.');
            return;
        }

        navigator.clipboard.writeText(this.storedOrderText)
            .then(() => {
                // Temporarily change button text to show success
                const btn = document.getElementById(CART_CONFIG.ELEMENTS.RECOPY_ORDER_BTN);
                const originalText = btn.innerHTML;
                btn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Copied!</span>
                `;
                btn.disabled = true;
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy order text:', err);
                alert('Failed to copy order text. Please try again.');
            });
    }

    /**
     * @description Starts a new order by resetting everything and going back to cart items
     * @public
     */
    startNewOrder() {
        // Clear stored order text
        this.storedOrderText = '';
        
        // Reset form
        const form = this.elements.form;
        if (form) {
            form.reset();
        }

        // Reset customer info
        this.customerInfo = this.createDefaultCustomerInfo();

        // Go back to cart items view
        this.setActiveAccordion('cart-items');
    }
}

/**
 * Initialize shopping cart functionality
 */
export function initializeCart() {
    console.log('Initializing shopping cart...');
    window.cart = new ShoppingCart();
}