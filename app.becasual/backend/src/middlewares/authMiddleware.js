import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const secret = process.env.JWT_SECRET || 'becasual_super_secret_key_123!';

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      console.warn('⚠️ Token inválido o expirado recibido en API:', err.message);
    } else {
      req.user = user;
    }
    next();
  });
}

// Alias para compatibilidad con authRoutes.js
export const authenticateJWT = authenticateToken;

export default authenticateToken;
