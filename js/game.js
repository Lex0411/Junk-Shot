// Main A-Frame scene initialization
import '../src/components/aframeAnimations.js';
import '../src/components/aframeGun.js';
import '../src/components/aframeTarget.js';
import '../src/components/fpsControls.js';
import { getSettings } from '../src/services/settingsService.js';

const STAGE_SELECTOR = '#aframe-stage';

let scene = null;

const createAFrameScene = () => {
    const stage = document.querySelector(STAGE_SELECTOR);
    if (!stage) {
        return null;
    }

    const settings = getSettings();
    const sensitivitySetting = Number(settings?.sensitivity ?? 50);
    const sensitivity = 0.001 + (sensitivitySetting / 100) * 0.002;

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
            
            <!-- Camera with gun attached -->
            <a-entity id="camera-rig" movement-controls="enabled: false">
                <a-camera 
                    id="camera"
                    look-controls="enabled: true; pointerLockEnabled: true; touchEnabled: false; sensitivity: ${sensitivity}"
                    wasd-controls="enabled: false"
                    fps-controls="enabled: true; sensitivity: ${sensitivity}"
                    position="0 1.2 4"
                    rotation="0 0 0"
                >
                    <!-- Crosshair cursor -->
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
        </a-scene>
    `;

    stage.innerHTML = sceneHTML;
    
    if (typeof AFRAME === 'undefined') {
        window.addEventListener('load', () => {
            setTimeout(createAFrameScene, 100);
        });
        return null;
    }
    
    scene = stage.querySelector('#game-scene');
    
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
    window.dispatchEvent(new CustomEvent('aframe:scene-ready', { 
        detail: { scene } 
    }));
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createAFrameScene);
} else {
    createAFrameScene();
}

export { scene, createAFrameScene };

