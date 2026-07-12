import express from 'express';
import { login, getProfile } from '../controllers/authController.js';
import { authenticateJWT } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/profile', authenticateJWT, getProfile);

export default router;
