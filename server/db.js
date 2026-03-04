import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'caja.db');
const db = new Database(dbPath);

db.exec(`
	CREATE TABLE IF NOT EXISTS pedidos (
		id TEXT PRIMARY KEY,
		fecha TEXT NOT NULL,
		descripcion TEXT,
		monto REAL NOT NULL DEFAULT 0,
		metodo_pago TEXT,
		tipo_venta TEXT
	);

	CREATE TABLE IF NOT EXISTS gastos (
		id TEXT PRIMARY KEY,
		tipo TEXT NOT NULL,
		descripcion TEXT,
		monto REAL NOT NULL DEFAULT 0,
		fecha TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS metas (
		id TEXT PRIMARY KEY,
		nombre TEXT NOT NULL,
		monto REAL NOT NULL DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS ajustes (
		year INTEGER NOT NULL,
		month INTEGER NOT NULL,
		efectivo_inicial REAL NOT NULL DEFAULT 0,
		dinero_mes_pasado REAL NOT NULL DEFAULT 0,
		PRIMARY KEY (year, month)
	);
`);

try {
	db.exec('ALTER TABLE pedidos ADD COLUMN tipo_venta TEXT');
} catch (_) {}

export function getPedidos() {
	const rows = db.prepare('SELECT id, fecha, descripcion, monto, metodo_pago, tipo_venta FROM pedidos').all();
	return rows.map((r) => ({
		id: r.id,
		fecha: r.fecha,
		descripcion: r.descripcion,
		monto: r.monto,
		metodoPago: r.metodo_pago || undefined,
		tipoVenta: r.tipo_venta === 'transferencia' ? 'transferencia' : 'efectivo',
	}));
}

export function setPedidos(pedidos) {
	const insert = db.prepare(
		'INSERT OR REPLACE INTO pedidos (id, fecha, descripcion, monto, metodo_pago, tipo_venta) VALUES (?, ?, ?, ?, ?, ?)'
	);
	db.transaction(() => {
		db.prepare('DELETE FROM pedidos').run();
		for (const p of pedidos) {
			const tipoVenta = p.tipoVenta === 'transferencia' ? 'transferencia' : 'efectivo';
			insert.run(p.id, p.fecha, p.descripcion ?? '', Number(p.monto) || 0, p.metodoPago ?? null, tipoVenta);
		}
	})();
}

export function getGastos() {
	const rows = db.prepare('SELECT id, tipo, descripcion, monto, fecha FROM gastos').all();
	return rows.map((r) => ({
		id: r.id,
		tipo: r.tipo,
		descripcion: r.descripcion,
		monto: r.monto,
		fecha: r.fecha,
	}));
}

export function setGastos(gastos) {
	const insert = db.prepare(
		'INSERT OR REPLACE INTO gastos (id, tipo, descripcion, monto, fecha) VALUES (?, ?, ?, ?, ?)'
	);
	db.transaction(() => {
		db.prepare('DELETE FROM gastos').run();
		for (const g of gastos) {
			insert.run(g.id, g.tipo, g.descripcion ?? '', Number(g.monto) || 0, g.fecha);
		}
	})();
}

export function getMetas() {
	const rows = db.prepare('SELECT id, nombre, monto FROM metas').all();
	return rows.map((r) => ({
		id: r.id,
		nombre: r.nombre,
		monto: r.monto,
	}));
}

export function setMetas(metas) {
	const insert = db.prepare('INSERT OR REPLACE INTO metas (id, nombre, monto) VALUES (?, ?, ?)');
	db.transaction(() => {
		db.prepare('DELETE FROM metas').run();
		for (const m of metas) {
			insert.run(m.id, m.nombre, Number(m.monto) || 0);
		}
	})();
}

export function getAjustes(year, month) {
	const row = db
		.prepare('SELECT efectivo_inicial, dinero_mes_pasado FROM ajustes WHERE year = ? AND month = ?')
		.get(year, month);
	if (!row) return { efectivoInicial: 0, dineroMesPasado: 0 };
	return {
		efectivoInicial: row.efectivo_inicial,
		dineroMesPasado: row.dinero_mes_pasado,
	};
}

export function setAjustes(year, month, efectivoInicial, dineroMesPasado) {
	db.prepare(
		`INSERT INTO ajustes (year, month, efectivo_inicial, dinero_mes_pasado) VALUES (?, ?, ?, ?)
		 ON CONFLICT(year, month) DO UPDATE SET efectivo_inicial = ?, dinero_mes_pasado = ?`
	).run(year, month, efectivoInicial, dineroMesPasado, efectivoInicial, dineroMesPasado);
}

export default db;
