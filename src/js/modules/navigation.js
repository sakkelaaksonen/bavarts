/**
 * Navigation functionality
 * Handles mobile menu toggle and active state management
 */

/**
 * Initialize mobile menu functionality
 */
function initializeMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when clicking on navigation links
        const mobileNavLinks = mobileMenu.querySelectorAll('a[href^="#"]');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (event) => {
            const isClickInsideNav = mobileMenu.contains(event.target) || 
                                   mobileMenuButton.contains(event.target);
            
            if (!isClickInsideNav && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
            }
        });
    }
}

/**
 * Initialize navigation active state management
 */
function initializeActiveNavigation() {
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    const sections = document.querySelectorAll('section[id]');
    
    /**
     * Update active navigation item based on current scroll position
     */
    function updateActiveNav() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const linkHref = link.getAttribute('href');
            
            // Handle home link edge case - both "#" and "#home" should match "home" section
            if ((linkHref === '#' || linkHref === '#home') && current === 'home') {
                link.classList.add('active');
            } else if (linkHref === '#' + current) {
                link.classList.add('active');
            }
        });
    }
    
    // Update on scroll
    window.addEventListener('scroll', updateActiveNav);
    
    // Update on page load
    updateActiveNav();
    
    // Handle click events for immediate feedback and smooth scrolling
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
            
            // Smooth scroll to target section
            let targetId = this.getAttribute('href').substring(1);
            
            // Handle home link edge case
            if (targetId === '' || targetId === 'home') {
                targetId = 'home';
            }
            
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                e.preventDefault();
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update URL without triggering page reload
                history.pushState(null, null, `#${targetId}`);
            }
        });
    });
}

/**
 * Initialize all navigation functionality
 */
export function initializeNavigation() {
    console.log('Initializing navigation...');
    
    initializeMobileMenu();
    initializeActiveNavigation();
} 