import express from 'express';
import { getAll, create, createBulk } from '../controllers/salesController.js';

const router = express.Router();

router.get('/', getAll);
router.post('/bulk', createBulk);
router.post('/', create);

export default router;
