import { prisma } from '../config/db.js';

export const getAll = async (req, res) => {
  try {
    const { storeId, startDate, endDate, paymentMethod, clientId, employeeId } = req.query;
    const where = {};

    if (storeId && storeId !== 'all') where.storeId = storeId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (clientId) where.clientId = clientId;
    if (employeeId) where.employeeId = employeeId;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        details: {
          include: {
            product: true
          }
        },
        client: true,
        employee: true
      },
      orderBy: { date: 'desc' }
    });

    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas.', details: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { storeId, invoiceNumber, clientName, clientDocument, clientId, employeeId, paymentMethod, total, items } = req.body;

    const store_id = storeId || 'store_1';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe contener al menos un producto.' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'El método de pago es obligatorio.' });
    }

    // Ejecutar venta e inventario en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolver cliente
      let finalClientId = clientId || null;
      if (!finalClientId && clientName) {
        // Buscar cliente por documento
        let client = null;
        if (clientDocument) {
          client = await tx.client.findUnique({
            where: { document: String(clientDocument).trim() }
          });
        }

        if (!client) {
          // Crear cliente nuevo si no existe
          client = await tx.client.create({
            data: {
              name: clientName.trim(),
              document: clientDocument ? String(clientDocument).trim() : null
            }
          });
        }
        finalClientId = client.id;
      }

      // 2. Crear la Venta principal
      const newSale = await tx.sale.create({
        data: {
          storeId: store_id,
          invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : null,
          clientName: clientName ? clientName.trim() : null,
          clientId: finalClientId,
          employeeId: employeeId || null,
          paymentMethod,
          total: Number(total) || 0
        }
      });

      // 3. Procesar ítems, restar inventario y crear detalles
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado.`);
        }

        // Restamos el stock
        const newStock = product.stock - Number(item.quantity);

        await tx.product.update({
          where: { id: product.id },
          data: { stock: newStock }
        });

        // Crear detalle de venta
        await tx.saleDetail.create({
          data: {
            saleId: newSale.id,
            productId: product.id,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || product.sellPrice,
            subtotal: Number(item.subtotal) || (Number(item.quantity) * product.sellPrice)
          }
        });
      }

      // Retornar la factura completa incluyendo detalles
      return tx.sale.findUnique({
        where: { id: newSale.id },
        include: {
          details: {
            include: {
              product: true
            }
          },
          client: true,
          employee: true
        }
      });
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar venta y actualizar stock.', details: error.message });
  }
};

export const createBulk = async (req, res) => {
  try {
    const { sales } = req.body;
    if (!Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ error: 'Se requiere un arreglo de ventas válido.' });
    }

    await prisma.$transaction(async (tx) => {
      for (const sale of sales) {
        const existing = await tx.sale.findUnique({
          where: { id: sale.id }
        });
        if (existing) continue;

        const newSale = await tx.sale.create({
          data: {
            id: sale.id,
            storeId: sale.storeId || 'store_1',
            invoiceNumber: sale.invoiceNumber,
            date: sale.date ? new Date(sale.date) : new Date(),
            subtotal: Number(sale.subtotal) || 0,
            tax: Number(sale.tax) || 0,
            total: Number(sale.total) || 0,
            discount: Number(sale.discount) || 0,
            cost: Number(sale.cost) || 0,
            profit: Number(sale.profit) || 0,
            paymentMethod: sale.paymentMethod || 'Efectivo',
            clientName: sale.clientName || 'Cliente Final',
            clientDocument: sale.clientDocument || null,
            employeeId: sale.sellerId || 'emp_1'
          }
        });

        if (Array.isArray(sale.items)) {
          for (const item of sale.items) {
            const prod = await tx.product.findUnique({
              where: { id: item.productId }
            });
            if (!prod) continue;

            await tx.saleDetail.create({
              data: {
                saleId: newSale.id,
                productId: item.productId,
                quantity: Number(item.quantity) || 1,
                price: Number(item.sellPrice || item.price) || prod.sellPrice,
                subtotal: Number(item.subtotal) || (Number(item.quantity) * prod.sellPrice)
              }
            });
          }
        }
      }
    });

    res.json({ message: 'Ventas masivas importadas correctamente en la base de datos.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al importar ventas masivas.', details: error.message });
  }
};
