/**
 * AreaCalculator Class
 * Custom calculator for square meter pricing
 */
class AreaCalculator extends HTMLElement {
  constructor() {
    super();
    this.basePrice = parseFloat(this.dataset.basePrice);
    this.inputSelectors = {
      length: '[data-length-input]',
      width: '[data-width-input]',
      variant: '[name="id"]',
      quantity: '[name="quantity"]'
    };
    this.outputSelectors = {
      area: '[data-total-area]',
      price: '[data-total-price]',
      originalPrice: '[data-original-price]'
    };

    // Add debounce timeout property
    this.debounceTimeout = null;

    this.init();
  }

  // Add debounce helper method
  debounce(func, wait = 300) {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => func(), wait);
  }

  init() {
    // Cache DOM elements
    this.lengthInput = this.querySelector(this.inputSelectors.length);
    this.widthInput = this.querySelector(this.inputSelectors.width);
    this.variantInput = document.querySelector(this.inputSelectors.variant);
    this.quantityInput = document.querySelector(this.inputSelectors.quantity);
    this.totalAreaOutput = this.querySelector(this.outputSelectors.area);
    this.totalPriceOutput = this.querySelector(this.outputSelectors.price);
    this.originalPriceOutput = this.querySelector(this.outputSelectors.originalPrice);

    // Bind event listeners
    this.bindEvents();

    // Initial calculation
    this.updateCalculations();
  }

  bindEvents() {
    this.lengthInput?.addEventListener('input', this.handleInputChange.bind(this));
    this.widthInput?.addEventListener('input', this.handleInputChange.bind(this));
    this.quantityInput?.addEventListener('change', this.handleInputChange.bind(this));
  }

  handleInputChange(event) {
    this.debounce(() => this.updateCalculations());
  }

  updateCalculations() {
    const length = parseFloat(this.lengthInput?.value) || 0;
    const width = parseFloat(this.widthInput?.value) || 0;
    const quantity = parseInt(this.quantityInput?.value) || 1;

    // Convert cm² to m²
    const areaSqm = (length * width) / 10000;

    // Calculate total price (basePrice is already in cents)
    const totalPrice = areaSqm * this.basePrice * quantity;

    // Update displays
    this.updateDisplays(areaSqm, totalPrice);

    // Update hidden inputs for cart
    this.updateCartInputs(areaSqm, totalPrice);

    // Dispatch custom event for other components
    this.dispatchEvent(
      new CustomEvent('price:update', {
        bubbles: true,
        detail: { price: totalPrice, area: areaSqm }
      })
    );
  }

  updateDisplays(area, price) {
    if (this.totalAreaOutput) {
      this.totalAreaOutput.textContent = area.toFixed(2);
    }

    if (this.totalPriceOutput) {
      this.totalPriceOutput.innerHTML = this.formatMoney(price);
    }
  }

  updateCartInputs(area, price) {
    if (this.variantInput) {
      this.variantInput.dataset.price = price;
    }

    // Get min/max values from input elements
    const length = parseFloat(this.lengthInput?.value) || 0;
    const width = parseFloat(this.widthInput?.value) || 0;
    const minLength = parseFloat(this.lengthInput?.min) || 0;
    const maxLength = parseFloat(this.lengthInput?.max) || Infinity;
    const minWidth = parseFloat(this.widthInput?.min) || 0;
    const maxWidth = parseFloat(this.widthInput?.max) || Infinity;

    // Get error elements
    const lengthError = this.querySelector('[data-length-error]');
    const widthError = this.querySelector('[data-width-error]');

    // Validate each input separately, only if there's a value
    if (this.lengthInput?.value && (length < minLength || length > maxLength)) {
      this.lengthInput.classList.add('!twcss-border-red-500', '!twcss-ring-red-500');
      lengthError.textContent = `Please enter a length between ${minLength}-${maxLength}cm`;
    } else {
      this.lengthInput.classList.remove('!twcss-border-red-500', '!twcss-ring-red-500');
      lengthError.textContent = '';
    }

    if (this.widthInput?.value && (width < minWidth || width > maxWidth)) {
      this.widthInput.classList.add('!twcss-border-red-500', '!twcss-ring-red-500');
      widthError.textContent = `Please enter a width between ${minWidth}-${maxWidth}cm`;
    } else {
      this.widthInput.classList.remove('!twcss-border-red-500', '!twcss-ring-red-500');
      widthError.textContent = '';
    }

    // Return if either input is invalid (only when they have values)
    if ((this.lengthInput?.value && (length < minLength || length > maxLength)) ||
      (this.widthInput?.value && (width < minWidth || width > maxWidth))) {
      return;
    }

    // Add line item properties that will be saved with the order
    const properties = {
      '_Length': length,  // Underscore prefix ensures it shows in order admin
      '_Width': width,
      'Length (cm)': length,
      'Width (cm)': width
    };

    // Update or create properties input
    this.updateLineItemProperties(properties);

    // Also save as cart attributes (optional, for additional data persistence)
    this.updateCartAttributes(length, width, area);
  }

  updateCartAttributes(length, width, area) {
    // Create hidden inputs for cart attributes if they don't exist
    const cartAttributeFields = {
      'Length_cm': length,
      'Width_cm': width,
      'Total_Area_sqm': area.toFixed(2)
    };

    Object.entries(cartAttributeFields).forEach(([key, value]) => {
      let attributeInput = document.querySelector(`[name="attributes[${key}]"]`);

      if (!attributeInput) {
        attributeInput = document.createElement('input');
        attributeInput.type = 'hidden';
        attributeInput.name = `attributes[${key}]`;
        this.appendChild(attributeInput);
      }

      attributeInput.value = value;
    });
  }

  updateLineItemProperties(properties) {
    Object.entries(properties).forEach(([key, value]) => {
      let propertyInput = this.querySelector(`[name="properties[${key}]"]`);

      if (!propertyInput) {
        propertyInput = document.createElement('input');
        propertyInput.type = 'hidden';
        propertyInput.name = `properties[${key}]`;
        this.appendChild(propertyInput);
      }

      propertyInput.value = value;
    });
  }

  formatMoney(cents) {
    // Try to get the current currency from Shopify's Currency object if it exists
    const currentCurrency = Shopify?.currency?.active || window.shop?.money_format?.currency || 'USD';

    if (typeof Shopify.formatMoney === 'function') {
      // Use Shopify's built-in formatter if available
      return Shopify.formatMoney(cents, window.shop.money_format);
    }

    // Fallback to browser's built-in formatter
    return (cents / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: currentCurrency
    });
  }
}

// Register custom element
customElements.define('area-calculator', AreaCalculator);
