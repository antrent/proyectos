import { prisma } from '../config/db.js';

export const getAll = async (req, res) => {
  try {
    const { storeId, query, line, category, provider, stockStatus } = req.query;

    const where = {};

    // Sede filter
    if (storeId && storeId !== 'all') {
      where.storeId = storeId;
    }

    // Line/Category/Provider filters
    if (line) where.line = line;
    if (category) where.category = category;
    if (provider) where.provider = provider;

    // General text query search
    if (query) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } }
      ];
    }

    let products = await prisma.product.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    // Stock status filters
    if (stockStatus) {
      if (stockStatus === 'low') {
        products = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
      } else if (stockStatus === 'out') {
        products = products.filter(p => p.stock === 0);
      } else if (stockStatus === 'in') {
        products = products.filter(p => p.stock > p.minStock);
      }
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos.', details: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener producto.', details: error.message });
  }
};

export const getByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const { storeId } = req.query;

    const bc = barcode.trim();
    const where = {
      OR: [
        { barcode: bc },
        { sku: bc }
      ]
    };

    if (storeId && storeId !== 'all') {
      where.storeId = storeId;
    }

    const product = await prisma.product.findFirst({
      where
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado por código de barras o SKU.' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar producto.', details: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { id, storeId, barcode, sku, name, stock, costPrice, sellPrice, line, category, gender, style, color, size, provider, minStock } = req.body;

    const store_id = storeId || 'store_1';

    // Validar duplicado de código de barras en la misma sede
    const barcodeTrimmed = (barcode || '').trim();
    if (barcodeTrimmed) {
      const duplicate = await prisma.product.findFirst({
        where: {
          barcode: barcodeTrimmed,
          storeId: store_id
        }
      });

      if (duplicate) {
        return res.status(400).json({ error: 'El código de barras ya existe en el inventario de esta sede.' });
      }
    }

    // Auto-generar barcode y sku si no vienen
    const finalBarcode = barcodeTrimmed ? barcodeTrimmed : `BE-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalSku = sku ? sku.trim() : `SKU-${Date.now().toString().slice(-6)}`;

    const newProduct = await prisma.product.create({
      data: {
        id: id || undefined,
        storeId: store_id,
        barcode: finalBarcode,
        sku: finalSku,
        name: name.trim(),
        stock: Number(stock) || 0,
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        line: line || '-',
        category: category || '-',
        gender: gender || '-',
        style: style || '-',
        color: color || '-',
        size: size || '-',
        provider: provider || '-',
        minStock: Number(minStock) || 5
      }
    });

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto.', details: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Eliminar campos no modificables directamente si los hay
    delete data.id;

    // Convertir tipos
    if (data.stock !== undefined) data.stock = Number(data.stock);
    if (data.costPrice !== undefined) data.costPrice = Number(data.costPrice);
    if (data.sellPrice !== undefined) data.sellPrice = Number(data.sellPrice);
    if (data.minStock !== undefined) data.minStock = Number(data.minStock);

    const updatedProduct = await prisma.product.update({
      where: { id },
      data
    });

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto.', details: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id }
    });

    res.json({ message: 'Producto eliminado del inventario correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto.', details: error.message });
  }
};

export const updateGlobalMinStock = async (req, res) => {
  try {
    const { minStock } = req.body;
    if (minStock === undefined) {
      return res.status(400).json({ error: 'El parámetro minStock es obligatorio.' });
    }

    await prisma.product.updateMany({
      data: { minStock: Number(minStock) || 0 }
    });

    res.json({ message: 'Stock mínimo global actualizado correctamente en todos los productos.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el stock mínimo global.', details: error.message });
  }
};
