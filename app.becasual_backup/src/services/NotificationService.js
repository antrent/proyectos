/**
 * NotificationService.js
 * 
 * Servicio de notificaciones para separaciones (Layaways).
 * Soporta WhatsApp (vía link wa.me o API configurable) y Email (vía mailto o SMTP externo).
 *
 * MODO DE OPERACIÓN:
 * - 'whatsapp_link': Abre un link wa.me en nueva pestaña (no requiere API, pero es manual).
 * - 'email_mailto': Abre el cliente de correo predeterminado del navegador (mailto:).
 * - 'log_only': Solo registra en consola. Útil para desarrollo o pruebas.
 *
 * Para integración real con APIs (Twilio, SendGrid, etc.) se deben configurar
 * las credenciales en los ajustes de notificaciones de la aplicación.
 */

import { storageRepository } from './StorageRepository';

const DEFAULT_CONFIG = {
  enabled: true,
  whatsappMode: 'whatsapp_link', // 'whatsapp_link' | 'log_only'
  emailMode: 'email_mailto',     // 'email_mailto' | 'log_only'
  storeName: 'tienda.Be casual',
  storePhone: '3115929346',
  // Plantillas de mensajes personalizables
  templates: {
    layaway_created: `¡Hola {{clientName}}! 🛍️\n\nTu separación en {{storeName}} ha sido registrada con éxito.\n\n📋 *N° Separación:* {{layawayNumber}}\n💰 *Total:* {{total}}\n✅ *Abono inicial:* {{paid}}\n⏳ *Saldo pendiente:* {{balance}}\n\n¡Gracias por tu preferencia! Cualquier duda, contáctanos al {{storePhone}}.`,
    payment_registered: `¡Hola {{clientName}}! 💵\n\nHemos recibido tu abono en {{storeName}}.\n\n📋 *N° Separación:* {{layawayNumber}}\n💵 *Abono recibido:* {{amount}}\n⏳ *Saldo pendiente:* {{balance}}\n\n{{#if isFullyPaid}}¡Tu separación está totalmente pagada! Puedes recoger tus productos cuando quieras. 🎉{{/if}}\n\nGracias por tu pago. ¡Te esperamos!`,
    product_ready: `¡Hola {{clientName}}! 📦\n\n¡Buenas noticias! Tu producto en {{storeName}} ya está disponible y listo para entrega.\n\n📋 *N° Separación:* {{layawayNumber}}\n🛍️ *Productos:* {{itemNames}}\n\nPuedes pasar a recogerlos en nuestra tienda. ¡Te esperamos con los brazos abiertos! 😊\n\nCualquier inquietud: {{storePhone}}`
  }
};

