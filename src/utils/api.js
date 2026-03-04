import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANNON_KEY;
if (!url || !key) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANNON_KEY en .env');

const supabase = createClient(url, key);

function mapPedido(r) {
	return {
		id: r.id,
		fecha: r.fecha,
		descripcion: r.descripcion,
		monto: r.monto,
		metodoPago: r.metodo_pago ?? undefined,
		tipoVenta: r.tipo_venta === 'transferencia' ? 'transferencia' : 'efectivo',
	};
}

export async function loadStateFromApi(year, month) {
	const [pedidosRes, gastosRes, metasRes, ajustesRes] = await Promise.all([
		supabase.from('pedidos').select('id, fecha, descripcion, monto, metodo_pago, tipo_venta'),
		supabase.from('gastos').select('id, tipo, descripcion, monto, fecha'),
		supabase.from('metas').select('id, nombre, monto'),
		supabase.from('ajustes').select('efectivo_inicial, dinero_mes_pasado').eq('year', year).eq('month', month).maybeSingle(),
	]);

	if (pedidosRes.error) throw new Error(pedidosRes.error.message);
	if (gastosRes.error) throw new Error(gastosRes.error.message);
	if (metasRes.error) throw new Error(metasRes.error.message);
	if (ajustesRes.error) throw new Error(ajustesRes.error.message);

	const pedidos = (pedidosRes.data || []).map(mapPedido);
	const gastos = gastosRes.data || [];
	const metas = metasRes.data || [];
	const row = ajustesRes.data;
	const ajustes = row
		? { efectivoInicial: Number(row.efectivo_inicial) || 0, dineroMesPasado: Number(row.dinero_mes_pasado) || 0 }
		: { efectivoInicial: 0, dineroMesPasado: 0 };

	return { pedidos, gastos, metas, ajustes };
}

export async function saveStateToApi(state) {
	const { year, month, pedidos = [], gastos = [], metas = [], ajustes = {} } = state;
	const efectivoInicial = Number(ajustes.efectivoInicial) || 0;
	const dineroMesPasado = Number(ajustes.dineroMesPasado) || 0;

	// Reemplazar pedidos: borrar todos e insertar los actuales
	const { data: pedidosIds } = await supabase.from('pedidos').select('id');
	const idsP = (pedidosIds || []).map((r) => r.id);
	if (idsP.length) {
		const { error: delP } = await supabase.from('pedidos').delete().in('id', idsP);
		if (delP) throw new Error(delP.message);
	}
	if (pedidos.length) {
		const rows = pedidos.map((p) => ({
			id: p.id,
			fecha: p.fecha,
			descripcion: p.descripcion ?? '',
			monto: Number(p.monto) || 0,
			metodo_pago: p.metodoPago ?? null,
			tipo_venta: p.tipoVenta === 'transferencia' ? 'transferencia' : 'efectivo',
		}));
		const { error: insP } = await supabase.from('pedidos').insert(rows);
		if (insP) throw new Error(insP.message);
	}

	// Reemplazar gastos
	const { data: gastosIds } = await supabase.from('gastos').select('id');
	const idsG = (gastosIds || []).map((r) => r.id);
	if (idsG.length) {
		const { error: delG } = await supabase.from('gastos').delete().in('id', idsG);
		if (delG) throw new Error(delG.message);
	}
	if (gastos.length) {
		const { error: insG } = await supabase.from('gastos').insert(gastos);
		if (insG) throw new Error(insG.message);
	}

	// Reemplazar metas
	const { data: metasIds } = await supabase.from('metas').select('id');
	const idsM = (metasIds || []).map((r) => r.id);
	if (idsM.length) {
		const { error: delM } = await supabase.from('metas').delete().in('id', idsM);
		if (delM) throw new Error(delM.message);
	}
	if (metas.length) {
		const rows = metas.map((m) => ({ id: m.id, nombre: m.nombre, monto: Number(m.monto) || 0 }));
		const { error: insM } = await supabase.from('metas').insert(rows);
		if (insM) throw new Error(insM.message);
	}

	// Upsert ajustes (year, month)
	const { error: upsA } = await supabase
		.from('ajustes')
		.upsert({ year, month, efectivo_inicial: efectivoInicial, dinero_mes_pasado: dineroMesPasado }, { onConflict: 'year,month' });
	if (upsA) throw new Error(upsA.message);

	return { ok: true };
}
