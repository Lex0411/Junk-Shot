import AudioManager from '../services/audioManager.js';

const CLICK_SOUND_KEY = 'ui-click';
const CLICK_SOUND_SRC = '/public/audio/mouse_click.mp3';
const QUIT_MODAL_OPEN_CLASS = 'quit-modal-open';
const NAV_DELAY_MS = 120;

const audioManager = AudioManager.getInstance();
audioManager.registerSound(CLICK_SOUND_KEY, CLICK_SOUND_SRC, { volume: 0.5 });

const ensureAudioUnlocked = (() => {
	let unlocked = false;
	return () => {
		if (unlocked) {
			return;
		}
		const test = new Audio();
		test.play().catch(() => {});
		unlocked = true;
	};
})();

const onReady = (callback) => {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', callback, { once: true });
	} else {
		callback();
	}
};

const playClick = () => {
	ensureAudioUnlocked();
	audioManager.play(CLICK_SOUND_KEY);
};

const onButtonClickSound = () => {
	playClick();
};

const attachClickSound = (button) => {
	if (!button || button.dataset.clickSoundAttached === 'true') {
		return;
	}

	button.addEventListener('click', onButtonClickSound, { capture: true });
	button.dataset.clickSoundAttached = 'true';
};

const primeButtonClickSounds = (root = document) => {
	const buttons = root.querySelectorAll('button');
	buttons.forEach(attachClickSound);
};

const navigateTo = (path) => {
	if (!path) {
		return;
	}
	window.location.assign(path);
};

const exitGame = () => {
	const currentWindow = window.open('', '_self');
	currentWindow?.close();

	setTimeout(() => {
		if (!window.closed) {
			window.location.replace('about:blank');
		}
	}, 150);
};

const toggleQuitModal = (isOpen, modal) => {
	if (!modal) {
		return;
	}

	modal.style.display = isOpen ? 'flex' : 'none';
	modal.setAttribute('aria-hidden', String(!isOpen));
	modal.dataset.state = isOpen ? 'open' : 'closed';
	document.body.classList.toggle(QUIT_MODAL_OPEN_CLASS, isOpen);
};

const wireMainMenu = () => {
	primeButtonClickSounds();

	const playBtn = document.getElementById('playBtn');
	const settingsBtn = document.getElementById('settingsBtn');
	const quitBtn = document.getElementById('quitBtn');
	const quitModal = document.getElementById('quitModal');
	const confirmQuitBtn = document.getElementById('yesBtn') ?? quitModal?.querySelector('.yes-btn');
	const cancelQuitBtn = document.getElementById('noBtn') ?? quitModal?.querySelector('.no-btn');

	if (!playBtn || !settingsBtn || !quitBtn || !quitModal) {
		return;
	}

	const openQuitModal = () => {
		toggleQuitModal(true, quitModal);
	};

	const closeQuitModal = () => {
		toggleQuitModal(false, quitModal);
	};

	const handleNavigation = (path) => () => {
		setTimeout(() => navigateTo(path), NAV_DELAY_MS);
	};

	playBtn.addEventListener('click', handleNavigation('/difficulty.html'));
	settingsBtn.addEventListener('click', handleNavigation('/settings.html'));
	quitBtn.addEventListener('click', () => {
		scrollTo(0, 0);
		setTimeout(openQuitModal, NAV_DELAY_MS / 2);
	});

	confirmQuitBtn?.addEventListener('click', () => {
		setTimeout(() => {
			closeQuitModal();
			exitGame();
		}, NAV_DELAY_MS);
	});

	cancelQuitBtn?.addEventListener('click', () => {
		setTimeout(closeQuitModal, NAV_DELAY_MS);
	});

	quitModal.addEventListener('click', (event) => {
		if (event.target === quitModal) {
			closeQuitModal();
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && quitModal.dataset.state === 'open') {
			closeQuitModal();
		}
	});
};

onReady(wireMainMenu);
