import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANNON_KEY;
const supabase = url && key ? createClient(url, key) : null;

/** True si Supabase está configurado; en ese caso la app no debe usar localStorage. */
export const isSupabaseConfigured = Boolean(supabase);

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
	const [pedidosRes, gastosRes, metasRes, ajustesRes, ajustesSemanaRes] = await Promise.all([
		supabase.from('pedidos').select('id, fecha, descripcion, monto, metodo_pago, tipo_venta'),
		supabase.from('gastos').select('id, tipo, descripcion, monto, fecha'),
		supabase.from('metas').select('id, nombre, monto'),
		supabase.from('ajustes').select('dinero_mes_pasado').eq('year', year).eq('month', month).maybeSingle(),
		supabase.from('ajustes_semana').select('semana, efectivo_inicial, efectivo_caja_bloqueado').eq('year', year).eq('month', month),
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
	if (!supabase || !id) return;
	const { error } = await supabase.from('pedidos').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

export async function saveStateToApi(state) {
	if (!supabase) throw new Error('Supabase no configurado');
	const { year, month, pedidos = [], gastos = [], metas = [], ajustes = {} } = state;
	const dineroMesPasado = Number(ajustes.dineroMesPasado) || 0;
	const efectivoInicialSemana = ajustes.efectivoInicialSemana || {};

	// Pedidos: solo upsert. No borrar en la base por estar "fuera" del state (evita pérdida de datos).
	if (pedidos.length) {
		const rows = pedidos.map((p) => ({
			id: p.id,
			fecha: p.fecha,
			descripcion: p.descripcion ?? '',
			monto: Number(p.monto) || 0,
			metodo_pago: p.metodoPago ?? null,
			tipo_venta: p.tipoVenta === 'transferencia' ? 'transferencia' : 'efectivo',
		}));
		const { error: upsP } = await supabase.from('pedidos').upsert(rows, { onConflict: 'id' });
		if (upsP) throw new Error(upsP.message);
	}

	// Gastos: solo upsert
	if (gastos.length) {
		const { error: upsG } = await supabase.from('gastos').upsert(gastos, { onConflict: 'id' });
		if (upsG) throw new Error(upsG.message);
	}

	// Metas: solo upsert
	if (metas.length) {
		const rows = metas.map((m) => ({ id: m.id, nombre: m.nombre, monto: Number(m.monto) || 0 }));
		const { error: upsM } = await supabase.from('metas').upsert(rows, { onConflict: 'id' });
		if (upsM) throw new Error(upsM.message);
	}

	// Upsert ajustes (year, month) — solo dinero_mes_pasado; el efectivo es solo semanal (ajustes_semana)
	const { error: upsA } = await supabase
		.from('ajustes')
		.upsert({ year, month, dinero_mes_pasado: dineroMesPasado }, { onConflict: 'year,month' });
	if (upsA) throw new Error(upsA.message);

	// Upsert ajustes_semana (efectivo inicial y bloqueado por semana)
	const efectivoCajaBloqueadoSemana = ajustes.efectivoCajaBloqueadoSemana || {};
	const semanasRows = Object.entries(efectivoInicialSemana).map(([semana, efectivo_inicial]) => ({
		year,
		month,
		semana: parseInt(semana, 10),
		efectivo_inicial: Number(efectivo_inicial) || 0,
		efectivo_caja_bloqueado: Boolean(efectivoCajaBloqueadoSemana[semana]),
	}));
	if (semanasRows.length) {
		const { error: upsS } = await supabase.from('ajustes_semana').upsert(semanasRows, { onConflict: 'year,month,semana' });
		if (upsS) throw new Error(upsS.message);
	}

	return { ok: true };
}
