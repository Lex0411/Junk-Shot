// Miss Effect - Visual feedback when wrong target is hit
import AudioManager from '../services/audioManager.js';

const audioManager = AudioManager.getInstance();

export const playMissEffect = (targetElement) => {
	if (!targetElement) return;

	// Play miss sound
	audioManager.play('miss');

	// Get original position to ensure we don't lose it
	const originalPos = targetElement.getAttribute('position');
	let posObj;
	if (typeof originalPos === 'object') {
		posObj = { x: originalPos.x, y: originalPos.y, z: originalPos.z };
	} else if (typeof originalPos === 'string') {
		const parts = originalPos.split(' ').map(Number);
		posObj = { x: parts[0] || 0, y: parts[1] || 0, z: parts[2] || 0 };
	} else {
		// Fallback: read from object3D if available
		if (targetElement.object3D) {
			const p = targetElement.object3D.position;
			posObj = { x: p.x, y: p.y, z: p.z };
		} else {
			posObj = { x: 0, y: 0, z: 0 };
		}
	}
	
	// Lock the y and z positions - only allow x to shake
	// Use scale animation instead of position to avoid falling
	targetElement.setAttribute('animation__miss-shake-scale', {
		property: 'scale',
		from: '1.2 1.2 1.2',
		to: '1.25 1.2 1.2',
		dur: 50,
		dir: 'alternate',
		loop: 4,
		easing: 'easeInOutQuad'
	});

	// Red flash effect
	createMissFlash(targetElement);

	// Reset animation and ensure position is locked
	setTimeout(() => {
		targetElement.removeAttribute('animation__miss-shake-scale');
		// Force restore original position - especially y position to prevent falling
		if (targetElement.object3D) {
			targetElement.object3D.position.set(posObj.x, posObj.y, posObj.z);
			targetElement.object3D.updateMatrixWorld(true);
		}
		// Also set via attribute to ensure A-Frame respects it
		targetElement.setAttribute('position', `${posObj.x} ${posObj.y} ${posObj.z}`);
		// Restore scale
		targetElement.setAttribute('scale', '1.2 1.2 1.2');
		
		// Continuously lock position for a short period to prevent any physics/falling
		let lockCount = 0;
		const lockPosition = setInterval(() => {
			if (targetElement.object3D && targetElement.object3D.parent) {
				const currentPos = targetElement.object3D.position;
				// If y position has changed (fallen), restore it
				if (Math.abs(currentPos.y - posObj.y) > 0.01) {
					targetElement.object3D.position.set(posObj.x, posObj.y, posObj.z);
					targetElement.setAttribute('position', `${posObj.x} ${posObj.y} ${posObj.z}`);
				}
			}
			lockCount++;
			if (lockCount >= 20) { // Lock for 1 second (20 * 50ms)
				clearInterval(lockPosition);
			}
		}, 50);
	}, 200);
};

const createMissFlash = (targetElement) => {
	const flash = document.createElement('a-ring');
	const position = targetElement.getAttribute('position');
	
	flash.setAttribute('position', {
		x: position.x,
		y: position.y,
		z: position.z - 0.1
	});
	flash.setAttribute('rotation', '-90 0 0');
	flash.setAttribute('radius-inner', '0.3');
	flash.setAttribute('radius-outer', '0.5');
	flash.setAttribute('color', '#ff4444');
	flash.setAttribute('emissive', '#ff4444');
	flash.setAttribute('opacity', '0.8');

	const scene = targetElement.sceneEl || document.querySelector('#game-scene');
	if (scene) {
		scene.appendChild(flash);

		flash.setAttribute('animation__flash-scale', {
			property: 'scale',
			from: '1 1 1',
			to: '2 2 2',
			dur: 200,
			easing: 'easeOutQuad'
		});

		flash.setAttribute('animation__flash-fade', {
			property: 'opacity',
			from: 0.8,
			to: 0,
			dur: 200,
			easing: 'easeOutQuad'
		});

		setTimeout(() => {
			flash.remove();
		}, 250);
	}
};

