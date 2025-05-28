/**
 * @fileoverview Email functionality for the webshop
 * @description Handles email sending for order confirmations
 */

/**
 * Email service for handling order confirmations
 */
export class EmailService {
    /**
     * Creates an instance of EmailService
     */
    constructor() {
        this.defaultRecipient = 'contact@example.com';
    }

    /**
     * Sends order details via email
     * @param {Object} orderData - The order data to send
     * @returns {Promise} Promise that resolves when email is sent
     */
    sendOrderEmail(orderData) {
        return new Promise((resolve, reject) => {
            // Create email content
            const subject = `New Order from ${orderData.customer.name}`;
            const body = this.formatOrderEmail(orderData);

            // Create mailto link
            const mailtoLink = `mailto:${this.defaultRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            try {
                // Copy email content to clipboard
                this.copyToClipboard(body)
                    .then(() => {
                        // Show alert with confirmation
                        const userConfirmed = confirm(
                            'Order details have been copied to your clipboard!\n\n' +
                            'Click OK to open your email client, or Cancel to handle manually.\n\n' +
                            'You can paste the order details into any email application.'
                        );

                        if (userConfirmed) {
                            // Open email client
                            window.location.href = mailtoLink;
                        }

                        // Resolve after user interaction
                        setTimeout(() => {
                            resolve();
                        }, 1000);
                    })
                    .catch(() => {
                        // Fallback if clipboard fails - still show alert
                        const userConfirmed = confirm(
                            'Click OK to open your email client with the order details.\n\n' +
                            'Note: Order details could not be copied to clipboard automatically.'
                        );

                        if (userConfirmed) {
                            window.location.href = mailtoLink;
                        }

                        setTimeout(() => {
                            resolve();
                        }, 1000);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Copies text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise} Promise that resolves when text is copied
     * @private
     */
    copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            // Modern clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text)
                    .then(resolve)
                    .catch(reject);
            } else {
                // Fallback for older browsers
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (successful) {
                        resolve();
                    } else {
                        reject(new Error('Copy command failed'));
                    }
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    /**
     * Formats order data into email content
     * @param {Object} orderData - The order data to format
     * @returns {string} Formatted email body
     * @private
     */
    formatOrderEmail(orderData) {
        let emailBody = `New Order Details:\n\n`;
        
        // Customer information
        emailBody += `Customer Information:\n`;
        emailBody += `Name: ${orderData.customer.name}\n`;
        emailBody += `Email: ${orderData.customer.email}\n\n`;
        
        // Address information
        emailBody += `Shipping Address:\n`;
        emailBody += `Street: ${orderData.customer.address.street}\n`;
        emailBody += `City: ${orderData.customer.address.city}\n`;
        emailBody += `Postal Code: ${orderData.customer.address.postal}\n`;
        emailBody += `Country: ${orderData.customer.address.country}\n\n`;
        
        // Order items
        emailBody += `Order Items:\n`;
        orderData.items.forEach((item, index) => {
            const itemTotal = item.price ? (item.price * item.quantity).toFixed(2) : 'N/A';
            emailBody += `${index + 1}. ${item.name}\n`;
            emailBody += `   Quantity: ${item.quantity}\n`;
            emailBody += `   Price: €${item.price ? item.price.toFixed(2) : 'N/A'}\n`;
            emailBody += `   Total: €${itemTotal}\n\n`;
        });
        
        // Order total
        emailBody += `Order Total: €${orderData.total.toFixed(2)}\n\n`;
        
        // Timestamp
        emailBody += `Order Date: ${new Date(orderData.timestamp).toLocaleString()}\n\n`;
        
        emailBody += `Please process this order and contact the customer for payment and delivery arrangements.\n`;
        
        return emailBody;
    }
} 