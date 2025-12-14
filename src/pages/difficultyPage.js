import AudioManager from '../services/audioManager.js';
import { getSettings } from '../services/settingsService.js';

const DIFFICULTY_STORAGE_KEY = 'junkshot_difficulty';
const GAME_PAGE_PATH = '/game.html';
const CLICK_SOUND_KEY = 'ui-click';
const CLICK_SOUND_SRC = '/public/audio/mouse_click.mp3';

const audioManager = AudioManager.getInstance();
audioManager.registerSound(CLICK_SOUND_KEY, CLICK_SOUND_SRC, { volume: 0.5 });
audioManager.registerSound('lobby', '/public/audio/lobby.mp3', { loop: true, volume: 0.5 });

const ensureAudioUnlocked = (() => {
	let unlocked = false;
	return () => {
		if (unlocked) {
			return;
		}
		const test = new Audio();
		test.play().catch(() => {});
		unlocked = true;
	};
})();

const playClick = () => {
	ensureAudioUnlocked();
	audioManager.play(CLICK_SOUND_KEY);
};

const onButtonClickSound = () => {
	playClick();
};

const attachClickSound = (button) => {
	if (!button || button.dataset.clickSoundAttached === 'true') {
		return;
	}
	button.addEventListener('click', onButtonClickSound, { capture: true });
	button.dataset.clickSoundAttached = 'true';
};

const primeButtonClickSounds = (root = document) => {
	const buttons = root.querySelectorAll('button');
	buttons.forEach(attachClickSound);
};

const navigateTo = (path) => {
	console.log(`[DifficultyPage] Navigating to: ${path}`);
	window.location.assign(path);
};

const saveDifficulty = (difficulty) => {
	try {
		localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
		console.log(`[DifficultyPage] Saved difficulty: ${difficulty}`);
	} catch (error) {
		console.error('[DifficultyPage] Failed to save difficulty', error);
	}
};

const handleDifficultySelection = (difficulty) => () => {
	saveDifficulty(difficulty);
	navigateTo(GAME_PAGE_PATH);
};

const bindButton = (selector, handler) => {
	const element = document.querySelector(selector);
	if (!element) {
		console.warn(`[DifficultyPage] Missing element: ${selector}`);
		return;
	}
	element.addEventListener('click', handler);
};

const initDifficultyPage = () => {
	console.log('[DifficultyPage] Initializing listeners');
	
	// Attach click sounds to buttons
	primeButtonClickSounds();
	
	// Apply music volume setting and play lobby music
	const settings = getSettings();
	const musicVolume = Number(settings?.musicVolume ?? 80) / 100;
	audioManager.setMasterVolume(musicVolume);
	
	ensureAudioUnlocked();
	setTimeout(() => {
		// Only play if music volume is not 0
		if (musicVolume > 0) {
			audioManager.play('lobby');
		}
	}, 300);
	
	bindButton('#easyBtn', handleDifficultySelection('easy'));
	bindButton('#intermediateBtn', handleDifficultySelection('intermediate'));
	bindButton('#hardBtn', handleDifficultySelection('hard'));
	bindButton('#backBtn', () => navigateTo('/index.html'));
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initDifficultyPage, { once: true });
} else {
	initDifficultyPage();
}
