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

import { authenticateToken } from './middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware global de seguridad para validación de sesiones JWT
app.use(authenticateToken);

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

import { prisma } from './config/db.js';
import { exec } from 'child_process';

app.listen(PORT, async () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);

  // Verificar e inicializar base de datos local de PostgreSQL de forma automatizada
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Conexión con PostgreSQL establecida de forma exitosa. Usuarios locales: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️ Base de datos vacía. Iniciando sembrado automático de datos...');
      exec('npx prisma db seed', { env: process.env }, (err, stdout, stderr) => {
        if (err) {
          console.error('❌ Error al sembrar base de datos local:', err);
        } else {
          console.log('✅ Base de datos local sembrada exitosamente. Datos de inicio cargados.');
        }
      });
    }
  } catch (err) {
    console.log('⚠️ La base de datos no está sincronizada o no se han creado las tablas locales.');
    console.log('⚙️ Iniciando creación de tablas local (npx prisma db push)...');
    
    exec('npx prisma db push', { env: process.env }, (pushErr, stdout, stderr) => {
      if (pushErr) {
        console.error('❌ Error al crear tablas locales en PostgreSQL:', pushErr);
      } else {
        console.log('✅ Tablas creadas con éxito. Procediendo con el sembrado de datos...');
        
        exec('npx prisma db seed', { env: process.env }, (seedErr, seedStdout, seedStderr) => {
          if (seedErr) {
            console.error('❌ Error al sembrar base de datos local:', seedErr);
          } else {
            console.log('✅ Base de datos inicializada y sembrada con éxito. Listo para login.');
          }
        });
      }
    });
  }
});

export default app;
