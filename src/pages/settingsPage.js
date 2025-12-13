import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../services/settingsService.js';

const sliderOrder = {
    sensitivity: 1,
    musicVolume: 2,
    sfxVolume: 3
};

const sliderRefs = {};
let settings = { ...DEFAULT_SETTINGS };

const clampValue = (value) => Math.max(0, Math.min(100, Math.round(Number(value ?? 0))));

const persistSettings = () => {
    saveSettings(settings);
};

const getSettingItem = (order) => document.querySelector(`.setting-item:nth-of-type(${order})`);

const ensureSliderId = (key, sliderEl) => {
    if (sliderEl && !sliderEl.id) {
        sliderEl.id = `${key}Slider`;
    }
};

const populateSliderRefs = () => {
    Object.entries(sliderOrder).forEach(([key, order]) => {
        const settingItem = getSettingItem(order);
        if (!settingItem) {
            console.warn(`[SettingsPage] Missing setting item for ${key}`);
            return;
        }

        const sliderTrack = settingItem.querySelector(`#${key}Slider`) || settingItem.querySelector('.slider-track');
        ensureSliderId(key, sliderTrack);
        sliderRefs[key] = {
            track: sliderTrack,
            fill: sliderTrack?.querySelector('.slider-fill'),
            handle: sliderTrack?.querySelector('.slider-handle'),
            minusBtn: settingItem.querySelector('.minus-btn'),
            plusBtn: settingItem.querySelector('.plus-btn')
        };
    });
};

const updateSliderUI = (key, value) => {
    const refs = sliderRefs[key];
    if (!refs) {
        return;
    }

    if (refs.fill) {
        refs.fill.style.width = `${value}%`;
    }
    if (refs.handle) {
        refs.handle.style.left = `${value}%`;
    }
    if (refs.track) {
        refs.track.setAttribute('aria-valuenow', String(value));
        refs.track.setAttribute('aria-valuetext', `${value}%`);
    }
};

const setSetting = (key, value) => {
    const clamped = clampValue(value);
    settings[key] = clamped;
    updateSliderUI(key, clamped);
};

const handleSliderPointer = (event, key, track) => {
    if (!track) {
        return;
    }
    const rect = track.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    setSetting(key, percent);
};

const attachSliderInteractions = (key) => {
    const refs = sliderRefs[key];
    if (!refs?.track) {
        return;
    }

    const trackHandler = (event) => {
        event.preventDefault();
        handleSliderPointer(event, key, refs.track);
    };

    refs.track.addEventListener('click', trackHandler);

    if (refs.handle) {
        refs.handle.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            refs.handle.setPointerCapture?.(event.pointerId);
            handleSliderPointer(event, key, refs.track);

            const moveListener = (moveEvent) => handleSliderPointer(moveEvent, key, refs.track);
            const upListener = (endEvent) => {
                refs.handle.releasePointerCapture?.(endEvent.pointerId);
                document.removeEventListener('pointermove', moveListener);
                document.removeEventListener('pointerup', upListener);
                document.removeEventListener('pointercancel', upListener);
            };

            document.addEventListener('pointermove', moveListener);
            document.addEventListener('pointerup', upListener);
            document.addEventListener('pointercancel', upListener);
        });
    }
};

const attachStepButtons = (key) => {
    const refs = sliderRefs[key];
    if (!refs) {
        return;
    }

    refs.minusBtn?.addEventListener('click', () => setSetting(key, settings[key] - 10));
    refs.plusBtn?.addEventListener('click', () => setSetting(key, settings[key] + 10));
};

const bindLegacyGlobals = () => {
    // Functions are already defined at module level for onclick handlers
    // This function is kept for compatibility but functions are already bound
};

const navigateHome = () => {
    window.location.assign('/index.html');
};

const bindNavigationButtons = () => {
    const backButton = document.getElementById('backBtn') || document.getElementById('settingsBackButton');
    const saveButton = document.getElementById('saveBtn');

    backButton?.addEventListener('click', () => {
        persistSettings();
        navigateHome();
    });

    saveButton?.addEventListener('click', () => {
        persistSettings();
    });
};

const applySavedValues = () => {
    Object.keys(sliderOrder).forEach((key) => {
        setSetting(key, settings[key]);
    });
};

// Define stub functions immediately so onclick handlers work
// They'll be replaced with proper implementations after initialization
window.changeSensitivity = (delta) => {
    if (typeof setSetting === 'function' && typeof persistSettings === 'function') {
        if (!settings) settings = getSettings();
        const current = settings.sensitivity || DEFAULT_SETTINGS.sensitivity;
        setSetting('sensitivity', current + Number(delta || 0));
        persistSettings();
    } else {
        // Defer until initialized
        setTimeout(() => window.changeSensitivity(delta), 50);
    }
};
window.changeMusicVolume = (delta) => {
    if (typeof setSetting === 'function' && typeof persistSettings === 'function') {
        if (!settings) settings = getSettings();
        const current = settings.musicVolume || DEFAULT_SETTINGS.musicVolume;
        setSetting('musicVolume', current + Number(delta || 0));
        persistSettings();
    } else {
        setTimeout(() => window.changeMusicVolume(delta), 50);
    }
};
window.changeSfxVolume = (delta) => {
    if (typeof setSetting === 'function' && typeof persistSettings === 'function') {
        if (!settings) settings = getSettings();
        const current = settings.sfxVolume || DEFAULT_SETTINGS.sfxVolume;
        setSetting('sfxVolume', current + Number(delta || 0));
        persistSettings();
    } else {
        setTimeout(() => window.changeSfxVolume(delta), 50);
    }
};

window.updateSensitivity = (event) => {
    if (typeof handleSliderPointer === 'function' && sliderRefs.sensitivity?.track) {
        handleSliderPointer(event, 'sensitivity', sliderRefs.sensitivity.track);
        if (typeof persistSettings === 'function') persistSettings();
    } else {
        setTimeout(() => window.updateSensitivity(event), 50);
    }
};
window.updateMusicVolume = (event) => {
    if (typeof handleSliderPointer === 'function' && sliderRefs.musicVolume?.track) {
        handleSliderPointer(event, 'musicVolume', sliderRefs.musicVolume.track);
        if (typeof persistSettings === 'function') persistSettings();
    } else {
        setTimeout(() => window.updateMusicVolume(event), 50);
    }
};
window.updateSfxVolume = (event) => {
    if (typeof handleSliderPointer === 'function' && sliderRefs.sfxVolume?.track) {
        handleSliderPointer(event, 'sfxVolume', sliderRefs.sfxVolume.track);
        if (typeof persistSettings === 'function') persistSettings();
    } else {
        setTimeout(() => window.updateSfxVolume(event), 50);
    }
};

const initSettingsPage = () => {
    settings = getSettings();
    
    populateSliderRefs();
    applySavedValues();
    Object.keys(sliderOrder).forEach((key) => {
        attachSliderInteractions(key);
        attachStepButtons(key);
    });
    bindLegacyGlobals();
    bindNavigationButtons();
    window.addEventListener('beforeunload', persistSettings);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsPage, { once: true });
} else {
    initSettingsPage();
}