// Hit Effect - Visual feedback when correct target is hit
import AudioManager from '../services/audioManager.js';

const audioManager = AudioManager.getInstance();

export const playHitEffect = (targetElement) => {
	if (!targetElement) return;

	// Play hit sound
	audioManager.play('hit');

	// Create success particles
	createHitParticles(targetElement);

	// Scale and fade animation
	targetElement.setAttribute('animation__hit-scale', {
		property: 'scale',
		from: '0.9 0.9 0.9',
		to: '1.3 1.3 1.3',
		dur: 200,
		easing: 'easeOutQuad'
	});

	targetElement.setAttribute('animation__hit-fade', {
		property: 'opacity',
		from: 1,
		to: 0,
		dur: 300,
		easing: 'easeOutQuad'
	});

	// Remove target after animation
	setTimeout(() => {
		if (targetElement.parentNode) {
			targetElement.remove();
		}
	}, 300);
};

const createHitParticles = (targetElement) => {
	const scene = targetElement.sceneEl || document.querySelector('#game-scene');
	if (!scene) return;

	const position = targetElement.getAttribute('position');
	const particleCount = 8;

	for (let i = 0; i < particleCount; i++) {
		const particle = document.createElement('a-sphere');
		const angle = (i / particleCount) * Math.PI * 2;
		const radius = 0.3;
		const x = Math.cos(angle) * radius;
		const z = Math.sin(angle) * radius;

		particle.setAttribute('position', {
			x: position.x + x,
			y: position.y,
			z: position.z + z
		});
		particle.setAttribute('radius', '0.05');
		particle.setAttribute('color', '#4ecdc4');
		particle.setAttribute('emissive', '#4ecdc4');
		particle.setAttribute('opacity', '1');

		// Animate particle
		particle.setAttribute('animation__particle-move', {
			property: 'position',
			from: `${position.x + x} ${position.y} ${position.z + z}`,
			to: `${position.x + x * 2} ${position.y + 0.5} ${position.z + z * 2}`,
			dur: 500,
			easing: 'easeOutQuad'
		});

		particle.setAttribute('animation__particle-fade', {
			property: 'opacity',
			from: 1,
			to: 0,
			dur: 500,
			easing: 'easeOutQuad'
		});

		scene.appendChild(particle);

		setTimeout(() => {
			particle.remove();
		}, 600);
	}
};

