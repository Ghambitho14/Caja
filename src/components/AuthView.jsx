import { useState } from 'react';
import { signInWithPassword, signUpWithPassword } from '../utils/api';
import './AuthView.css';

export default function AuthView() {
	const [mode, setMode] = useState('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	async function onSubmit(e) {
		e.preventDefault();
		setError('');
		setNotice('');
		setLoading(true);
		try {
			if (mode === 'login') {
				await signInWithPassword(email, password);
			} else {
				const result = await signUpWithPassword(email, password);
				if (!result.user) {
					setNotice('No se pudo crear la cuenta. Intenta nuevamente.');
				} else if (!result.session) {
					setNotice('Cuenta creada. Revisa tu correo y confirma la cuenta antes de iniciar sesión.');
				} else {
					setNotice('Cuenta creada. Ya puedes usar la app.');
				}
			}
		} catch (err) {
			setError(err?.message || 'No se pudo completar la autenticación.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="auth-shell">
			<form className="auth-card" onSubmit={onSubmit}>
				<h1 className="auth-title">Sistema de Caja</h1>
				<p className="auth-subtitle">Inicia sesión para ver solo tus datos.</p>

				<div className="auth-tabs" role="tablist" aria-label="Tipo de acceso">
					<button
						type="button"
						className={mode === 'login' ? 'active' : ''}
						onClick={() => {
							setMode('login');
							setError('');
							setNotice('');
						}}
					>
						Iniciar sesión
					</button>
					<button
						type="button"
						className={mode === 'signup' ? 'active' : ''}
						onClick={() => {
							setMode('signup');
							setError('');
							setNotice('');
						}}
					>
						Crear cuenta
					</button>
				</div>

				<label className="auth-label" htmlFor="auth-email">Correo</label>
				<input
					id="auth-email"
					type="email"
					autoComplete="email"
					className="auth-input"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="tu@correo.com"
					required
				/>

				<label className="auth-label" htmlFor="auth-password">Contraseña</label>
				<input
					id="auth-password"
					type="password"
					autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
					className="auth-input"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder="Mínimo 6 caracteres"
					minLength={6}
					required
				/>

				{error ? <p className="auth-error">{error}</p> : null}
				{notice ? <p className="auth-notice">{notice}</p> : null}

				<button type="submit" className="auth-submit" disabled={loading}>
					{loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
				</button>
			</form>
		</div>
	);
}
