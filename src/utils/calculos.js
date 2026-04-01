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

/** Total de un día por tipo: efectivo | transferencia | tarjeta. Tarjeta no suma a dinero en cuenta (va a otra cuenta). Sin tipoVenta cuenta como efectivo. */
export function totalDiaPorTipo(pedidos, fecha, tipo) {
	const t = p => (p.tipoVenta || 'efectivo');
	return pedidos
		.filter((p) => p.fecha === fecha && t(p) === tipo)
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

/** Total de la semana por tipo. */
export function totalSemanaPorTipo(pedidos, fechasSemana, tipo) {
	return fechasSemana.reduce((s, f) => s + totalDiaPorTipo(pedidos, f, tipo), 0);
}

/** Total de la semana solo por tipo exacto (transferencia no incluye tarjeta, tarjeta solo tarjeta). */
export function totalSemanaPorTipoExacto(pedidos, fechasSemana, tipo) {
	const t = (p) => (p.tipoVenta || 'efectivo');
	return pedidos
		.filter((p) => p.fecha && fechasSemana.includes(p.fecha) && t(p) === tipo)
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

export function totalMes(pedidos, year, month) {
	if (!Array.isArray(pedidos)) return 0;
	const prefix = `${year}-${String(month).padStart(2, '0')}-`;
	return pedidos
		.filter((p) => p && p.fecha && String(p.fecha).startsWith(prefix))
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

/** Total del mes por tipo: efectivo | transferencia | tarjeta. Solo transferencia suma a dinero en cuenta; tarjeta va a otra cuenta. Sin tipoVenta cuenta como efectivo. */
export function totalMesPorTipo(pedidos, year, month, tipo) {
	if (!Array.isArray(pedidos)) return 0;
	const prefix = `${year}-${String(month).padStart(2, '0')}-`;
	const t = p => (p.tipoVenta || 'efectivo');
	return pedidos
		.filter((p) => p && p.fecha && String(p.fecha).startsWith(prefix) && t(p) === tipo)
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

/** Índice de semana (0-based) en la que cae la fecha YYYY-MM-DD, o -1 si no está en ninguna (ej. lunes). */
export function semanaIndexDeFecha(semanas, fechaStr) {
	if (!fechaStr || !Array.isArray(semanas)) return -1;
	for (let i = 0; i < semanas.length; i++) {
		const fechas = semanas[i]?.fechas || [];
		if (fechas.includes(fechaStr)) return i;
	}
	return -1;
}

/**
 * Total del mes por tipo (efectivo | tarjeta) excluyendo pedidos en semanas con caja cerrada:
 * ese dinero ya se depositó a cuenta y no debe figurar como “en caja / pendiente tarjeta”.
 */
export function totalMesPorTipoMenosSemanasCerradas(pedidos, year, month, tipo, semanas, efectivoCajaBloqueadoSemana) {
	if (!Array.isArray(pedidos)) return 0;
	const prefix = `${year}-${String(month).padStart(2, '0')}-`;
	const t = (p) => (p.tipoVenta || 'efectivo');
	const bloqueado = efectivoCajaBloqueadoSemana || {};
	return pedidos
		.filter((p) => {
			if (!p || !p.fecha || !String(p.fecha).startsWith(prefix) || t(p) !== tipo) return false;
			const idx = semanaIndexDeFecha(semanas, p.fecha);
			if (idx < 0) return true;
			return !bloqueado[idx];
		})
		.reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

export function totalGastosPorTipo(gastos, tipo, year, month, fuentePago) {
	const prefix = `${year}-${String(month).padStart(2, '0')}-`;
	return gastos
		.filter((g) => {
			if (g.tipo !== tipo) return false;
			if (g.fecha && !g.fecha.startsWith(prefix)) return false;
			if (fuentePago && g.fuentePago !== fuentePago) return false;
			return true;
		})
		.reduce((s, g) => s + (Number(g.monto) || 0), 0);
}

export function totalMetas(metas) {
	return metas.reduce((s, m) => s + (Number(m.monto) || 0), 0);
}

/** Punto de partida: dinero del mes pasado (el efectivo de caja es solo semanal, en Pedidos) */
export function dineroInicial(ajustes) {
	const a = ajustes || {};
	const dineroMesPasado = Number(a.dineroMesPasado ?? a.dinero_mes_pasado) || 0;
	return dineroMesPasado;
}

export function totalDepositosMes(ajustes) {
	const a = ajustes || {};
	const depositos = a.depositoTotalSemana && typeof a.depositoTotalSemana === 'object' ? a.depositoTotalSemana : {};
	return Object.values(depositos).reduce((s, v) => s + (Number(v) || 0), 0);
}

/** Dinero actual = dinero inicial (mes pasado) + ventas − gastos */
export function dineroActual(ajustes, totalMes, gastosLocal, gastosPersonales) {
	return dineroInicial(ajustes) + (Number(totalMes) || 0) - (Number(gastosLocal) || 0) - (Number(gastosPersonales) || 0);
}

/** Dinero actual sin incluir efectivo de caja: dinero mes pasado + ventas − gastos */
export function dineroActualSinCaja(ajustes, totalMes, gastosLocal, gastosPersonales) {
	const a = ajustes || {};
	const dineroMesPasado = Number(a.dineroMesPasado ?? a.dinero_mes_pasado) || 0;
	return dineroMesPasado + (Number(totalMes) || 0) - (Number(gastosLocal) || 0) - (Number(gastosPersonales) || 0);
}

/** Dinero en cuenta = arrastre mes pasado + depósitos semanales + transferencias del mes − gastos (pagados desde cuenta) */
export function dineroEnCuenta(ajustes, totalTransferenciaMes, gastosLocal, gastosPersonales) {
	const a = ajustes || {};
	const dineroMesPasado = Number(a.dineroMesPasado ?? a.dinero_mes_pasado) || 0;
	const depositos = totalDepositosMes(a);
	const transferencias = Number(totalTransferenciaMes) || 0;
	const gastosL = Number(gastosLocal) || 0;
	const gastosP = Number(gastosPersonales) || 0;
	return dineroMesPasado + depositos + transferencias - gastosL - gastosP;
}

/** Dinero en efectivo (mes) = ventas en efectivo del mes; el efectivo de caja es solo semanal */
export function efectivoTotal(ajustes, totalEfectivoMes) {
	return Number(totalEfectivoMes) || 0;
}

/** 6) Ganancia real = dinero actual − compromisos */
export function gananciaReal(dineroActualVal, totalCompromisos) {
	return (Number(dineroActualVal) || 0) - (Number(totalCompromisos) || 0);
}

/** @deprecated usar gananciaReal */
export function ganancia(dineroEnCuentaVal, totalMetasVal) {
	return gananciaReal(dineroEnCuentaVal, totalMetasVal);
}

/**
 * Semanas que se muestran en un mes: bloques de martes a domingo (6 días). El lunes no se cuenta.
 * Pueden cruzar mes: la semana que contiene el día 1 empieza el martes de esa semana (aunque sea del mes anterior).
 */
export function getSemanasDelMes(year, month) {
	const monthEnd = new Date(year, month - 1, new Date(year, month, 0).getDate());
	const prefix = `${year}-${String(month).padStart(2, '0')}-`;

	let t = new Date(year, month - 1, 1);
	const dow = t.getDay();
	const back = (dow - 2 + 7) % 7;
	t.setDate(t.getDate() - back);

	const weeks = [];
	while (true) {
		const fechas = [];
		for (let i = 0; i < 6; i++) {
			const d = new Date(t);
			d.setDate(t.getDate() + i);
			fechas.push(formatFecha(d));
		}
		const overlaps = fechas.some((f) => f.startsWith(prefix));
		if (overlaps) {
			weeks.push({ start: fechas[0], fechas });
		}
		t.setDate(t.getDate() + 7);
		if (!overlaps && t > monthEnd) break;
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
