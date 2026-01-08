/**
 * Performance Utilities
 * Common performance optimization patterns for the OSM application
 */

(function(window) {
    'use strict';

    const PerformanceUtils = {
        /**
         * Debounce function - limits how often a function can be called
         * @param {Function} func - Function to debounce
         * @param {number} wait - Milliseconds to wait
         * @returns {Function} Debounced function
         */
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function - ensures a function runs at most once in a time period
         * @param {Function} func - Function to throttle
         * @param {number} limit - Milliseconds between executions
         * @returns {Function} Throttled function
         */
        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Memoize function - caches function results
         * @param {Function} func - Function to memoize
         * @param {Function} keyGenerator - Optional custom key generator function
         * @returns {Function} Memoized function
         */
        memoize: function(func, keyGenerator) {
            const cache = new Map();
            return function(...args) {
                // Use custom key generator if provided, otherwise use simple string key
                const key = keyGenerator ? keyGenerator(...args) : args.length === 1 && 
                    (typeof args[0] === 'string' || typeof args[0] === 'number') 
                    ? String(args[0]) 
                    : JSON.stringify(args);
                
                if (cache.has(key)) {
                    return cache.get(key);
                }
                const result = func.apply(this, args);
                cache.set(key, result);
                return result;
            };
        },

        /**
         * Cache DOM element queries for reuse
         * @param {Object} selectors - Object with selector strings
         * @returns {Object} Object with cached DOM elements
         */
        cacheDOMElements: function(selectors) {
            const cache = {};
            for (const [key, selector] of Object.entries(selectors)) {
                cache[key] = document.querySelector(selector);
            }
            return cache;
        },

        /**
         * Batch DOM updates using DocumentFragment
         * @param {HTMLElement} parent - Parent element
         * @param {Array} elements - Array of elements or HTML strings to append
         */
        batchDOMUpdates: function(parent, elements) {
            if (!parent) return;
            
            const fragment = document.createDocumentFragment();
            
            elements.forEach(element => {
                if (typeof element === 'string') {
                    const temp = document.createElement('div');
                    temp.innerHTML = element;
                    while (temp.firstChild) {
                        fragment.appendChild(temp.firstChild);
                    }
                } else if (element instanceof HTMLElement) {
                    fragment.appendChild(element);
                }
            });
            
            parent.appendChild(fragment);
        },

        /**
         * Optimize array operations by reducing iterations
         * @param {Array} array - Array to process
         * @param {Object} operations - Object with operation functions
         * @returns {Object} Results of all operations
         */
        optimizedArrayOps: function(array, operations) {
            const results = {};
            
            // Initialize results
            for (const key in operations) {
                if (operations[key].type === 'count') results[key] = 0;
                else if (operations[key].type === 'collect') results[key] = [];
                else if (operations[key].type === 'unique') results[key] = new Set();
                else if (operations[key].type === 'sum') results[key] = 0;
            }
            
            // Single iteration
            array.forEach(item => {
                for (const [key, op] of Object.entries(operations)) {
                    if (op.type === 'count' && op.condition(item)) {
                        results[key]++;
                    } else if (op.type === 'collect' && op.condition(item)) {
                        results[key].push(item);
                    } else if (op.type === 'unique' && op.value) {
                        const val = op.value(item);
                        if (val !== null && val !== undefined) {
                            results[key].add(val);
                        }
                    } else if (op.type === 'sum' && op.value) {
                        results[key] += (op.value(item) || 0);
                    }
                }
            });
            
            // Convert Sets to arrays for unique operations
            for (const key in results) {
                if (results[key] instanceof Set) {
                    results[key] = Array.from(results[key]);
                }
            }
            
            return results;
        },

        /**
         * Request Animation Frame wrapper for smooth animations
         * @param {Function} callback - Function to call on next frame
         */
        raf: function(callback) {
            if (window.requestAnimationFrame) {
                return window.requestAnimationFrame(callback);
            }
            return setTimeout(callback, 16); // ~60fps fallback
        },

        /**
         * Create event delegation handler
         * @param {HTMLElement} parent - Parent element
         * @param {string} selector - CSS selector for target elements
         * @param {string} event - Event type
         * @param {Function} handler - Event handler
         */
        delegateEvent: function(parent, selector, event, handler) {
            if (!parent) return;
            
            parent.addEventListener(event, function(e) {
                const target = e.target.closest(selector);
                if (target) {
                    handler.call(target, e);
                }
            });
        },

        /**
         * Lazy load images when they enter viewport
         * @param {string} selector - CSS selector for images
         */
        lazyLoadImages: function(selector = 'img[data-src]') {
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    });
                });

                document.querySelectorAll(selector).forEach(img => {
                    imageObserver.observe(img);
                });
            } else {
                // Fallback for older browsers
                document.querySelectorAll(selector).forEach(img => {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                });
            }
        }
    };

    // Export to window
    window.PerformanceUtils = PerformanceUtils;

})(window);
