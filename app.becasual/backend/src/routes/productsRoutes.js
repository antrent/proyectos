import express from 'express';
import { getAll, getById, getByBarcode, create, update, remove } from '../controllers/productsController.js';

const router = express.Router();

router.get('/', getAll);
router.get('/:id', getById);
router.get('/barcode/:barcode', getByBarcode);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
