import { isCorrectCategory } from './categoryChecker.js';
import { playHitEffect } from '../effects/hitEffect.js';
import { playMissEffect } from '../effects/missEffect.js';
import AudioManager from '../services/audioManager.js';

const audioManager = AudioManager.getInstance();

const TARGET_SELECTOR = '.junkshot-target';

let onTargetHitCallback = null;
// Track recently processed targets to prevent duplicate clicks
const processedTargets = new Set();
const PROCESS_COOLDOWN = 500; // 500ms cooldown per target

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

const handleTargetClick = (event) => {
	const targetElement = event.detail?.target || event.currentTarget || event.target;
	if (!targetElement) return;
	
	// Get unique target ID
	const targetId = targetElement.id || targetElement.dataset.id;
	if (!targetId) return;
	
	// Prevent duplicate processing
	const processKey = `${targetId}_${Date.now()}`;
	if (processedTargets.has(targetId)) {
		console.log('Duplicate click ignored for target:', targetId);
		return;
	}
	
	// Mark as processed
	processedTargets.add(targetId);
	// Remove from set after cooldown
	setTimeout(() => {
		processedTargets.delete(targetId);
	}, PROCESS_COOLDOWN);
	
	const trashItem = extractTrashItem(targetElement);
	const expectedCategory = targetElement.closest('[data-round-category]')?.dataset.roundCategory ||
	                         document.querySelector('#aframe-stage')?.dataset.roundCategory ||
	                         document.querySelector('#game-scene')?.dataset.roundCategory;
	const isCorrect = isCorrectCategory(trashItem, expectedCategory);
	
	// Play gunshot sound
	console.log('Playing gunshot sound');
	audioManager.play('gunshot');
	
	// Trigger gun shoot event for visual feedback
	console.log('Dispatching gun:shoot event');
	window.dispatchEvent(new CustomEvent('gun:shoot', { 
		bubbles: true,
		cancelable: true 
	}));
	
	if (isCorrect) {
		playHitEffect?.(targetElement);
	} else {
		playMissEffect?.(targetElement);
	}
	onTargetHitCallback?.(isCorrect, trashItem);
};

export const registerShootingHandlers = (callback) => {
	onTargetHitCallback = callback;
	
	// Listen for A-Frame target-clicked events (only once, on window)
	const handleAFrameClick = (event) => {
		console.log('Target clicked event received:', event.detail);
		if (event.detail && event.detail.target) {
			handleTargetClick(event);
		}
	};
	
	// Listen on window only (events bubble up from document)
	window.addEventListener('target-clicked', handleAFrameClick, true);
	
	// Also register click handlers on existing targets
	const registerTargetClicks = () => {
		document.querySelectorAll(TARGET_SELECTOR).forEach((element) => {
			// Remove existing listener if any
			element.removeEventListener('click', handleTargetClick);
			// Add new listener
			element.addEventListener('click', (e) => {
				console.log('Direct click on target:', element.id);
				handleTargetClick(e);
			});
		});
	};
	
	// Register immediately
	registerTargetClicks();
	
	// Also register after a delay to catch dynamically added targets
	setTimeout(registerTargetClicks, 500);
	
	// Store handler for cleanup
	window._junkshotClickHandler = handleAFrameClick;
};

export const unregisterShootingHandlers = () => {
	// Remove A-Frame event listener
	if (window._junkshotClickHandler) {
		window.removeEventListener('target-clicked', window._junkshotClickHandler);
		document.removeEventListener('target-clicked', window._junkshotClickHandler);
		window._junkshotClickHandler = null;
	}
	
	// Remove regular click handlers
	document.querySelectorAll(TARGET_SELECTOR).forEach((element) => {
		element.removeEventListener('click', handleTargetClick);
	});
	onTargetHitCallback = null;
	// Clear processed targets
	processedTargets.clear();
};
