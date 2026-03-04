import { useState } from 'react';
import { formatFechaCorta, formatMonto, totalDia } from '../utils/calculos';
import { id } from '../utils/storage';

export default function DiaView({ fecha, pedidos, onPedidosChange, onCerrar }) {
	const [editando, setEditando] = useState(null);
	const [descripcion, setDescripcion] = useState('');
	const [monto, setMonto] = useState('');
	const [metodoPago, setMetodoPago] = useState('');

	const pedidosDia = pedidos.filter((p) => p.fecha === fecha);
	const total = totalDia(pedidos, fecha);

	function guardarPedido() {
		const montoNum = parseFloat(String(monto).replace(',', '.')) || 0;
		if (editando) {
			onPedidosChange(
				pedidos.map((p) =>
					p.id === editando
						? { ...p, descripcion: descripcion.trim(), monto: montoNum, metodoPago: metodoPago || undefined }
						: p
				)
			);
			setEditando(null);
		} else {
			onPedidosChange([
				...pedidos,
				{ id: id(), fecha, descripcion: descripcion.trim(), monto: montoNum, metodoPago: metodoPago || undefined },
			]);
		}
		setDescripcion('');
		setMonto('');
		setMetodoPago('');
	}

	function eliminar(idElim) {
		onPedidosChange(pedidos.filter((p) => p.id !== idElim));
		setEditando(null);
	}

	function editar(p) {
		setEditando(p.id);
		setDescripcion(p.descripcion || '');
		setMonto(String(p.monto));
		setMetodoPago(p.metodoPago || '');
	}

	return (
		<section className="pantalla dia-view">
			<header className="dia-view-header">
				<h2>Día {formatFechaCorta(fecha)}</h2>
				<button type="button" className="btn-cerrar" onClick={onCerrar}>
					Cerrar
				</button>
			</header>
			<div className="dia-total-row">
				Total del día: <strong>{formatMonto(total)}</strong>
			</div>
			<form
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
				<input
					type="text"
					placeholder="Método de pago (opcional)"
					value={metodoPago}
					onChange={(e) => setMetodoPago(e.target.value)}
				/>
				<button type="submit">{editando ? 'Guardar' : 'Agregar'}</button>
				{editando && (
					<button type="button" onClick={() => { setEditando(null); setDescripcion(''); setMonto(''); setMetodoPago(''); }}>
						Cancelar
					</button>
				)}
			</form>
			<ul className="lista-pedidos-dia">
				{pedidosDia.map((p) => (
					<li key={p.id}>
						<span className="pedido-desc">{p.descripcion || '—'}</span>
						<span className="pedido-monto">{formatMonto(p.monto)}</span>
						{p.metodoPago && <span className="pedido-metodo">{p.metodoPago}</span>}
						<button type="button" className="btn-editar" onClick={() => editar(p)}>Editar</button>
						<button type="button" className="btn-eliminar" onClick={() => eliminar(p.id)}>Eliminar</button>
					</li>
				))}
			</ul>
		</section>
	);
}
