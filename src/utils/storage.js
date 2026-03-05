const STORAGE_KEY = 'sistema-caja-v1';

export function id() {
	return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

/** Solo se usa cuando Supabase NO está configurado (ej. desarrollo sin backend). Ver App.jsx. */
export function loadState() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/** Solo se usa cuando Supabase NO está configurado. Ver App.jsx. */
export function saveState(state) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (e) {
		console.warn('No se pudo guardar en localStorage', e);
	}
}
