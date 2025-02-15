class AlertMessage extends HTMLElement {
    constructor() {
        super();
        this.closeButton = this.querySelector('.alert-message__close');

        if (this.closeButton) {
            this.closeButton.addEventListener('click', this.close.bind(this));
        }
    }

    close() {
        this.animate(
            [
                { opacity: 1, transform: 'translateY(0)' },
                { opacity: 0, transform: 'translateY(-10px)' }
            ],
            { duration: 200, easing: 'ease-out' }
        ).onfinish = () => {
            this.remove();
        };
    }
}

customElements.define('alert-message', AlertMessage); 