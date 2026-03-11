import * as XLSX from 'xlsx';
import {
	totalMes,
	totalMesPorTipo,
	totalGastosPorTipo,
	totalMetas,
	dineroInicial,
	dineroActual,
	dineroEnCuenta,
	efectivoTotal,
	gananciaReal,
} from './calculos';

function monthPrefix(year, month) {
	return `${year}-${String(month).padStart(2, '0')}-`;
}

function toSafeArray(value) {
	return Array.isArray(value) ? value : [];
}

function toSafeNumber(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

function sortByDateAsc(a, b) {
	return String(a?.fecha || '').localeCompare(String(b?.fecha || ''));
}

export function exportarExcelMesActual({ year, month, pedidos, gastos, metas, ajustes }) {
	const safePedidos = toSafeArray(pedidos);
	const safeGastos = toSafeArray(gastos);
	const safeMetas = toSafeArray(metas);
	const safeAjustes = ajustes && typeof ajustes === 'object' ? ajustes : {};
	const prefix = monthPrefix(year, month);

	const pedidosMes = safePedidos
		.filter((p) => p?.fecha && String(p.fecha).startsWith(prefix))
		.slice()
		.sort(sortByDateAsc);

	const gastosMes = safeGastos
		.filter((g) => g?.fecha && String(g.fecha).startsWith(prefix))
		.slice()
		.sort(sortByDateAsc);

	const ventasTotales = totalMes(safePedidos, year, month);
	const ventasEfectivo = totalMesPorTipo(safePedidos, year, month, 'efectivo');
	const ventasTransferencia = totalMesPorTipo(safePedidos, year, month, 'transferencia');
	const gastosNegocio = totalGastosPorTipo(safeGastos, 'local', year, month);
	const gastosPersonales = totalGastosPorTipo(safeGastos, 'jhon', year, month);
	const gastosTotales = gastosNegocio + gastosPersonales;
	const dineroInicialVal = dineroInicial(safeAjustes);
	const dineroEnCuentaVal = dineroEnCuenta(safeAjustes, ventasTransferencia, gastosNegocio, gastosPersonales);
	const efectivoMesVal = efectivoTotal(safeAjustes, ventasEfectivo);
	const dineroActualVal = dineroActual(safeAjustes, ventasTotales, gastosNegocio, gastosPersonales);
	const compromisosVal = totalMetas(safeMetas);
	const gananciaRealVal = gananciaReal(dineroActualVal, compromisosVal);

	const rows = [];
	rows.push(['Sistema de Caja - Exportacion mensual']);
	rows.push(['Mes', `${year}-${String(month).padStart(2, '0')}`]);
	rows.push(['Generado', new Date().toISOString()]);
	rows.push([]);

	rows.push(['RESUMEN MENSUAL']);
	rows.push(['Campo', 'Valor']);
	rows.push(['Ventas totales', ventasTotales]);
	rows.push(['Ventas efectivo', ventasEfectivo]);
	rows.push(['Ventas transferencia', ventasTransferencia]);
	rows.push(['Gastos negocio', gastosNegocio]);
	rows.push(['Gastos personales', gastosPersonales]);
	rows.push(['Gastos totales', gastosTotales]);
	rows.push(['Dinero mes pasado', dineroInicialVal]);
	rows.push(['Dinero en cuenta', dineroEnCuentaVal]);
	rows.push(['Efectivo del mes', efectivoMesVal]);
	rows.push(['Dinero actual', dineroActualVal]);
	rows.push(['Compromisos', compromisosVal]);
	rows.push(['Ganancia real', gananciaRealVal]);
	rows.push([]);

	rows.push(['PEDIDOS DEL MES']);
	rows.push(['Fecha', 'Descripcion', 'Tipo', 'Monto']);
	pedidosMes.forEach((p) => {
		rows.push([
			String(p.fecha || ''),
			String(p.descripcion || ''),
			p.tipoVenta === 'transferencia' ? 'Transferencia' : p.tipoVenta === 'tarjeta' ? 'Tarjeta' : 'Efectivo',
			toSafeNumber(p.monto),
		]);
	});
	if (!pedidosMes.length) rows.push(['Sin pedidos para este mes']);
	rows.push([]);

	rows.push(['GASTOS DEL MES']);
	rows.push(['Fecha', 'Tipo', 'Descripcion', 'Monto']);
	gastosMes.forEach((g) => {
		rows.push([
			String(g.fecha || ''),
			g.tipo === 'jhon' ? 'Personal' : 'Negocio',
			String(g.descripcion || ''),
			toSafeNumber(g.monto),
		]);
	});
	if (!gastosMes.length) rows.push(['Sin gastos para este mes']);
	rows.push([]);

	rows.push(['COMPROMISOS']);
	rows.push(['Nombre', 'Monto']);
	safeMetas.forEach((m) => {
		rows.push([String(m?.nombre || ''), toSafeNumber(m?.monto)]);
	});
	if (!safeMetas.length) rows.push(['Sin compromisos']);
	rows.push([]);

	const efectivoInicialSemana = safeAjustes.efectivoInicialSemana || {};
	const efectivoCajaBloqueadoSemana = safeAjustes.efectivoCajaBloqueadoSemana || {};
	const semanasConAjustes = Array.from(new Set([
		...Object.keys(efectivoInicialSemana),
		...Object.keys(efectivoCajaBloqueadoSemana),
	]))
		.map((k) => parseInt(k, 10))
		.filter((n) => Number.isInteger(n) && n >= 0)
		.sort((a, b) => a - b);

	rows.push(['AJUSTES']);
	rows.push(['Campo', 'Valor']);
	rows.push(['Dinero mes pasado', dineroInicialVal]);
	rows.push([]);
	rows.push(['AJUSTES SEMANA']);
	rows.push(['Semana', 'Efectivo inicial', 'Cerrada']);
	semanasConAjustes.forEach((semana) => {
		rows.push([
			`Semana ${semana + 1}`,
			toSafeNumber(efectivoInicialSemana[semana]),
			efectivoCajaBloqueadoSemana[semana] ? 'Si' : 'No',
		]);
	});
	if (!semanasConAjustes.length) rows.push(['Sin ajustes semanales']);

	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws['!cols'] = [{ wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 14 }];

	const wb = XLSX.utils.book_new();
	const sheetName = `Caja ${year}-${String(month).padStart(2, '0')}`;
	XLSX.utils.book_append_sheet(wb, ws, sheetName);
	XLSX.writeFile(wb, `caja-${year}-${String(month).padStart(2, '0')}.xlsx`);
}
