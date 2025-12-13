// Mouse-based shooting system
// Handles left mouse click shooting with raycasting

import { isCorrectCategory } from './categoryChecker.js';
import { playHitEffect } from '../effects/hitEffect.js';
import { playMissEffect } from '../effects/missEffect.js';
import AudioManager from '../services/audioManager.js';

const audioManager = AudioManager.getInstance();
const TARGET_SELECTOR = '.junkshot-target';

let onTargetHitCallback = null;
let raycaster = null;
let camera = null;
let scene = null;
let THREE = null;
let shootingEnabled = false; // Prevent shooting until pointer lock is active

// Track recently processed shots to prevent duplicate clicks
const processedShots = new Set();
const SHOT_COOLDOWN = 200; // 200ms cooldown between shots

const extractTrashItem = (element) => {
	if (!element) {
		return null;
	}
	return {
		id: element.dataset.id,
		category: element.dataset.category,
		type: element.dataset.type,
		isCorrect: element.dataset.correct === 'true'
	};
};

const handleMouseClick = (event) => {
	// Only handle left mouse button
	if (event.button !== 0) {
		return;
	}
	
	// Don't shoot if shooting is disabled (pointer lock not active yet)
	if (!shootingEnabled) {
		console.log('Shooting disabled - waiting for pointer lock');
		return;
	}
	
	event.preventDefault();
	event.stopPropagation();
	
	// Prevent duplicate shots
	const shotKey = `shot_${Date.now()}`;
	if (processedShots.size > 0) {
		return; // Still in cooldown
	}
	
	processedShots.add(shotKey);
	setTimeout(() => {
		processedShots.delete(shotKey);
	}, SHOT_COOLDOWN);
	
	if (!raycaster || !camera || !scene) {
		console.warn('Raycaster or camera not initialized');
		return;
	}
	
	if (!THREE) {
		THREE = window.AFRAME?.THREE || window.THREE;
		if (!THREE) {
			console.warn('THREE.js not available');
			return;
		}
	}
	
	// Shoot from center of screen (crosshair position), not mouse click position
	// This makes shooting work with pointer lock and FPS-style controls
	const mouse = new THREE.Vector2(0, 0); // Center of screen (0, 0) = crosshair position
	
	// Update raycaster with camera and center position (crosshair)
	raycaster.setFromCamera(mouse, camera);
	
	// Find all targets (should only be containers now)
	const targets = scene.querySelectorAll(TARGET_SELECTOR);
	console.log('Found targets:', targets.length);
	
	const targetObjects = Array.from(targets)
		.map(target => {
			if (!target.object3D) {
				console.warn('Target has no object3D:', target.id);
				return null;
			}
			return target.object3D;
		})
		.filter(obj => obj && obj.visible);
	
	console.log('Target objects for raycast:', targetObjects.length);
	
	// Perform raycast - true means check children recursively
	const intersects = raycaster.intersectObjects(targetObjects, true);
	console.log('Raycast intersects:', intersects.length);
	
	// Play gunshot sound
	audioManager.play('gunshot');
	
	// Trigger gun shoot event for visual feedback
	window.dispatchEvent(new CustomEvent('gun:shoot', { 
		bubbles: true,
		cancelable: true 
	}));
	
	if (intersects.length > 0) {
		// Hit a target
		const hitObject = intersects[0].object;
		
		// Find the A-Frame entity from the Three.js object
		// Traverse up the parent chain to find the A-Frame entity
		let targetElement = null;
		
		// Traverse up from the hit object to find the container
		let checkObj = hitObject;
		while (checkObj && !targetElement) {
			// Check all targets to see if this object belongs to any of them
			for (const target of targets) {
				if (!target.object3D) continue;
				
				// Check if checkObj is the target's object3D itself
				if (checkObj === target.object3D) {
					targetElement = target;
					break;
				}
				
				// Check if checkObj is a child of the target's object3D
				// (the image or outline is a child of the container)
				let parent = checkObj.parent;
				while (parent) {
					if (parent === target.object3D) {
						targetElement = target;
						break;
					}
					parent = parent.parent;
				}
				
				if (targetElement) break;
			}
			
			if (!targetElement) {
				checkObj = checkObj.parent;
			}
		}
		
		if (targetElement) {
			// Make sure we have the data attributes
			console.log('Found target element:', {
				id: targetElement.id,
				dataset: {
					id: targetElement.dataset.id,
					category: targetElement.dataset.category,
					type: targetElement.dataset.type,
					correct: targetElement.dataset.correct
				}
			});
			
			const trashItem = extractTrashItem(targetElement);
			
			if (!trashItem || !trashItem.id) {
				console.error('Failed to extract trash item from target:', targetElement);
				return;
			}
			
			const expectedCategory = targetElement.closest('[data-round-category]')?.dataset.roundCategory ||
			                         document.querySelector('#aframe-stage')?.dataset.roundCategory ||
			                         document.querySelector('#game-scene')?.dataset.roundCategory;
			
			console.log('Hit target:', {
				targetId: trashItem.id,
				category: trashItem.category,
				type: trashItem.type,
				expectedCategory: expectedCategory,
				isCorrectFlag: trashItem.isCorrect
			});
			
			// Check if the target's category matches the expected category
			const isCorrect = isCorrectCategory(trashItem, expectedCategory);
			
			console.log('Target evaluation:', {
				targetCategory: trashItem.category,
				expectedCategory: expectedCategory,
				isCorrect: isCorrect
			});
			
			if (isCorrect) {
				playHitEffect?.(targetElement);
			} else {
				playMissEffect?.(targetElement);
			}
			
			// Call the callback with the result
			onTargetHitCallback?.(isCorrect, trashItem);
		} else {
			// Hit something but couldn't find the element
			console.warn('Hit object but could not find target element', {
				hitObject: hitObject,
				hitObjectParent: hitObject.parent,
				targetsCount: targets.length
			});
		}
	} else {
		// Missed - play miss effect at cursor position
		console.log('Missed shot');
		// Could add a miss effect here if needed
	}
};

