// src/services/mercadopago.js
const PUBLIC_KEY = 'TEST-f8557a31-daf6-40f9-b9ef-95990878ee8e';

// Función para crear preferencia de suscripción
export const crearPreferenciaSuscripcion = async (plan, userEmail, userId) => {
  const planData = {
    pro: { 
      title: 'STRATIUM AI - Plan 1 (Pro)',
      price: 59900,
      description: '30 escaneos/mes, reportes PDF, comparativas'
    },
    business: { 
      title: 'STRATIUM AI - Plan 2 (Business)',
      price: 99900,
      description: '100 escaneos/mes, auditoría completa, reportes PDF'
    },
    elite: { 
      title: 'STRATIUM AI - Plan 3 (Elite)',
      price: 199900,
      description: '500 escaneos/mes, WhatsApp, soporte prioritario'
    }
  };

  const selectedPlan = planData[plan];
  if (!selectedPlan) throw new Error('Plan no válido');

  const response = await fetch('/api/crear-preferencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: plan,
      title: selectedPlan.title,
      price: selectedPlan.price,
      description: selectedPlan.description,
      userEmail: userEmail,
      userId: userId
    })
  });

  const data = await response.json();
  return data.init_point; // URL de checkout
};

// Función para verificar el estado de un pago
export const verificarPago = async (paymentId) => {
  const response = await fetch(`/api/verificar-pago?payment_id=${paymentId}`);
  const data = await response.json();
  return data;
};

