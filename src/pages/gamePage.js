import AudioManager from '../services/audioManager.js';
import { spawnTargets, clearTargets } from '../logic/targetSpawner.js';
import { registerShootingHandlers, unregisterShootingHandlers } from '../logic/shooting.js';
import { isCorrectCategory } from '../logic/categoryChecker.js';
import {
	initScoreSystem,
	addPoints,
	deductLife,
	getScore
} from '../logic/scoreSystem.js';
import Timer from '../logic/timer.js';
import difficultyMap, { getDifficultyConfig } from '../logic/difficultyConfig.js';
import { getSettings } from '../services/settingsService.js';
import { getHighScore, saveHighScore } from '../services/highScoreService.js';

const ROUND_PROMPT_DURATION = 2000;
const ROUND_CATEGORIES = ['organic', 'inorganic', 'recyclable', 'hazardous'];
const SCORE_PER_HIT = 100;
const TRASH_DATA_URL = '/data/garbageItems.json';
const DEFAULT_DIFFICULTY = 'easy';
const DEFAULT_CONFIG = getDifficultyConfig(DEFAULT_DIFFICULTY);

const state = {
	difficulty: DEFAULT_DIFFICULTY,
	config: DEFAULT_CONFIG,
	timeRemaining: DEFAULT_CONFIG.timeLimit,
	trashPool: [],
	roundCategory: null,
	correctTargetsRemaining: 0,
	roundActive: false,
	roundResolver: null,
	timer: null,
	gameOver: false,
	highScore: 0,
	stageElement: null
};

const elements = {
	scoreValue: null,
	highscoreValue: null,
	timeValue: null,
	livesContainer: null,
	roundPrompt: null,
	roundPromptText: null,
	gameOverOverlay: null
};

const audioManager = AudioManager.getInstance();

const ready = (callback) => {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', callback, { once: true });
		return;
	}
	callback();
};

const cacheElements = () => {
	elements.scoreValue = document.getElementById('score-value');
	elements.highscoreValue = document.getElementById('highscore-value');
	elements.timeValue = document.getElementById('time-value');
	elements.livesContainer = document.getElementById('lives-container');
	elements.roundPrompt = document.getElementById('roundPrompt');
	elements.roundPromptText = document.getElementById('roundPromptText');
	state.stageElement = document.querySelector('#aframe-stage');
};

const isValidDifficulty = (value) => Boolean(value && difficultyMap[value]);

const getStoredDifficulty = () => {
	try {
		const stored = localStorage.getItem('junkshot_difficulty');
		if (isValidDifficulty(stored)) {
			return stored;
		}
	} catch (error) {
		console.warn('Unable to read stored difficulty', error);
	}
	return null;
};

const parseDifficultyFromUrl = () => {
	const params = new URLSearchParams(window.location.search);
	const difficulty = params.get('difficulty');
	return isValidDifficulty(difficulty) ? difficulty : null;
};

const resolveDifficulty = () => getStoredDifficulty() ?? parseDifficultyFromUrl() ?? DEFAULT_DIFFICULTY;

