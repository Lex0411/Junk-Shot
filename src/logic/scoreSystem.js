const SCORE_EVENT = 'score:update';
const LIVES_EVENT = 'lives:update';
const HARD_MODE = 'hard';
const HARD_LIVES = 1;
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
	lives = difficulty === HARD_MODE ? HARD_LIVES : DEFAULT_LIVES;
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
	lives = Math.max(0, lives - 1);
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
	lives = difficulty === HARD_MODE ? HARD_LIVES : DEFAULT_LIVES;
	emitLives();
};
