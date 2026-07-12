import { api } from './api.js';

class AuthService {
  getCurrentUser() {
    try {
      const user = sessionStorage.getItem('becasual_current_user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }

  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    
    const sessionUser = {
      id: response.user.id,
      username: response.user.username,
      name: response.user.name,
      role: response.user.role,
      token: response.token // Almacenamos el JWT retornado por el API
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

  // Métodos de administración de usuarios (mockeados temporalmente hasta que se requiera la gestión de usuarios completa en BD)
  async addUser(currentUserRole, newUser) {
    if (currentUserRole !== 'admin') {
      throw new Error('Permiso denegado. Solo administradores pueden gestionar usuarios.');
    }
    // En una iteración posterior, esto consumirá POST /api/users
    console.log('addUser mock backend call:', newUser);
    return {
      id: `usr_${Date.now()}`,
      ...newUser
    };
  }

  async updateUser(currentUserRole, userId, updatedFields) {
    if (currentUserRole !== 'admin') {
      throw new Error('Permiso denegado. Solo administradores pueden gestionar usuarios.');
    }
    console.log('updateUser mock backend call:', userId, updatedFields);
    return {
      id: userId,
      ...updatedFields
    };
  }

  async deleteUser(currentUserRole, userId) {
    if (currentUserRole !== 'admin') {
      throw new Error('Permiso denegado. Solo administradores pueden gestionar usuarios.');
    }
    console.log('deleteUser mock backend call:', userId);
    return true;
  }
}

export const authService = new AuthService();
