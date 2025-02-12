if (!customElements.get('popup-section')) {
    class Popup extends HTMLElement {
        constructor() {
            super();
            this.overlay = this.querySelector('[data-popup-overlay]');
            this.closeButton = this.querySelector('[data-popup-close]');
            this.popupFrequency = this.getAttribute('data-popup-frequency');
            this.popupDelay = parseInt(this.getAttribute('data-popup-delay')) * 1000;

            this.setupEventListeners();
            this.handleEscKey = this.handleEscKey.bind(this);

            console.log('Popup initialized');

            // Always show popup in editor mode, otherwise check conditions
            if (Shopify.designMode) {
                this.showPopup();
            } else {
                this.checkAndShowPopup();
            }
        }

        handleEscKey(event) {
            if (event.key === 'Escape') {
                if (!Shopify.designMode) {
                    this.hidePopup();
                    this.setStorageOnClose();
                } else {
                    // In editor mode, just dim the overlay
                    this.overlay.style.opacity = '0.3';
                    this.overlay.style.pointerEvents = 'none';
                }
            }
        }

        setupEventListeners() {
            if (!this.closeButton || !this.overlay) return;

            // Add ESC key listener when popup is shown
            document.addEventListener('keydown', this.handleEscKey);

            this.closeButton.addEventListener('click', () => {
                // In editor mode, don't fully hide the popup
                if (Shopify.designMode) {
                    this.overlay.style.opacity = '0.3';
                    this.overlay.style.pointerEvents = 'none';
                } else {
                    this.hidePopup();
                    this.setStorageOnClose();
                }
            });

            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay && !Shopify.designMode) {
                    this.hidePopup();
                    this.setStorageOnClose();
                }
            });

            // Re-show popup when section is reloaded in editor
            if (Shopify.designMode) {
                document.addEventListener('shopify:section:load', (event) => {
                    if (event.target.contains(this)) {
                        this.showPopup();
                    }
                });

                // Show popup when section is selected in editor
                document.addEventListener('shopify:section:select', (event) => {
                    if (event.target.contains(this)) {
                        this.showPopup();
                    }
                });
            }
        }

        disconnectedCallback() {
            // Remove ESC key listener when popup is removed
            document.removeEventListener('keydown', this.handleEscKey);
        }

        setStorageOnClose() {
            const now = new Date().getTime();

            if (this.popupFrequency === 'once_per_session') {
                sessionStorage.setItem('popupShown', 'true');
            } else if (this.popupFrequency === 'once_per_day') {
                localStorage.setItem('popupLastShown', now.toString());
            }
        }

        checkAndShowPopup() {
            const lastShown = localStorage.getItem('popupLastShown');
            const now = new Date().getTime();

            if (this.popupFrequency === 'always') {
                setTimeout(() => this.showPopup(), this.popupDelay);
                return;
            }

            if (this.popupFrequency === 'once_per_session') {
                if (!sessionStorage.getItem('popupShown')) {
                    setTimeout(() => this.showPopup(), this.popupDelay);
                }
                return;
            }

            // once_per_day
            if (!lastShown || (now - parseInt(lastShown)) > 24 * 60 * 60 * 1000) {
                setTimeout(() => this.showPopup(), this.popupDelay);
            }
        }

        showPopup() {
            if (!this.overlay) return;
            this.overlay.classList.add('active');
            if (!Shopify.designMode) {
                document.body.style.overflow = 'hidden';
            }
            // Reset opacity and pointer events in case they were modified
            this.overlay.style.opacity = '';
            this.overlay.style.pointerEvents = '';
        }

        hidePopup() {
            if (!this.overlay) return;
            this.overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    customElements.define('popup-section', Popup);
} 