const DIFFICULTY_STORAGE_KEY = 'junkshot_difficulty';
const GAME_PAGE_PATH = '/game.html';

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
