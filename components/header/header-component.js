/**
 * Header Component - Reusable hea                    <nav class="primary">
                        <a href="${basePath}#plans">Plans</a>
                        <a href="${basePath}#why">Why us</a>
                        <a href="${basePath}#faq">FAQ</a>
                    </nav>or all pages
 */

class HeaderComponent {
    constructor(options = {}) {
        this.options = {
            brandName: options.brandName || 'Tech Tiger BD',
            basePath: options.basePath || '/',
            ...options
        };
    }

    render() {
        const { brandName, basePath } = this.options;

        // Brand name with muted "BD" suffix
        let brandNameHtml = brandName;
        if (brandName.includes('BD')) {
            brandNameHtml = brandName.replace('BD', '<span class="muted">BD</span>');
        }

        return `
            <header class="topbar">
                <div class="container inner">
                    <a class="brand" href="${basePath}">
                        <span>${brandNameHtml}</span>
                    </a>
                    <nav class="primary">
                        <a href="${basePath}#plans">Plans</a>
                        <a href="${basePath}#why">Why us</a>
                        <a href="${basePath}#faq">FAQ</a>
                    </nav>
                </div>
            </header>
        `;
    }

    // Method to inject header into a page
    injectIntoPage(targetSelector = 'body') {
        const headerHtml = this.render();
        const targetElement = document.querySelector(targetSelector);

        if (targetElement) {
            // If there's already a header, replace it
            const existingHeader = targetElement.querySelector('header.topbar');
            if (existingHeader) {
                existingHeader.outerHTML = headerHtml;
            } else {
                // Insert at the beginning of the target element
                targetElement.insertAdjacentHTML('afterbegin', headerHtml);
            }
        }
    }

    // Static method for easy component creation and injection
    static create(options = {}) {
        const header = new HeaderComponent(options);
        header.injectIntoPage();
        return header;
    }
}

// Predefined configurations for different page types
HeaderComponent.configs = {
    home: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    youtube: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    netflix: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    chatgpt: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    spotify: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    prime: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    disney: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    hbo: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    crunchyroll: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    surfshark: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    telegram: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    gemini: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    freefire: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    pay: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    },

    delivery: {
        brandName: 'Tech Tiger BD',
        basePath: '/'
    }
};

// Make it available globally
window.HeaderComponent = HeaderComponent;