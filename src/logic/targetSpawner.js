const STAGE_SELECTOR = '#game-scene';
const TARGET_CLASS = 'junkshot-target';
const ROW_GAP = 2.8;
const COLUMN_GAP = 2.8;
const BASE_DISTANCE = -2;
const BASE_HEIGHT = 5;
const TARGET_SCALE = '1.0 1.0 1.0';
const MOVE_AMPLITUDE = 0.3;
const MOVE_DURATION_BASE = 4000;

// Get target scale based on difficulty mode
const getTargetScale = (gridSize, movementSpeed) => {
    return '1.0 1.0 1.0';
};

// Calculate spacing for grid layout
const getSpacing = (gridSize, movementSpeed) => {
    if (movementSpeed === 1) {
        return { rowGap: 2.2, colGap: 2.2 };
    }
    if (movementSpeed === 2) {
        return { rowGap: 2.2, colGap: 2.2 };
    }
    if (gridSize === 3 && movementSpeed === 0) {
        return { rowGap: 2.4, colGap: 2.4 };
    }
    return { rowGap: 2.8, colGap: 2.8 };
};

let stageRef = null;

const getStage = () => {
    if (!stageRef) {
        stageRef = document.querySelector(STAGE_SELECTOR);
        if (!stageRef) {
            stageRef = document.querySelector('#aframe-stage #game-scene');
        }
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
    const baseHeight = BASE_HEIGHT;
    const y = baseHeight + (row - offset) * spacing.rowGap;
    let z = BASE_DISTANCE;
    if (movementSpeed === 2) {
        z = -3.5;
    } else if (movementSpeed === 1) {
        z = -2.5;
    }
    return { x, y, z };
};

// Apply zigzag movement based on speed
const attachMovement = (entity, rowIndex, columnIndex, speed, expectedX) => {
    if (!entity || speed <= 0) {
        return;
    }
    
    const duration = 3000 / speed;
    const amplitude = 0.3 * speed;
    
    entity.setAttribute('zigzag-movement', {
        axis: 'x',
        duration: duration,
        amplitude: amplitude
    });
};

const createTargetEntity = (item, index, gridSize, movementSpeed) => {
    const position = computePosition(index, gridSize, movementSpeed);
    
    // Create parent entity (wrapper) - holds position and data
    const parent = document.createElement('a-entity');
    parent.classList.add(TARGET_CLASS);
    parent.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    parent.setAttribute('rotation', '0 180 0');
    
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
    
    parent.setAttribute('target-item', {
        itemId: item.id,
        category: item.category || '',
        isCorrect: item.isCorrect,
        image: imagePath
    });
    
    // Create child entity (animator) - holds animation
    const child = document.createElement('a-entity');
    child.setAttribute('position', '0 0 0');
    
    // Apply zigzag animation using local coordinates
    if (movementSpeed > 0) {
        const duration = 3000 / movementSpeed;
        let amplitude = 0.3 * movementSpeed;
        
        // Alternate row movement direction
        if (row % 2 === 1) {
            amplitude = -amplitude;
        }
        
        child.setAttribute('zigzag-movement', {
            axis: 'x',
            duration: duration,
            amplitude: amplitude
        });
    }
    
    // Create visuals
    const targetScale = getTargetScale(gridSize, movementSpeed);
    
    // Create image entity
    const entity = document.createElement('a-image');
    entity.setAttribute('scale', targetScale);
    entity.setAttribute('src', imagePath);
    entity.setAttribute('width', '2');
    entity.setAttribute('height', '2');
    entity.setAttribute('position', '0 0 0');
    entity.setAttribute('material', {
        shader: 'flat',
        side: 'double',
        transparent: true
    });
    entity.setAttribute('data-raycastable', '');
    
    // Create outline plane
    const outline = document.createElement('a-plane');
    outline.setAttribute('width', '2.05');
    outline.setAttribute('height', '2.05');
    outline.setAttribute('position', '0 0 0.01');
    outline.setAttribute('material', {
        color: '#4ecdc4',
        shader: 'flat',
        side: 'double',
        transparent: true,
        opacity: 0.9
    });
    outline.setAttribute('rotation', '0 0 0');
    outline.setAttribute('visible', 'true');
    
    // Attach visuals to child
    child.appendChild(entity);
    child.appendChild(outline);
    
    // Attach child to parent
    parent.appendChild(child);
    
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
        setTimeout(() => spawnTargets(category, gridSize, movementSpeed, trashList), 200);
        return;
    }
    clearTargets();
    
    // Get scene element
    let sceneEl = stage;
    if (stage.tagName === 'DIV' || stage.id === 'aframe-stage') {
        sceneEl = stage.querySelector('#game-scene') || stage.sceneEl;
    }
    if (!sceneEl) {
        sceneEl = document.querySelector('#game-scene');
    }
    
    // Wait for A-Frame to be ready
    if (sceneEl && !sceneEl.hasLoaded) {
        sceneEl.addEventListener('loaded', () => {
            spawnTargets(category, gridSize, movementSpeed, trashList);
        }, { once: true });
        return;
    }
    
    if (!trashList || trashList.length === 0) {
        return;
    }
    
    let scene = stage;
    if (stage.tagName === 'DIV' || stage.id === 'aframe-stage') {
        scene = stage.querySelector('#game-scene') || stage.sceneEl;
    }
    
    if (!scene || (scene.tagName !== 'A-SCENE' && !scene.sceneEl)) {
        scene = document.querySelector('#game-scene');
    }
    
    if (!scene) {
        return;
    }
    
    trashList.forEach((item, index) => {
        try {
            const target = createTargetEntity(item, index, gridSize, movementSpeed);
            scene.appendChild(target);
            
            // Wait for entity to load before verifying
            target.addEventListener('loaded', () => {
                if (target.object3D && target.object3D.parent) {
                    target.object3D.visible = true;
                    target.object3D.updateMatrixWorld(true);
                    target.flushToDOM();
                }
            }, { once: true });
        } catch (error) {
            console.error('Error creating target:', error);
        }
    });
    
    // Re-register click handlers for new targets
    setTimeout(() => {
        const targets = stage.querySelectorAll(`.${TARGET_CLASS}`);
        if (targets.length > 0 && window._junkshotClickHandler) {
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
};
