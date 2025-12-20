const STAGE_SELECTOR = '#game-scene';
const TARGET_CLASS = 'junkshot-target';
const ROW_GAP = 2.8; // Increased gap to prevent overlap (targets are 2.4 units with scale)
const COLUMN_GAP = 2.8; // Increased gap to prevent overlap
// Targets positioned higher to avoid tree obstruction
// Camera is at z=4, y=1.2 looking straight ahead
// Using previous distance but elevated to clear trees
const BASE_DISTANCE = -2; // Previous distance (back to original)
const BASE_HEIGHT = 5; // Raised higher so bottom row is well above ground
const TARGET_SCALE = '1.0 1.0 1.0'; // Base scale for easy mode
const MOVE_AMPLITUDE = 0.3; // Reduced movement for posters on wall
const MOVE_DURATION_BASE = 4000;

// Get target scale based on difficulty mode
const getTargetScale = (gridSize, movementSpeed) => {
	// All modes use consistent scale now that targets are raised higher
	return '1.0 1.0 1.0';
};

// Spacing configuration - balanced gaps for different modes to avoid tree obstruction
const getSpacing = (gridSize, movementSpeed) => {
	// Intermediate mode (movementSpeed === 1) - gap of 2.2
	if (movementSpeed === 1) {
		return { rowGap: 2.2, colGap: 2.2 }; // Intermediate mode spacing
	}
	// Hard mode (movementSpeed === 2) - same spacing as intermediate
	if (movementSpeed === 2) {
		return { rowGap: 2.2, colGap: 2.2 }; // Same as intermediate for consistent grid
	}
	// Easy mode (gridSize === 3, movementSpeed === 0) - tighter gap to avoid tree obstruction
	if (gridSize === 3 && movementSpeed === 0) {
		return { rowGap: 2.4, colGap: 2.4 }; // Tighter gap for easy mode
	}
	// Default spacing (fallback)
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

const computePosition = (index, gridSize, movementSpeed = 0) => {
	const row = Math.floor(index / gridSize);
	const column = index % gridSize;
	const offset = (gridSize - 1) / 2;
	const spacing = getSpacing(gridSize, movementSpeed);
	let x = (column - offset) * spacing.colGap;
	// Use BASE_HEIGHT for all modes - no overrides needed
	const baseHeight = BASE_HEIGHT;
	// Center the grid vertically around baseHeight (same as horizontal centering)
	const y = baseHeight + (row - offset) * spacing.rowGap;
	// Distance: Hard mode furthest back, intermediate slightly back, easy at base distance
	let z = BASE_DISTANCE;
	if (movementSpeed === 2) {
		z = -3.5; // Hard mode: push targets further back to increase difficulty
	} else if (movementSpeed === 1) {
		z = -2.5; // Intermediate mode: push targets slightly back
	}
	return { x, y, z };
};

const attachMovement = (entity, rowIndex, columnIndex, speed, expectedX) => {
    if (!entity) {
        return;
    }
    
    // Easy mode (speed = 0): No movement
    if (speed <= 0) {
        return;
    }
    
    // Intermediate and Hard modes (speed > 0): Apply zigzag movement
    // Higher speed = faster and wider zigzags
    // Speed 1 (Intermediate): 3000ms duration, 0.3 amplitude (slower, narrower)
    // Speed 2 (Hard): 1500ms duration, 0.6 amplitude (faster, wider)
    const duration = 3000 / speed; // Speed 1 = 3000ms, Speed 2 = 1500ms
    const amplitude = 0.3 * speed; // Speed 1 = 0.3 units, Speed 2 = 0.6 units
    
    entity.setAttribute('zigzag-movement', {
        axis: 'x',
        duration: duration,
        amplitude: amplitude
    });
};

const createTargetEntity = (item, index, gridSize, movementSpeed) => {
    // Compute position as object with x, y, z
    const position = computePosition(index, gridSize, movementSpeed);
    
    // STEP 1: Create Parent Entity (The Wrapper) - Holds position and data
    const parent = document.createElement('a-entity');
    parent.classList.add(TARGET_CLASS);
    parent.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    parent.setAttribute('rotation', '0 180 0'); // Rotate to face camera
    
    // Store all data attributes on the parent
    parent.id = item.id;
    parent.dataset.id = item.id;
    parent.dataset.correct = String(item.isCorrect);
    parent.dataset.type = item.type;
    parent.dataset.category = item.category || '';
    
    const row = Math.floor(index / gridSize);
    const column = index % gridSize;
    parent.dataset.rowIndex = row;
    parent.dataset.columnIndex = column;
    
    // Fix image path
    let imagePath = item.image;
    if (imagePath.startsWith('public/')) {
        imagePath = '/' + imagePath;
    } else if (!imagePath.startsWith('/') && !imagePath.startsWith('http')) {
        imagePath = '/' + imagePath;
    }
    
    // Set target-item component with data on the parent
    parent.setAttribute('target-item', {
        itemId: item.id,
        category: item.category || '',
        isCorrect: item.isCorrect,
        image: imagePath
    });
    
    // STEP 2: Create Child Entity (The Animator) - Holds animation
    const child = document.createElement('a-entity');
    child.setAttribute('position', '0 0 0'); // Start at local origin relative to parent
    
    // Apply zigzag animation to child using LOCAL coordinates
    if (movementSpeed > 0) {
        // Higher speed = faster and wider zigzags
        // Speed 1 (Intermediate): 3000ms duration, 0.3 amplitude (slower, narrower)
        // Speed 2 (Hard): 1500ms duration, 0.6 amplitude (faster, wider)
        const duration = 3000 / movementSpeed; // Speed 1 = 3000ms, Speed 2 = 1500ms
        let amplitude = 0.3 * movementSpeed; // Speed 1 = 0.3 units, Speed 2 = 0.6 units
        
        // Alternate row movement: even rows move right first, odd rows move left first
        if (row % 2 === 1) {
            amplitude = -amplitude; // Reverse direction for odd rows
        }
        
        child.setAttribute('zigzag-movement', {
            axis: 'x',
            duration: duration,
            amplitude: amplitude
        });
    }
    
    // STEP 3: Create Visuals (Outline + Image) - Attach to Child
    const targetScale = getTargetScale(gridSize, movementSpeed);
    
    // Create the image entity FIRST (in front)
    const entity = document.createElement('a-image');
    entity.setAttribute('scale', targetScale);
    entity.setAttribute('src', imagePath);
    entity.setAttribute('width', '2');
    entity.setAttribute('height', '2');
    entity.setAttribute('position', '0 0 0');
    
    // Material settings for image rendering
    entity.setAttribute('material', {
        shader: 'flat',
        side: 'double',
        transparent: true
    });
    
    entity.setAttribute('data-raycastable', ''); // Make image raycaster-detectable
    
    // Create outline plane (behind the image)
    const outline = document.createElement('a-plane');
    outline.setAttribute('width', '2.05'); // Thinner outline - closer to image size (2.0)
    outline.setAttribute('height', '2.05');
    outline.setAttribute('position', '0 0 0.01'); // Behind the image (positive Z after 180° rotation = away from camera)
    outline.setAttribute('material', {
        color: '#4ecdc4', // Cyan outline color
        shader: 'flat',
        side: 'double',
        transparent: true,
        opacity: 0.9
    });
    outline.setAttribute('rotation', '0 0 0');
    outline.setAttribute('visible', 'true');
    
    // Add error handling for image loading
    entity.addEventListener('loaded', () => {
        console.log(`Target image loaded: ${item.name || item.id}`);
    });
    
    entity.addEventListener('error', (e) => {
        console.error(`Failed to load image for ${item.name || item.id}:`, imagePath, e);
        // Set a fallback color if image fails
        entity.setAttribute('material', 'color: #ff0000; shader: flat');
    });
    
    // Attach visuals to child (the animator) - IMAGE FIRST so it renders on top
    child.appendChild(entity);
    child.appendChild(outline);
    
    // Attach child to parent
    parent.appendChild(child);
    
    // Return the parent (wrapper) entity
    return parent;
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
            spawnTargets(category, gridSize, movementSpeed, trashList);
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
    
    // Determine the actual scene element
    let scene = stage;
    if (stage.tagName === 'DIV' || stage.id === 'aframe-stage') {
        scene = stage.querySelector('#game-scene') || stage.sceneEl;
    }
    
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
            console.log(`Creating target ${index + 1}/${trashList.length}: ${item.name || item.id}`);
            
            const target = createTargetEntity(item, index, gridSize, movementSpeed);
            
            // Add to scene first - A-Frame needs entity in DOM to initialize
            scene.appendChild(target);
            
            // Use A-Frame's loaded event to ensure entity is ready
            target.addEventListener('loaded', () => {
                if (target.object3D && target.object3D.parent) {
                    // Position is already set on creation, just verify it's correct
                    const expectedPos = computePosition(index, gridSize, movementSpeed);
                    const actualPos = target.object3D.position;
                    
                    console.log(`✓ Target ${index + 1}/${trashList.length} loaded: ${item.name || item.id}`);
                    console.log(`  Expected: (${expectedPos.x.toFixed(2)}, ${expectedPos.y.toFixed(2)}, ${expectedPos.z.toFixed(2)})`);
                    console.log(`  Actual: (${actualPos.x.toFixed(2)}, ${actualPos.y.toFixed(2)}, ${actualPos.z.toFixed(2)})`);
                    
                    // Force update to ensure visibility
                    target.object3D.visible = true;
                    target.object3D.updateMatrixWorld(true);
                    target.flushToDOM();
                    
                    // Verify visibility after a brief delay
                    setTimeout(() => {
                        const visible = target.object3D.visible !== false;
                        const inScene = target.sceneEl !== null;
                        const pos3d = target.object3D.position;
                        console.log(`Target ${item.id} - visible: ${visible}, inScene: ${inScene}, 3D pos: (${pos3d.x.toFixed(2)}, ${pos3d.y.toFixed(2)}, ${pos3d.z.toFixed(2)})`);
                        if (!visible || !inScene) {
                            console.warn(`⚠ Target ${item.id} may not be visible or in scene`);
                        }
                    }, 100);
                } else {
                    console.error(`✗ Target ${item.id} object3D not available after loaded event`);
                }
            }, { once: true });
            
            // Verify the entity was added
            if (!target.parentNode) {
                console.error(`✗ Target ${item.id} was not added to scene!`);
            }
        } catch (error) {
            console.error(`✗ Error creating target ${index}:`, error, error.stack);
        }
    });
    
    console.log(`Scene children count after:`, scene.children.length);
    
    // Re-register shooting handlers after a brief delay to ensure all targets are ready
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
};
