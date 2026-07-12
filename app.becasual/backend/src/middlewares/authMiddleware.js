import jwt from 'jsonwebtoken';

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // El token viene como "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso no proporcionado.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'becasual_super_secret_key_123!', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido o expirado.' });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Cabecera de autorización no encontrada.' });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado. No tienes los permisos requeridos para esta acción.' });
    }

    next();
  };
};
