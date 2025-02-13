/**
 * AreaCalculator Class
 * Custom calculator for square meter pricing
 */
class AreaCalculator extends HTMLElement {
  constructor() {
    super();
    this.basePrice = parseFloat(this.dataset.basePrice);
    this.productId = this.dataset.productId;
    this.domain = this.dataset.domain || 'https://price-calculator.test';
    this.inputSelectors = {
      length: '[data-length-input]',
      width: '[data-width-input]',
      variant: 'form[action="/cart/add"] [name="id"]',
      quantity: 'form[action="/cart/add"] [name="quantity"]',
      form: 'form[action="/cart/add"]'
    };
    this.outputSelectors = {
      area: '[data-total-area]',
      price: '[data-total-price]',
      originalPrice: '[data-original-price]',
      totalPriceSpinner: '[data-total-price-spinner]'
    };

    // Add translation strings
    this.strings = {
      enterLength: window.themeStrings?.enterLength || 'Please enter a length between {min}-{max}cm',
      enterWidth: window.themeStrings?.enterWidth || 'Please enter a width between {min}-{max}cm',
      failedVariant: window.themeStrings?.failedVariant || 'Failed to create variant',
      widthRange: window.themeStrings?.widthRange || 'Width must be between {min}-{max}cm',
      lengthRange: window.themeStrings?.lengthRange || 'Length must be between {min}-{max}cm'
    };

    // Add debounce timeout property
    this.debounceTimeout = null;

    // Track if inputs have been interacted with
    this.inputsInteracted = {
      length: false,
      width: false
    };

    // Cache the active formula
    this.activeFormula = null;

    // Initialize after fetching formula
    this.initialize();
  }

  async initialize() {
    await this.fetchActiveFormula();
    this.disableDefaultPriceUpdates();
    this.init();
  }

  disableDefaultPriceUpdates() {
    // Find variant selectors
    const variantSelectors = document.querySelectorAll('variant-selects, variant-radios');

    variantSelectors.forEach(selector => {
      console.log('selector', selector);
      // Listen for variant change events
      selector.addEventListener('change', (event) => {
        console.log('change', event);
        // Prevent default price updates by storing original prices
        const priceElements = document.querySelectorAll('.price__regular .price-item--regular, .price__sale .price-item--sale');
        priceElements.forEach(element => {
          console.log('element', element);
          // Store original price if not already stored
          let originalPrice = element.innerHTML;
          if (!element.dataset.originalPrice) {
            element.dataset.originalPrice = originalPrice;
          }
          // Restore original price
          setTimeout(() => {
            element.innerHTML = originalPrice;
            console.log('set timeout element', element);
          }, 1000);
        });
      });
    });
  }

