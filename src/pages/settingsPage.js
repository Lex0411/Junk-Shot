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
    window.changeSensitivity = (delta) => setSetting('sensitivity', settings.sensitivity + Number(delta || 0));
    window.changeMusicVolume = (delta) => setSetting('musicVolume', settings.musicVolume + Number(delta || 0));
    window.changeSfxVolume = (delta) => setSetting('sfxVolume', settings.sfxVolume + Number(delta || 0));

    window.updateSensitivity = (event) => handleSliderPointer(event, 'sensitivity', sliderRefs.sensitivity?.track);
    window.updateMusicVolume = (event) => handleSliderPointer(event, 'musicVolume', sliderRefs.musicVolume?.track);
    window.updateSfxVolume = (event) => handleSliderPointer(event, 'sfxVolume', sliderRefs.sfxVolume?.track);
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