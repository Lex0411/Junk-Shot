const STAGE_SELECTOR = '#game-scene';
const TARGET_CLASS = 'junkshot-target';
const ROW_GAP = 2.8; // Increased gap to prevent overlap (targets are 2.4 units with scale)
const COLUMN_GAP = 2.8; // Increased gap to prevent overlap
// Targets positioned in front of the building
// Camera is at z=2, y=1.2 looking straight ahead
// Move targets forward so they appear in front of the building structures
const BASE_DISTANCE = -2; // Position in front of the building
const BASE_HEIGHT = 1.2; // Same height as camera (y=1.2) - eye level straight-on view
const TARGET_SCALE = '1.2 1.2 1.2';
const MOVE_AMPLITUDE = 0.3; // Reduced movement for posters on wall
const MOVE_DURATION_BASE = 4000;

// Use the SAME spacing for ALL difficulties - copy exact configuration from easy mode
const getSpacing = (gridSize) => {
	// Same spacing for all grid sizes - ensures identical positioning
	return { rowGap: 2.8, colGap: 2.8 };
};

let stageRef = null;

const getStage = () => {
	if (!stageRef) {
		// First try to get the A-Frame scene element directly
		stageRef = document.querySelector(STAGE_SELECTOR);
		// If not found, try nested in aframe-stage
		if (!stageRef) {
			stageRef = document.querySelector('#aframe-stage #game-scene');
		}
		// Last resort: get the container div
		if (!stageRef) {
			stageRef = document.querySelector('#aframe-stage');
		}
	}
	return stageRef;
};

const computePosition = (index, gridSize) => {
	const row = Math.floor(index / gridSize);
	const column = index % gridSize;
	const offset = (gridSize - 1) / 2;
	const spacing = getSpacing(gridSize);
	const x = (column - offset) * spacing.colGap;
	// Use the same positioning formula for ALL difficulties (easy, medium, hard)
	// This ensures consistent visual positioning across all modes
	const y = BASE_HEIGHT + row * spacing.rowGap;
	// Position exactly on the wall surface (front face of wall)
	const z = BASE_DISTANCE; // All targets at same distance (on the wall surface)
	return { x, y, z };
};

const attachMovement = (entity, rowIndex, speed, expectedX) => {
	// Disable movement for all modes - targets should be stationary like posters on wall
	// This matches easy mode behavior where targets don't float
	if (!entity || speed <= 0) {
		return;
	}
	// Disable movement animation entirely to prevent floating effect
	return;
	// Wait for entity to be in scene and position to be set before adding animation
	// Use expectedX if provided, otherwise read from entity after it's positioned
	setTimeout(() => {
		if (!entity.object3D || !entity.object3D.parent) {
			// Retry if not ready
			setTimeout(() => attachMovement(entity, rowIndex, speed, expectedX), 100);
			return;
		}
		
		const amplitude = MOVE_AMPLITUDE * (rowIndex % 2 === 0 ? 1 : -1);
		const duration = Math.max(1200, MOVE_DURATION_BASE / speed);
		
		// Use expectedX if provided, otherwise read from object3D
		const x = expectedX !== undefined ? expectedX : (entity.object3D.position.x || 0);
		
		// Only add animation if position is valid (not at origin)
		if (Math.abs(x) > 0.01 || Math.abs(entity.object3D.position.z) < -1) {
			entity.setAttribute('animation__zigzag', {
				property: 'position.x',
				from: x - amplitude,
				to: x + amplitude,
				dur: duration,
				dir: 'alternate',
				easing: 'linear',
				loop: true
			});
		} else {
			// Position not set yet, retry
			setTimeout(() => attachMovement(entity, rowIndex, speed, expectedX), 100);
		}
	}, 300); // Increased delay to ensure position is set first
};

