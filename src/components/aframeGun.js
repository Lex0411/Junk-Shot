// A-Frame Gun Component
// Attaches the 3D gun model to the camera and handles shooting visuals

AFRAME.registerComponent('gun-component', {
	schema: {
		model: { type: 'string', default: '/public/models/gun.glb' },
		scale: { type: 'string', default: '1.2 1.2 1.2' },
		rotation: { type: 'string', default: '0 0 0' }
	},

	init() {
		console.log('Gun component initializing with model:', this.data.model);
		
		// Load gun model from public folder
		if (this.data.model) {
			this.el.setAttribute('gltf-model', this.data.model);
			
			// Add error handling for model loading
			this.el.addEventListener('model-loaded', () => {
				console.log('Gun model loaded successfully');
			});
			
			this.el.addEventListener('model-error', (e) => {
				console.error('Failed to load gun model:', this.data.model, e);
			});
		}
		this.el.setAttribute('scale', this.data.scale);
		this.el.setAttribute('rotation', this.data.rotation);
		
		// Idle animation
		this.el.setAttribute('animation__idle', {
			property: 'position',
			from: '0.3 -0.3 -0.5',
			to: '0.3 -0.28 -0.5',
			dur: 2000,
			dir: 'alternate',
			easing: 'easeInOutSine',
			loop: true
		});

		// Listen for shooting events
		this.handleShoot = this.handleShoot.bind(this);
		window.addEventListener('gun:shoot', this.handleShoot);
		
		console.log('Gun component ready, listening for gun:shoot events');
	},

	handleShoot() {
		console.log('Gun shooting! Recoil animation triggered');
		
		// Recoil animation
		this.el.setAttribute('animation__recoil', {
			property: 'position',
			from: '0.3 -0.3 -0.5',
			to: '0.35 -0.32 -0.48',
			dur: 100,
			easing: 'easeOutQuad'
		});

		// Muzzle flash effect
		this.createMuzzleFlash();

		// Reset after recoil
		setTimeout(() => {
			this.el.removeAttribute('animation__recoil');
		}, 100);
	},

	createMuzzleFlash() {
		const flash = document.createElement('a-sphere');
		flash.setAttribute('position', '0 0 -0.6');
		flash.setAttribute('radius', '0.05');
		flash.setAttribute('color', '#ffff00');
		flash.setAttribute('emissive', '#ffff00');
		flash.setAttribute('opacity', '0.9');
		
		this.el.appendChild(flash);

		flash.setAttribute('animation__fade', {
			property: 'opacity',
			from: 0.9,
			to: 0,
			dur: 150,
			easing: 'easeOutQuad'
		});

		flash.setAttribute('animation__scale', {
			property: 'scale',
			from: '1 1 1',
			to: '2 2 2',
			dur: 150,
			easing: 'easeOutQuad'
		});

		setTimeout(() => {
			flash.remove();
		}, 200);
	},

	remove() {
		window.removeEventListener('gun:shoot', this.handleShoot);
	}
});

