import AudioManager from '../services/audioManager.js';
import { spawnTargets, clearTargets } from '../logic/targetSpawner.js';
import { registerMouseShooting, unregisterMouseShooting } from '../logic/mouseShooting.js';
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
const TRASH_DATA_URL = '/public/data/garbageItems.json';
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
	const sfxVolume = Number(settings?.sfxVolume ?? 80) / 100;
	audioManager.setMasterVolume(masterVolume);
	
	// Use absolute paths from root
	// Register all audio files from public/audio folder
	audioManager
		.registerSound('bgm', '/public/audio/inGame.mp3', { loop: true, volume: 0.55 })
		.registerSound('gunshot', '/public/audio/gunshot.mp3', { volume: 0.8 * sfxVolume })
		.registerSound('hit', '/public/audio/gunshot.mp3', { volume: 0.6 * sfxVolume })
		.registerSound('miss', '/public/audio/gunshot.mp3', { volume: 0.4 * sfxVolume })
		.registerSound('round-clear', '/public/audio/gunshot.mp3', { volume: 0.6 * sfxVolume })
		.registerSound('click', '/public/audio/mouse_click.mp3', { volume: 0.5 * sfxVolume });
	
	// Play BGM after a short delay to ensure audio context is ready
	setTimeout(() => {
		audioManager.play('bgm');
	}, 500);
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
	// Deduct a life when time runs out instead of ending game immediately
	const remaining = deductLife();
	if (remaining <= 0) {
		triggerGameOver('lives');
	} else {
		// Round failed due to time, but player still has lives - continue to next round
		completeRound('timeout');
	}
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
		console.log('Lives updated:', remainingLives);
		renderLives(remainingLives);
		// Don't trigger game over here - let handleShotResult handle it
		// This prevents double-triggering game over
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
	// Also set on the A-Frame scene
	const scene = document.querySelector('#game-scene');
	if (scene) {
		scene.dataset.roundCategory = category;
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
			throw new Error(`Unable to load trash data: ${response.status} ${response.statusText}`);
		}
		const data = await response.json();
		state.trashPool = Array.isArray(data) ? data : data?.items ?? [];
		console.log(`Loaded ${state.trashPool.length} trash items from database`);
	} catch (error) {
		console.error('Error loading trash database:', error);
		console.warn('Falling back to empty trash pool');
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
	unregisterMouseShooting();
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
	// Wrong target shot - deduct a life but continue the round
	// Only end game if lives reach 0
	const remaining = deductLife();
	console.log(`Wrong target shot! Lives remaining: ${remaining}`);
	if (remaining <= 0) {
		// No lives left - game over
		triggerGameOver('lives');
	} else {
		// Still have lives - continue the round
		// The round continues until all correct targets are shot or time runs out
	}
};

// Listen for settings changes to update audio
window.addEventListener('game:settings-change', (event) => {
	const { key, value, settings } = event.detail;
	if (key === 'musicVolume') {
		audioManager.setMasterVolume(value / 100);
	} else if (key === 'sfxVolume') {
		audioManager.setSoundVolume('gunshot', (value / 100) * 0.8);
		audioManager.setSoundVolume('hit', (value / 100) * 0.6);
		audioManager.setSoundVolume('miss', (value / 100) * 0.4);
		audioManager.setSoundVolume('round-clear', (value / 100) * 0.6);
	}
});

const playRound = async () => {
	console.log('Starting new round...');
	await fetchTrashDatabase();
	
	if (state.trashPool.length === 0) {
		console.error('No trash items loaded! Cannot start round.');
		return;
	}
	
	const category = pickRandomCategory();
	state.roundCategory = category;
	setStageCategory(category);
	await showRoundPrompt(category);
	
	const targets = buildRoundTargets(category, state.config.gridSize);
	console.log(`Built ${targets.length} targets for category: ${category}`);
	
	state.correctTargetsRemaining = targets.filter((item) => isCorrectCategory(item, category)).length;
	console.log(`Correct targets to shoot: ${state.correctTargetsRemaining}`);
	
	spawnTargets(category, state.config.gridSize, state.config.movementSpeed, targets);
	
	// Wait a bit for targets to be added to DOM
	await new Promise(resolve => setTimeout(resolve, 300));
	
	registerMouseShooting(handleShotResult);
	
	// Request pointer lock when round starts (after user interaction from clicking to start)
	requestPointerLockOnRoundStart();
	
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
	
	// Exit pointer lock when game is over
	exitPointerLock();
};

// Function to exit pointer lock
const exitPointerLock = () => {
	const exitLock = document.exitPointerLock ||
	                  document.mozExitPointerLock ||
	                  document.webkitExitPointerLock;
	if (exitLock) {
		try {
			exitLock.call(document);
			console.log('Pointer lock exited - cursor restored');
		} catch (error) {
			console.warn('Error exiting pointer lock:', error);
		}
	}
};

// Function to request pointer lock when round starts
const requestPointerLockOnRoundStart = () => {
	const scene = document.querySelector('#game-scene');
	if (!scene || !scene.canvas) return;
	
	const canvas = scene.canvas;
	const requestLock = canvas.requestPointerLock ||
	                    canvas.mozRequestPointerLock ||
	                    canvas.webkitRequestPointerLock;
	if (requestLock) {
		try {
			requestLock.call(canvas);
			console.log('Pointer lock requested on round start');
		} catch (error) {
			console.log('Pointer lock request on round start failed:', error);
		}
	}
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

const waitForAFrameScene = () => {
	return new Promise((resolve) => {
		const checkScene = () => {
			const scene = document.querySelector('#game-scene');
			if (scene && scene.hasLoaded) {
				console.log('A-Frame scene is ready');
				resolve(scene);
				return;
			}
			// Listen for scene ready event
			const readyHandler = () => {
				const scene = document.querySelector('#game-scene');
				console.log('A-Frame scene ready event received');
				if (scene) resolve(scene);
			};
			window.addEventListener('aframe:scene-ready', readyHandler, { once: true });
			// Fallback timeout
			setTimeout(() => {
				const scene = document.querySelector('#game-scene');
				if (scene) {
					console.log('A-Frame scene found via timeout');
					resolve(scene);
				} else {
					console.warn('A-Frame scene not found after timeout');
					resolve(null);
				}
			}, 3000);
		};
		checkScene();
	});
};

const startGame = async () => {
	cacheElements();
	bindScoreSystemEvents();
	bindPauseEvents();
	
	// Wait for A-Frame scene to be ready
	await waitForAFrameScene();
	
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