class NotificationService {
  /**
   * Obtiene la configuración de notificaciones guardada o usa los valores por defecto.
   */
  getConfig() {
    try {
      const stored = localStorage.getItem('becasual_notification_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all keys exist
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          templates: { ...DEFAULT_CONFIG.templates, ...(parsed.templates || {}) }
        };
      }
    } catch (e) {
      console.warn('[NotificationService] Error leyendo config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Guarda la configuración de notificaciones en localStorage.
   */
  saveConfig(config) {
    try {
      localStorage.setItem('becasual_notification_config', JSON.stringify(config));
      return true;
    } catch (e) {
      console.error('[NotificationService] Error guardando config:', e);
      return false;
    }
  }

  /**
   * Obtiene el historial de notificaciones enviadas.
   */
  getLog() {
    try {
      const data = localStorage.getItem('becasual_notification_log');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Registra una notificación en el historial local.
   */
  _addToLog(entry) {
    try {
      const log = this.getLog();
      log.unshift({ ...entry, timestamp: new Date().toISOString(), id: `notif_${Date.now()}` });
      // Keep only last 200 entries
      if (log.length > 200) log.splice(200);
      localStorage.setItem('becasual_notification_log', JSON.stringify(log));
    } catch (e) {
      console.warn('[NotificationService] Error al guardar log:', e);
    }
  }

  /**
   * Remplaza placeholders {{key}} en una plantilla con los valores dados.
   */
  _renderTemplate(template, vars) {
    let result = template;
    // Handle {{#if isFullyPaid}}...{{/if}} blocks
    if (vars.isFullyPaid) {
      result = result.replace(/\{\{#if isFullyPaid\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
    } else {
      result = result.replace(/\{\{#if isFullyPaid\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }
    // Replace all simple {{key}} placeholders
    Object.entries(vars).forEach(([key, val]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val !== undefined && val !== null ? String(val) : '');
    });
    return result.trim();
  }

  /**
   * Formatea un número como moneda COP.
   */
  _formatCOP(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(amount || 0);
  }

  /**
   * Envía una notificación de WhatsApp.
   * @param {string} phone - Número de teléfono del cliente (sin +57, o con código)
   * @param {string} message - Mensaje a enviar
   * @param {string} mode - 'whatsapp_link' | 'log_only'
   */
  _sendWhatsApp(phone, message, mode = 'whatsapp_link') {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      console.warn('[NotificationService] No se envió WhatsApp: teléfono vacío.');
      return { success: false, reason: 'no_phone' };
    }

    // Add Colombia country code if missing
    const intlPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const encodedMsg = encodeURIComponent(message);

    if (mode === 'whatsapp_link') {
      const url = `https://wa.me/${intlPhone}?text=${encodedMsg}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return { success: true, mode: 'whatsapp_link', url };
    }

    // log_only mode
    console.log(`[NotificationService - WhatsApp] Para: +${intlPhone}\nMensaje:\n${message}`);
    return { success: true, mode: 'log_only' };
  }

  /**
   * Envía una notificación de Email.
   * @param {string} email - Dirección de correo del cliente
   * @param {string} subject - Asunto del correo
   * @param {string} body - Cuerpo del correo
   * @param {string} mode - 'email_mailto' | 'log_only'
   */
  _sendEmail(email, subject, body, mode = 'email_mailto') {
    if (!email || !email.includes('@')) {
      console.warn('[NotificationService] No se envió Email: dirección inválida o vacía.');
      return { success: false, reason: 'no_email' };
    }

    if (mode === 'email_mailto') {
      const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
      return { success: true, mode: 'email_mailto' };
    }

    // log_only mode
    console.log(`[NotificationService - Email] Para: ${email}\nAsunto: ${subject}\nCuerpo:\n${body}`);
    return { success: true, mode: 'log_only' };
  }

  /**
   * Notificación: Separación creada (nuevo separado + abono inicial).
   * @param {object} layaway - El objeto de separación recién creado
   */
  notifyLayawayCreated(layaway) {
    const config = this.getConfig();
    if (!config.enabled) return;

    const storeConfig = storageRepository.getConfig();
    const storeName = storeConfig.name || config.storeName;
    const storePhone = storeConfig.phone || config.storePhone;

    const vars = {
      clientName: layaway.clientName,
      storeName,
      storePhone,
      layawayNumber: layaway.layawayNumber,
      total: this._formatCOP(layaway.total),
      paid: this._formatCOP(layaway.paid),
      balance: this._formatCOP(layaway.balance),
    };

    const message = this._renderTemplate(config.templates.layaway_created, vars);
    const emailSubject = `Tu separación ${layaway.layawayNumber} en ${storeName}`;

    const results = { layawayId: layaway.id, type: 'layaway_created', channels: [] };

    // WhatsApp
    if (layaway.clientPhone) {
      const wa = this._sendWhatsApp(layaway.clientPhone, message, config.whatsappMode);
      results.channels.push({ channel: 'whatsapp', phone: layaway.clientPhone, ...wa });
    }

    // Email
    if (layaway.clientEmail) {
      const em = this._sendEmail(layaway.clientEmail, emailSubject, message, config.emailMode);
      results.channels.push({ channel: 'email', email: layaway.clientEmail, ...em });
    }

    this._addToLog(results);
    return results;
  }

  /**
   * Notificación: Abono registrado en separación existente.
   * @param {object} layaway - El objeto de separación actualizado
   * @param {number} amount - El monto del abono recién registrado
   */
  notifyPaymentRegistered(layaway, amount) {
    const config = this.getConfig();
    if (!config.enabled) return;

    const storeConfig = storageRepository.getConfig();
    const storeName = storeConfig.name || config.storeName;
    const storePhone = storeConfig.phone || config.storePhone;

    const vars = {
      clientName: layaway.clientName,
      storeName,
      storePhone,
      layawayNumber: layaway.layawayNumber,
      amount: this._formatCOP(amount),
      balance: this._formatCOP(layaway.balance),
      isFullyPaid: layaway.balance === 0,
    };

    const message = this._renderTemplate(config.templates.payment_registered, vars);
    const emailSubject = `Abono recibido — Separación ${layaway.layawayNumber} en ${storeName}`;

    const results = { layawayId: layaway.id, type: 'payment_registered', channels: [] };

    if (layaway.clientPhone) {
      const wa = this._sendWhatsApp(layaway.clientPhone, message, config.whatsappMode);
      results.channels.push({ channel: 'whatsapp', phone: layaway.clientPhone, ...wa });
    }

    if (layaway.clientEmail) {
      const em = this._sendEmail(layaway.clientEmail, emailSubject, message, config.emailMode);
      results.channels.push({ channel: 'email', email: layaway.clientEmail, ...em });
    }

    this._addToLog(results);
    return results;
  }

  /**
   * Notificación: Producto listo para entrega en tienda.
   * @param {object} layaway - El objeto de separación
   */
  notifyProductReady(layaway) {
    const config = this.getConfig();
    if (!config.enabled) return;

    const storeConfig = storageRepository.getConfig();
    const storeName = storeConfig.name || config.storeName;
    const storePhone = storeConfig.phone || config.storePhone;

    const itemNames = (layaway.items || []).map(i => `• ${i.name}${i.quantity > 1 ? ` (x${i.quantity})` : ''}`).join('\n');

    const vars = {
      clientName: layaway.clientName,
      storeName,
      storePhone,
      layawayNumber: layaway.layawayNumber,
      itemNames,
    };

    const message = this._renderTemplate(config.templates.product_ready, vars);
    const emailSubject = `¡Tu pedido está listo! — Separación ${layaway.layawayNumber} en ${storeName}`;

    const results = { layawayId: layaway.id, type: 'product_ready', channels: [] };

    if (layaway.clientPhone) {
      const wa = this._sendWhatsApp(layaway.clientPhone, message, config.whatsappMode);
      results.channels.push({ channel: 'whatsapp', phone: layaway.clientPhone, ...wa });
    }

    if (layaway.clientEmail) {
      const em = this._sendEmail(layaway.clientEmail, emailSubject, message, config.emailMode);
      results.channels.push({ channel: 'email', email: layaway.clientEmail, ...em });
    }

    this._addToLog(results);
    return results;
  }
}

export const notificationService = new NotificationService();
