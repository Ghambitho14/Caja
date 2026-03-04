const STORAGE_KEY = 'sistema-caja-v1';

export function loadState() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function saveState(state) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (e) {
		console.warn('No se pudo guardar en localStorage', e);
	}
}

export function id() {
	return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
