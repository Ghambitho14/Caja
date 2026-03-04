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
	nombreMes,
	formatMonto,
} from '../utils/calculos';

export default function MesResumen({ year, month, pedidos, gastos, ajustes, onAjustesChange, metas, embed }) {
	const ventasTotales = totalMes(pedidos, year, month);
	const totalEfectivoMes = totalMesPorTipo(pedidos, year, month, 'efectivo');
	const totalTransferenciaMes = totalMesPorTipo(pedidos, year, month, 'transferencia');
	const gastosNegocio = totalGastosPorTipo(gastos, 'local', year, month);
	const gastosPersonales = totalGastosPorTipo(gastos, 'jhon', year, month);
	const gastosTotales = gastosNegocio + gastosPersonales;
	const compromisos = totalMetas(metas);
	const dineroInicialVal = dineroInicial(ajustes);
	const dineroEnCuentaVal = dineroEnCuenta(ajustes, totalTransferenciaMes, gastosNegocio, gastosPersonales);
	const efectivoTotalVal = efectivoTotal(ajustes, totalEfectivoMes);
	const dineroActualVal = dineroActual(ajustes, ventasTotales, gastosNegocio, gastosPersonales);
	const gananciaRealVal = gananciaReal(dineroActualVal, compromisos);

	const Wrapper = embed ? 'div' : 'section';
	return (
		<Wrapper className={embed ? 'mes-resumen mes-resumen-embed' : 'pantalla mes-resumen'}>
			<h2 className="titulo-pantalla">
				{nombreMes(month)} {year}
			</h2>
			<div className="ajustes-mes">
				<p className="resumen-intro">Punto de partida: dinero inicial = dinero del mes pasado + efectivo en caja al abrir</p>
				<label>
					Dinero mes pasado
					<input
						type="number"
						value={ajustes.dineroMesPasado ?? ''}
						onChange={(e) => onAjustesChange({ ...ajustes, dineroMesPasado: e.target.value === '' ? 0 : Number(e.target.value) })}
					/>
				</label>
				<label>
					Efectivo en caja (al abrir)
					<input
						type="number"
						value={ajustes.efectivoInicial ?? ''}
						onChange={(e) => onAjustesChange({ ...ajustes, efectivoInicial: e.target.value === '' ? 0 : Number(e.target.value) })}
					/>
				</label>
				<strong className="resumen-dinero-inicial">Dinero inicial = {formatMonto(dineroInicialVal)}</strong>
			</div>
			<dl className="resumen-grid">
				<dt>Ventas totales (pedidos del mes)</dt>
				<dd>{formatMonto(ventasTotales)}</dd>
				<dt>Gastos del negocio (local)</dt>
				<dd>{formatMonto(gastosNegocio)}</dd>
				<dt>Gastos personales</dt>
				<dd>{formatMonto(gastosPersonales)}</dd>
				<dt>Gastos totales</dt>
				<dd>{formatMonto(gastosTotales)}</dd>
				<dt>Dinero en efectivo</dt>
				<dd>{formatMonto(efectivoTotalVal)}</dd>
				<dt>Dinero de la cuenta</dt>
				<dd>{formatMonto(dineroEnCuentaVal)}</dd>
				<dt>Dinero actual</dt>
				<dd className="destacado">{formatMonto(dineroActualVal)}</dd>
				<dt>Compromisos del negocio</dt>
				<dd>{formatMonto(compromisos)}</dd>
				<dt>Ganancia real</dt>
				<dd className={gananciaRealVal >= 0 ? 'positivo' : 'negativo'}>{formatMonto(gananciaRealVal)}</dd>
			</dl>
		</Wrapper>
	);
}
