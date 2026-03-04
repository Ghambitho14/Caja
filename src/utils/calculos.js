/**
 * Cálculos del sistema de caja (equivalente a las fórmulas del Excel).
 */

export function totalDia(pedidos, fecha) {
	return pedidos
		.filter((p) => p.fecha === fecha)
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

export function totalSemana(pedidos, fechasSemana) {
	return fechasSemana.reduce((s, f) => s + totalDia(pedidos, f), 0);
}

/** Total de un día solo para pedidos con tipoVenta === tipo ('efectivo' | 'transferencia'). Sin tipoVenta cuenta como efectivo. */
export function totalDiaPorTipo(pedidos, fecha, tipo) {
	return pedidos
		.filter((p) => p.fecha === fecha && (p.tipoVenta || 'efectivo') === tipo)
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

/** Total de la semana por tipo. */
export function totalSemanaPorTipo(pedidos, fechasSemana, tipo) {
	return fechasSemana.reduce((s, f) => s + totalDiaPorTipo(pedidos, f, tipo), 0);
}

export function totalMes(pedidos, year, month) {
	if (!Array.isArray(pedidos)) return 0;
	const prefix = `${year}-${String(month).padStart(2, '0')}-`;
	return pedidos
		.filter((p) => p && p.fecha && String(p.fecha).startsWith(prefix))
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

/** Total del mes solo para pedidos con tipoVenta === tipo. Sin tipoVenta cuenta como efectivo. */
export function totalMesPorTipo(pedidos, year, month, tipo) {
	if (!Array.isArray(pedidos)) return 0;
	const prefix = `${year}-${String(month).padStart(2, '0')}-`;
	return pedidos
		.filter((p) => p && p.fecha && String(p.fecha).startsWith(prefix) && (p.tipoVenta || 'efectivo') === tipo)
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

export function totalGastosPorTipo(gastos, tipo, year, month) {
	const prefix = `${year}-${String(month).padStart(2, '0')}-`;
	return gastos
		.filter((g) => g.tipo === tipo && g.fecha && g.fecha.startsWith(prefix))
		.reduce((s, g) => s + (Number(g.monto) || 0), 0);
}

export function totalMetas(metas) {
	return metas.reduce((s, m) => s + (Number(m.monto) || 0), 0);
}

/** 1) Punto de partida: dinero del mes pasado + efectivo en caja al abrir */
export function dineroInicial(ajustes) {
	const a = ajustes || {};
	const dineroMesPasado = Number(a.dineroMesPasado ?? a.dinero_mes_pasado) || 0;
	const efectivoInicial = Number(a.efectivoInicial ?? a.efectivo_inicial) || 0;
	return dineroMesPasado + efectivoInicial;
}

/** 4) Dinero actual = dinero inicial (caja + mes pasado) + ventas − gastos */
export function dineroActual(ajustes, totalMes, gastosLocal, gastosPersonales) {
	return dineroInicial(ajustes) + (Number(totalMes) || 0) - (Number(gastosLocal) || 0) - (Number(gastosPersonales) || 0);
}

/** Dinero actual sin incluir efectivo de caja: dinero mes pasado + ventas − gastos */
export function dineroActualSinCaja(ajustes, totalMes, gastosLocal, gastosPersonales) {
	const a = ajustes || {};
	const dineroMesPasado = Number(a.dineroMesPasado ?? a.dinero_mes_pasado) || 0;
	return dineroMesPasado + (Number(totalMes) || 0) - (Number(gastosLocal) || 0) - (Number(gastosPersonales) || 0);
}

/** Dinero en cuenta = dinero del mes pasado + transferencias del mes − gastos */
export function dineroEnCuenta(ajustes, totalTransferenciaMes, gastosLocal, gastosPersonales) {
	const a = ajustes || {};
	const dineroMesPasado = Number(a.dineroMesPasado ?? a.dinero_mes_pasado) || 0;
	const transferencias = Number(totalTransferenciaMes) || 0;
	const gastosL = Number(gastosLocal) || 0;
	const gastosP = Number(gastosPersonales) || 0;
	return dineroMesPasado + transferencias - gastosL - gastosP;
}

/** Efectivo total = efectivo de caja + ventas en efectivo del mes */
export function efectivoTotal(ajustes, totalEfectivoMes) {
	const a = ajustes || {};
	const efectivoInicial = Number(a.efectivoInicial ?? a.efectivo_inicial) || 0;
	return efectivoInicial + (Number(totalEfectivoMes) || 0);
}

/** 6) Ganancia real = dinero actual − compromisos */
export function gananciaReal(dineroActualVal, totalCompromisos) {
	return (Number(dineroActualVal) || 0) - (Number(totalCompromisos) || 0);
}

/** @deprecated usar gananciaReal */
export function ganancia(dineroEnCuentaVal, totalMetasVal) {
	return gananciaReal(dineroEnCuentaVal, totalMetasVal);
}

export function getSemanasDelMes(year, month) {
	const first = new Date(year, month - 1, 1);
	const last = new Date(year, month, 0);
	const weeks = [];
	let start = new Date(first);
	while (start <= last) {
		const end = new Date(start);
		end.setDate(end.getDate() + 6);
		const fechas = [];
		const d = new Date(start);
		for (let i = 0; i < 7; i++) {
			if (d.getMonth() === month - 1 && d.getFullYear() === year) {
				fechas.push(formatFecha(d));
			}
			d.setDate(d.getDate() + 1);
		}
		if (fechas.length) weeks.push({ start: formatFecha(start), fechas });
		start.setDate(start.getDate() + 7);
	}
	return weeks;
}

export function formatFecha(d) {
	if (typeof d === 'string') return d;
	const date = d instanceof Date ? d : new Date(d);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function formatFechaCorta(fechaStr) {
	if (!fechaStr) return '';
	const [y, m, d] = fechaStr.split('-');
	return `${d}-${m}`;
}

const MES_CORTO = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatFechaDiaMes(fechaStr) {
	if (!fechaStr) return '';
	const [, m, d] = fechaStr.split('-');
	return `${d}-${MES_CORTO[Number(m)] || m}`;
}

export function nombreMes(month) {
	const names = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
	return names[Number(month)] || '';
}

export function formatMonto(n) {
	return new Intl.NumberFormat('es-CL', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(Number(n) || 0);
}
