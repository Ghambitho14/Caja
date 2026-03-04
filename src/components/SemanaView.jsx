import { totalDia, totalSemana, formatFechaCorta, formatMonto } from '../utils/calculos';

export default function SemanaView({ semana, pedidos, onVerDia, embed }) {
	const { fechas } = semana;
	const totalSemanaVal = totalSemana(pedidos, fechas);
	const Wrapper = embed ? 'div' : 'section';
	const className = embed ? 'semana-view semana-view-embed' : 'pantalla semana-view';

	return (
		<Wrapper className={className}>
			<div className="semana-total">
				Total semana: <strong>{formatMonto(totalSemanaVal)}</strong>
			</div>
			<div className="tarjetas-dias">
				{fechas.map((fecha) => {
					const totalDiaVal = totalDia(pedidos, fecha);
					const pedidosDia = pedidos.filter((p) => p.fecha === fecha);
					return (
						<article key={fecha} className="tarjeta-dia">
							<header>
								<span className="dia-fecha">{formatFechaCorta(fecha)}</span>
								<span className="dia-total">{formatMonto(totalDiaVal)}</span>
							</header>
							<ul className="lista-pedidos">
								{pedidosDia.length === 0 ? (
									<li className="sin-datos">Sin pedidos</li>
								) : (
									pedidosDia.map((p) => (
										<li key={p.id}>
											<span className="pedido-desc">{p.descripcion || '—'}</span>
											<span className="pedido-monto">{formatMonto(p.monto)}</span>
										</li>
									))
								)}
							</ul>
							<button type="button" className="btn-ver-dia" onClick={() => onVerDia(fecha)}>
								Ver día
							</button>
						</article>
					);
				})}
			</div>
		</Wrapper>
	);
}
