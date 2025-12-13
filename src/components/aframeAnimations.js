// A-Frame Custom Animations Component
// Provides additional animation capabilities for targets and game objects

AFRAME.registerComponent('zigzag-movement', {
	schema: {
		amplitude: { type: 'number', default: 0.75 },
		duration: { type: 'number', default: 4000 },
		axis: { type: 'string', default: 'x' }
	},

	init() {
		const { amplitude, duration, axis } = this.data;
		const currentPos = this.el.getAttribute('position');
		const axisIndex = { x: 0, y: 1, z: 2 }[axis] || 0;
		const startValue = currentPos[axis];
		
		this.el.setAttribute('animation__zigzag', {
			property: `position.${axis}`,
			from: startValue - amplitude,
			to: startValue + amplitude,
			dur: duration,
			dir: 'alternate',
			easing: 'linear',
			loop: true
		});
	}
});

AFRAME.registerComponent('bob-animation', {
	schema: {
		amplitude: { type: 'number', default: 0.2 },
		duration: { type: 'number', default: 2000 }
	},

	init() {
		const { amplitude, duration } = this.data;
		const currentPos = this.el.getAttribute('position');
		
		this.el.setAttribute('animation__bob', {
			property: 'position.y',
			from: currentPos.y - amplitude,
			to: currentPos.y + amplitude,
			dur: duration,
			dir: 'alternate',
			easing: 'easeInOutSine',
			loop: true
		});
	}
});

AFRAME.registerComponent('spin-animation', {
	schema: {
		speed: { type: 'number', default: 1000 },
		axis: { type: 'string', default: 'y' }
	},

	init() {
		const { speed, axis } = this.data;
		const axisMap = { x: 'rotation.x', y: 'rotation.y', z: 'rotation.z' };
		
		this.el.setAttribute('animation__spin', {
			property: axisMap[axis] || 'rotation.y',
			from: 0,
			to: 360,
			dur: speed,
			easing: 'linear',
			loop: true
		});
	}
});

AFRAME.registerComponent('pulse-animation', {
	schema: {
		minScale: { type: 'number', default: 0.9 },
		maxScale: { type: 'number', default: 1.1 },
		duration: { type: 'number', default: 1000 }
	},

	init() {
		const { minScale, maxScale, duration } = this.data;
		
		this.el.setAttribute('animation__pulse', {
			property: 'scale',
			from: `${minScale} ${minScale} ${minScale}`,
			to: `${maxScale} ${maxScale} ${maxScale}`,
			dur: duration,
			dir: 'alternate',
			easing: 'easeInOutSine',
			loop: true
		});
	}
});

AFRAME.registerComponent('fade-out', {
	schema: {
		duration: { type: 'number', default: 500 }
	},

	init() {
		const { duration } = this.data;
		
		this.el.setAttribute('animation__fade', {
			property: 'opacity',
			from: 1,
			to: 0,
			dur: duration,
			easing: 'easeOutQuad'
		});

		setTimeout(() => {
			this.el.remove();
		}, duration);
	}
});

AFRAME.registerComponent('scale-out', {
	schema: {
		duration: { type: 'number', default: 300 },
		finalScale: { type: 'number', default: 0 }
	},

	init() {
		const { duration, finalScale } = this.data;
		const currentScale = this.el.getAttribute('scale') || { x: 1, y: 1, z: 1 };
		
		this.el.setAttribute('animation__scale', {
			property: 'scale',
			from: `${currentScale.x} ${currentScale.y} ${currentScale.z}`,
			to: `${finalScale} ${finalScale} ${finalScale}`,
			dur: duration,
			easing: 'easeInBack'
		});

		setTimeout(() => {
			this.el.remove();
		}, duration);
	}
});

