import express from 'express';
import { getAll, create } from '../controllers/purchasesController.js';

const router = express.Router();

router.get('/', getAll);
router.post('/', create);

export default router;
