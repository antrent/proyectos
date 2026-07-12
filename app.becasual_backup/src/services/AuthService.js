import { storageRepository } from './StorageRepository';

class AuthService {
  getCurrentUser() {
    try {
      const user = sessionStorage.getItem('becasual_current_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }

  login(username, password) {
    const users = storageRepository.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password);
    
    if (!user) {
      throw new Error('Usuario o contraseña incorrectos.');
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };

    sessionStorage.setItem('becasual_current_user', JSON.stringify(sessionUser));
    return sessionUser;
  }

  logout() {
    sessionStorage.removeItem('becasual_current_user');
  }

  // RBAC (Role-Based Access Control) checker
  hasPermission(role, moduleName) {
    if (!role) return false;
    if (role === 'admin') return true; // Admins have access to everything

    const permissions = {
      vendedor: ['sales', 'inventory_view'],
      comprador: ['purchases', 'inventory_view', 'inventory_edit']
    };

    const userPermissions = permissions[role] || [];
    return userPermissions.includes(moduleName);
  }

  // Manage users (Admin only)
  addUser(currentUserRole, newUser) {
    if (currentUserRole !== 'admin') {
      throw new Error('Permiso denegado. Solo administradores pueden gestionar usuarios.');
    }

    const users = storageRepository.getUsers();
    
    // Check if username exists
    if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase().trim())) {
      throw new Error('El nombre de usuario ya existe.');
    }

    const createdUser = {
      id: `usr_${Date.now()}`,
      username: newUser.username.trim(),
      password: newUser.password,
      name: newUser.name.trim(),
      role: newUser.role
    };

    users.push(createdUser);
    storageRepository.saveUsers(users);
    return createdUser;
  }

  updateUser(currentUserRole, userId, updatedFields) {
    if (currentUserRole !== 'admin') {
      throw new Error('Permiso denegado. Solo administradores pueden gestionar usuarios.');
    }

    const users = storageRepository.getUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
      throw new Error('Usuario no encontrado.');
    }

    // Check username duplication
    if (updatedFields.username) {
      const exists = users.some(u => u.id !== userId && u.username.toLowerCase() === updatedFields.username.toLowerCase().trim());
      if (exists) {
        throw new Error('El nombre de usuario ya está en uso.');
      }
    }

    users[index] = {
      ...users[index],
      ...updatedFields,
      // Keep ID and username if not changed
      id: users[index].id,
      username: updatedFields.username ? updatedFields.username.trim() : users[index].username
    };

    storageRepository.saveUsers(users);
    return users[index];
  }

  deleteUser(currentUserRole, userId) {
    if (currentUserRole !== 'admin') {
      throw new Error('Permiso denegado. Solo administradores pueden gestionar usuarios.');
    }

    const users = storageRepository.getUsers();
    const userToDelete = users.find(u => u.id === userId);

    if (!userToDelete) {
      throw new Error('Usuario no encontrado.');
    }

    if (userToDelete.username === 'admin') {
      throw new Error('No se puede eliminar el usuario administrador principal.');
    }

    const updatedUsers = users.filter(u => u.id !== userId);
    storageRepository.saveUsers(updatedUsers);
    return true;
  }
}

export const authService = new AuthService();
