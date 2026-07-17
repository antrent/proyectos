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

    // 1. Precargar catálogo de productos y crear mapas en memoria para evitar latencia de queries recurrentes
    const allProducts = await prisma.product.findMany();
    const productMapById = new Map(allProducts.map(p => [p.id, p]));
    const productMapBySku = new Map(allProducts.map(p => [p.sku.toLowerCase(), p]));
    const productMapByBarcode = new Map(allProducts.map(p => [p.barcode.toLowerCase(), p]));

    // 2. Obtener listado de IDs válidos de tiendas y empleados
    const validStores = await prisma.store.findMany({ select: { id: true } });
    const storeIds = validStores.map(s => s.id);
    const defaultStoreId = storeIds[0] || 'store_1';

    const validEmployees = await prisma.employee.findMany({ select: { id: true } });
    const employeeIds = validEmployees.map(e => e.id);

    // 3. Consultar cuáles de las ventas que se van a subir ya existen en la base de datos de GCP y traer sus detalles
    const existingSales = await prisma.sale.findMany({
      where: { id: { in: sales.map(s => s.id) } },
      include: { details: true }
    });
    const existingSalesMap = new Map(existingSales.map(s => [s.id, s.details || []]));

    const salesToInsert = [];
    const detailsToInsert = [];

    for (const sale of sales) {
      const hasExistingSale = existingSalesMap.has(sale.id);
      const existingDetails = existingSalesMap.get(sale.id) || [];

      if (hasExistingSale && existingDetails.length > 0) {
        continue; // Omitir facturas que ya existen y ya tienen detalles para evitar duplicación
      }

      if (!hasExistingSale) {
        const targetStoreId = storeIds.includes(sale.storeId) ? sale.storeId : defaultStoreId;
        const targetEmployeeId = employeeIds.includes(sale.sellerId || sale.employeeId)
          ? (sale.sellerId || sale.employeeId)
          : null;

        salesToInsert.push({
          id: sale.id,
          storeId: targetStoreId,
          invoiceNumber: sale.invoiceNumber,
          date: sale.date ? new Date(sale.date) : new Date(),
          clientName: sale.clientName || 'Cliente Final',
          employeeId: targetEmployeeId,
          paymentMethod: sale.paymentMethod || 'Efectivo',
          total: Number(sale.total) || 0
        });
      }

      if (existingDetails.length === 0 && Array.isArray(sale.items)) {
        for (const item of sale.items) {
          if (!item.productId) continue;

          // Limpiar asteriscos y resolver código de barras en el backend
          let cleanBarcode = String(item.barcode || '').replace(/\*/g, '').trim();
          if (!cleanBarcode && item.productId) {
            cleanBarcode = String(item.productId).replace('prod_generico_', '').replace(/\*/g, '').trim();
          }

          // Buscar en mapas de memoria
          let prod = productMapById.get(item.productId);
          if (!prod && cleanBarcode) {
            prod = productMapBySku.get(cleanBarcode.toLowerCase()) || productMapByBarcode.get(cleanBarcode.toLowerCase());
          }

          if (!prod) {
            // Si el producto no existe en GCP, lo creamos de forma síncrona en base de datos
            prod = await prisma.product.create({
              data: {
                id: item.productId,
                storeId: targetStoreId,
                barcode: cleanBarcode || `GEN_${Math.random().toString(36).slice(2, 8)}`,
                sku: cleanBarcode || `GEN_${Math.random().toString(36).slice(2, 8)}`,
                name: item.name || 'Producto Genérico',
                stock: 0,
                costPrice: Number(item.costPrice) || 0,
                sellPrice: Number(item.sellPrice || item.price) || 0,
                line: 'Genérico',
                category: 'Importación',
                gender: 'Unisex',
                style: 'Genérico',
                color: 'N/A',
                size: 'U',
                provider: 'Genérico'
              }
            });

            // Registrar en memoria para búsquedas siguientes del bloque
            productMapById.set(prod.id, prod);
            productMapBySku.set(prod.sku.toLowerCase(), prod);
            productMapByBarcode.set(prod.barcode.toLowerCase(), prod);
          }

          // Actualizar el productId
          item.productId = prod.id;

          detailsToInsert.push({
            id: `det_${Math.random().toString(36).slice(2, 10)}`,
            saleId: sale.id,
            productId: item.productId,
            quantity: Number(item.quantity) || 1,
            price: Number(item.sellPrice || item.price) || (prod ? prod.sellPrice : 0),
            subtotal: Number(item.subtotal) || (Number(item.quantity) * (prod ? prod.sellPrice : 0))
          });
        }
      }
    }

    // 4. Inserción masiva optimizada
    if (salesToInsert.length > 0) {
      await prisma.sale.createMany({
        data: salesToInsert,
        skipDuplicates: true
      });
    }

    if (detailsToInsert.length > 0) {
      await prisma.saleDetail.createMany({
        data: detailsToInsert,
        skipDuplicates: true
      });

      // 5. Recalcular y actualizar stock de productos afectados
      const affectedProductIds = [...new Set(detailsToInsert.map(d => d.productId))];
      
      for (const pid of affectedProductIds) {
        const prod = productMapById.get(pid);
        if (!prod) continue;

        // Sumar compras de este SKU en base de datos
        const boughtAgg = await prisma.purchase.aggregate({
          where: { sku: prod.sku },
          _sum: { quantity: true }
        });
        const totalBought = boughtAgg._sum.quantity || 0;

        // Sumar ventas de este productId en base de datos
        const soldAgg = await prisma.saleDetail.aggregate({
          where: { productId: pid },
          _sum: { quantity: true }
        });
        const totalSold = soldAgg._sum.quantity || 0;

        const netStock = Math.max(0, totalBought - totalSold);

        await prisma.product.update({
          where: { id: pid },
          data: { stock: netStock }
        });
      }
    }

    res.json({ message: 'Ventas masivas importadas correctamente en la base de datos y stocks recalculados.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al importar ventas masivas.', details: error.message });
  }
};
