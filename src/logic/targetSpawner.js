const STAGE_SELECTOR = '#aframe-stage';
const TARGET_CLASS = 'junkshot-target';
const ROW_GAP = 1.5;
const COLUMN_GAP = 1.5;
const BASE_DISTANCE = -5;
const BASE_HEIGHT = 1.5;
const TARGET_SCALE = '0.9 0.9 0.9';
const MOVE_AMPLITUDE = 0.75;
const MOVE_DURATION_BASE = 4000;

let stageRef = null;

const getStage = () => {
	if (!stageRef) {
		stageRef = document.querySelector(STAGE_SELECTOR);
	}
	return stageRef;
};

const computePosition = (index, gridSize) => {
	const row = Math.floor(index / gridSize);
	const column = index % gridSize;
	const offset = (gridSize - 1) / 2;
	const x = (column - offset) * COLUMN_GAP;
	const y = BASE_HEIGHT + row * ROW_GAP;
	const z = BASE_DISTANCE + row * 0.25;
	return `${x} ${y} ${z}`;
};

const attachMovement = (entity, rowIndex, speed) => {
	if (!entity || speed <= 0) {
		return;
	}
	const amplitude = MOVE_AMPLITUDE * (rowIndex % 2 === 0 ? 1 : -1);
	const duration = Math.max(1200, MOVE_DURATION_BASE / speed);
	const { x, y, z } = entity.object3D.position;
	entity.setAttribute('animation__zigzag', {
		property: 'position',
		from: `${-amplitude + x} ${y} ${z}`,
		to: `${amplitude + x} ${y} ${z}`,
		dur: duration,
		direction: 'alternate',
		easing: 'linear',
		loop: true
	});
};

const createTargetEntity = (item, index, gridSize, movementSpeed) => {
	const entity = document.createElement('a-image');
	entity.classList.add(TARGET_CLASS);
	entity.setAttribute('position', computePosition(index, gridSize));
	entity.setAttribute('scale', TARGET_SCALE);
	entity.setAttribute('src', item.image);
	entity.id = item.id;
	entity.dataset.id = item.id;
	entity.dataset.correct = String(item.isCorrect);
	entity.dataset.type = item.type;
	entity.dataset.category = item.category || '';
	entity.setAttribute('look-at', '#camera');
	const row = Math.floor(index / gridSize);
	attachMovement(entity, row, movementSpeed);
	return entity;
};

export const clearTargets = () => {
	const stage = getStage();
	if (!stage) {
		return;
	}
	stage.querySelectorAll(`.${TARGET_CLASS}`).forEach((element) => {
		element.remove();
	});
};

export const spawnTargets = (category, gridSize, movementSpeed, trashList) => {
	const stage = getStage();
	if (!stage) {
		console.warn('TargetSpawner: Missing stage element');
		return;
	}
	clearTargets();
	trashList.forEach((item, index) => {
		const target = createTargetEntity(item, index, gridSize, movementSpeed);
		stage.appendChild(target);
	});
};