  // Add debounce helper method
  debounce(func, wait = 300) {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => func(), wait);
  }

  async fetchActiveFormula() {
    try {
      const response = await fetch(`${this.domain}/api/price-formulas`);
      const formulas = await response.json();
      this.activeFormula = formulas.find(f => f.is_active) || formulas[0];

      // Log the formula details for debugging
      console.log('Active Formula:', {
        name: this.activeFormula.name,
        parameters: this.activeFormula.formula_parameters,
        ranges: this.activeFormula.value_ranges,
        explanation: this.activeFormula.formula_explanation
      });
    } catch (error) {
      console.error('Error fetching price formula:', error);
    }
  }

  getValueForInput(input, ranges) {
    for (const range of ranges) {
      if (input >= range.start && input <= range.end) {
        // Use value_raw instead of value since value includes the currency symbol
        return range.value_raw;
      }
    }
    return null;
  }

  calculatePrice(width, length) {
    if (!this.activeFormula) return 0;

    try {
      // Get values from ranges using value_raw
      const widthValue = this.getValueForInput(width, this.activeFormula.value_ranges);
      const lengthValue = length;

      if (!widthValue || !lengthValue) {
        return 0;
      }

      // Get formula parameters
      const {
        markup,
        tax,
        base_addition,
        length_divisor
      } = this.activeFormula.formula_parameters;

      console.log('Formula parameters:', {
        markup,
        tax,
        base_addition,
        length_divisor
      });

      // Calculate price using the formula:
      // width_value * (length_value / length_divisor) * (markup + 1) * (tax + 1) + base_addition
      const price = widthValue *
        (lengthValue / length_divisor) *
        (markup + 1) *
        (tax + 1) +
        base_addition;

      return Math.floor(price) * 100;
    } catch (error) {
      console.error('Error calculating price:', error);
      return 0;
    }
  }

  getErrorMessageForInputs(width, length) {
    const ranges = this.activeFormula.value_ranges;
    const minRange = ranges[0];
    const maxRange = ranges[ranges.length - 1];

    let message = '';

    if (!this.getValueForInput(width, ranges)) {
      message += this.strings.widthRange
        .replace('{min}', minRange.start)
        .replace('{max}', maxRange.end) + ' ';
    }

    if (!this.getValueForInput(length, ranges)) {
      message += this.strings.lengthRange
        .replace('{min}', minRange.start)
        .replace('{max}', maxRange.end);
    }

    return message.trim();
  }

  async createVariant(width, length, variantId) {
    if (!this.activeFormula) return null;

    try {
      const response = await fetch(`${this.domain}/api/make-variant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formula_id: this.activeFormula.id,
          width,
          length,
          productId: this.productId,
          variantId
        })
      });

      console.log('response', response);

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      return result.variant;
    } catch (error) {
      console.error('Error creating variant:', error);
      return null;
    }
  }

  init() {
    // Cache DOM elements - now using document.querySelector for form elements
    this.lengthInput = this.querySelector(this.inputSelectors.length);
    this.widthInput = this.querySelector(this.inputSelectors.width);
    this.variantInput = document.querySelector(this.inputSelectors.variant);
    this.quantityInput = document.querySelector(this.inputSelectors.quantity);
    this.form = document.querySelector(this.inputSelectors.form);
    this.totalAreaOutput = this.querySelector(this.outputSelectors.area);
    this.totalPriceOutput = this.querySelector(this.outputSelectors.price);
    this.originalPriceOutput = this.querySelector(this.outputSelectors.originalPrice);
    this.submitButton = document.querySelector('[type="submit"][name="add"]');
    this.totalPriceSpinner = this.querySelector(this.outputSelectors.totalPriceSpinner);

    // Create error message elements
    this.createErrorElements();

    // Only set default values if inputs are empty or zero
    if (this.activeFormula && this.activeFormula.value_ranges.length > 0) {
      const minRange = this.activeFormula.value_ranges[0];

      if (this.lengthInput && (!this.lengthInput.value || parseFloat(this.lengthInput.value) === 0)) {
        this.lengthInput.value = minRange.start;
        this.inputsInteracted.length = true;
      } else if (this.lengthInput && this.lengthInput.value) {
        // If there's an existing value, mark as interacted
        this.inputsInteracted.length = true;
      }

      if (this.widthInput && (!this.widthInput.value || parseFloat(this.widthInput.value) === 0)) {
        this.widthInput.value = minRange.start;
        this.inputsInteracted.width = true;
      } else if (this.widthInput && this.widthInput.value) {
        // If there's an existing value, mark as interacted
        this.inputsInteracted.width = true;
      }
    } else {
      // Fallback to input min attributes if no formula ranges, but only if inputs are empty or zero
      if (this.lengthInput && (!this.lengthInput.value || parseFloat(this.lengthInput.value) === 0)) {
        const minLength = parseFloat(this.lengthInput.min) || 0;
        this.lengthInput.value = minLength;
        this.inputsInteracted.length = true;
      } else if (this.lengthInput && this.lengthInput.value) {
        this.inputsInteracted.length = true;
      }

      if (this.widthInput && (!this.widthInput.value || parseFloat(this.widthInput.value) === 0)) {
        const minWidth = parseFloat(this.widthInput.min) || 0;
        this.widthInput.value = minWidth;
        this.inputsInteracted.width = true;
      } else if (this.widthInput && this.widthInput.value) {
        this.inputsInteracted.width = true;
      }
    }

    // Bind event listeners
    this.bindEvents();

    // Initial calculation and validation
    this.updateCalculations();
    this.validateInput(this.lengthInput, 'length');
    this.validateInput(this.widthInput, 'width');
  }

  createErrorElements() {
    // Create error message containers
    ['length', 'width'].forEach(type => {
      const input = this[`${type}Input`];
      if (!input) return;

      const errorDiv = document.createElement('div');
      errorDiv.className = 'twcss-text-red-500 twcss-text-xs twcss-mt-1 twcss-hidden';
      errorDiv.setAttribute(`data-${type}-error`, '');
      input.parentNode.insertBefore(errorDiv, input.nextSibling);
    });
  }

  bindEvents() {
    // Track first interaction on input instead of focus
    this.lengthInput?.addEventListener('input', () => {
      this.inputsInteracted.length = true;
      this.validateAndUpdate(this.lengthInput, 'length');
    });
    this.widthInput?.addEventListener('input', () => {
      this.inputsInteracted.width = true;
      this.validateAndUpdate(this.widthInput, 'width');
    });

    this.quantityInput?.addEventListener('change', () => this.updateCalculations());

    // Use button click instead of form submit
    console.log('Setting up button click handler, button:', this.submitButton);
    if (this.submitButton) {
      this.submitButton.addEventListener('click', (event) => {
        console.log('Button clicked');
        event.preventDefault();
        event.stopPropagation(); // Stop event from bubbling up
        this.handleSubmit(event);
      });
    }
  }

  validateAndUpdate(input, type) {
    this.debounce(() => {
      this.validateInput(input, type);
      this.updateCalculations();
    }, 300);
  }

  validateInput(input, type) {
    if (!input || !this.inputsInteracted[type]) return true;

    const value = parseFloat(input.value) || 0;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || Infinity;
    const isValid = value > 0 && value >= min && value <= max;

    const errorElement = this.querySelector(`[data-${type}-error]`);

    if (!value || !isValid) {
      input.classList.add('!twcss-border-red-500', '!twcss-ring-red-500');
      input.setAttribute('aria-invalid', 'true');
      if (errorElement) {
        const errorMessage = type === 'length' ? this.strings.enterLength : this.strings.enterWidth;
        errorElement.textContent = errorMessage
          .replace('{min}', min)
          .replace('{max}', max);
        errorElement.classList.remove('twcss-hidden');
      }
      if (this.submitButton) {
        this.submitButton.setAttribute('disabled', 'disabled');
        this.submitButton.classList.add('twcss-opacity-50', 'twcss-cursor-not-allowed');
      }
    } else {
      input.classList.remove('!twcss-border-red-500', '!twcss-ring-red-500');
      input.removeAttribute('aria-invalid');
      if (errorElement) {
        errorElement.classList.add('twcss-hidden');
        errorElement.textContent = '';
      }
      // Only enable submit if both inputs are valid
      if (this.submitButton && this.areAllInputsValid()) {
        this.submitButton.removeAttribute('disabled');
        this.submitButton.classList.remove('twcss-opacity-50', 'twcss-cursor-not-allowed');
      }
    }

    return isValid;
  }

  handleInputChange(event) {
    this.updateCalculations();
  }

  areAllInputsValid() {
    const lengthValue = parseFloat(this.lengthInput?.value) || 0;
    const widthValue = parseFloat(this.widthInput?.value) || 0;
    const lengthMin = parseFloat(this.lengthInput?.min) || 0;
    const lengthMax = parseFloat(this.lengthInput?.max) || Infinity;
    const widthMin = parseFloat(this.widthInput?.min) || 0;
    const widthMax = parseFloat(this.widthInput?.max) || Infinity;

    const isLengthValid = lengthValue > 0 && lengthValue >= lengthMin && lengthValue <= lengthMax;
    const isWidthValid = widthValue > 0 && widthValue >= widthMin && widthValue <= widthMax;

    return isLengthValid && isWidthValid;
  }

  // Get current variant ID from the form
  getCurrentVariantId() {
    return this.variantInput?.value;
  }

  async handleSubmit(event) {
    console.log('handleSubmit called', {
      form: this.form,
      variantInput: this.variantInput,
      variantValue: this.variantInput?.value,
      submitButton: this.submitButton
    });

    // Mark both inputs as interacted with on submit
    this.inputsInteracted.length = true;
    this.inputsInteracted.width = true;

    const length = parseFloat(this.lengthInput?.value) || 0;
    const width = parseFloat(this.widthInput?.value) || 0;

    if (!this.areAllInputsValid()) {
      return;
    }

    const loadingSpinner = this.submitButton?.querySelector('.loading__spinner');

    try {
      // Disable submit button and show loading state
      if (this.submitButton) {
        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        loadingSpinner?.classList.remove('hidden');
      }

      // Get current variant ID
      const currentVariantId = this.getCurrentVariantId();
      if (!currentVariantId) {
        throw new Error('No variant selected');
      }

      // Create variant with calculated price
      const variant = await this.createVariant(width, length, currentVariantId);

      // Handle variant creation errors
      if (!variant) {
        console.error('Failed to create variant:', {
          width,
          length,
          productId: this.productId,
          variantId: currentVariantId
        });
        throw new Error(this.strings.failedVariant);
      }

      // Check if variant has an error property
      if (variant.error) {
        console.error('Variant creation error:', variant.error, {
          width,
          length,
          productId: this.productId,
          variantId: currentVariantId
        });
        throw new Error(variant.error || this.strings.failedVariant);
      }

      // Extract numeric ID from GraphQL ID
      const numericId = variant.id.split('/').pop();

      // Prepare cart data
      const cartData = {
        items: [{
          id: numericId,
          quantity: parseInt(this.quantityInput?.value) || 1,
          properties: {
            '_Length': length,
            '_Width': width,
            'Verticaal (cm)': length,
            'Horizontaal (cm)': width,
          }
        }]
      };

      // Add to cart using Shopify Cart API
      const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartData)
      });

      const result = await response.json();

      if (result.status === 422 || result.status === 'bad_request') {
        throw new Error(result.description || result.message || 'Failed to add to cart');
      }

      // Update cart drawer if it exists
      const cartDrawer = document.querySelector('cart-drawer');
      if (cartDrawer) {
        // Get sections to render
        const sections = cartDrawer.getSectionsToRender().map((section) => section.id);

        // Fetch cart sections
        const sectionsResponse = await fetch(`${window.Shopify.routes.root}cart/update.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({
            sections: sections,
            sections_url: window.location.pathname
          })
        });

        if (sectionsResponse.ok) {
          const sectionsData = await sectionsResponse.json();

          // Try to get non-zero prices with polling
          const updatedSectionsData = await this.pollForNonZeroPrices(sections, sectionsData);

          // Remove any existing message
          this.removePollingMessage();

          // Render the final content
          cartDrawer.renderContents(updatedSectionsData);

          // Ensure drawer is opened and empty state is removed
          cartDrawer.classList.remove('is-empty');
          cartDrawer.open();
        }
      }

      // Dispatch event for successful add to cart
      this.dispatchEvent(
        new CustomEvent('variant:added', {
          bubbles: true,
          detail: {
            variant: { ...variant, id: numericId },  // Pass the numeric ID
            result
          }
        })
      );

    } catch (error) {
      console.error('Error adding to cart:', error);
      // Show error in the appropriate error element
      const errorElement = this.querySelector('[data-length-error]');
      if (errorElement) {
        errorElement.textContent = error.message;
        errorElement.classList.remove('twcss-hidden');
      }
    } finally {
      // Reset button state
      if (this.submitButton) {
        this.submitButton.classList.remove('loading');
        this.submitButton.removeAttribute('aria-disabled');
        loadingSpinner?.classList.add('hidden');
      }
    }
  }

  updateCalculations() {
    const length = parseFloat(this.lengthInput?.value) || 0;
    const width = parseFloat(this.widthInput?.value) || 0;
    const quantity = parseInt(this.quantityInput?.value) || 1;

    // Convert cm² to m²
    const areaSqm = (length * width) / 10000;

    // Calculate price using the local formula calculation
    const totalPrice = this.calculatePrice(width, length) * quantity;

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

    // Update our custom price output
    if (this.totalPriceOutput) {
      this.totalPriceSpinner.classList.add('hidden');
      this.totalPriceOutput.innerHTML = this.formatMoney(price);
    }

    // Update default Shopify price elements if they exist
    const defaultPriceElements = document.querySelectorAll('.price-item--regular, .price-item');
    defaultPriceElements.forEach(element => {
      element.innerHTML = this.formatMoney(price);
    });
  }

  updateCartInputs(area, price) {
    if (this.variantInput) {
      this.variantInput.dataset.price = price;
    }

    const length = parseFloat(this.lengthInput?.value) || 0;
    const width = parseFloat(this.widthInput?.value) || 0;

    // Validate inputs
    if (!this.areAllInputsValid()) {
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

  createPollingMessage($message) {
    // Remove any existing message first
    this.removePollingMessage();

    const messageDiv = document.createElement('div');
    messageDiv.id = 'polling-message';
    messageDiv.className = 'twcss-text-sm twcss-text-gray-600 twcss-mt-2 twcss-text-center';
    messageDiv.innerHTML = $message;

    const submitButton = this.submitButton;
    if (submitButton && submitButton.parentNode) {
      submitButton.parentNode.insertBefore(messageDiv, submitButton.nextSibling);
    }
  }

  removePollingMessage() {
    const existingMessage = document.getElementById('polling-message');
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  async pollForNonZeroPrices(sections, originalData, maxAttempts = 10) {
    console.log('Starting price polling process...');
    console.log('Original sections data:', originalData);

    let currentAttempt = 0;
    let currentData = originalData;

    // Early return if we don't have cart-drawer section
    if (!sections.includes('cart-drawer')) {
      console.log('No cart-drawer section found in sections list');
      return currentData;
    }

    while (currentAttempt < maxAttempts) {
      console.log(`\nAttempt ${currentAttempt + 1} of ${maxAttempts}`);

      // Show message after 4th attempt
      if (currentAttempt === 1) {
        this.createPollingMessage('Even geduld, we zijn jouw product op maat aan het berekenen...');
      }

      if (currentAttempt === 2) {
        this.createPollingMessage('We zijn bijna klaar met het berekenen van jouw product op maat...');
      }

      if (currentAttempt === 3) {
        this.createPollingMessage('Nog heel even geduld, we zijn bijna klaar...');
      }

      // Check if current data has zero prices
      const cartDrawerHtml = currentData?.sections?.['cart-drawer'] || currentData['cart-drawer'];
      if (!cartDrawerHtml) {
        console.log('No cart drawer HTML found in response data');
        return currentData;
      }

      const hasZeroPrices = this.checkForZeroPrices(cartDrawerHtml);
      console.log(`Current data has zero prices: ${hasZeroPrices}`);

      if (!hasZeroPrices) {
        console.log('Found valid non-zero prices, returning data');
        return currentData;
      }

      // Linear delay: 500ms, 1000ms, 1500ms, 2000ms, 2500ms
      const delay = Math.min(500 * (currentAttempt + 1), 5000);
      console.log(`Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        console.log('Fetching updated cart sections...');
        // Fetch updated cart sections
        const response = await fetch(`${window.Shopify.routes.root}cart/update.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({
            sections: sections,
            sections_url: window.location.pathname
          })
        });

        if (response.ok) {
          const newData = await response.json();
          console.log('Received new cart data:', newData);

          // Ensure we have cart drawer HTML in the new data
          const newCartDrawerHtml = newData?.sections?.['cart-drawer'] || newData['cart-drawer'];
          if (!newCartDrawerHtml) {
            console.log('No cart drawer HTML found in new response data');
            continue;
          }

          const newHasZeroPrices = this.checkForZeroPrices(newCartDrawerHtml);
          console.log(`New data has zero prices: ${newHasZeroPrices}`);

          if (!newHasZeroPrices) {
            console.log('Found valid non-zero prices in new data, returning');
            return newData;
          }
          currentData = newData;
        } else {
          console.log('Failed to fetch updated cart sections:', response.status);
        }
      } catch (error) {
        console.error('Error during polling attempt:', error);
      }

      currentAttempt++;
    }

    console.log('Exhausted all polling attempts, returning last available data');
    return currentData;
  }

  checkForZeroPrices(html) {
    if (!html) {
      console.log('No HTML content provided to check prices');
      return false;
    }

    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Find all price elements
    const priceElements = tempDiv.querySelectorAll('.price.price--end');
    console.log(`Found ${priceElements.length} price elements to check`);

    if (priceElements.length === 0) {
      console.log('No price elements found in cart drawer HTML');
      return false;
    }

    // Check if any price element contains €0,00 and has a non-empty product link
    const hasZeroPrice = Array.from(priceElements).some(element => {
      const priceCell = element.closest('.cart-item__totals');
      if (!priceCell) {
        console.log('Price element not in a totals cell:', element.textContent);
        return false;
      }

      const cartItem = priceCell.closest('.cart-item');
      if (!cartItem) {
        console.log('Price element not in a cart item:', element.textContent);
        return false;
      }

      const productLink = cartItem.querySelector('.cart-item__name');
      const price = element.textContent.trim();
      const hasValidProduct = productLink && productLink.href;
      const isZeroPrice = price === '€0,00';

      console.log('Price check:', {
        price,
        hasValidProduct,
        isZeroPrice,
        productUrl: hasValidProduct ? productLink.href : 'none'
      });

      return hasValidProduct && isZeroPrice;
    });

    console.log(`Final zero price check result: ${hasZeroPrice}`);
    return hasZeroPrice;
  }
}

// Register custom element
customElements.define('area-calculator', AreaCalculator);
