import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANNON_KEY;
const supabase = url && key ? createClient(url, key) : null;

/** True si Supabase está configurado; en ese caso la app no debe usar localStorage. */
export const isSupabaseConfigured = Boolean(supabase);

const MAX_STRING = 500;
const MAX_ID_LENGTH = 128;
const SANE_YEAR_MIN = 2000;
const SANE_YEAR_MAX = 2100;
/** Límite de monto (alineado con CHECK en BD). */
const MAX_MONTO = 100_000_000;

function sanitizeString(s, maxLen = MAX_STRING) {
	if (s == null) return '';
	const t = String(s).trim();
	return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function sanitizeId(id) {
	if (id == null) return '';
	const t = String(id).trim();
	return t.length > MAX_ID_LENGTH ? t.slice(0, MAX_ID_LENGTH) : t;
}

/** Fecha YYYY-MM-DD. Acepta ISO (con T) y devuelve solo la parte fecha. Si no es válida, devuelve hoy. */
function sanitizeFecha(s) {
	if (s == null) return todayStr();
	const t = String(s).trim();
	const match = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
	if (match) {
		const [, y, m, d] = match;
		const month = m.padStart(2, '0');
		const day = d.padStart(2, '0');
		return `${y}-${month}-${day}`;
	}
	return todayStr();
}

function todayStr() {
	const d = new Date();
	return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Monto en rango [0, MAX_MONTO] para cumplir con CHECK en BD. */
function clampMonto(n) {
	const v = Number.isFinite(Number(n)) ? Number(n) : 0;
	return Math.min(MAX_MONTO, Math.max(0, v));
}

function mapPedido(r) {
	const fecha = r.fecha ? String(r.fecha).slice(0, 10) : '';
	return {
		id: r.id,
		fecha,
		descripcion: r.descripcion ?? '',
		monto: Number(r.monto) || 0,
		metodoPago: r.metodo_pago ?? undefined,
		tipoVenta: r.tipo_venta === 'transferencia' ? 'transferencia' : 'efectivo',
	};
}

export async function loadStateFromApi(year, month) {
	if (!supabase) throw new Error('Supabase no configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANNON_KEY)');
	const now = new Date();
	let y = Number(year);
	let m = Number(month);
	if (!Number.isInteger(y) || y < SANE_YEAR_MIN || y > SANE_YEAR_MAX) y = now.getFullYear();
	if (!Number.isInteger(m) || m < 1 || m > 12) m = now.getMonth() + 1;
	const [pedidosRes, gastosRes, metasRes, ajustesRes, ajustesSemanaRes] = await Promise.all([
		supabase.from('pedidos').select('id, fecha, descripcion, monto, metodo_pago, tipo_venta'),
		supabase.from('gastos').select('id, tipo, descripcion, monto, fecha'),
		supabase.from('metas').select('id, nombre, monto'),
		supabase.from('ajustes').select('dinero_mes_pasado').eq('year', y).eq('month', m).maybeSingle(),
		supabase.from('ajustes_semana').select('semana, efectivo_inicial, efectivo_caja_bloqueado').eq('year', y).eq('month', m),
	]);

	if (pedidosRes.error) throw new Error(pedidosRes.error.message);
	if (gastosRes.error) throw new Error(gastosRes.error.message);
	if (metasRes.error) throw new Error(metasRes.error.message);
	if (ajustesRes.error) throw new Error(ajustesRes.error.message);
	if (ajustesSemanaRes.error) throw new Error(ajustesSemanaRes.error.message);

	const pedidos = (pedidosRes.data || []).map(mapPedido);
	const gastos = gastosRes.data || [];
	const metas = metasRes.data || [];
	const row = ajustesRes.data;
	const efectivoInicialSemana = {};
	const efectivoCajaBloqueadoSemana = {};
	(ajustesSemanaRes.data || []).forEach((r) => {
		efectivoInicialSemana[r.semana] = Number(r.efectivo_inicial) || 0;
		efectivoCajaBloqueadoSemana[r.semana] = Boolean(r.efectivo_caja_bloqueado);
	});
	const ajustes = row
		? {
			dineroMesPasado: Number(row.dinero_mes_pasado) || 0,
			efectivoInicialSemana,
			efectivoCajaBloqueadoSemana,
		}
		: { dineroMesPasado: 0, efectivoInicialSemana, efectivoCajaBloqueadoSemana: {} };

	return { pedidos, gastos, metas, ajustes };
}

/** Borra un pedido en Supabase (solo cuando el usuario pulsa Eliminar). */
export async function deletePedidoFromApi(id) {
	if (!supabase) return;
	const safeId = sanitizeId(id);
	if (!safeId) return;
	const { error } = await supabase.from('pedidos').delete().eq('id', safeId);
	if (error) throw new Error(error.message);
}

export async function saveStateToApi(state) {
	if (!supabase) throw new Error('Supabase no configurado');
	const { year, month, pedidos = [], gastos = [], metas = [], ajustes = {} } = state;
	const now = new Date();
	let y = Number(year);
	let m = Number(month);
	if (!Number.isInteger(y) || y < SANE_YEAR_MIN || y > SANE_YEAR_MAX) y = now.getFullYear();
	if (!Number.isInteger(m) || m < 1 || m > 12) m = now.getMonth() + 1;
	const dineroMesPasado = clampMonto(ajustes.dineroMesPasado);
	const efectivoInicialSemana = ajustes.efectivoInicialSemana || {};

	// Pedidos: solo upsert. Saneamos pero no filtramos filas (evitar pérdida de datos).
	if (pedidos.length) {
		const rows = pedidos.map((p) => ({
			id: sanitizeId(p.id),
			fecha: sanitizeFecha(p.fecha),
			descripcion: sanitizeString(p.descripcion),
			monto: clampMonto(p.monto),
			metodo_pago: sanitizeString(p.metodoPago, 100) || null,
			tipo_venta: p.tipoVenta === 'transferencia' ? 'transferencia' : 'efectivo',
		})).filter((r) => r.id);
		if (rows.length) {
			const { error: upsP } = await supabase.from('pedidos').upsert(rows, { onConflict: 'id' });
			if (upsP) throw new Error(upsP.message);
		}
	}

	// Gastos: upsert. Solo excluimos filas sin id.
	if (gastos.length) {
		const rows = gastos.map((g) => ({
			id: sanitizeId(g.id),
			tipo: g.tipo === 'jhon' ? 'jhon' : 'local',
			descripcion: sanitizeString(g.descripcion),
			monto: clampMonto(g.monto),
			fecha: sanitizeFecha(g.fecha),
		})).filter((r) => r.id);
		if (rows.length) {
			const { error: upsG } = await supabase.from('gastos').upsert(rows, { onConflict: 'id' });
			if (upsG) throw new Error(upsG.message);
		}
	}

	// Metas: upsert. Solo excluimos filas sin id.
	if (metas.length) {
		const rows = metas.map((m) => ({
			id: sanitizeId(m.id),
			nombre: sanitizeString(m.nombre, 200),
			monto: clampMonto(m.monto),
		})).filter((r) => r.id);
		if (rows.length) {
			const { error: upsM } = await supabase.from('metas').upsert(rows, { onConflict: 'id' });
			if (upsM) throw new Error(upsM.message);
		}
	}

	// Upsert ajustes (year, month)
	const { error: upsA } = await supabase
		.from('ajustes')
		.upsert({ year: y, month: m, dinero_mes_pasado: dineroMesPasado }, { onConflict: 'year,month' });
	if (upsA) throw new Error(upsA.message);

	// Upsert ajustes_semana
	const efectivoCajaBloqueadoSemana = ajustes.efectivoCajaBloqueadoSemana || {};
	const semanasRows = Object.entries(efectivoInicialSemana).map(([semana, efectivo_inicial]) => ({
		year: y,
		month: m,
		semana: Math.min(10, Math.max(0, parseInt(semana, 10) || 0)),
		efectivo_inicial: clampMonto(efectivo_inicial),
		efectivo_caja_bloqueado: Boolean(efectivoCajaBloqueadoSemana[semana]),
	}));
	if (semanasRows.length) {
		const { error: upsS } = await supabase.from('ajustes_semana').upsert(semanasRows, { onConflict: 'year,month,semana' });
		if (upsS) throw new Error(upsS.message);
	}

	return { ok: true };
}
