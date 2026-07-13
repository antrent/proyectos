import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Debes proporcionar usuario y contraseña.' });
    }

    // Buscar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Validar contraseña (bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Firmar token JWT (expira en 24 horas)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'becasual_super_secret_key_123!',
      { expiresIn: '24h' }
    );

    // Retornar token y datos del usuario
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el proceso de login.', details: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    // req.user viene inyectado por el middleware de autenticación
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil.', details: error.message });
  }
};
