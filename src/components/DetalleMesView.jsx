import { useState } from 'react';
import MesResumen from './MesResumen';
import SemanaView from './SemanaView';
import { exportarExcelMesActual } from '../utils/exportExcel';
import './DetalleMesView.css';

export default function DetalleMesView({
	year,
	month,
	pedidos,
	gastos,
	ajustes,
	onAjustesChange,
	metas,
	semanas,
	semanaIndex,
	onSemanaIndexChange,
	onVerDia,
}) {
	const [modo, setModo] = useState('mes'); // 'mes' | 'semana'
	const semanaActual = semanas[semanaIndex] || semanas[0];

	function exportarExcel() {
		try {
			exportarExcelMesActual({
				year,
				month,
				pedidos,
				gastos,
				metas,
				ajustes,
			});
		} catch (error) {
			console.error(error);
			window.alert('No se pudo exportar el Excel. Intenta nuevamente.');
		}
	}

	return (
		<div className="pantalla detalle-mes-view">
			<div className="detalle-mes-tabs">
				<button
					type="button"
					className={modo === 'mes' ? 'active' : ''}
					onClick={() => setModo('mes')}
				>
					Por mes
				</button>
				<button
					type="button"
					className={modo === 'semana' ? 'active' : ''}
					onClick={() => setModo('semana')}
				>
					Por semana
				</button>
				<button type="button" className="btn-exportar-excel" onClick={exportarExcel}>
					Exportar Excel
				</button>
			</div>

			{modo === 'mes' && (
				<MesResumen
					year={year}
					month={month}
					pedidos={pedidos}
					gastos={gastos}
					ajustes={ajustes}
					onAjustesChange={onAjustesChange}
					metas={metas}
					embed
				/>
			)}

			{modo === 'semana' && (
				<>
					<div className="semana-nav">
						<button
							type="button"
							disabled={semanaIndex <= 0}
							onClick={() => onSemanaIndexChange((i) => i - 1)}
						>
							← Semana anterior
						</button>
						<span>
							Semana {semanaIndex + 1} de {semanas.length}
						</span>
						<button
							type="button"
							disabled={semanaIndex >= semanas.length - 1}
							onClick={() => onSemanaIndexChange((i) => i + 1)}
						>
							Semana siguiente →
						</button>
					</div>
					{semanaActual && (
						<SemanaView
							semana={semanaActual}
							pedidos={pedidos}
							efectivoInicialSemana={ajustes.efectivoInicialSemana?.[semanaIndex]}
							onAjustesChange={onAjustesChange}
							ajustes={ajustes}
							semanaIndex={semanaIndex}
							onVerDia={onVerDia}
							embed
						/>
					)}
				</>
			)}
		</div>
	);
}

