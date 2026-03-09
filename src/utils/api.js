import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANNON_KEY;
const supabase = url && key ? createClient(url, key) : null;

/** True si Supabase está configurado; en ese caso la app no debe usar localStorage. */
export const isSupabaseConfigured = Boolean(supabase);

export async function getCurrentUser() {
	if (!supabase) return null;
	const { data, error } = await supabase.auth.getUser();
	if (error) throw new Error(error.message);
	return data.user ?? null;
}

export function onAuthStateChange(handler) {
	if (!supabase) {
		return { unsubscribe: () => {} };
	}
	const { data } = supabase.auth.onAuthStateChange((_event, session) => {
		handler(session?.user ?? null);
	});
	return data.subscription;
}

export async function signInWithPassword(email, password) {
	if (!supabase) throw new Error('Supabase no configurado');
	const safeEmail = sanitizeString(email, 200).toLowerCase();
	const safePassword = String(password ?? '');
	const { data, error } = await supabase.auth.signInWithPassword({
		email: safeEmail,
		password: safePassword,
	});
	if (error) {
		const msg = String(error.message || '').toLowerCase();
		if (msg.includes('invalid login credentials')) {
			throw new Error('Correo o contraseña inválidos. Si la cuenta es nueva, confirma el correo primero.');
		}
		if (msg.includes('email not confirmed')) {
			throw new Error('Debes confirmar tu correo antes de iniciar sesión.');
		}
		throw new Error(error.message);
	}
	return data.user ?? null;
}

export async function signUpWithPassword(email, password) {
	if (!supabase) throw new Error('Supabase no configurado');
	const safeEmail = sanitizeString(email, 200).toLowerCase();
	const safePassword = String(password ?? '');
	const { data, error } = await supabase.auth.signUp({
		email: safeEmail,
		password: safePassword,
	});
	if (error) throw new Error(error.message);
	return {
		user: data.user ?? null,
		session: data.session ?? null,
	};
}

export async function signOut() {
	if (!supabase) return;
	const { error } = await supabase.auth.signOut();
	if (error) throw new Error(error.message);
}

function sanitizeRole(role) {
	return role === 'admin' ? 'admin' : 'user';
}

function sanitizeAccountStatus(status) {
	return status === 'active' || status === 'blocked' ? status : 'pending';
}

function mapAccessUser(row) {
	return {
		userId: row.user_id,
		email: row.email || '',
		role: sanitizeRole(row.role),
		status: sanitizeAccountStatus(row.status),
		createdAt: row.created_at || null,
		updatedAt: row.updated_at || null,
	};
}

