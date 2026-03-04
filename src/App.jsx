import { useState, useEffect } from 'react';
import {
	getSemanasDelMes,
	totalMes,
	totalMesPorTipo,
	totalGastosPorTipo,
	dineroEnCuenta,
	efectivoTotal,
	formatMonto,
} from './utils/calculos';
import { loadStateFromApi, saveStateToApi } from './utils/api';
import PedidosView from './components/PedidosView';
import DetalleMesView from './components/DetalleMesView';
import GastosView from './components/GastosView';
import MetasView from './components/MetasView';
import './App.css';

const VISTAS = [
	{ id: 'pedidos', label: 'Pedidos' },
	{ id: 'detalle-mes', label: 'Detalle de mes' },
	{ id: 'gastos', label: 'Gastos' },
	{ id: 'compromisos', label: 'Compromisos' },
];
const METAS_INICIALES = [
	{ id: 'm1', nombre: 'Arriendo', monto: 0 },
	{ id: 'm2', nombre: 'Mercadería', monto: 0 },
	{ id: 'm3', nombre: 'Local A.', monto: 0 },
];

function estadoInicial() {
	const now = new Date();
	return {
		year: now.getFullYear(),
		month: now.getMonth() + 1,
		pedidos: [],
		gastos: [],
		ajustes: { efectivoInicial: 0, dineroMesPasado: 0 },
		metas: METAS_INICIALES,
	};
}

