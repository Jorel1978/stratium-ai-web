// src/components/Notificaciones.jsx
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ✅ Función para escapar HTML y prevenir XSS
const escapeHtml = (texto) => {
  if (!texto) return '';
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
};

const Notificaciones = ({ usuarioActual }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [error, setError] = useState(null);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    // ✅ Validar que el usuario autenticado coincide con el prop
    if (usuarioActual?.uid && auth.currentUser?.uid === usuarioActual.uid) {
      cargarNotificaciones();
    }
  }, [usuarioActual?.uid, auth.currentUser?.uid]);

  const cargarNotificaciones = async () => {
    try {
      // ✅ Doble verificación de seguridad
      if (!auth.currentUser || auth.currentUser.uid !== usuarioActual?.uid) {
        return;
      }

      const notificacionesRef = collection(db, 'notificaciones');
      const q = query(
        notificacionesRef, 
        where('userId', '==', auth.currentUser.uid), // ✅ Usar UID seguro de auth
        where('leida', '==', false)
      );
      const snapshot = await getDocs(q);
      const notis = [];
      snapshot.forEach(docSnap => {
        // ✅ Validar estructura mínima del documento
        const data = docSnap.data();
        if (data.mensaje && typeof data.mensaje === 'string') {
          notis.push({ id: docSnap.id, ...data });
        }
      });
      setNotificaciones(notis);
      setError(null);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
      setError('No se pudieron cargar las notificaciones');
      // ✅ No exponer detalles del error al usuario
    }
  };

  const marcarComoLeida = async (id) => {
    try {
      // ✅ Verificar que el usuario sigue autenticado antes de escribir
      if (!auth.currentUser || auth.currentUser.uid !== usuarioActual?.uid) {
        return;
      }
      
      await updateDoc(doc(db, 'notificaciones', id), { leida: true });
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error marcando como leída:', err);
      // ✅ No romper la UI si falla
    }
  };

  // ✅ Manejar estado de error
  if (error) {
    return (
      <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
        <p className="text-red-200 text-sm">{error}</p>
      </div>
    );
  }

  if (notificaciones.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {notificaciones.map(noti => (
        <div key={noti.id} className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 flex justify-between items-center">
          <div>
            {/* ✅ Mensaje sanitizado para prevenir XSS */}
            <p className="text-yellow-200 text-sm" dangerouslySetInnerHTML={{ __html: escapeHtml(noti.mensaje) }} />
            <p className="text-gray-500 text-xs">
              {noti.fecha ? new Date(noti.fecha).toLocaleDateString() : ''}
            </p>
          </div>
          <button 
            onClick={() => marcarComoLeida(noti.id)} 
            className="text-gray-400 hover:text-white text-xl"
            aria-label="Marcar como leída"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default Notificaciones;

