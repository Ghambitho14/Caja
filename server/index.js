import express from 'express';
import cors from 'cors';
import {
	getPedidos,
	setPedidos,
	getGastos,
	setGastos,
	getMetas,
	setMetas,
	getAjustes,
	setAjustes,
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/state', (req, res) => {
	try {
		const year = parseInt(req.query.year, 10) || new Date().getFullYear();
		const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
		const pedidos = getPedidos();
		const gastos = getGastos();
		const metas = getMetas();
		const ajustes = getAjustes(year, month);
		res.json({ pedidos, gastos, metas, ajustes });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});

app.post('/api/state', (req, res) => {
	try {
		const { pedidos = [], gastos = [], metas = [], ajustes = {}, year, month } = req.body;
		const y = year ?? new Date().getFullYear();
		const m = month ?? new Date().getMonth() + 1;
		setPedidos(pedidos);
		setGastos(gastos);
		setMetas(metas);
		setAjustes(y, m, Number(ajustes.efectivoInicial) || 0, Number(ajustes.dineroMesPasado) || 0);
		res.json({ ok: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});

app.listen(PORT, () => {
	console.log(`Servidor en http://localhost:${PORT}`);
});
