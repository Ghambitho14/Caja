const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function loadStateFromApi(year, month) {
	const res = await fetch(`${API_URL}/api/state?year=${year}&month=${month}`);
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export async function saveStateToApi(state) {
	const { year, month, pedidos, gastos, metas, ajustes } = state;
	const res = await fetch(`${API_URL}/api/state`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			year,
			month,
			pedidos: pedidos || [],
			gastos: gastos || [],
			metas: metas || [],
			ajustes: ajustes || { efectivoInicial: 0, dineroMesPasado: 0 },
		}),
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}
