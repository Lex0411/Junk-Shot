import { getDifficultyConfig } from './difficultyConfig.js';

const SCORE_EVENT = 'score:update';
const LIVES_EVENT = 'lives:update';
const DEFAULT_LIVES = 3;

let score = 0;
let lives = DEFAULT_LIVES;

const emitScore = () => {
	window.dispatchEvent(new CustomEvent(SCORE_EVENT, { detail: { score } }));
};

const emitLives = () => {
	window.dispatchEvent(new CustomEvent(LIVES_EVENT, { detail: { lives } }));
};

export const initScoreSystem = (difficulty = 'easy') => {
	score = 0;
	// Use lives from difficulty config
	const config = getDifficultyConfig(difficulty);
	lives = config?.lives ?? DEFAULT_LIVES;
	console.log(`Initializing score system for difficulty: ${difficulty}, lives: ${lives}`);
	emitScore();
	emitLives();
};

export const addPoints = (points) => {
	const value = Number(points);
	if (!Number.isFinite(value) || value <= 0) {
		return;
	}
	score += value;
	emitScore();
};

export const deductLife = () => {
	const previousLives = lives;
	lives = Math.max(0, lives - 1);
	console.log(`Deducting life: ${previousLives} -> ${lives}`);
	emitLives();
	return lives;
};

export const getScore = () => score;

export const getLives = () => lives;

export const resetScore = () => {
	score = 0;
	emitScore();
};

export const resetLives = (difficulty = 'easy') => {
	// Use lives from difficulty config
	const config = getDifficultyConfig(difficulty);
	lives = config?.lives ?? DEFAULT_LIVES;
	emitLives();
};