const createTargetEntity = (item, index, gridSize, movementSpeed) => {
	// Compute position as object with x, y, z
	const position = computePosition(index, gridSize);
	
	// Create container entity to hold outline and image
	const container = document.createElement('a-entity');
	container.classList.add(TARGET_CLASS);
	container.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
	container.setAttribute('rotation', '0 180 0'); // Rotate container to face camera
	
	// Create outline plane (slightly larger, positioned behind the image)
	const outline = document.createElement('a-plane');
	outline.setAttribute('width', '2.3'); // Slightly larger than image (2.0)
	outline.setAttribute('height', '2.3');
	outline.setAttribute('position', '0 0 -0.01'); // Slightly behind the image (negative z = further from camera after 180° rotation)
	outline.setAttribute('material', {
		color: '#4ecdc4', // Cyan outline color
		shader: 'flat',
		side: 'double',
		transparent: true,
		opacity: 0.9
	});
	outline.setAttribute('rotation', '0 0 0');
	// Don't make outline raycaster-detectable - only the image should be hit
	outline.setAttribute('visible', 'true');
	
	// Create the image entity
	const entity = document.createElement('a-image');
	// Don't add TARGET_CLASS to image - only container should have it
	entity.setAttribute('scale', TARGET_SCALE);
	
	// Fix image path - ensure it starts with / if it doesn't
	// Paths from garbageItems.json are like "public/textures/..." 
	// Need to convert to "/public/textures/..." for web server
	let imagePath = item.image;
	if (imagePath.startsWith('public/')) {
		imagePath = '/' + imagePath;
	} else if (!imagePath.startsWith('/') && !imagePath.startsWith('http')) {
		imagePath = '/' + imagePath;
	}
	
	// Set a-image attributes properly
	entity.setAttribute('src', imagePath);
	entity.setAttribute('width', '2');
	entity.setAttribute('height', '2');
	entity.setAttribute('position', '0 0 0');
	
	// Ensure material supports transparency for PNG images with transparent backgrounds
	// For PNG files with transparency, just use transparent: true (no alphaTest needed)
	entity.setAttribute('material', {
		shader: 'flat',
		transparent: true,
		opacity: 1.0,
		side: 'double', // Render both sides so targets are visible from camera
		alphaTest: 0 // Only use alphaTest if needed, 0 means use image's actual alpha channel
	});
	
	// Set target-item component with data on the container
	container.setAttribute('target-item', {
		itemId: item.id,
		category: item.category || '',
		isCorrect: item.isCorrect,
		image: imagePath
	});
	
	container.id = item.id;
	container.dataset.id = item.id;
	container.dataset.correct = String(item.isCorrect);
	container.dataset.type = item.type;
	container.dataset.category = item.category || '';
	
	// Make sure container is interactive and raycaster-detectable
	container.setAttribute('data-raycastable', '');
	entity.setAttribute('data-raycastable', '');
	
	// Add error handling for image loading
	entity.addEventListener('loaded', () => {
		console.log(`Target image loaded: ${item.name || item.id}`);
	});
	
	entity.addEventListener('error', (e) => {
		console.error(`Failed to load image for ${item.name || item.id}:`, imagePath, e);
		// Set a fallback color if image fails
		entity.setAttribute('material', 'color: #ff0000; shader: flat');
	});
	
	// Add outline and image to container
	container.appendChild(outline);
	container.appendChild(entity);
	
	const row = Math.floor(index / gridSize);
	// Pass expected x position to animation so it doesn't read (0,0,0)
	attachMovement(container, row, movementSpeed, position.x);
	
	return container;
};

export const clearTargets = () => {
	const stage = getStage();
	if (!stage) {
		return;
	}
	stage.querySelectorAll(`.${TARGET_CLASS}`).forEach((element) => {
		element.remove();
	});
};

