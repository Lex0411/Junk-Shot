const DIFFICULTY_MAP = {
	easy: {
		gridSize: 3,
		movement: 'none',
		movementSpeed: 0,
		timeLimit: 60,
		lives: 3
	},
	intermediate: {
		gridSize: 4,
		movement: 'slow',
		movementSpeed: 0.5,
		timeLimit: 45,
		lives: 3
	},
	hard: {
		gridSize: 4,
		movement: 'fast',
		movementSpeed: 1,
		timeLimit: 30,
		lives: 1
	}
};

export const getDifficultyConfig = (mode = 'easy') => DIFFICULTY_MAP[mode] ?? DIFFICULTY_MAP.easy;

export default DIFFICULTY_MAP;
