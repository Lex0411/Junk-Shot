import { isCorrectCategory } from './categoryChecker.js';
import { playHitEffect } from '../effects/hitEffect.js';
import { playMissEffect } from '../effects/missEffect.js';

const TARGET_SELECTOR = '.junkshot-target';

let onTargetHitCallback = null;

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
	const targetElement = event.currentTarget;
	const trashItem = extractTrashItem(targetElement);
	const expectedCategory = targetElement.closest('[data-round-category]')?.dataset.roundCategory;
	const isCorrect = isCorrectCategory(trashItem, expectedCategory);
	if (isCorrect) {
		playHitEffect?.(targetElement);
	} else {
		playMissEffect?.(targetElement);
	}
	onTargetHitCallback?.(isCorrect, trashItem);
};

export const registerShootingHandlers = (callback) => {
	onTargetHitCallback = callback;
	document.querySelectorAll(TARGET_SELECTOR).forEach((element) => {
		element.addEventListener('click', handleTargetClick);
	});
};

export const unregisterShootingHandlers = () => {
	document.querySelectorAll(TARGET_SELECTOR).forEach((element) => {
		element.removeEventListener('click', handleTargetClick);
	});
	onTargetHitCallback = null;
};
