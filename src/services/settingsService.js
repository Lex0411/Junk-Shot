const STORAGE_KEY = 'junkshot_settings';

const DEFAULT_SETTINGS = {
	sensitivity: 50,
	musicVolume: 70,
	sfxVolume: 80
};

const clamp = (value, min = 0, max = 100) => {
	const numeric = Number(value);
	if (Number.isNaN(numeric)) {
		return min;
	}
	return Math.min(max, Math.max(min, Math.round(numeric)));
};

export const getSettings = () => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return { ...DEFAULT_SETTINGS };
		}
		const parsed = JSON.parse(raw);
		return {
			...DEFAULT_SETTINGS,
			...parsed
		};
	} catch (error) {
		console.warn('settingsService:getSettings failed', error);
		return { ...DEFAULT_SETTINGS };
	}
};

export const saveSettings = (settings = {}) => {
	const payload = {
		sensitivity: clamp(settings.sensitivity ?? DEFAULT_SETTINGS.sensitivity),
		musicVolume: clamp(settings.musicVolume ?? DEFAULT_SETTINGS.musicVolume),
		sfxVolume: clamp(settings.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume)
	};
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	} catch (error) {
		console.warn('settingsService:saveSettings failed', error);
	}
	return payload;
};

export default {
	getSettings,
	saveSettings,
	DEFAULT_SETTINGS
};
