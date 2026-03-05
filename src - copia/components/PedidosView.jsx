import { useState, useEffect, useRef } from 'react';
import { formatFecha, formatFechaDiaMes, formatMonto, totalDia, totalSemana, totalDiaPorTipo, totalSemanaPorTipo } from '../utils/calculos';
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
		onPedidosChange(pedidos.filter((p) => p.id !== idElim));
		setEditando(null);
	}

	function editar(p) {
		const pedidoId = p.id != null ? p.id : p._id;
		if (pedidoId == null) return;
		setEditando(pedidoId);
		setDescripcion(p.descripcion || '');
		setMonto(String(p.monto));
		setTipoVenta(p.tipoVenta || 'efectivo');
		requestAnimationFrame(() => {
			formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		});
	}

	const totalSemanaVal = totalSemana(pedidos, semanaActual);
	const totalEfectivoSemana = totalSemanaPorTipo(pedidos, semanaActual, 'efectivo');
	const totalTransferenciaSemana = totalSemanaPorTipo(pedidos, semanaActual, 'transferencia');

	const efectivoInicialSemana = ajustes.efectivoInicialSemana || {};
	const efectivoCajaBloqueadoSemana = ajustes.efectivoCajaBloqueadoSemana || {};
	const efectivoInicialEstaSemana = Number(efectivoInicialSemana[semanaIndexClamped]) || 0;
	const bloqueadoEstaSemana = Boolean(efectivoCajaBloqueadoSemana[semanaIndexClamped]);
	const efectivoCajaSemanaVal = bloqueadoEstaSemana ? efectivoInicialEstaSemana + totalEfectivoSemana : efectivoInicialEstaSemana;

	const transferenciaDia = totalDiaPorTipo(pedidos, fechaInicial, 'transferencia');
	const efectivoDia = totalDiaPorTipo(pedidos, fechaInicial, 'efectivo');
	const efectivoTotalDia = efectivoDia + efectivoInicialEstaSemana;
	const efectivoTotalSemana = efectivoInicialEstaSemana + totalEfectivoSemana;

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
				<div className="pedidos-efectivo-caja-semana">
					<span className="pedidos-efectivo-caja-semana-label">
						{bloqueadoEstaSemana ? 'Efectivo caja (inicial + entrante)' : 'Efectivo inicial de la semana'}
					</span>
					{bloqueadoEstaSemana ? (
						<span className="pedidos-efectivo-caja-semana-valor" title="Inicial de la semana + ventas en efectivo">
							{formatMonto(efectivoCajaSemanaVal)}
						</span>
					) : (
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
					)}
					<label className="pedidos-efectivo-caja-semana-switch">
						<input
							type="checkbox"
							checked={bloqueadoEstaSemana}
							onChange={(e) => onAjustesChange({
								...ajustes,
								efectivoCajaBloqueadoSemana: { ...efectivoCajaBloqueadoSemana, [semanaIndexClamped]: e.target.checked },
							})}
							aria-label="Calcular efectivo caja (inicial + entrante)"
						/>
						<span>Calcular (inicial + entrante)</span>
					</label>
				</div>
				<div className="pedidos-detalle-dia">
					<span className="pedidos-detalle-dia-label">Día {formatFechaDiaMes(fechaInicial)}:</span>
					<span className="pedidos-detalle-dia-item">
						Transferencia del día: <strong>{formatMonto(transferenciaDia)}</strong>
					</span>
					<span className="pedidos-detalle-dia-item">
						Efectivo (ventas del día + efectivo inicial semana): <strong>{formatMonto(efectivoTotalDia)}</strong>
					</span>
				</div>
			</div>

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
													<td className={`tipo-${p.tipoVenta || 'efectivo'}`}>{p.tipoVenta === 'transferencia' ? 'Transferencia' : 'Efectivo'}</td>
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
								{p.tipoVenta === 'transferencia' ? 'Transferencia' : 'Efectivo'}
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

			<div className="pedidos-detalle">
				<h3 className="pedidos-detalle-titulo">Detalle</h3>
				<div className="pedidos-detalle-efectivo">
					<span className="pedidos-detalle-label">Efectivo inicial (semana):</span>
					<strong>{formatMonto(efectivoInicialEstaSemana)}</strong>
				</div>
				<div className="pedidos-detalle-efectivo">
					<span className="pedidos-detalle-label">Efectivo ventas (semana):</span>
					<strong>{formatMonto(totalEfectivoSemana)}</strong>
				</div>
				<div className="pedidos-detalle-efectivo">
					<span className="pedidos-detalle-label">Efectivo total (semana):</span>
					<strong>{formatMonto(efectivoTotalSemana)}</strong>
				</div>
				<div className="pedidos-detalle-transferencias">
					<span className="pedidos-detalle-label">Transferencia por día:</span>
					<table className="pedidos-detalle-tabla">
						<thead>
							<tr>
								<th>Día</th>
								<th>Transferencia</th>
							</tr>
						</thead>
						<tbody>
							{semanaActual.map((fecha) => (
								<tr key={fecha}>
									<td>{formatFechaDiaMes(fecha)}</td>
									<td className="pedidos-detalle-monto">{formatMonto(totalDiaPorTipo(pedidos, fecha, 'transferencia'))}</td>
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr>
								<td>Total semana</td>
								<td className="pedidos-detalle-monto pedidos-detalle-total">{formatMonto(totalTransferenciaSemana)}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</section>
	);
}
