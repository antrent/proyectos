import { prisma } from '../config/db.js';

export const getAll = async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;

    const where = {};

    // Sede filter
    if (storeId && storeId !== 'all') {
      where.storeId = storeId;
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        // Para incluir todo el día de la fecha final, la seteamos a final de día
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener compras.', details: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { id, storeId, barcode, sku, name, provider, quantity, costPrice, sellPrice, date } = req.body;

    const store_id = storeId || 'store_1';
    const qty = Number(quantity) || 0;
    const cost = Number(costPrice) || 0;
    const sell = Number(sellPrice) || 0;
    const total = qty * cost;
    const finalDate = date ? new Date(date) : new Date();

    if (qty <= 0) {
      return res.status(400).json({ error: 'La cantidad comprada debe ser mayor a 0.' });
    }

    if (!sku && !barcode) {
      return res.status(400).json({ error: 'Debes proporcionar un SKU o código de barras.' });
    }

    // Ejecutar registro de compra y actualización de inventario en una transacción atómica de Prisma
    const result = await prisma.$transaction(async (tx) => {
      // 1. Guardar la compra
      const newPurchase = await tx.purchase.create({
        data: {
          id: id || undefined,
          storeId: store_id,
          date: finalDate,
          barcode: barcode ? String(barcode).trim() : '',
          sku: sku ? String(sku).trim() : '',
          name: name.trim(),
          provider: provider ? provider.trim() : '-',
          quantity: qty,
          costPrice: cost,
          totalPrice: total,
          sellPrice: sell
        }
      });

      // 2. Buscar si el producto ya existe en el inventario por SKU o por Barcode
      const searchConditions = [];
      if (sku) searchConditions.push({ sku: sku.trim() });
      if (barcode) searchConditions.push({ barcode: barcode.trim() });

      let product = await tx.product.findFirst({
        where: {
          storeId: store_id,
          OR: searchConditions
        }
      });

      if (product) {
        // Si existe: sumamos el stock y actualizamos precios
        product = await tx.product.update({
          where: { id: product.id },
          data: {
            stock: product.stock + qty,
            costPrice: cost, // Actualiza al último precio de costo
            sellPrice: sell  // Actualiza al último precio de venta
          }
        });
      } else {
        // Si no existe: creamos el nuevo producto en el inventario
        product = await tx.product.create({
          data: {
            storeId: store_id,
            barcode: barcode ? barcode.trim() : `BE-${Math.floor(100000 + Math.random() * 900000)}`,
            sku: sku ? sku.trim() : `SKU-${Date.now().toString().slice(-6)}`,
            name: name.trim(),
            stock: qty,
            costPrice: cost,
            sellPrice: sell,
            line: '-',
            category: '-',
            gender: '-',
            style: '-',
            color: '-',
            size: '-',
            provider: provider ? provider.trim() : '-',
            minStock: 5
          }
        });
      }

      return { purchase: newPurchase, product };
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar compra y actualizar inventario.', details: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { barcode, sku, name, provider, quantity, costPrice, sellPrice, date } = req.body;

    const oldPurchase = await prisma.purchase.findUnique({ where: { id } });
    if (!oldPurchase) {
      return res.status(404).json({ error: 'Compra no encontrada.' });
    }

    const newQty = quantity !== undefined ? Number(quantity) : oldPurchase.quantity;
    const newCost = costPrice !== undefined ? Number(costPrice) : oldPurchase.costPrice;
    const newSell = sellPrice !== undefined ? Number(sellPrice) : oldPurchase.sellPrice;
    const newTotal = newQty * newCost;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar registro de compra
      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: {
          barcode: barcode !== undefined ? String(barcode).trim() : oldPurchase.barcode,
          sku: sku !== undefined ? String(sku).trim() : oldPurchase.sku,
          name: name !== undefined ? name.trim() : oldPurchase.name,
          provider: provider !== undefined ? provider.trim() : oldPurchase.provider,
          quantity: newQty,
          costPrice: newCost,
          sellPrice: newSell,
          totalPrice: newTotal,
          date: date ? new Date(date) : oldPurchase.date
        }
      });

      // 2. Ajustar stock del producto en inventario por la diferencia
      const qtyDiff = newQty - oldPurchase.quantity;
      if (qtyDiff !== 0) {
        const searchConditions = [];
        if (updatedPurchase.sku) searchConditions.push({ sku: updatedPurchase.sku });
        if (updatedPurchase.barcode) searchConditions.push({ barcode: updatedPurchase.barcode });

        const product = await tx.product.findFirst({
          where: {
            storeId: oldPurchase.storeId,
            OR: searchConditions
          }
        });

        if (product) {
          const adjustedStock = Math.max(0, product.stock + qtyDiff);
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: adjustedStock,
              costPrice: newCost,
              sellPrice: newSell
            }
          });
        }
      }

      return updatedPurchase;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la compra.', details: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) {
      return res.status(404).json({ error: 'Compra no encontrada.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Revertir el stock en inventario
      const searchConditions = [];
      if (purchase.sku) searchConditions.push({ sku: purchase.sku });
      if (purchase.barcode) searchConditions.push({ barcode: purchase.barcode });

      if (searchConditions.length > 0) {
        const product = await tx.product.findFirst({
          where: {
            storeId: purchase.storeId,
            OR: searchConditions
          }
        });

        if (product) {
          const revertedStock = Math.max(0, product.stock - purchase.quantity);
          await tx.product.update({
            where: { id: product.id },
            data: { stock: revertedStock }
          });
        }
      }

      // 2. Eliminar registro de la compra
      await tx.purchase.delete({ where: { id } });
    });

    res.json({ message: 'Compra eliminada y stock revertido con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la compra.', details: error.message });
  }
};
