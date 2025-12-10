const TICK_INTERVAL_MS = 1000;

export class Timer {
	#duration;
	#remaining;
	#intervalId = null;
	#isPaused = true;
	#tickCallbacks = new Set();
	#finishCallbacks = new Set();

	constructor(durationInSeconds) {
		this.#duration = Math.max(0, Number(durationInSeconds) || 0);
		this.#remaining = this.#duration;
	}

	onTick(callback) {
		if (typeof callback === 'function') {
			this.#tickCallbacks.add(callback);
		}
		return this;
	}

	onFinish(callback) {
		if (typeof callback === 'function') {
			this.#finishCallbacks.add(callback);
		}
		return this;
	}

	start() {
		this.reset(this.#duration);
		this.#isPaused = false;
		this.#startInterval();
	}

	pause() {
		if (this.#isPaused) {
			return;
		}
		this.#isPaused = true;
		this.#clearInterval();
	}

	resume() {
		if (!this.#isPaused || this.#remaining <= 0) {
			return;
		}
		this.#isPaused = false;
		this.#startInterval();
	}

	reset(newDuration = this.#duration) {
		this.#clearInterval();
		this.#duration = Math.max(0, Number(newDuration) || 0);
		this.#remaining = this.#duration;
		this.#isPaused = true;
		this.#emitTick();
	}

	getTimeRemaining() {
		return Math.max(0, this.#remaining);
	}

	#startInterval() {
		this.#clearInterval();
		this.#emitTick();
		this.#intervalId = setInterval(() => {
			if (this.#isPaused) {
				return;
			}
			this.#remaining = Math.max(0, this.#remaining - 1);
			this.#emitTick();
			if (this.#remaining <= 0) {
				this.#handleFinish();
			}
		}, TICK_INTERVAL_MS);
	}

	#clearInterval() {
		if (this.#intervalId) {
			clearInterval(this.#intervalId);
			this.#intervalId = null;
		}
	}

	#emitTick() {
		const time = this.getTimeRemaining();
		window.dispatchEvent(new CustomEvent('timer:update', { detail: { time } }));
		this.#tickCallbacks.forEach((callback) => {
			try {
				callback(time);
			} catch (error) {
				console.error('Timer tick callback failed', error);
			}
		});
	}

	#handleFinish() {
		this.#clearInterval();
		this.#isPaused = true;
		this.#finishCallbacks.forEach((callback) => {
			try {
				callback();
			} catch (error) {
				console.error('Timer finish callback failed', error);
			}
		});
	}
}

export default Timer;
