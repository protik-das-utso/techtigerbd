/* ========================================
   StreamyBD - Modern Quantity System JS
   ======================================== */

(function () {
    'use strict';

    // Initialize quantity system when DOM is loaded
    function initQuantitySystem() {
        const plans = document.querySelectorAll('.chip--plan, .chip');
        const unit = document.getElementById('pUnit');
        const total = document.getElementById('pTotal');
        const qty = document.getElementById('pQty');
        const qtyMinus = document.getElementById('pQtyMinus');
        const qtyPlus = document.getElementById('pQtyPlus');
        const qtyWrapper = document.querySelector('.qty-wrapper');

        // Debug logging
        console.log('Quantity System: Found', plans.length, 'plan buttons');
        console.log('Quantity System: Elements found:', { unit: !!unit, total: !!total, qty: !!qty });

        // Auto-detect theme based on page or CSS variables
        function detectAndApplyTheme() {
            const rootStyles = getComputedStyle(document.documentElement);
            const accent = rootStyles.getPropertyValue('--accent').trim();
            let theme = 'default';

            // Map accent colors to themes
            const themeMap = {
                '#ff0000': 'youtube',
                '#1db954': 'spotify',
                '#2aabee': 'telegram',
                '#00c2a8': 'surfshark'
            };

            theme = themeMap[accent] || 'default';

            // Apply theme to elements
            if (qtyWrapper) {
                qtyWrapper.setAttribute('data-theme', theme);
            }

            const labelBilingual = document.querySelector('.label-bilingual');
            if (labelBilingual) {
                labelBilingual.setAttribute('data-theme', theme);
            }
        }

        function money(x) {
            return '৳' + x;
        }

        function recalc() {
            const sel = document.querySelector('.chip--plan.active') || plans[0];
            const price = parseFloat(sel?.dataset.price || '50');
            const q = Math.max(1, parseInt(qty?.value || '1', 10));

            if (unit) unit.textContent = money(price);
            if (total) total.textContent = money(price * q);

            // Update button states
            if (qtyMinus) qtyMinus.disabled = q <= 1;
            if (qtyPlus) qtyPlus.disabled = q >= 99;
        }

        // Plan selection handlers
        plans.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                console.log('Plan clicked:', index, btn.dataset.id);
                plans.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                recalc();
            });
        });

        // Initialize first plan as active
        if (plans.length > 0 && !document.querySelector('.chip--plan.active')) {
            plans[0].classList.add('active');
        }

        // Apply theme detection
        detectAndApplyTheme();

        // Initial calculation
        recalc();

        // Quantity decrease handler
        if (qtyMinus) {
            qtyMinus.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const currentVal = Math.max(1, parseInt(qty?.value || '1', 10));
                if (currentVal > 1) {
                    qty.value = currentVal - 1;
                    recalc();
                }
            });

            // Also prevent click events
            qtyMinus.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
        }

        // Quantity increase handler
        if (qtyPlus) {
            qtyPlus.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const currentVal = Math.max(1, parseInt(qty?.value || '1', 10));
                if (currentVal < 99) {
                    qty.value = currentVal + 1;
                    recalc();
                }
            });

            // Also prevent click events
            qtyPlus.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
        }

        // Input field validation
        if (qty) {
            qty.addEventListener('input', (e) => {
                let val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) {
                    e.target.value = 1;
                } else if (val > 99) {
                    e.target.value = 99;
                }
                recalc();
            });
        }

        // Prevent unwanted clicks on form field
        const qtyFormField = document.querySelector('.form-field:has(.qty-wrapper)');
        if (qtyFormField) {
            qtyFormField.addEventListener('click', (e) => {
                // Only allow clicks on the actual input and buttons
                if (!e.target.closest('.qty-wrapper')) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            });
        }

        // Initialize theme and calculations
        detectAndApplyTheme();
        recalc();
    }

    // Enhanced initialization - works with different loading states
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initQuantitySystem);
        } else {
            // DOM already loaded
            initQuantitySystem();
        }
    }

    // Public API for manual initialization
    window.StreamyBDQuantity = {
        init: initQuantitySystem,
        version: '1.0.0'
    };

    // Auto-initialize
    init();

})();

/* ========================================
   Global Integration Helpers
   ======================================== */

// Helper function to create quantity HTML structure
function createQuantityHTML(theme = 'default') {
    return `
    <label class="form-field">
      <div class="qty-label label-bilingual" data-theme="${theme}">
        <span>পরিমাণ / Quantity</span>
      </div>
      <div class="qty-wrapper" data-theme="${theme}">
        <div class="qty">
          <button class="btn decrease" id="pQtyMinus" aria-label="Decrease quantity" title="কমিয়ে দিন / Decrease">
          </button>
          <input class="input center" id="pQty" type="number" min="1" max="99" value="1" aria-label="Quantity" />
          <button class="btn increase" id="pQtyPlus" aria-label="Increase quantity" title="বাড়িয়ে দিন / Increase">
          </button>
        </div>
      </div>
    </label>
  `;
}

// Helper to inject quantity system into any container
function injectQuantitySystem(containerId, theme = 'default') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = createQuantityHTML(theme);
        // Re-initialize the system for the new elements
        if (window.StreamyBDQuantity) {
            window.StreamyBDQuantity.init();
        }
    }
}

// Export helpers
window.StreamyBDQuantityHelpers = {
    createHTML: createQuantityHTML,
    inject: injectQuantitySystem
};