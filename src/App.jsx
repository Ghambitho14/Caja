import { useState, useEffect } from 'react';
import {
	getSemanasDelMes,
	totalMes,
	totalMesPorTipo,
	totalSemanaPorTipo,
	totalGastosPorTipo,
	totalMetas,
	dineroEnCuenta,
	formatMonto,
	formatFecha,
} from './utils/calculos';
import { loadState, saveState } from './utils/storage';
import {
	loadStateFromApi,
	saveStateToApi,
	deletePedidoFromApi,
	isSupabaseConfigured,
	getCurrentUser,
	onAuthStateChange,
	signOut,
	getMyAccessProfile,
} from './utils/api';
import PedidosView from './components/PedidosView';
import DetalleMesView from './components/DetalleMesView';
import GastosView from './components/GastosView';
import MetasView from './components/MetasView';
import AuthView from './components/AuthView';
import AdminUsersView from './components/AdminUsersView';
import './App.css';

const VISTAS = [
	{ id: 'pedidos', label: 'Pedidos' },
	{ id: 'detalle-mes', label: 'Detalle de mes' },
	{ id: 'gastos', label: 'Gastos' },
	{ id: 'compromisos', label: 'Compromisos' },
	{ id: 'admin-usuarios', label: 'Usuarios', onlyAdmin: true },
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
		ajustes: { dineroMesPasado: 0, efectivoInicialSemana: {}, efectivoCajaBloqueadoSemana: {} },
		metas: METAS_INICIALES,
	};
}