export async function getMyAccessProfile() {
	if (!supabase) return null;
	const { data: authData, error: authError } = await supabase.auth.getUser();
	if (authError) throw new Error(authError.message);
	const userId = authData.user?.id;
	if (!userId) return null;
	const { data, error } = await supabase
		.from('app_users')
		.select('user_id, email, role, status, created_at, updated_at')
		.eq('user_id', userId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return data ? mapAccessUser(data) : null;
}

export async function listAccessUsers() {
	if (!supabase) throw new Error('Supabase no configurado');
	const { data, error } = await supabase
		.from('app_users')
		.select('user_id, email, role, status, created_at, updated_at')
		.order('created_at', { ascending: false });
	if (error) throw new Error(error.message);
	return (data || []).map(mapAccessUser);
}

export async function updateAccessUserStatus(userId, status) {
	if (!supabase) throw new Error('Supabase no configurado');
	const safeUserId = sanitizeString(userId, 128);
	const safeStatus = status === 'active' ? 'active' : 'blocked';
	if (!safeUserId) throw new Error('Usuario inválido');
	const { error } = await supabase
		.from('app_users')
		.update({ status: safeStatus })
		.eq('user_id', safeUserId);
	if (error) throw new Error(error.message);
	return { ok: true };
}

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

function requireUserId(userId) {
	const safe = sanitizeString(userId, 128);
	if (!safe) throw new Error('Usuario no autenticado');
	return safe;
}

export async function loadStateFromApi(year, month, userId) {
	if (!supabase) throw new Error('Supabase no configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANNON_KEY)');
	const ownerId = requireUserId(userId);
	const now = new Date();
	let y = Number(year);
	let m = Number(month);
	if (!Number.isInteger(y) || y < SANE_YEAR_MIN || y > SANE_YEAR_MAX) y = now.getFullYear();
	if (!Number.isInteger(m) || m < 1 || m > 12) m = now.getMonth() + 1;
	const [pedidosRes, gastosRes, metasRes, ajustesRes, ajustesSemanaRes] = await Promise.all([
		supabase.from('pedidos').select('id, fecha, descripcion, monto, metodo_pago, tipo_venta').eq('user_id', ownerId),
		supabase.from('gastos').select('id, tipo, descripcion, monto, fecha').eq('user_id', ownerId),
		supabase.from('metas').select('id, nombre, monto').eq('user_id', ownerId),
		supabase.from('ajustes').select('dinero_mes_pasado').eq('user_id', ownerId).eq('year', y).eq('month', m).maybeSingle(),
		supabase.from('ajustes_semana').select('semana, efectivo_inicial, efectivo_caja_bloqueado, efectivo_inicial_bloqueado').eq('user_id', ownerId).eq('year', y).eq('month', m),
	]);

	if (pedidosRes.error) throw new Error(pedidosRes.error.message);
	if (gastosRes.error) throw new Error(gastosRes.error.message);
	if (metasRes.error) throw new Error(metasRes.error.message);
	if (ajustesRes.error) throw new Error(ajustesRes.error.message);
	if (ajustesSemanaRes.error) throw new Error(ajustesSemanaRes.error.message);

	const pedidos = (pedidosRes.data || []).map(mapPedido);
	const gastos = gastosRes.data || [];
	// Deduplicar metas por id por si hubo duplicados en DB (evita doble conteo en "Falta para la meta").
	const metasRaw = metasRes.data || [];
	const seenMetaIds = new Set();
	const metas = metasRaw.filter((m) => {
		const id = m?.id;
		if (!id || seenMetaIds.has(id)) return false;
		seenMetaIds.add(id);
		return true;
	});
	const row = ajustesRes.data;
	const efectivoInicialSemana = {};
	const efectivoCajaBloqueadoSemana = {};
	const efectivoInicialBloqueadoSemana = {};
	(ajustesSemanaRes.data || []).forEach((r) => {
		efectivoInicialSemana[r.semana] = Number(r.efectivo_inicial) || 0;
		efectivoCajaBloqueadoSemana[r.semana] = r.efectivo_caja_bloqueado === true;
		efectivoInicialBloqueadoSemana[r.semana] = r.efectivo_inicial_bloqueado === true;
	});
	const ajustes = row
		? {
			dineroMesPasado: Number(row.dinero_mes_pasado) || 0,
			efectivoInicialSemana,
			efectivoCajaBloqueadoSemana,
			efectivoInicialBloqueadoSemana,
		}
		: { dineroMesPasado: 0, efectivoInicialSemana, efectivoCajaBloqueadoSemana: {}, efectivoInicialBloqueadoSemana: {} };

	return { pedidos, gastos, metas, ajustes };
}

/** Borra un pedido en Supabase (solo cuando el usuario pulsa Eliminar). */
export async function deletePedidoFromApi(id) {
	if (!supabase) return;
	const safeId = sanitizeId(id);
	const { data, error: userErr } = await supabase.auth.getUser();
	if (userErr) throw new Error(userErr.message);
	const ownerId = requireUserId(data.user?.id);
	if (!safeId) return;
	const { error } = await supabase.from('pedidos').delete().eq('id', safeId).eq('user_id', ownerId);
	if (error) throw new Error(error.message);
}

export async function saveStateToApi(state, userId) {
	if (!supabase) throw new Error('Supabase no configurado');
	const ownerId = requireUserId(userId);
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
			user_id: ownerId,
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
			user_id: ownerId,
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

	// Metas: reemplazar todo el conjunto para que los eliminados en la UI se borren en la DB.
	const { error: delMetas } = await supabase.from('metas').delete().eq('user_id', ownerId);
	if (delMetas) throw new Error(delMetas.message);
	if (metas.length) {
		const rows = metas.map((m) => ({
			id: sanitizeId(m.id),
			user_id: ownerId,
			nombre: sanitizeString(m.nombre, 200),
			monto: clampMonto(m.monto),
		})).filter((r) => r.id);
		if (rows.length) {
			const { error: upsM } = await supabase.from('metas').upsert(rows, { onConflict: 'id' });
			if (upsM) throw new Error(upsM.message);
		}
	}

	// Ajustes por usuario/mes
	const { error: upsA } = await supabase
		.from('ajustes')
		.upsert(
			{ user_id: ownerId, year: y, month: m, dinero_mes_pasado: dineroMesPasado },
			{ onConflict: 'user_id,year,month' }
		);
	if (upsA) throw new Error(upsA.message);

	// Upsert ajustes_semana (incluir semanas que solo tengan bloqueo, aunque no tengan efectivo_inicial)
	const efectivoCajaBloqueadoSemana = ajustes.efectivoCajaBloqueadoSemana || {};
	const efectivoInicialBloqueadoSemana = ajustes.efectivoInicialBloqueadoSemana || {};
	const semanasKeys = new Set([
		...Object.keys(efectivoInicialSemana),
		...Object.keys(efectivoCajaBloqueadoSemana),
		...Object.keys(efectivoInicialBloqueadoSemana),
	]);
	const semanasRows = Array.from(semanasKeys).map((semana) => {
		const sem = Math.min(10, Math.max(0, parseInt(semana, 10) || 0));
		return {
			year: y,
			month: m,
			semana: sem,
			efectivo_inicial: clampMonto(efectivoInicialSemana[semana]),
			efectivo_caja_bloqueado: Boolean(efectivoCajaBloqueadoSemana[semana]),
			efectivo_inicial_bloqueado: Boolean(efectivoInicialBloqueadoSemana[semana]),
		};
	});
	if (semanasRows.length) {
		const rows = semanasRows.map((r) => ({ ...r, user_id: ownerId }));
		const { error: upsS } = await supabase
			.from('ajustes_semana')
			.upsert(rows, { onConflict: 'user_id,year,month,semana' });
		if (upsS) throw new Error(upsS.message);
	}

	return { ok: true };
}