export default function App() {
	const [state, setState] = useState(estadoInicial);
	const [vista, setVista] = useState('pedidos');
	const [semanaIndex, setSemanaIndex] = useState(0);
	const [diaSeleccionado, setDiaSeleccionado] = useState(null);
	const [sidebarAbierto, setSidebarAbierto] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const now = new Date();
			const year = now.getFullYear();
			const month = now.getMonth() + 1;
			try {
				const loaded = await loadStateFromApi(year, month);
				if (!cancelled && loaded) {
					const rawPedidos = Array.isArray(loaded.pedidos) ? loaded.pedidos : (loaded.pedidos ?? []);
					const pedidos = rawPedidos.map((p) => ({
						...p,
						tipoVenta: p.tipoVenta === 'transferencia' ? 'transferencia' : 'efectivo',
					}));
					const gastos = Array.isArray(loaded.gastos) ? loaded.gastos : (loaded.gastos ?? []);
					const metas = Array.isArray(loaded.metas) && loaded.metas.length ? loaded.metas : undefined;
					const rawAjustes = loaded.ajustes;
					const ajustes = rawAjustes && typeof rawAjustes === 'object'
						? {
							efectivoInicial: Number(rawAjustes.efectivoInicial ?? rawAjustes.efectivo_inicial) || 0,
							dineroMesPasado: Number(rawAjustes.dineroMesPasado ?? rawAjustes.dinero_mes_pasado) || 0,
						}
						: undefined;
					setState((s) => ({
						...s,
						pedidos: pedidos.length ? pedidos : s.pedidos,
						gastos: gastos.length ? gastos : s.gastos,
						metas: metas || s.metas,
						ajustes: ajustes || s.ajustes,
					}));
				}
			} catch (_) {
				// Sin fallback: solo BD Supabase
			}
		})();
		return () => { cancelled = true; };
	}, []);

	useEffect(() => {
		const t = setTimeout(() => {
			saveStateToApi(state).catch(() => {});
		}, 400);
		return () => clearTimeout(t);
	}, [state]);

	const { year, month, pedidos = [], gastos = [], ajustes: rawAjustes, metas } = state;
	const ajustes = rawAjustes && typeof rawAjustes === 'object'
		? {
			efectivoInicial: Number(rawAjustes.efectivoInicial ?? rawAjustes.efectivo_inicial) || 0,
			dineroMesPasado: Number(rawAjustes.dineroMesPasado ?? rawAjustes.dinero_mes_pasado) || 0,
		}
		: { efectivoInicial: 0, dineroMesPasado: 0 };
	const semanas = getSemanasDelMes(year, month);

	const totalMesVal = totalMes(pedidos, year, month);
	const totalEfectivoMesVal = totalMesPorTipo(pedidos, year, month, 'efectivo');
	const totalTransferenciaMesVal = totalMesPorTipo(pedidos, year, month, 'transferencia');
	const gastosNegocio = totalGastosPorTipo(gastos, 'local', year, month);
	const gastosPersonales = totalGastosPorTipo(gastos, 'jhon', year, month);
	const dineroEnCuentaVal = dineroEnCuenta(ajustes, totalTransferenciaMesVal, gastosNegocio, gastosPersonales);
	const efectivoTotalVal = efectivoTotal(ajustes, totalEfectivoMesVal);
	const efectivoMasCuentaVal = efectivoTotalVal + dineroEnCuentaVal;

	function setPedidos(next) {
		setState((s) => ({ ...s, pedidos: next }));
	}
	function setGastos(next) {
		setState((s) => ({ ...s, gastos: next }));
	}
	function setAjustes(next) {
		setState((s) => ({ ...s, ajustes: next }));
	}
	function setMetas(next) {
		setState((s) => ({ ...s, metas: next }));
	}

	function irAVista(id) {
		setVista(id);
		setSidebarAbierto(false);
	}

	return (
		<div className={`app ${sidebarAbierto ? 'sidebar-open' : ''}`}>
			<button
				type="button"
				className="sidebar-toggle"
				onClick={() => setSidebarAbierto((v) => !v)}
				aria-label={sidebarAbierto ? 'Cerrar menú' : 'Abrir menú'}
				aria-expanded={sidebarAbierto}
			>
				<span className="sidebar-toggle-icon" aria-hidden />
			</button>
			<div className="sidebar-overlay" aria-hidden onClick={() => setSidebarAbierto(false)} />
			<nav className="navbar">
				<h1 className="navbar-titulo">Sistema de Caja</h1>
				<div className="navbar-metricas">
					<div className="navbar-metrica">
						<span className="navbar-metrica-label">Dinero efectivo caja</span>
						<input
							type="text"
							className="navbar-metrica-input"
							value={ajustes.efectivoInicial || ''}
							onChange={(e) => {
								const v = e.target.value.replace(/\D/g, '');
								setAjustes({
									...ajustes,
									efectivoInicial: v === '' ? 0 : parseInt(v, 10) || 0,
								});
							}}
							placeholder="0"
							aria-label="Dinero efectivo caja"
						/>
					</div>
					<div className="navbar-metrica">
						<span className="navbar-metrica-label">Dinero de todo el mes</span>
						<span className="navbar-metrica-valor">{formatMonto(totalMesVal)}</span>
					</div>
					<div className="navbar-metrica navbar-metrica-destacada">
						<span className="navbar-metrica-label">Dinero de la cuenta</span>
						<span className="navbar-metrica-valor" title="Transferencias + dinero del mes pasado − gastos del mes">
							{formatMonto(dineroEnCuentaVal)}
						</span>
					</div>
					<div className="navbar-metrica navbar-metrica-destacada">
						<span className="navbar-metrica-label">Dinero en efectivo</span>
						<span className="navbar-metrica-valor" title="Efectivo de caja + ventas en efectivo del mes">
							{formatMonto(efectivoTotalVal)}
						</span>
					</div>
					<div className="navbar-metrica navbar-metrica-destacada">
						<span className="navbar-metrica-label">Dinero Efectivo + Cuenta</span>
						<span className="navbar-metrica-valor" title="Dinero en efectivo + dinero de la cuenta">
							{formatMonto(efectivoMasCuentaVal)}
						</span>
					</div>
					<div className="navbar-metrica">
						<span className="navbar-metrica-label">Dinero de ganancia del mes pasado</span>
						<input
							type="text"
							className="navbar-metrica-input"
							value={ajustes.dineroMesPasado || ''}
							onChange={(e) => {
								const v = e.target.value.replace(/\D/g, '');
								setAjustes({
									...ajustes,
									dineroMesPasado: v === '' ? 0 : parseInt(v, 10) || 0,
								});
							}}
							placeholder="0"
							aria-label="Dinero de ganancia del mes pasado"
						/>
					</div>
				</div>
			</nav>

			<div className="layout-body">
				<aside className="sidebar">
					<ul className="sidebar-nav">
						{VISTAS.map((v) => (
							<li key={v.id}>
								<button
									type="button"
									className={vista === v.id ? 'active' : ''}
									onClick={() => irAVista(v.id)}
								>
									{v.label}
								</button>
							</li>
						))}
					</ul>
				</aside>

				<main className="main-content">
					{vista === 'pedidos' && (
						<PedidosView
							year={year}
							month={month}
							diaSeleccionado={diaSeleccionado}
							onDiaSeleccionadoChange={setDiaSeleccionado}
							pedidos={pedidos}
							onPedidosChange={setPedidos}
							efectivoInicial={ajustes.efectivoInicial}
						/>
					)}

					{vista === 'detalle-mes' && (
						<DetalleMesView
							year={year}
							month={month}
							pedidos={pedidos}
							gastos={gastos}
							ajustes={ajustes}
							onAjustesChange={setAjustes}
							metas={metas}
							semanas={semanas}
							semanaIndex={semanaIndex}
							onSemanaIndexChange={setSemanaIndex}
							onVerDia={(fecha) => {
								setDiaSeleccionado(fecha);
								setVista('pedidos');
							}}
						/>
					)}

					{vista === 'gastos' && (
						<GastosView
							year={year}
							month={month}
							gastos={gastos}
							onGastosChange={setGastos}
						/>
					)}

					{vista === 'compromisos' && (
						<MetasView metas={metas} onMetasChange={setMetas} />
					)}
				</main>
			</div>
		</div>
	);
}
