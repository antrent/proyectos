const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Adjuntar el token JWT almacenado en sessionStorage al iniciar sesión
  const sessionUser = sessionStorage.getItem('becasual_current_user');
  if (sessionUser) {
    try {
      const { token } = JSON.parse(sessionUser);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error al decodificar token de la sesión:', e);
    }
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error en la petición: ${response.status}`);
    }

    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    // Si la conexión falla en entorno local, informar de forma explícita sin mezclar con producción
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      console.error(`❌ Error de conexión con el Backend (${API_URL}). Asegúrate de haber iniciado el servicio local con ./start-local-dev.sh`);
      throw new Error(`No se pudo conectar con el servidor backend en ${API_URL}. Por favor verifica que esté corriendo (ejecuta ./start-local-dev.sh).`);
    }
    throw error;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
