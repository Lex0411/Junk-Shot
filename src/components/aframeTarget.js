// A-Frame Target Component
// Enhanced target entity with hit detection and visual feedback

AFRAME.registerComponent('target-item', {
	schema: {
		itemId: { type: 'string' },
		category: { type: 'string' },
		isCorrect: { type: 'boolean', default: false },
		image: { type: 'string' }
	},

	init() {
		// Make target clickable
		this.el.setAttribute('class', 'junkshot-target');
		this.el.setAttribute('data-id', this.data.itemId);
		this.el.setAttribute('data-category', this.data.category);
		this.el.setAttribute('data-correct', String(this.data.isCorrect));
		
		// Note: Click handling is now done via mouse shooting system
		// Keep this for compatibility but it won't be used for shooting
		this.onClick = this.onClick.bind(this);
		// Don't add click listener - mouse shooting handles it
		
		// Add hover effect using A-Frame events
		this.onHoverEnter = this.onHoverEnter.bind(this);
		this.onHoverLeave = this.onHoverLeave.bind(this);
		this.el.addEventListener('mouseenter', this.onHoverEnter);
		this.el.addEventListener('mouseleave', this.onHoverLeave);

		// Add subtle rotation animation for visual interest
		this.el.setAttribute('animation__rotate', {
			property: 'rotation.y',
			from: -5,
			to: 5,
			dur: 3000,
			dir: 'alternate',
			easing: 'easeInOutSine',
			loop: true
		});
	},

	onClick(evt) {
		console.log('A-Frame target clicked:', this.data.itemId, 'Category:', this.data.category);
		// Prevent default to avoid any issues
		if (evt) {
			evt.preventDefault();
			evt.stopPropagation();
		}
		
		// Dispatch custom event that shooting.js can listen to
		const clickEvent = new CustomEvent('target-clicked', {
			detail: {
				target: this.el,
				itemId: this.data.itemId,
				category: this.data.category,
				isCorrect: this.data.isCorrect
			},
			bubbles: true,
			cancelable: true
		});
		
		// Dispatch on both the element and window
		this.el.dispatchEvent(clickEvent);
		window.dispatchEvent(clickEvent);
		
		console.log('Target click event dispatched for:', this.data.itemId);
	},

	onHoverEnter() {
		this.el.setAttribute('animation__hover', {
			property: 'scale',
			from: '0.9 0.9 0.9',
			to: '1.0 1.0 1.0',
			dur: 200,
			easing: 'easeOutQuad'
		});
	},

	onHoverLeave() {
		this.el.setAttribute('animation__hover', {
			property: 'scale',
			from: '1.0 1.0 1.0',
			to: '0.9 0.9 0.9',
			dur: 200,
			easing: 'easeOutQuad'
		});
	},

	remove() {
		// Cleanup
		this.el.removeEventListener('click', this.onClick);
		this.el.removeEventListener('mouseenter', this.onHoverEnter);
		this.el.removeEventListener('mouseleave', this.onHoverLeave);
		this.el.removeAttribute('animation__hover');
		this.el.removeAttribute('animation__rotate');
	}
});

