import express from 'express';
import { getAll, create } from '../controllers/salesController.js';

const router = express.Router();

router.get('/', getAll);
router.post('/', create);

export default router;
