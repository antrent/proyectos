import { prisma } from '../config/db.js';

export const getAll = async (req, res) => {
  try {
    const { query } = req.query;
    const where = {};

    if (query) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { document: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } }
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes.', details: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id }
    });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cliente.', details: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, document, phone, email } = req.body;

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio.' });

    if (document) {
      const duplicate = await prisma.client.findUnique({
        where: { document: document.trim() }
      });
      if (duplicate) return res.status(400).json({ error: 'El documento de identidad ya está registrado.' });
    }

    const newClient = await prisma.client.create({
      data: {
        name: name.trim(),
        document: document ? document.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null
      }
    });
    res.status(201).json(newClient);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cliente.', details: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    delete data.id;

    const updated = await prisma.client.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente.', details: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({
      where: { id }
    });
    res.json({ message: 'Cliente eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente.', details: error.message });
  }
};
