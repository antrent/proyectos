import { prisma } from '../config/db.js';

export const getAll = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = {};

    if (storeId && storeId !== 'all') where.storeId = storeId;

    const closings = await prisma.closing.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    res.json(closings);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener arqueos y cierres de caja.', details: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const closing = await prisma.closing.findUnique({
      where: { id }
    });
    if (!closing) return res.status(404).json({ error: 'Cierre de caja no encontrado.' });
    res.json(closing);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cierre de caja.', details: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { storeId, cashCollected, cardCollected, digitalCollect } = req.body;

    const store_id = storeId || 'store_1';

    // 1. Obtener ventas del día de hoy en la sede
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        storeId: store_id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // 2. Sumar total y agrupar por métodos de pago
    let totalSales = 0;

    sales.forEach(sale => {
      totalSales += sale.total;
    });

    const cashVal = Number(cashCollected) || 0;
    const cardVal = Number(cardCollected) || 0;
    const digVal = Number(digitalCollect) || 0;

    // Calcular la diferencia total contra lo esperado del sistema
    const totalCollected = cashVal + cardVal + digVal;
    const difference = totalCollected - totalSales;

    // 3. Registrar el Arqueo / Cierre
    const newClosing = await prisma.closing.create({
      data: {
        storeId: store_id,
        salesCount: sales.length,
        totalSales,
        cashCollected: cashVal,
        cardCollected: cardVal,
        digitalCollect: digVal,
        difference,
        status: 'abierta'
      }
    });

    res.status(201).json(newClosing);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar arqueo de caja.', details: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.closing.update({
      where: { id },
      data: { status: status || 'cerrada' }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar caja.', details: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.closing.delete({
      where: { id }
    });
    res.json({ message: 'Arqueo eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar arqueo de caja.', details: error.message });
  }
};
