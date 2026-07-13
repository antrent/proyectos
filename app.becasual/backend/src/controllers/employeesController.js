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
        { role: { contains: q, mode: 'insensitive' } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empleados.', details: error.message });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id }
    });
    if (!employee) return res.status(404).json({ error: 'Empleado no encontrado.' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empleado.', details: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, document, role, phone, email, salary, startDate, status } = req.body;

    if (!name || !document || !role) {
      return res.status(400).json({ error: 'Nombre, documento y cargo son obligatorios.' });
    }

    const duplicate = await prisma.employee.findUnique({
      where: { document: document.trim() }
    });
    if (duplicate) return res.status(400).json({ error: 'El documento de identidad ya está registrado.' });

    const newEmployee = await prisma.employee.create({
      data: {
        name: name.trim(),
        document: document.trim(),
        role: role.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        salary: Number(salary) || 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        status: status || 'activo'
      }
    });
    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear empleado.', details: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    delete data.id;

    if (data.salary !== undefined) data.salary = Number(data.salary);
    if (data.startDate !== undefined) data.startDate = new Date(data.startDate);

    const updated = await prisma.employee.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar empleado.', details: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.employee.delete({
      where: { id }
    });
    res.json({ message: 'Empleado eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar empleado.', details: error.message });
  }
};
