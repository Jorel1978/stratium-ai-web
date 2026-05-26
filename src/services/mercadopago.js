// src/services/mercadopago.js
const PUBLIC_KEY = 'TEST-f8557a31-daf6-40f9-b9ef-95990878ee8e';

// Configuración de planes con precios en COP y USD
const planesConfig = {
  starter: {
    title: 'STRATIUM GLOBAL AI - Plan Starter',
    priceCOP: 29900,
    priceUSD: 9.99,
    description: '10 escaneos/mes, ingreso manual, dashboard básico, alertas de riesgo'
  },
  pro: {
    title: 'STRATIUM GLOBAL AI - Plan Pro',
    priceCOP: 79900,
    priceUSD: 29.99,
    description: '30 escaneos/mes, reportes PDF, exportar CSV, comparativas, punto de equilibrio, rotación de inventario'
  },
  business: {
    title: 'STRATIUM GLOBAL AI - Plan Business',
    priceCOP: 199900,
    priceUSD: 79.99,
    description: '120 escaneos/mes, auditoría forense de gastos, detección de sobrecostos, 3 usuarios'
  },
  elite: {
    title: 'STRATIUM GLOBAL AI - Plan Elite',
    priceCOP: 499900,
    priceUSD: 199.99,
    description: '300 escaneos/mes, radar de quiebra, alertas WhatsApp, certificado QR, 10 usuarios'
  }
};

// Función para crear preferencia de suscripción
export const crearPreferenciaSuscripcion = async (plan, userEmail, userId, moneda) => {
  const planData = planesConfig[plan];
  if (!planData) throw new Error('Plan no válido');
  
  const esCOP = moneda?.mostrarCOP !== undefined ? moneda.mostrarCOP : true;
  const price = esCOP ? planData.priceCOP : planData.priceUSD;
  const currency = esCOP ? 'COP' : 'USD';
  const title = `${planData.title} - ${esCOP ? `$${price.toLocaleString()} COP` : `$${price} USD`}/mes`;

  const response = await fetch('/api/crear-preferencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: plan,
      title: title,
      price: price,
      currency: currency,
      description: planData.description,
      userEmail: userEmail,
      userId: userId
    })
  });

  const data = await response.json();
  return data.init_point;
};

// Función para verificar el estado de un pago
export const verificarPago = async (paymentId) => {
  const response = await fetch(`/api/verificar-pago?payment_id=${paymentId}`);
  const data = await response.json();
  return data;
};

// Función para crear preferencia de paquete de escaneos
export const crearPreferenciaPaquete = async (paquete, userEmail, userId, moneda) => {
  const paquetesConfig = {
    basico: { escaneos: 10, priceCOP: 19900, priceUSD: 9.99, title: 'Paquete Básico' },
    frecuente: { escaneos: 30, priceCOP: 49900, priceUSD: 19.99, title: 'Paquete Frecuente' },
    profesional: { escaneos: 100, priceCOP: 99900, priceUSD: 39.99, title: 'Paquete Profesional' },
    corporativo: { escaneos: 300, priceCOP: 199900, priceUSD: 79.99, title: 'Paquete Corporativo' }
  };
  
  const paqueteData = paquetesConfig[paquete];
  if (!paqueteData) throw new Error('Paquete no válido');
  
  const esCOP = moneda?.mostrarCOP !== undefined ? moneda.mostrarCOP : true;
  const price = esCOP ? paqueteData.priceCOP : paqueteData.priceUSD;
  const currency = esCOP ? 'COP' : 'USD';
  const title = `${paqueteData.title} - ${paqueteData.escaneos} escaneos adicionales`;

  const response = await fetch('/api/crear-preferencia-paquete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paquete: paquete,
      title: title,
      price: price,
      currency: currency,
      escaneos: paqueteData.escaneos,
      userEmail: userEmail,
      userId: userId
    })
  });

  const data = await response.json();
  return data.init_point;
};

export { PUBLIC_KEY };