export default function App() {
	const [state, setState] = useState(estadoInicial);
	const [vista, setVista] = useState('pedidos');
	const [semanaIndex, setSemanaIndex] = useState(0);
	const [diaSeleccionado, setDiaSeleccionado] = useState(null);
	const [sidebarAbierto, setSidebarAbierto] = useState(false);
	/** True solo cuando se cargó bien desde Supabase; solo entonces se permite guardar en API. */
	const [hasLoadedFromApi, setHasLoadedFromApi] = useState(false);
	const [authUser, setAuthUser] = useState(null);
	const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
	const [authProfile, setAuthProfile] = useState(null);
	const [authProfileReady, setAuthProfileReady] = useState(!isSupabaseConfigured);

	useEffect(() => {
		if (!isSupabaseConfigured) return undefined;
		let active = true;
		getCurrentUser()
			.then((user) => {
				if (!active) return;
				setAuthUser(user);
				setAuthReady(true);
			})
			.catch(() => {
				if (!active) return;
				setAuthReady(true);
			});
		const subscription = onAuthStateChange((user) => {
			setAuthUser(user);
			setAuthProfile(null);
			setAuthProfileReady(!user);
			setState(estadoInicial());
			setHasLoadedFromApi(false);
		});
		return () => {
			active = false;
			subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (!isSupabaseConfigured) return undefined;
		if (!authUser) {
			setAuthProfile(null);
			setAuthProfileReady(true);
			return undefined;
		}
		let active = true;
		setAuthProfileReady(false);
		getMyAccessProfile()
			.then((profile) => {
				if (!active) return;
				setAuthProfile(profile);
				setAuthProfileReady(true);
			})
			.catch(() => {
				if (!active) return;
				setAuthProfile(null);
				setAuthProfileReady(true);
			});
		return () => { active = false; };
	}, [authUser]);

	useEffect(() => {
		let cancelled = false;
		if (isSupabaseConfigured && !authReady) return () => { cancelled = true; };
		if (isSupabaseConfigured && !authUser) {
			setHasLoadedFromApi(false);
			return () => { cancelled = true; };
		}
		if (isSupabaseConfigured && (!authProfileReady || authProfile?.status !== 'active')) {
			setHasLoadedFromApi(false);
			return () => { cancelled = true; };
		}
		(async () => {
			const now = new Date();
			const year = now.getFullYear();
			const month = now.getMonth() + 1;

			if (isSupabaseConfigured) {
				try {
					const loaded = await loadStateFromApi(year, month, authUser.id);
					if (cancelled || !loaded) return;
					const rawPedidos = Array.isArray(loaded.pedidos) ? loaded.pedidos : (loaded.pedidos ?? []);
					const pedidos = rawPedidos.map((p) => {
						const fecha = p.fecha ? String(p.fecha).slice(0, 10) : '';
						return {
							...p,
							id: p.id ?? p._id,
							fecha,
							descripcion: p.descripcion ?? '',
							monto: Number(p.monto) || 0,
							tipoVenta: p.tipoVenta === 'transferencia' ? 'transferencia' : 'efectivo',
						};
					});
					const gastos = Array.isArray(loaded.gastos) ? loaded.gastos : (loaded.gastos ?? []);
					const metas = Array.isArray(loaded.metas) && loaded.metas.length ? loaded.metas : undefined;
					const rawAjustes = loaded.ajustes;
					const ajustes = rawAjustes && typeof rawAjustes === 'object'
						? {
							dineroMesPasado: Number(rawAjustes.dineroMesPasado ?? rawAjustes.dinero_mes_pasado) || 0,
							efectivoInicialSemana: rawAjustes.efectivoInicialSemana && typeof rawAjustes.efectivoInicialSemana === 'object' ? rawAjustes.efectivoInicialSemana : {},
							efectivoCajaBloqueadoSemana: rawAjustes.efectivoCajaBloqueadoSemana && typeof rawAjustes.efectivoCajaBloqueadoSemana === 'object' ? rawAjustes.efectivoCajaBloqueadoSemana : {},
						}
						: undefined;
					setState((s) => ({
						...s,
						pedidos,
						gastos,
						metas: metas || s.metas,
						ajustes: ajustes || s.ajustes,
					}));
					setHasLoadedFromApi(true);
				} catch (_) {
					// No cargar desde localStorage: evitar escribir estado vacío o viejo a Supabase.
					// El estado se queda en estadoInicial; no se marca hasLoadedFromApi, así que no se guardará en API.
				}
				return;
			}

			// Sin Supabase: usar solo localStorage (ej. desarrollo local).
			const local = loadState();
			if (!cancelled && local && typeof local === 'object') {
				const rawPedidos = Array.isArray(local.pedidos) ? local.pedidos : [];
				const pedidos = rawPedidos.map((p) => ({
					...p,
					id: p.id ?? p._id,
					fecha: p.fecha ? String(p.fecha).slice(0, 10) : '',
					descripcion: p.descripcion ?? '',
					monto: Number(p.monto) || 0,
					tipoVenta: p.tipoVenta === 'transferencia' ? 'transferencia' : 'efectivo',
				}));
				const gastos = Array.isArray(local.gastos) ? local.gastos : [];
				const metas = Array.isArray(local.metas) && local.metas.length ? local.metas : undefined;
				const rawA = local.ajustes;
				const ajustes = rawA && typeof rawA === 'object'
					? {
						dineroMesPasado: Number(rawA.dineroMesPasado ?? rawA.dinero_mes_pasado) || 0,
						efectivoInicialSemana: rawA.efectivoInicialSemana && typeof rawA.efectivoInicialSemana === 'object' ? rawA.efectivoInicialSemana : {},
						efectivoCajaBloqueadoSemana: rawA.efectivoCajaBloqueadoSemana && typeof rawA.efectivoCajaBloqueadoSemana === 'object' ? rawA.efectivoCajaBloqueadoSemana : {},
					}
					: undefined;
				setState((s) => ({
					...s,
					pedidos: pedidos.length > 0 ? pedidos : s.pedidos,
					gastos: gastos.length > 0 ? gastos : s.gastos,
					metas: metas || s.metas,
					ajustes: ajustes || s.ajustes,
				}));
			}
			setHasLoadedFromApi(true);
		})();
		return () => { cancelled = true; };
	}, [authReady, authUser, authProfileReady, authProfile]);

	useEffect(() => {
		if (isSupabaseConfigured) {
			if (hasLoadedFromApi && authUser && authProfile?.status === 'active') {
				const t = setTimeout(() => {
					saveStateToApi(state, authUser.id).catch(() => {});
				}, 400);
				return () => clearTimeout(t);
			}
		} else {
			saveState(state);
		}
	}, [state, hasLoadedFromApi, authUser, authProfile]);

	const { year, month, pedidos = [], gastos = [], ajustes: rawAjustes, metas } = state;
	const ajustes = rawAjustes && typeof rawAjustes === 'object'
		? {
			dineroMesPasado: Number(rawAjustes.dineroMesPasado ?? rawAjustes.dinero_mes_pasado) || 0,
			efectivoInicialSemana: rawAjustes.efectivoInicialSemana && typeof rawAjustes.efectivoInicialSemana === 'object' ? rawAjustes.efectivoInicialSemana : {},
			efectivoCajaBloqueadoSemana: rawAjustes.efectivoCajaBloqueadoSemana && typeof rawAjustes.efectivoCajaBloqueadoSemana === 'object' ? rawAjustes.efectivoCajaBloqueadoSemana : {},
		}
		: { dineroMesPasado: 0, efectivoInicialSemana: {}, efectivoCajaBloqueadoSemana: {} };
	const semanas = getSemanasDelMes(year, month);
	const hoy = formatFecha(new Date());
	const semanaActualNav = semanas.find((s) => s.fechas && s.fechas.includes(hoy));
	const semanaActualIndex = semanas.findIndex((s) => s.fechas && s.fechas.includes(hoy));
	const fechasSemanaActual = semanaActualNav?.fechas || [];
	const totalEfectivoSemanaVal = totalSemanaPorTipo(pedidos, fechasSemanaActual, 'efectivo');
	const semanaActualCerrada = semanaActualIndex >= 0 && Boolean(ajustes.efectivoCajaBloqueadoSemana?.[semanaActualIndex]);
	const totalEfectivoSemanaDisponibleVal = semanaActualCerrada ? 0 : totalEfectivoSemanaVal;

	const totalMesVal = totalMes(pedidos, year, month);
	const totalTransferenciaMesVal = totalMesPorTipo(pedidos, year, month, 'transferencia');
	const totalMetasVal = totalMetas(Array.isArray(metas) ? metas : []);
	const gastosNegocio = totalGastosPorTipo(gastos, 'local', year, month);
	const gastosPersonales = totalGastosPorTipo(gastos, 'jhon', year, month);
	const dineroEnCuentaVal = dineroEnCuenta(ajustes, totalTransferenciaMesVal, gastosNegocio, gastosPersonales);
	const efectivoMasCuentaVal = totalEfectivoSemanaDisponibleVal + dineroEnCuentaVal;
	const avanceMetaVal = efectivoMasCuentaVal - totalMetasVal;

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

	const isAdmin = authProfile?.role === 'admin';
	const vistasDisponibles = VISTAS.filter((v) => !v.onlyAdmin || isAdmin);

	useEffect(() => {
		if (!vistasDisponibles.some((v) => v.id === vista)) {
			setVista('pedidos');
		}
	}, [vistasDisponibles, vista]);

	if (isSupabaseConfigured && !authReady) {
		return (
			<div className="auth-shell">
				<div className="auth-card">
					<h1 className="auth-title">Sistema de Caja</h1>
					<p className="auth-helper">Cargando sesión...</p>
				</div>
			</div>
		);
	}

	if (isSupabaseConfigured && !authUser) {
		return <AuthView />;
	}

	if (isSupabaseConfigured && (!authProfileReady || !authProfile)) {
		return (
			<div className="auth-shell">
				<div className="auth-card">
					<h1 className="auth-title">Sistema de Caja</h1>
					<p className="auth-helper">Preparando tu cuenta...</p>
				</div>
			</div>
		);
	}

	if (isSupabaseConfigured && authProfile.status !== 'active') {
		return (
			<div className="auth-shell">
				<div className="auth-card">
					<h1 className="auth-title">Cuenta {authProfile.status === 'blocked' ? 'bloqueada' : 'pendiente'}</h1>
					<p className="auth-helper">
						{authProfile.status === 'blocked'
							? 'Tu cuenta fue bloqueada por el administrador.'
							: 'Tu cuenta está creada, pero aún debe ser aprobada por el administrador.'}
					</p>
					<button
						type="button"
						className="auth-submit"
						onClick={() => signOut().catch(() => {})}
					>
						Cerrar sesión
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={`app ${sidebarAbierto ? 'sidebar-open' : ''}`}>
			<div className="sidebar-overlay" aria-hidden onClick={() => setSidebarAbierto(false)} />
			<nav className="navbar">
				<button
					type="button"
					className="sidebar-toggle"
					onClick={() => setSidebarAbierto((v) => !v)}
					aria-label={sidebarAbierto ? 'Cerrar menú' : 'Abrir menú'}
					aria-expanded={sidebarAbierto}
				>
					<span className="sidebar-toggle-icon" aria-hidden />
				</button>
				<div className="navbar-brand">
					<h1 className="navbar-titulo">
						<img src="/icon.png" alt="" className="navbar-logo" aria-hidden />
						Sistema de Caja
					</h1>
					{authUser ? <span className="navbar-user-email">{authUser.email}</span> : null}
				</div>
				{authUser ? (
					<div className="navbar-user">
						<button
							type="button"
							className="navbar-user-logout"
							onClick={() => signOut().catch(() => {})}
						>
							Cerrar sesión
						</button>
					</div>
				) : null}
				<div className="navbar-metricas">
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
						<span className="navbar-metrica-label">Ventas efectivo (semana) + Cuenta</span>
						<span className="navbar-metrica-valor" title="Ventas en efectivo de esta semana + dinero de la cuenta">
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
					<div className="navbar-metrica navbar-metrica-destacada navbar-metrica-meta">
						<span className="navbar-metrica-label">Falta para la meta</span>
						<span
							className={`navbar-metrica-valor ${avanceMetaVal < 0 ? 'navbar-metrica-valor-negativo' : 'navbar-metrica-valor-positivo'}`}
							title="Ventas en efectivo de esta semana + dinero de la cuenta - compromisos/metas."
						>
							{avanceMetaVal < 0 ? '-' : '+'}
							{formatMonto(Math.abs(avanceMetaVal))}
						</span>
					</div>
				</div>
			</nav>

			<div className="layout-body">
				<aside className="sidebar">
					<ul className="sidebar-nav">
						{vistasDisponibles.map((v) => (
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
							semanas={semanas}
							diaSeleccionado={diaSeleccionado}
							onDiaSeleccionadoChange={setDiaSeleccionado}
							pedidos={pedidos}
							onPedidosChange={setPedidos}
							onEliminarPedido={(id) => deletePedidoFromApi(id).catch(() => {})}
							ajustes={ajustes}
							onAjustesChange={setAjustes}
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

					{vista === 'admin-usuarios' && isAdmin && (
						<AdminUsersView currentUserId={authUser?.id} />
					)}
				</main>
			</div>
		</div>
	);
}
