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
		// Auto-request pointer lock after scene is ready
		// This prevents accidental clicks from shooting
		if (!this.canvas) return;
		
		// Try to request immediately
		this.requestPointerLock();
		
		// Mark as attempted
		this.autoLockAttempted = true;
		
		// If it didn't work, try again after a delay (some browsers require user interaction)
		setTimeout(() => {
			if (!this.isLocked && this.canvas) {
				this.requestPointerLock();
			}
		}, 100);
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
		
		// Auto-request pointer lock immediately after setup
		// Wait a bit for everything to initialize, then try multiple times if needed
		setTimeout(() => {
			this.autoRequestPointerLock();
		}, 500);
		
		// Retry if first attempt fails (browser may require user interaction first)
		setTimeout(() => {
			if (!this.isLocked && this.canvas) {
				this.requestPointerLock();
			}
		}, 1500);
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
		} else {
			console.log('Pointer unlocked');
		}
	},

	onPointerLockError() {
		console.warn('Pointer lock error');
		this.isLocked = false;
	},

	update() {
		// Update look-controls sensitivity if needed
		if (this.data.enabled) {
			this.el.setAttribute('look-controls', {
				enabled: true,
				pointerLockEnabled: true,
				touchEnabled: false
			});
		}
	},

	remove() {
		if (this.canvas) {
			this.canvas.removeEventListener('click', this.requestPointerLock);
		}
		
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

