import { useState, useEffect, useRef } from 'react';
import { formatFecha, formatFechaDiaMes, formatMonto, totalDia, totalSemana, totalMes, totalDiaPorTipo, totalSemanaPorTipo, totalSemanaPorTipoExacto, totalMesPorTipo } from '../utils/calculos';
import { id } from '../utils/storage';
import './PedidosView.css';

export default function PedidosView({
	year,
	month,
	semanas = [],
	diaSeleccionado,
	onDiaSeleccionadoChange,
	pedidos,
	onPedidosChange,
	onEliminarPedido,
	ajustes = {},
	onAjustesChange,
}) {
	const [editando, setEditando] = useState(null);
	const [descripcion, setDescripcion] = useState('');
	const [monto, setMonto] = useState('');
	const [tipoVenta, setTipoVenta] = useState('efectivo');
	const [semanaIndex, setSemanaIndex] = useState(0);
	const formRef = useRef(null);

	const semanaIndexClamped = Math.min(semanaIndex, Math.max(0, semanas.length - 1));
	const semanaActual = semanas[semanaIndexClamped]?.fechas || [];

	// Al cargar o cambiar mes: seleccionar la semana actual (no siempre la primera).
	useEffect(() => {
		if (semanas.length === 0) return;
		const hoy = formatFecha(new Date());
		let idx = semanas.findIndex((s) => s.fechas && s.fechas.includes(hoy));
		if (idx < 0 && new Date().getDay() === 1) {
			const manana = new Date();
			manana.setDate(manana.getDate() + 1);
			idx = semanas.findIndex((s) => s.fechas && s.fechas.includes(formatFecha(manana)));
		}
		if (idx >= 0) setSemanaIndex(idx);
	}, [year, month, semanas.length]);

	useEffect(() => {
		if (semanaIndex >= semanas.length) setSemanaIndex(Math.max(0, semanas.length - 1));
	}, [semanas.length]);

	const fechaInicial = diaSeleccionado || formatFecha(new Date());
	const pedidosDia = pedidos.filter((p) => p.fecha === fechaInicial);
	const total = totalDia(pedidos, fechaInicial);

	function guardarPedido() {
		const montoNum = parseFloat(String(monto).replace(',', '.')) || 0;
		if (editando != null && editando !== '') {
			onPedidosChange(
				pedidos.map((p) =>
					String(p.id) === String(editando)
						? { ...p, descripcion: descripcion.trim(), monto: montoNum, tipoVenta }
						: p
				)
			);
			setEditando(null);
		} else {
			onPedidosChange([
				...pedidos,
				{
					id: id(),
					fecha: fechaInicial,
					descripcion: descripcion.trim(),
					monto: montoNum,
					tipoVenta,
				},
			]);
		}
		setDescripcion('');
		setMonto('');
	}

	function eliminar(idElim) {
		if (onEliminarPedido) onEliminarPedido(idElim);
		onPedidosChange(pedidos.filter((p) => p.id !== idElim));
		setEditando(null);
	}

	function editar(p) {
		const pedidoId = p.id != null ? p.id : p._id;
		if (pedidoId == null) return;
		setEditando(pedidoId);
		setDescripcion(p.descripcion || '');
		setMonto(String(p.monto));
		setTipoVenta(p.tipoVenta === 'transferencia' || p.tipoVenta === 'tarjeta' ? p.tipoVenta : 'efectivo');
		requestAnimationFrame(() => {
			formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		});
	}

	const totalSemanaVal = totalSemana(pedidos, semanaActual);
	const totalEfectivoSemana = totalSemanaPorTipo(pedidos, semanaActual, 'efectivo');
	const totalTransferenciaSemana = totalSemanaPorTipo(pedidos, semanaActual, 'transferencia');
	const totalTransferenciaSoloSemana = totalSemanaPorTipoExacto(pedidos, semanaActual, 'transferencia');
	const totalTarjetaSemana = totalSemanaPorTipoExacto(pedidos, semanaActual, 'tarjeta');

	const efectivoInicialSemana = ajustes.efectivoInicialSemana || {};
	const efectivoCajaBloqueadoSemana = ajustes.efectivoCajaBloqueadoSemana || {};
	const efectivoInicialBloqueadoSemana = ajustes.efectivoInicialBloqueadoSemana || {};
	const efectivoInicialEstaSemana = Number(efectivoInicialSemana[semanaIndexClamped]) || 0;
	const semanaCerrada = Boolean(efectivoCajaBloqueadoSemana[semanaIndexClamped]);
	const efectivoInicialBloqueadoEstaSemana = Boolean(efectivoInicialBloqueadoSemana[semanaIndexClamped]);
	const efectivoCajaSemanaVal = semanaCerrada ? 0 : efectivoInicialEstaSemana + totalEfectivoSemana;
	// Con semana cerrada, efectivo y tarjeta ya fueron a cuenta: mostrar 0 en recuadros (los pedidos siguen en lista como historial).
	const efectivoTotalSemana = semanaCerrada ? 0 : efectivoInicialEstaSemana + totalEfectivoSemana;
	const tarjetaSemanaEnCaja = semanaCerrada ? 0 : totalTarjetaSemana;

	const transferenciaDia = totalDiaPorTipo(pedidos, fechaInicial, 'transferencia');
	const efectivoInicialEditable = !semanaCerrada && !efectivoInicialBloqueadoEstaSemana;

	function cerrarSemana() {
		if (semanaCerrada) return;
		const totalDeposito = efectivoInicialEstaSemana + totalEfectivoSemana + totalTarjetaSemana;
		if (totalDeposito <= 0) {
			window.alert('No hay efectivo para depositar en esta semana.');
			return;
		}
		const efectivoDeposito = efectivoInicialEstaSemana + totalEfectivoSemana;
		const confirmar = window.confirm(
			`Se depositarán ${formatMonto(totalDeposito)} a Dinero de la cuenta (${formatMonto(efectivoDeposito)} efectivo + ${formatMonto(totalTarjetaSemana)} tarjeta) y el efectivo semanal quedará en 0.`
		);
		if (!confirmar) return;
		onAjustesChange({
			...ajustes,
			dineroMesPasado: (Number(ajustes.dineroMesPasado) || 0) + totalDeposito,
			efectivoInicialSemana: {
				...efectivoInicialSemana,
				[semanaIndexClamped]: 0,
			},
			efectivoCajaBloqueadoSemana: {
				...efectivoCajaBloqueadoSemana,
				[semanaIndexClamped]: true,
			},
			efectivoInicialBloqueadoSemana: {
				...efectivoInicialBloqueadoSemana,
				[semanaIndexClamped]: true,
			},
		});
	}

	return (
		<section className="pantalla pedidos-view">
			<div className="titulo-pantalla-wrap">
				<h2 className="titulo-pantalla">Pedidos por día</h2>
				<span className="titulo-pantalla-total-semana">Total de semana: {formatMonto(totalSemanaVal)}</span>
			</div>

			<div className="pedidos-selector-semana">
				<label htmlFor="pedidos-semana">Semana del mes:</label>
				<select
					id="pedidos-semana"
					value={semanaIndexClamped}
					onChange={(e) => setSemanaIndex(Number(e.target.value))}
				>
					{semanas.map((_, i) => (
						<option key={i} value={i}>
							Semana {i + 1}
						</option>
					))}
				</select>
				<button
					type="button"
					className="btn-cerrar-semana"
					onClick={cerrarSemana}
					disabled={semanaCerrada}
					title={semanaCerrada ? 'Esta semana ya está cerrada' : 'Depositar efectivo de la semana y cerrar'}
				>
					{semanaCerrada ? 'Semana cerrada' : 'Cerrar semana'}
				</button>
				<div className="pedidos-efectivo-caja-semana">
					<span className="pedidos-efectivo-caja-semana-label">
						{semanaCerrada ? 'Efectivo disponible (semana cerrada)' : 'Efectivo inicial de la semana'}
					</span>
					{semanaCerrada ? (
						<span className="pedidos-efectivo-caja-semana-valor" title="Semana cerrada: efectivo depositado en cuenta">
							{formatMonto(efectivoCajaSemanaVal)}
						</span>
					) : efectivoInicialEditable ? (
						<input
							type="text"
							className="pedidos-input-efectivo-semana"
							value={efectivoInicialEstaSemana || ''}
							onChange={(e) => {
								const v = e.target.value.replace(/\D/g, '');
								const n = v === '' ? 0 : parseInt(v, 10) || 0;
								onAjustesChange({
									...ajustes,
									efectivoInicialSemana: { ...efectivoInicialSemana, [semanaIndexClamped]: n },
								});
							}}
							placeholder="0"
							aria-label="Efectivo inicial de la semana"
						/>
					) : (
						<span className="pedidos-efectivo-caja-semana-valor" title="Efectivo inicial bloqueado (no es semana cerrada)">
							{formatMonto(efectivoInicialEstaSemana)}
						</span>
					)}
					{semanaCerrada ? (
						<span className="pedidos-efectivo-caja-semana-switch">La semana está cerrada y el efectivo ya se depositó a cuenta.</span>
					) : (
						<label className="pedidos-efectivo-caja-semana-switch">
							<input
								type="checkbox"
								checked={efectivoInicialBloqueadoEstaSemana}
								onChange={(e) => {
									onAjustesChange({
										...ajustes,
										efectivoInicialBloqueadoSemana: {
											...efectivoInicialBloqueadoSemana,
											[semanaIndexClamped]: e.target.checked,
										},
									});
								}}
								aria-label="Bloquear efectivo inicial de la semana"
							/>
							{efectivoInicialBloqueadoEstaSemana
								? 'Efectivo inicial bloqueado'
								: 'Bloquear efectivo inicial de la semana'}
						</label>
					)}
				</div>
				<div className="pedidos-detalle-dia">
					<span className="pedidos-detalle-dia-label">Día {formatFechaDiaMes(fechaInicial)}:</span>
					<span className="pedidos-detalle-dia-item">
						Transferencia del día: <strong>{formatMonto(transferenciaDia)}</strong>
					</span>
					<span className="pedidos-detalle-dia-item">
						Efectivo (ventas del día + efectivo inicial semana): <strong>{formatMonto(efectivoTotalSemana)}</strong>
					</span>
				</div>
			</div>

			<div className="dia-total-row dia-total-destacado">
				Total del día: <strong>{formatMonto(total)}</strong>
			</div>

			<form
				ref={formRef}
				className="form-pedido"
				onSubmit={(e) => {
					e.preventDefault();
					guardarPedido();
				}}
			>
				<input
					type="text"
					placeholder="Descripción del pedido"
					value={descripcion}
					onChange={(e) => setDescripcion(e.target.value)}
				/>
				<input
					type="text"
					placeholder="Monto"
					value={monto}
					onChange={(e) => setMonto(e.target.value)}
				/>
				<div className="form-pedido-tipo">
					<span className="form-pedido-tipo-label">Tipo:</span>
					<button
						type="button"
						className={`btn-tipo ${tipoVenta === 'efectivo' ? 'active' : ''}`}
						onClick={() => setTipoVenta('efectivo')}
					>
						Efectivo
					</button>
					<button
						type="button"
						className={`btn-tipo ${tipoVenta === 'transferencia' ? 'active' : ''}`}
						onClick={() => setTipoVenta('transferencia')}
					>
						Transferencia
					</button>
					<button
						type="button"
						className={`btn-tipo ${tipoVenta === 'tarjeta' ? 'active' : ''}`}
						onClick={() => setTipoVenta('tarjeta')}
					>
						Tarjeta
					</button>
				</div>
				<button type="submit">{editando ? 'Guardar' : 'Agregar'}</button>
				{editando && (
					<button
						type="button"
						onClick={() => {
							setEditando(null);
							setDescripcion('');
							setMonto('');
							setTipoVenta('efectivo');
						}}
					>
						Cancelar
					</button>
				)}
			</form>

			<ul className="lista-pedidos-dia">
				{pedidosDia.length === 0 ? (
					<li className="sin-datos">Sin pedidos este día</li>
				) : (
					pedidosDia.map((p) => (
						<li key={p.id}>
							<span className="pedido-desc">{p.descripcion || '—'}</span>
							<span className={`pedido-tipo tipo-${p.tipoVenta || 'efectivo'}`}>
								{p.tipoVenta === 'transferencia' ? 'Transferencia' : p.tipoVenta === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
							</span>
							<span className="pedido-monto">{formatMonto(p.monto)}</span>
							<button type="button" className="btn-editar" onClick={() => editar(p)}>
								Editar
							</button>
							<button type="button" className="btn-eliminar" onClick={() => eliminar(p.id)}>
								Eliminar
							</button>
						</li>
					))
				)}
			</ul>

			<div className="pedidos-semana">
				<div className="pedidos-grid-dias">
					{semanaActual.map((fecha) => {
						const esSeleccionado = fecha === fechaInicial;
						const pedidosDelDia = pedidos.filter((p) => p.fecha === fecha);
						const totalDiaVal = totalDia(pedidos, fecha);
						return (
							<div
								key={fecha}
								role="button"
								tabIndex={0}
								className={`pedidos-cuadrado-dia ${esSeleccionado ? 'selected' : ''}`}
								onClick={() => onDiaSeleccionadoChange(fecha)}
								onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDiaSeleccionadoChange(fecha); } }}
							>
								<div className="pedidos-cuadrado-titulo">{formatFechaDiaMes(fecha)}</div>
								<table className="pedidos-cuadrado-tabla">
									<colgroup>
										<col />
										<col />
										<col />
									</colgroup>
									<thead>
										<tr>
											<th>Pedido</th>
											<th>Tipo</th>
											<th>Monto</th>
										</tr>
									</thead>
									<tbody>
										{pedidosDelDia.length === 0 ? (
											<tr>
												<td colSpan={3} className="sin-datos">—</td>
											</tr>
										) : (
											pedidosDelDia.map((p) => (
												<tr key={p.id}>
													<td>{p.descripcion || '—'}</td>
													<td className={`tipo-${p.tipoVenta || 'efectivo'}`}>{p.tipoVenta === 'transferencia' ? 'Transferencia' : p.tipoVenta === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}</td>
													<td>{formatMonto(p.monto)}</td>
												</tr>
											))
										)}
									</tbody>
									<tfoot>
										<tr>
											<td colSpan={2}>Total día</td>
											<td className="total-dia-celda">{formatMonto(totalDiaVal)}</td>
										</tr>
									</tfoot>
								</table>
							</div>
						);
					})}
				</div>
			</div>

			<div className="pedidos-detalle">
				<h3 className="pedidos-detalle-titulo">Detalle</h3>
				<div className="pedidos-detalle-efectivo">
					<span className="pedidos-detalle-label">Efectivo de la semana:</span>
					<strong>{formatMonto(efectivoTotalSemana)}</strong>
				</div>
				<div className="pedidos-detalle-efectivo">
					<span className="pedidos-detalle-label">Transferencia de la semana:</span>
					<strong>{formatMonto(totalTransferenciaSoloSemana)}</strong>
				</div>
				<div className="pedidos-detalle-efectivo">
					<span className="pedidos-detalle-label">Tarjeta de la semana:</span>
					<strong>{formatMonto(tarjetaSemanaEnCaja)}</strong>
				</div>
				<div className="pedidos-detalle-transferencias">
					<span className="pedidos-detalle-label">Total por semana (efectivo + transferencia + tarjeta):</span>
					<table className="pedidos-detalle-tabla">
						<thead>
							<tr>
								<th>Semana</th>
								<th>Total</th>
							</tr>
						</thead>
						<tbody>
							{semanas.map((sem, i) => (
								<tr key={sem.start ?? i}>
									<td>Semana {i + 1}</td>
									<td className="pedidos-detalle-monto">{formatMonto(totalSemana(pedidos, sem.fechas || []))}</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr>
								<td>Total mes</td>
								<td className="pedidos-detalle-monto pedidos-detalle-total">{formatMonto(totalMes(pedidos, year, month))}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</section>
	);
}