const initializeRaycaster = () => {
	// Wait for A-Frame scene to be ready
	const checkScene = () => {
		scene = document.querySelector('#game-scene');
		if (!scene) {
			setTimeout(checkScene, 100);
			return;
		}
		
		camera = document.querySelector('#camera');
		if (!camera || !camera.components || !camera.components['look-controls']) {
			setTimeout(checkScene, 100);
			return;
		}
		
		// Get the Three.js camera from A-Frame
		const cameraObj = camera.getObject3D('camera');
		if (!cameraObj) {
			setTimeout(checkScene, 100);
			return;
		}
		
		// Get THREE.js from A-Frame
		THREE = window.AFRAME?.THREE || window.THREE;
		if (!THREE) {
			setTimeout(checkScene, 100);
			return;
		}
		
		// Create raycaster
		raycaster = new THREE.Raycaster();
		raycaster.far = 100;
		
		// Store camera reference
		camera = cameraObj;
		
		console.log('Mouse shooting system initialized');
		
		// Listen for pointer lock changes to enable shooting
		const onPointerLockChange = () => {
			const canvas = scene?.canvas || document.querySelector('#game-scene')?.canvas;
			const isLocked = document.pointerLockElement === canvas ||
			                 document.mozPointerLockElement === canvas ||
			                 document.webkitPointerLockElement === canvas;
			
			if (isLocked) {
				shootingEnabled = true;
				console.log('Shooting enabled - pointer lock active');
			} else {
				shootingEnabled = false;
			}
		};
		
		document.addEventListener('pointerlockchange', onPointerLockChange);
		document.addEventListener('mozpointerlockchange', onPointerLockChange);
		document.addEventListener('webkitpointerlockchange', onPointerLockChange);
		
		// Also enable shooting after a delay as fallback
		setTimeout(() => {
			if (!shootingEnabled) {
				shootingEnabled = true;
				console.log('Shooting enabled (fallback)');
			}
		}, 2000);
	};
	
	checkScene();
};

export const registerMouseShooting = (callback) => {
	onTargetHitCallback = callback;
	
	// Initialize raycaster
	initializeRaycaster();
	
	// Listen for mouse clicks
	document.addEventListener('mousedown', handleMouseClick);
	
	console.log('Mouse shooting handlers registered');
};

export const unregisterMouseShooting = () => {
	document.removeEventListener('mousedown', handleMouseClick);
	onTargetHitCallback = null;
	raycaster = null;
	camera = null;
	scene = null;
	processedShots.clear();
	shootingEnabled = false;
};

