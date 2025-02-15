if (!customElements.get('variant-card')) {
    class VariantCard extends HTMLElement {
        constructor() {
            super();

            this.mainImage = this.querySelector('[data-main-image]');
            if (!this.mainImage) return;

            this.originalSrc = this.mainImage.src;
            this.originalSrcset = this.mainImage.srcset;
            this.secondaryMedia = this.querySelector('.media--hover-effect img:nth-child(2), .media--hover-effect video');

            this.swatchContainer = this.querySelector('.variant-color-swatches');
            this.swatchLinks = this.querySelectorAll('.variant-swatch-link');
            this.initializeSwatches();

            // Initialize video if present
            this.video = this.querySelector('video');
            if (this.video) {
                this.initializeVideo();
            }
        }

        initializeVideo() {
            this.addEventListener('mouseenter', () => {
                if (!this.isSwatchHovered) {
                    this.video.play();
                }
            });

            this.addEventListener('mouseleave', () => {
                this.video.pause();
                this.video.currentTime = 0;
            });
        }

        initializeSwatches() {
            this.isSwatchHovered = false;

            // Handle hover on the swatches container
            if (this.swatchContainer) {
                this.swatchContainer.addEventListener('mouseenter', () => {
                    this.isSwatchHovered = true;
                    if (this.video) {
                        this.video.pause();
                        this.video.currentTime = 0;
                    }
                    if (this.secondaryMedia) {
                        this.secondaryMedia.style.visibility = 'hidden';
                    }
                });

                this.swatchContainer.addEventListener('mouseleave', () => {
                    this.isSwatchHovered = false;
                    if (this.secondaryMedia) {
                        this.secondaryMedia.style.visibility = '';
                    }
                    if (this.video && this.matches(':hover')) {
                        this.video.play();
                    }
                    this.handleSwatchLeave();
                });
            }

            // Handle individual swatch interactions
            this.swatchLinks.forEach(link => {
                link.addEventListener('mouseenter', () => {
                    this.handleSwatchHover(link);
                });
                link.addEventListener('mouseleave', () => {
                    if (!this.swatchContainer.matches(':hover')) {
                        this.handleSwatchLeave();
                    }
                });
                link.addEventListener('click', (e) => this.handleSwatchClick(e, link));
            });
        }

        handleSwatchHover(link) {
            const newSrc = link.getAttribute('data-variant-image');
            const newSrcset = link.getAttribute('data-variant-srcset');

            if (newSrc && newSrcset) {
                this.mainImage.style.opacity = '1';
                this.mainImage.src = newSrc;
                this.mainImage.srcset = newSrcset;
            }
        }

        handleSwatchLeave() {
            this.mainImage.style.opacity = '';
            this.mainImage.src = this.originalSrc;
            this.mainImage.srcset = this.originalSrcset;
        }

        handleSwatchClick(event, link) {
            event.preventDefault();
            window.location.href = link.href;
        }
    }

    customElements.define('variant-card', VariantCard);
} 