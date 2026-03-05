import { useEffect, useMemo, useState } from 'react';
import { listAccessUsers, updateAccessUserStatus } from '../utils/api';
import './AdminUsersView.css';

function formatDateTime(value) {
	if (!value) return '-';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '-';
	return d.toLocaleString('es-CL');
}

export default function AdminUsersView({ currentUserId }) {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [busyUserId, setBusyUserId] = useState('');

	async function loadUsers() {
		setError('');
		setLoading(true);
		try {
			const rows = await listAccessUsers();
			setUsers(rows);
		} catch (err) {
			setError(err?.message || 'No se pudo cargar la lista de usuarios.');
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadUsers();
	}, []);

	const pendingCount = useMemo(
		() => users.filter((u) => u.status === 'pending').length,
		[users]
	);

	async function setStatus(userId, nextStatus) {
		setBusyUserId(userId);
		setError('');
		try {
			await updateAccessUserStatus(userId, nextStatus);
			setUsers((prev) => prev.map((u) => (
				u.userId === userId ? { ...u, status: nextStatus } : u
			)));
		} catch (err) {
			setError(err?.message || 'No se pudo actualizar el usuario.');
		} finally {
			setBusyUserId('');
		}
	}

	return (
		<section className="pantalla admin-users-view">
			<div className="titulo-pantalla-wrap">
				<h2 className="titulo-pantalla">Gestión de usuarios</h2>
				<span className="admin-users-pending">Pendientes: {pendingCount}</span>
			</div>
			<p className="admin-users-desc">
				Aquí puedes aprobar o bloquear cuentas. El administrador permanece con rol admin y los demás usuarios quedan como user.
			</p>
			<button type="button" className="admin-users-refresh" onClick={loadUsers} disabled={loading}>
				{loading ? 'Actualizando...' : 'Actualizar lista'}
			</button>
			{error ? <p className="admin-users-error">{error}</p> : null}
			{loading ? (
				<p className="sin-datos">Cargando usuarios...</p>
			) : (
				<div className="admin-users-table-wrap">
					<table className="admin-users-table">
						<thead>
							<tr>
								<th>Correo</th>
								<th>Rol</th>
								<th>Estado</th>
								<th>Creado</th>
								<th>Acción</th>
							</tr>
						</thead>
						<tbody>
							{users.length === 0 ? (
								<tr>
									<td colSpan={5} className="sin-datos">No hay usuarios aún.</td>
								</tr>
							) : users.map((u) => {
								const isSelf = u.userId === currentUserId;
								const isBusy = busyUserId === u.userId;
								const canManage = !isSelf && u.role !== 'admin';
								return (
									<tr key={u.userId}>
										<td>{u.email || '-'}</td>
										<td><span className={`badge role-${u.role}`}>{u.role}</span></td>
										<td><span className={`badge status-${u.status}`}>{u.status}</span></td>
										<td>{formatDateTime(u.createdAt)}</td>
										<td>
											{!canManage ? (
												<span className="sin-datos">{isSelf ? 'Tu cuenta' : 'Protegido'}</span>
											) : u.status === 'active' ? (
												<button type="button" className="btn-eliminar" disabled={isBusy} onClick={() => setStatus(u.userId, 'blocked')}>
													{isBusy ? 'Guardando...' : 'Bloquear'}
												</button>
											) : (
												<button type="button" className="btn-editar" disabled={isBusy} onClick={() => setStatus(u.userId, 'active')}>
													{isBusy ? 'Guardando...' : 'Aprobar'}
												</button>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}