export const spawnTargets = (category, gridSize, movementSpeed, trashList) => {
	const stage = getStage();
	if (!stage) {
		console.warn('TargetSpawner: Missing stage element, retrying...');
		// Retry after a short delay if scene isn't ready
		setTimeout(() => spawnTargets(category, gridSize, movementSpeed, trashList), 200);
		return;
	}
	clearTargets();
	
	// Determine the actual scene element
	let sceneEl = stage;
	if (stage.tagName === 'DIV' || stage.id === 'aframe-stage') {
		sceneEl = stage.querySelector('#game-scene') || stage.sceneEl;
	}
	if (!sceneEl) {
		sceneEl = document.querySelector('#game-scene');
	}
	
	// Wait for A-Frame to be ready if needed
	if (sceneEl && !sceneEl.hasLoaded) {
		sceneEl.addEventListener('loaded', () => {
			setTimeout(() => spawnTargets(category, gridSize, movementSpeed, trashList), 100);
		}, { once: true });
		return;
	}
	
	console.log(`Spawning ${trashList.length} targets for category: ${category}`);
	console.log(`Stage element:`, stage);
	console.log(`Stage type:`, stage?.tagName);
	
	if (!trashList || trashList.length === 0) {
		console.warn('No trash items to spawn!');
		return;
	}
	
	// Wait a bit for A-Frame to fully initialize entities
	setTimeout(() => {
		if (!stage) {
			console.error('Stage not available for spawning targets');
			return;
		}
		
		// Determine the actual scene element
		// If stage is the a-scene element, use it directly
		// If stage is a div, get the scene from it
		let scene = stage;
		if (stage.tagName === 'DIV' || stage.id === 'aframe-stage') {
			scene = stage.querySelector('#game-scene') || stage.sceneEl;
		}
		
		// If we still don't have a scene, try to get it from the stage
		if (!scene || (scene.tagName !== 'A-SCENE' && !scene.sceneEl)) {
			scene = document.querySelector('#game-scene');
		}
		
		if (!scene) {
			console.error('A-Frame scene element not found for spawning targets');
			return;
		}
		
		console.log(`Adding targets to scene:`, scene.tagName, scene.id);
		console.log(`Scene hasLoaded:`, scene.hasLoaded);
		console.log(`Scene children count before:`, scene.children.length);
		
		trashList.forEach((item, index) => {
			try {
				// Calculate expected position FIRST
				const expectedPos = computePosition(index, gridSize);
				console.log(`Creating target ${index + 1}/${trashList.length}: ${item.name || item.id} - Expected pos: (${expectedPos.x.toFixed(2)}, ${expectedPos.y.toFixed(2)}, ${expectedPos.z.toFixed(2)})`);
				
				const target = createTargetEntity(item, index, gridSize, movementSpeed);
				
				// Add to scene first - A-Frame needs entity in DOM to initialize
				scene.appendChild(target);
				
				// Wait for entity to be fully loaded, then set position IMMEDIATELY
				const applyPosition = () => {
					if (target.object3D && target.object3D.parent) {
						// Set position using attribute (A-Frame's preferred method)
						target.setAttribute('position', `${expectedPos.x} ${expectedPos.y} ${expectedPos.z}`);
						// Also set directly on object3D to ensure it sticks
						target.object3D.position.set(expectedPos.x, expectedPos.y, expectedPos.z);
						// Ensure rotation is correct (face camera)
						target.object3D.rotation.y = Math.PI; // 180 degrees in radians
						// Force update
						target.object3D.updateMatrixWorld(true);
						// Ensure visible
						target.object3D.visible = true;
						return true; // Position applied successfully
					}
					return false; // Not ready yet
				};
				
				// Try to apply position immediately
				if (!applyPosition()) {
					// Wait for A-Frame to fully initialize the entity
					target.addEventListener('loaded', applyPosition, { once: true });
					// Also try after a delay in case loaded already fired
					setTimeout(() => {
						if (!applyPosition()) {
							// Last resort - keep retrying
							const retry = setInterval(() => {
								if (applyPosition()) {
									clearInterval(retry);
								}
							}, 50);
							setTimeout(() => clearInterval(retry), 2000); // Stop after 2 seconds
						}
					}, 100);
				}
				
				// Ensure target is added to scene and visible
				if (target.parentNode) {
					const pos = target.getAttribute('position');
					const posStr = typeof pos === 'object' ? `${pos.x} ${pos.y} ${pos.z}` : pos;
					const imgPath = target.getAttribute('src');
					console.log(`✓ Target ${index + 1}/${trashList.length} created: ${item.name || item.id} at ${posStr}, image: ${imgPath}`);
					
					// Force update to ensure visibility
					target.flushToDOM();
					
					// Verify the entity is in the scene after a delay
					setTimeout(() => {
						if (target.object3D) {
							const visible = target.object3D.visible !== false;
							const inScene = target.sceneEl !== null;
							const pos3d = target.object3D.position;
							console.log(`Target ${item.id} - visible: ${visible}, inScene: ${inScene}, 3D pos: (${pos3d.x.toFixed(2)}, ${pos3d.y.toFixed(2)}, ${pos3d.z.toFixed(2)})`);
							if (!visible || !inScene) {
								console.warn(`⚠ Target ${item.id} may not be visible or in scene`);
							}
						} else {
							console.warn(`⚠ Target ${item.id} object3D not available yet`);
						}
					}, 500);
				} else {
					console.error(`✗ Target ${item.id} was not added to scene!`);
				}
			} catch (error) {
				console.error(`✗ Error creating target ${index}:`, error, error.stack);
			}
		});
		
		console.log(`Scene children count after:`, scene.children.length);
		
		// Re-register shooting handlers after targets are added
		setTimeout(() => {
			const targets = stage.querySelectorAll(`.${TARGET_CLASS}`);
			console.log(`Total targets in scene: ${targets.length}`);
			console.log(`Target positions:`, Array.from(targets).map(t => t.getAttribute('position')));
			
			if (targets.length > 0 && window._junkshotClickHandler) {
				// Re-register click handlers for new targets
				targets.forEach((element) => {
					element.addEventListener('click', (e) => {
						const clickEvent = new CustomEvent('target-clicked', {
							detail: {
								target: element,
								itemId: element.dataset.id,
								category: element.dataset.category,
								isCorrect: element.dataset.correct === 'true'
							},
							bubbles: true
						});
						window.dispatchEvent(clickEvent);
					});
				});
			}
		}, 200);
		
		console.log(`Successfully spawned ${trashList.length} targets`);
	}, 100);
};
