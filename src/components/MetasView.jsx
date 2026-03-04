import { useState } from 'react';
import { totalMetas, formatMonto } from '../utils/calculos';
import { id } from '../utils/storage';

export default function MetasView({ metas, onMetasChange }) {
	const [editando, setEditando] = useState(null);
	const [montoEdit, setMontoEdit] = useState('');

	const lista = metas;
	const total = totalMetas(lista);

	function guardar(idMeta) {
		const montoNum = parseFloat(String(montoEdit).replace(',', '.')) || 0;
		const exist = lista.find((m) => m.id === idMeta);
		if (exist) {
			onMetasChange(
				lista.map((m) => (m.id === idMeta ? { ...m, monto: montoNum } : m))
			);
		} else {
			onMetasChange([...lista, { id: idMeta, nombre: 'Nueva', monto: montoNum }]);
		}
		setEditando(null);
		setMontoEdit('');
	}

	function editar(m) {
		setEditando(m.id);
		setMontoEdit(String(m.monto));
	}

	function eliminar(idElim) {
		onMetasChange(lista.filter((m) => m.id !== idElim));
		setEditando(null);
	}

	function agregarNueva() {
		const nombre = prompt('Nombre del compromiso (ej: Arriendo, Mercadería)');
		if (!nombre?.trim()) return;
		onMetasChange([...lista, { id: id(), nombre: nombre.trim(), monto: 0 }]);
	}

	return (
		<section className="pantalla metas-view">
			<h2 className="titulo-pantalla">Compromisos del negocio</h2>
			<p className="metas-desc">Arriendo, mercadería futura, pagos del local: dinero comprometido que aún no se ha gastado.</p>
			<div className="metas-total">
				Total compromisos: <strong>{formatMonto(total)}</strong>
			</div>
			<ul className="lista-metas">
				{lista.map((m) => (
					<li key={m.id}>
						<span className="meta-nombre">{m.nombre}</span>
						{editando === m.id ? (
							<>
								<input
									type="text"
									value={montoEdit}
									onChange={(e) => setMontoEdit(e.target.value)}
									autoFocus
								/>
								<button type="button" onClick={() => guardar(m.id)}>Guardar</button>
								<button type="button" onClick={() => { setEditando(null); setMontoEdit(''); }}>Cancelar</button>
							</>
						) : (
							<>
								<span className="meta-monto">{formatMonto(m.monto)}</span>
								<button type="button" className="btn-editar" onClick={() => editar(m)}>Editar</button>
								<button type="button" className="btn-eliminar" onClick={() => eliminar(m.id)}>Eliminar</button>
							</>
						)}
					</li>
				))}
			</ul>
			<button type="button" className="btn-agregar" onClick={agregarNueva}>
				Agregar compromiso
			</button>
		</section>
	);
}
