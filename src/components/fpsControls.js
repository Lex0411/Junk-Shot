// FPS-style mouse controls - smooth mouse following without drag requirement
// Makes the camera follow mouse movement like Valorant/FPS games
// This component enables pointer lock and smooth mouse following

AFRAME.registerComponent('fps-controls', {
	schema: {
		enabled: { type: 'boolean', default: true },
		sensitivity: { type: 'number', default: 0.002 }
	},

	init() {
		this.isLocked = false;
		this.canvas = null;
		this.autoLockAttempted = false;
		this.boundOnMouseMove = this.onMouseMove.bind(this);
		
		// Wait for scene to be ready
		this.el.sceneEl.addEventListener('loaded', () => {
			this.canvas = this.el.sceneEl.canvas;
			this.setupPointerLock();
			// Auto-request pointer lock after a short delay
			this.autoRequestPointerLock();
		});
		
		console.log('FPS controls component initialized');
	},
	
	autoRequestPointerLock() {
		// Don't auto-request - browsers require user interaction
		// Pointer lock will be requested on first click
		this.autoLockAttempted = true;
	},

	setupPointerLock() {
		if (!this.canvas) return;
		
		// Bind methods
		this.onPointerLockChange = this.onPointerLockChange.bind(this);
		this.onPointerLockError = this.onPointerLockError.bind(this);
		this.requestPointerLock = this.requestPointerLock.bind(this);
		
		// Listen for pointer lock changes
		document.addEventListener('pointerlockchange', this.onPointerLockChange);
		document.addEventListener('mozpointerlockchange', this.onPointerLockChange);
		document.addEventListener('webkitpointerlockchange', this.onPointerLockChange);
		document.addEventListener('pointerlockerror', this.onPointerLockError);
		
		// Request pointer lock on click anywhere in the scene (fallback)
		this.canvas.addEventListener('click', this.requestPointerLock);
		
		// Also enable look-controls with pointer lock
		this.el.setAttribute('look-controls', {
			enabled: true,
			pointerLockEnabled: true,
			touchEnabled: false,
			reverseMouseDrag: false
		});
	},

	requestPointerLock(event) {
		if (!this.data.enabled || this.isLocked) return;
		
		// Don't lock if clicking on UI elements (only if event is provided)
		if (event && (event.target.closest('.hud') || event.target.closest('.pause-overlay'))) {
			return;
		}
		
		if (this.canvas) {
			const requestLock = this.canvas.requestPointerLock ||
			                   this.canvas.mozRequestPointerLock ||
			                   this.canvas.webkitRequestPointerLock;
			if (requestLock) {
				try {
					requestLock.call(this.canvas);
				} catch (error) {
					// Some browsers may throw if called without user interaction
					console.log('Pointer lock request failed (may need user interaction):', error);
				}
			}
		}
	},
	
	// Public method to exit pointer lock
	exitPointerLock() {
		if (this.isLocked) {
			const exitLock = document.exitPointerLock ||
			                  document.mozExitPointerLock ||
			                  document.webkitExitPointerLock;
			if (exitLock) {
				exitLock.call(document);
			}
		}
	},

	onPointerLockChange() {
		const isLocked = document.pointerLockElement === this.canvas ||
		                 document.mozPointerLockElement === this.canvas ||
		                 document.webkitPointerLockElement === this.canvas;
		
		this.isLocked = isLocked;
		
		if (isLocked) {
			console.log('Pointer locked - FPS controls active');
			// Disable look-controls and use our own mouse handler
			const lookControls = this.el.components['look-controls'];
			if (lookControls) {
				lookControls.pause();
			}
			document.addEventListener('mousemove', this.boundOnMouseMove);
		} else {
			console.log('Pointer unlocked');
			// Re-enable look-controls
			const lookControls = this.el.components['look-controls'];
			if (lookControls) {
				lookControls.play();
			}
			document.removeEventListener('mousemove', this.boundOnMouseMove);
		}
	},

	onMouseMove(event) {
		if (!this.isLocked || !this.data.enabled) return;
		
		const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
		
		// Get current rotation
		const rotation = this.el.getAttribute('rotation');
		
		// Apply sensitivity to mouse movement
		const sensitivity = this.data.sensitivity;
		rotation.y -= movementX * sensitivity * 100; // Yaw (horizontal)
		rotation.x -= movementY * sensitivity * 100; // Pitch (vertical)
		
		// Clamp vertical rotation to prevent flipping
		rotation.x = Math.max(-90, Math.min(90, rotation.x));
		
		// Apply rotation
		this.el.setAttribute('rotation', rotation);
	},

	onPointerLockError() {
		console.warn('Pointer lock error');
		this.isLocked = false;
	},

	update() {
		// Sensitivity changes are automatically applied via this.data.sensitivity in onMouseMove
		console.log('Sensitivity updated to:', this.data.sensitivity);
	},

	remove() {
		if (this.canvas) {
			this.canvas.removeEventListener('click', this.requestPointerLock);
		}
		
		document.removeEventListener('mousemove', this.boundOnMouseMove);
		document.removeEventListener('pointerlockchange', this.onPointerLockChange);
		document.removeEventListener('mozpointerlockchange', this.onPointerLockChange);
		document.removeEventListener('webkitpointerlockchange', this.onPointerLockChange);
		document.removeEventListener('pointerlockerror', this.onPointerLockError);
		
		// Exit pointer lock
		if (this.isLocked) {
			document.exitPointerLock();
		}
	}
});