const shuffleInPlace = (items) => {
	for (let i = items.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
};

const pickRandomCategory = () => ROUND_CATEGORIES[Math.floor(Math.random() * ROUND_CATEGORIES.length)];

const applyAudioSettings = () => {
	const settings = getSettings();
	const masterVolume = Number(settings?.musicVolume ?? 80) / 100;
	audioManager.setMasterVolume(masterVolume);
	audioManager
		.registerSound('bgm', '/public/audio/inGame.mp3', { loop: true, volume: 0.55 })
		.registerSound('round-clear', '/public/audio/gunshot.mp3', { volume: 0.6 });
	audioManager.play('bgm');
};

const stopBgm = () => {
	const channel = audioManager.channels?.get('bgm');
	channel?.audio.pause();
};

const updateScoreUI = (score) => {
	if (elements.scoreValue) {
		elements.scoreValue.textContent = String(score ?? 0);
	}
};

const updateHighscoreUI = (highScore) => {
	if (elements.highscoreValue) {
		elements.highscoreValue.textContent = String(highScore ?? 0);
	}
};

const updateTimeUI = () => {
	if (elements.timeValue) {
		const seconds = Math.max(0, Math.ceil(state.timeRemaining));
		elements.timeValue.textContent = `${seconds}s`;
	}
};

const handleTimerTick = (time) => {
	state.timeRemaining = time;
	updateTimeUI();
};

const handleTimerFinish = () => {
	triggerGameOver('time');
};

const initializeTimer = () => {
	if (!state.timer) {
		state.timer = new Timer(state.config.timeLimit)
			.onTick(handleTimerTick)
			.onFinish(handleTimerFinish);
	}
	state.timer.reset(state.config.timeLimit);
	state.timeRemaining = state.config.timeLimit;
	updateTimeUI();
	state.timer.start();
};

const pauseGameTimer = () => {
	state.timer?.pause();
};

const resumeGameTimer = () => {
	state.timer?.resume();
};

const renderLives = (lives) => {
	if (!elements.livesContainer) {
		return;
	}
	const fragment = document.createDocumentFragment();
	for (let i = 0; i < lives; i += 1) {
		const heart = document.createElement('i');
		heart.className = 'fas fa-heart';
		fragment.appendChild(heart);
	}
	elements.livesContainer.innerHTML = '';
	elements.livesContainer.appendChild(fragment);
};

const bindScoreSystemEvents = () => {
	window.addEventListener('score:update', (event) => updateScoreUI(event.detail?.score));
	window.addEventListener('lives:update', (event) => {
		const remainingLives = event.detail?.lives ?? 0;
		renderLives(remainingLives);
		if (remainingLives <= 0) {
			triggerGameOver('lives');
		}
	});
};

const bindPauseEvents = () => {
	window.addEventListener('game:pause', pauseGameTimer);
	window.addEventListener('game:resume', resumeGameTimer);
};

const showRoundPrompt = async (category) => {
	if (!elements.roundPrompt || !elements.roundPromptText) {
		return;
	}
	const label = category.toUpperCase();
	elements.roundPromptText.textContent = `Shoot all the ${label} trash!`;
	elements.roundPrompt.classList.add('show');
	await new Promise((resolve) => {
		setTimeout(() => {
			elements.roundPrompt.classList.remove('show');
			resolve();
		}, ROUND_PROMPT_DURATION);
	});
};

const setStageCategory = (category) => {
	if (state.stageElement) {
		state.stageElement.dataset.roundCategory = category;
	}
};

const ensureTrashId = (item, category, index) => {
	if (item.id) {
		return item;
	}
	return {
		...item,
		id: `${category}-${Date.now()}-${index}`
	};
};

const buildRoundTargets = (category, gridSize) => {
	const totalSlots = gridSize * gridSize;
	if (!state.trashPool.length) {
		return Array.from({ length: totalSlots }, (_, index) => ({
			id: `${category}-placeholder-${index}`,
			name: `${category} sample`,
			image: '#placeholder-texture',
			category,
			type: category,
			isCorrect: true
		}));
	}
	const correctItems = state.trashPool.filter((item) => isCorrectCategory(item, category));
	const incorrectItems = state.trashPool.filter((item) => !isCorrectCategory(item, category));
	shuffleInPlace(correctItems);
	shuffleInPlace(incorrectItems);
	const desiredCorrect = Math.min(correctItems.length, Math.max(1, Math.ceil(totalSlots / 2)));
	const desiredIncorrect = Math.max(0, totalSlots - desiredCorrect);
	const targets = [
		...correctItems.slice(0, desiredCorrect).map((item, index) => ({
			...ensureTrashId(item, category, index),
			isCorrect: true
		})),
		...incorrectItems.slice(0, desiredIncorrect).map((item, index) => ({
			...ensureTrashId(item, `${item.category ?? 'trash'}`, index),
			isCorrect: false
		}))
	];
	let duplicateIndex = 0;
	while (targets.length < totalSlots && correctItems.length) {
		const source = correctItems[duplicateIndex % correctItems.length];
		targets.push({
			...ensureTrashId(source, category, duplicateIndex + totalSlots),
			isCorrect: true
		});
		duplicateIndex += 1;
	}
	shuffleInPlace(targets);
	return targets;
};

const fetchTrashDatabase = async () => {
	if (state.trashPool.length) {
		return state.trashPool;
	}
	try {
		const response = await fetch(TRASH_DATA_URL);
		if (!response.ok) {
			throw new Error('Unable to load trash data');
		}
		const data = await response.json();
		state.trashPool = Array.isArray(data) ? data : data?.items ?? [];
	} catch (error) {
		console.warn('Falling back to empty trash pool', error);
		state.trashPool = [];
	}
	return state.trashPool;
};

const waitForRoundToEnd = () =>
	new Promise((resolve) => {
		state.roundActive = true;
		state.roundResolver = (outcome) => {
			state.roundActive = false;
			state.roundResolver = null;
			resolve(outcome);
		};
	});

const completeRound = (outcome) => {
	if (!state.roundActive) {
		return;
	}
	unregisterShootingHandlers();
	clearTargets();
	state.roundResolver?.(outcome);
};

const handleShotResult = (isCorrect) => {
	if (!state.roundActive || state.gameOver) {
		return;
	}
	if (isCorrect) {
		state.correctTargetsRemaining = Math.max(0, state.correctTargetsRemaining - 1);
		addPoints(SCORE_PER_HIT);
		if (state.correctTargetsRemaining === 0) {
			audioManager.play('round-clear');
			completeRound('cleared');
		}
		return;
	}
	const remaining = deductLife();
	if (remaining <= 0) {
		triggerGameOver('lives');
	}
};

const playRound = async () => {
	await fetchTrashDatabase();
	const category = pickRandomCategory();
	state.roundCategory = category;
	setStageCategory(category);
	await showRoundPrompt(category);
	const targets = buildRoundTargets(category, state.config.gridSize);
	state.correctTargetsRemaining = targets.filter((item) => isCorrectCategory(item, category)).length;
	spawnTargets(category, state.config.gridSize, state.config.movementSpeed, targets);
	registerShootingHandlers(handleShotResult);
	if (state.correctTargetsRemaining === 0) {
		completeRound('cleared');
		return;
	}
	await waitForRoundToEnd();
};

const ensureGameOverStyles = () => {
	if (document.getElementById('game-over-styles')) {
		return;
	}
	const style = document.createElement('style');
	style.id = 'game-over-styles';
	style.textContent = `
		.game-over-overlay { position: fixed; inset: 0; background: rgba(5, 9, 15, 0.85); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 200ms ease; z-index: 999; }
		.game-over-overlay.is-visible { opacity: 1; pointer-events: auto; }
		.game-over-panel { background: #101828; border-radius: 18px; padding: 32px; width: min(420px, 90vw); text-align: center; color: #fff; box-shadow: 0 20px 60px rgba(0,0,0,0.35); }
		.game-over-panel h2 { margin-bottom: 8px; font-size: 2rem; }
		.game-over-panel p { margin: 6px 0 18px; font-size: 1.1rem; }
		.game-over-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
		.game-over-actions button { flex: 1 1 140px; padding: 12px 16px; border-radius: 999px; border: none; font-weight: 600; cursor: pointer; }
		.game-over-actions button.primary { background: #0ea5e9; color: #fff; }
		.game-over-actions button.secondary { background: #f3f4f6; color: #111827; }
	`;
	document.head.appendChild(style);
};

const ensureGameOverOverlay = () => {
	if (elements.gameOverOverlay) {
		return elements.gameOverOverlay;
	}
	ensureGameOverStyles();
	const overlay = document.createElement('div');
	overlay.id = 'gameOverOverlay';
	overlay.className = 'game-over-overlay';
	overlay.innerHTML = `
		<div class="game-over-panel">
			<h2>Game Over</h2>
			<p class="game-over-score">Score: <strong data-game-score>0</strong></p>
			<p class="game-over-best">High Score: <strong data-game-highscore>0</strong></p>
			<div class="game-over-actions">
				<button type="button" class="primary" data-play-again>Play Again</button>
				<button type="button" class="secondary" data-return-menu>Return to Menu</button>
			</div>
		</div>
	`;
	document.body.appendChild(overlay);
	overlay.querySelector('[data-play-again]')?.addEventListener('click', () => {
		window.location.assign('/difficulty.html');
	});
	overlay.querySelector('[data-return-menu]')?.addEventListener('click', () => {
		window.location.assign('/index.html');
	});
	elements.gameOverOverlay = overlay;
	return overlay;
};

const showGameOverOverlay = (score, highScore) => {
	const overlay = ensureGameOverOverlay();
	overlay.querySelector('[data-game-score]').textContent = String(score);
	overlay.querySelector('[data-game-highscore]').textContent = String(highScore);
	overlay.classList.add('is-visible');
};

const triggerGameOver = (reason) => {
	if (state.gameOver) {
		return;
	}
	state.gameOver = true;
	completeRound(reason);
	pauseGameTimer();
	stopBgm();
	finishGame();
};

const finishGame = async () => {
	const finalScore = getScore();
	try {
		await saveHighScore(finalScore, state.difficulty);
	} catch (error) {
		console.warn('Unable to sync high score', error);
	}
	state.highScore = Math.max(state.highScore, finalScore);
	updateHighscoreUI(state.highScore);
	showGameOverOverlay(finalScore, state.highScore);
};

const runGameLoop = async () => {
	while (!state.gameOver) {
		await playRound();
	}
};

const initializeHighScore = async () => {
	try {
		state.highScore = await getHighScore(state.difficulty);
		updateHighscoreUI(state.highScore);
	} catch (error) {
		console.warn('Unable to load high score', error);
		state.highScore = 0;
	}
};

const startGame = async () => {
	cacheElements();
	bindScoreSystemEvents();
	bindPauseEvents();
	state.difficulty = resolveDifficulty();
	state.config = getDifficultyConfig(state.difficulty);
	state.timeRemaining = state.config.timeLimit;
	applyAudioSettings();
	initScoreSystem(state.difficulty);
	updateTimeUI();
	await initializeHighScore();
	initializeTimer();
	try {
		await runGameLoop();
	} catch (error) {
		console.error('Game loop crashed', error);
		triggerGameOver('error');
	}
};

ready(startGame);
