import { prisma } from '../config/db.js';

export const getAll = async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sucursales.', details: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slogan, address, phone, email, rent, taxRate, defaultOpeningCash } = req.body;

    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        slogan: slogan !== undefined ? slogan.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        email: email !== undefined ? email.trim() : undefined,
        rent: rent !== undefined ? rent.trim() : undefined,
        taxRate: taxRate !== undefined ? Number(taxRate) : undefined,
        defaultOpeningCash: defaultOpeningCash !== undefined ? Number(defaultOpeningCash) : undefined
      }
    });

    res.json(updatedStore);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar sucursal.', details: error.message });
  }
};
