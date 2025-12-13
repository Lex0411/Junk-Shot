// Main A-Frame scene initialization
import '../src/components/aframeAnimations.js';
import '../src/components/aframeGun.js';
import '../src/components/aframeTarget.js';
import '../src/components/fpsControls.js';

const STAGE_SELECTOR = '#aframe-stage';

let scene = null;

const createAFrameScene = () => {
	const stage = document.querySelector(STAGE_SELECTOR);
	if (!stage) {
		console.error('A-Frame stage element not found');
		return null;
	}

	// Create A-Frame scene
	const sceneHTML = `
		<a-scene 
			id="game-scene"
			vr-mode-ui="enabled: false"
			renderer="antialias: true; colorManagement: true; sortObjects: true"
			background="color: #1a1a2e"
		>
			<!-- Lighting -->
			<a-light type="ambient" color="#404040" intensity="0.8"></a-light>
			<a-light type="directional" position="2 5 3" intensity="1.2" cast-shadow="true"></a-light>
			<a-light type="point" position="-3 4 2" intensity="0.7" color="#4ecdc4"></a-light>
			<a-light type="point" position="3 4 2" intensity="0.7" color="#4ecdc4"></a-light>
			
			<!-- World scene model -->
			<a-entity 
				gltf-model="/public/models/scene.glb"
				position="0 0 0"
				scale="1 1 1"
			></a-entity>
			
			<!-- Back wall - This is where targets will be placed like posters -->
			<!-- Wall removed to test scene model -->
			<!--
			<a-box 
				position="0 1.5 -5" 
				width="12" 
				height="6" 
				depth="0.2" 
				color="#4a4a5e"
				roughness="0.6"
				metalness="0.15"
				emissive="#2a2a3e"
				emissiveIntensity="0.1"
				id="target-wall"
			></a-box>
			-->
			
		<!-- Camera with gun attached -->
		<a-entity id="camera-rig" movement-controls="enabled: false">
			<a-camera 
				id="camera"
				look-controls="enabled: true; pointerLockEnabled: true; touchEnabled: false"
				wasd-controls="enabled: false"
				fps-controls="enabled: true; sensitivity: 0.002"
				position="0 1.2 4"
				rotation="0 0 0"
			>
				<!-- Crosshair cursor (centered, follows camera rotation) -->
				<a-cursor
					id="cursor"
					rayOrigin="entity"
					fuse="false"
					raycaster="objects: .junkshot-target, [data-raycastable]; far: 100; interval: 0; showLine: false"
					geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.02"
					material="color: #4ecdc4; shader: flat"
					position="0 0 -1"
					cursor="rayOrigin: entity; fuse: false"
					visible="true"
				></a-cursor>
			<a-entity 
				id="gun-container"
				gun-component="model: /public/models/gun.glb; scale: 1.2 1.2 1.2"
				position="0.3 -0.3 -0.5"
				rotation="0 0 0"
			></a-entity>
			</a-camera>
		</a-entity>
			
			<!-- Sky/Background -->
			<a-entity 
				gltf-model="/public/models/nightsky.glb"
				position="0 0 0"
				scale="1 1 1"
			></a-entity>
			
			<!-- Ground plane -->
			<a-plane 
				position="0 -0.1 0" 
				rotation="-90 0 0" 
				width="20" 
				height="20" 
				color="#0a0a14"
				roughness="0.9"
				metalness="0.1"
			></a-plane>
		</a-scene>
	`;

	stage.innerHTML = sceneHTML;
	
	// Wait for A-Frame library to load
	if (typeof AFRAME === 'undefined') {
		window.addEventListener('load', () => {
			setTimeout(createAFrameScene, 100);
		});
		return null;
	}
	
	scene = stage.querySelector('#game-scene');
	
	// Wait for A-Frame scene to be ready
	if (scene) {
		if (scene.hasLoaded) {
			initializeScene();
		} else {
			scene.addEventListener('loaded', initializeScene, { once: true });
		}
	}

	return scene;
};

const initializeScene = () => {
	console.log('A-Frame scene initialized');
	
	// Dispatch event that scene is ready
	window.dispatchEvent(new CustomEvent('aframe:scene-ready', { 
		detail: { scene } 
	}));
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', createAFrameScene);
} else {
	createAFrameScene();
}

export { scene, createAFrameScene };

