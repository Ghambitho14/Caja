import { useState } from 'react';
import { totalGastosPorTipo, formatMonto, formatFecha } from '../utils/calculos';
import { id } from '../utils/storage';

export default function GastosView({ year, month, gastos, onGastosChange }) {
	const [editando, setEditando] = useState(null);
	const [tipoGasto, setTipoGasto] = useState('local');
	const [descripcion, setDescripcion] = useState('');
	const [monto, setMonto] = useState('');
	const [fecha, setFecha] = useState(formatFecha(new Date()));

	const prefix = `${year}-${String(month).padStart(2, '0')}-`;
	const totalLocal = totalGastosPorTipo(gastos, 'local', year, month);
	const totalJhon = totalGastosPorTipo(gastos, 'jhon', year, month);
	const lista = gastos.filter((g) => g.fecha && g.fecha.startsWith(prefix)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

	function guardar() {
		const montoNum = parseFloat(String(monto).replace(',', '.')) || 0;
		if (!montoNum) return;
		if (editando) {
			onGastosChange(
				gastos.map((g) =>
					g.id === editando
						? { ...g, tipo: tipoGasto, descripcion: descripcion.trim(), monto: montoNum, fecha }
						: g
				)
			);
			setEditando(null);
		} else {
			onGastosChange([
				...gastos,
				{ id: id(), tipo: tipoGasto, descripcion: descripcion.trim(), monto: montoNum, fecha },
			]);
		}
		setDescripcion('');
		setMonto('');
		setFecha(formatFecha(new Date()));
	}

	function editar(g) {
		setEditando(g.id);
		setTipoGasto(g.tipo || 'local');
		setDescripcion(g.descripcion || '');
		setMonto(String(g.monto));
		setFecha(g.fecha || formatFecha(new Date()));
	}

	function eliminar(idElim) {
		onGastosChange(gastos.filter((g) => g.id !== idElim));
		setEditando(null);
	}

	return (
		<section className="pantalla gastos-view">
			<h2 className="titulo-pantalla">Gastos</h2>
			<div className="gastos-totales">
				<span>Negocio: {formatMonto(totalLocal)}</span>
				<span>Personales: {formatMonto(totalJhon)}</span>
			</div>
			<form
				className="form-gasto"
				onSubmit={(e) => {
					e.preventDefault();
					guardar();
				}}
			>
				<input
					type="text"
					placeholder="Descripción"
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
					type="date"
					value={fecha}
					onChange={(e) => setFecha(e.target.value)}
				/>
				<div className="form-gasto-tipo">
					<span className="form-gasto-tipo-label">Tipo:</span>
					<button
						type="button"
						className={`btn-tipo-gasto ${tipoGasto === 'local' ? 'active' : ''}`}
						onClick={() => setTipoGasto('local')}
					>
						Gastos negocio
					</button>
					<button
						type="button"
						className={`btn-tipo-gasto ${tipoGasto === 'jhon' ? 'active' : ''}`}
						onClick={() => setTipoGasto('jhon')}
					>
						Gastos personales
					</button>
				</div>
				<button type="submit">{editando ? 'Guardar' : 'Agregar gasto'}</button>
				{editando && (
					<button
						type="button"
						onClick={() => {
							setEditando(null);
							setDescripcion('');
							setMonto('');
							setFecha(formatFecha(new Date()));
							setTipoGasto('local');
						}}
					>
						Cancelar
					</button>
				)}
			</form>
			<div className="lista-gastos">
				<h3>Todos los gastos del mes</h3>
				<ul>
					{lista.length === 0 ? (
						<li className="sin-datos">Sin gastos este mes</li>
					) : (
						lista.map((g) => (
							<li key={g.id}>
								<span className={`gasto-tipo-badge ${g.tipo === 'local' ? 'tipo-negocio' : 'tipo-personal'}`}>
									{g.tipo === 'local' ? 'Negocio' : 'Personal'}
								</span>
								<span className="gasto-desc">{g.descripcion || '—'}</span>
								<span className="gasto-monto">{formatMonto(g.monto)}</span>
								<span className="fecha-corta">{g.fecha}</span>
								<button type="button" className="btn-editar" onClick={() => editar(g)}>
									Editar
								</button>
								<button type="button" className="btn-eliminar" onClick={() => eliminar(g.id)}>
									Eliminar
								</button>
							</li>
						))
					)}
				</ul>
			</div>
		</section>
	);
}
