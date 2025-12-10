class AudioChannel {
	constructor(src, { loop = false, volume = 1 } = {}) {
		this.audio = new Audio(src);
		this.audio.preload = 'auto';
		this.audio.loop = loop;
		this.baseVolume = this.#clampVolume(volume);
	}

	#clampVolume(value) {
		return Math.min(1, Math.max(0, Number(value ?? 1)));
	}

	play(masterVolume) {
		const volume = this.baseVolume * this.#clampVolume(masterVolume);
		this.audio.currentTime = 0;
		this.audio.volume = volume;
		this.audio.play().catch(() => {});
	}

	setLoop(loop) {
		this.audio.loop = Boolean(loop);
	}

	setVolume(volume) {
		this.baseVolume = this.#clampVolume(volume);
	}
}

export default class AudioManager {
	static #instance;

	constructor() {
		if (AudioManager.#instance) {
			return AudioManager.#instance;
		}

		this.channels = new Map();
		this.masterVolume = 1;
		AudioManager.#instance = this;
	}

	static getInstance() {
		return AudioManager.#instance ?? new AudioManager();
	}

	setMasterVolume(volume) {
		this.masterVolume = Math.min(1, Math.max(0, Number(volume ?? 1)));
	}

	registerSound(key, src, options = {}) {
		if (!key || !src) {
			return this;
		}

		if (!this.channels.has(key)) {
			this.channels.set(key, new AudioChannel(src, options));
		}

		return this;
	}

	unregisterSound(key) {
		this.channels.delete(key);
	}

	play(key) {
		const channel = this.channels.get(key);
		if (!channel) {
			return;
		}
		channel.play(this.masterVolume);
	}

	setSoundVolume(key, volume) {
		const channel = this.channels.get(key);
		channel?.setVolume(volume);
	}

	setSoundLoop(key, loop) {
		const channel = this.channels.get(key);
		channel?.setLoop(loop);
	}
}
