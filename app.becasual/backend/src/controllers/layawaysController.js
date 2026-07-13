import { prisma } from '../config/db.js';

export const getAll = async (req, res) => {
  try {
    const { storeId, status } = req.query;
    const where = {};

    if (storeId && storeId !== 'all') where.storeId = storeId;
    if (status) where.status = status;

    const layaways = await prisma.layaway.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    res.json(layaways);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener apartados.', details: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const layaway = await prisma.layaway.findUnique({
      where: { id }
    });
    if (!layaway) return res.status(404).json({ error: 'Apartado no encontrado.' });
    res.json(layaway);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener apartado.', details: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { storeId, clientId, clientName, clientPhone, total, deposit, products } = req.body;

    const store_id = storeId || 'store_1';

    if (!clientName || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Nombre del cliente y lista de productos son requeridos.' });
    }

    const totalVal = Number(total) || 0;
    const depositVal = Number(deposit) || 0;
    const remainingVal = totalVal - depositVal;

    const newLayaway = await prisma.layaway.create({
      data: {
        storeId: store_id,
        clientId: clientId || null,
        clientName: clientName.trim(),
        clientPhone: clientPhone ? String(clientPhone).trim() : null,
        total: totalVal,
        deposit: depositVal,
        remaining: remainingVal,
        status: 'pendiente',
        products: products
      }
    });

    res.status(201).json(newLayaway);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear apartado.', details: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { deposit, status } = req.body;

    const layaway = await prisma.layaway.findUnique({
      where: { id }
    });

    if (!layaway) {
      return res.status(404).json({ error: 'Apartado no encontrado.' });
    }

    const data = {};

    if (deposit !== undefined) {
      // Registrar abono acumulado
      const newDeposit = layaway.deposit + Number(deposit);
      const newRemaining = layaway.total - newDeposit;

      data.deposit = newDeposit;
      data.remaining = newRemaining >= 0 ? newRemaining : 0;
    }

    if (status) {
      data.status = status;
    }

    const updated = await prisma.layaway.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar apartado.', details: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.layaway.delete({
      where: { id }
    });
    res.json({ message: 'Apartado eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar apartado.', details: error.message });
  }
};
