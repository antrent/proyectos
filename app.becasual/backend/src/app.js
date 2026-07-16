import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from './routes/productsRoutes.js';
import purchasesRouter from './routes/purchasesRoutes.js';
import authRouter from './routes/authRoutes.js';
import clientsRouter from './routes/clientsRoutes.js';
import employeesRouter from './routes/employeesRoutes.js';
import salesRouter from './routes/salesRoutes.js';
import layawaysRouter from './routes/layawaysRoutes.js';
import closingsRouter from './routes/closingsRoutes.js';
import storesRouter from './routes/storesRoutes.js';
import expensesRouter from './routes/expensesRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Registro de Rutas
app.use('/api/products', productsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/layaways', layawaysRouter);
app.use('/api/closings', closingsRouter);
app.use('/api/stores', storesRouter);
app.use('/api/expenses', expensesRouter);

// Ruta de estado
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor BeCasual corriendo correctamente' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

export default app;
