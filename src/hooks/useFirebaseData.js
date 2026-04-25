import { useState, useEffect } from 'react';
import { db, registrosCollection, inventarioCollection, cuentasPorPagarCollection } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export function useFirebaseData(userId) {
  const [movimientos, setMovimientos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setMovimientos([]);
      setInventario([]);
      setCuentasPorPagar([]);
      setIsLoading(false);
      return;
    }

    const unsubscribes = [];

    // Movimientos
    const qMov = query(registrosCollection, where('userId', '==', userId), orderBy('fecha', 'desc'));
    unsubscribes.push(onSnapshot(qMov, 
      (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), fecha: doc.data().fecha?.toDate() || new Date() }));
        setMovimientos(data);
        setIsLoading(false);
      },
      (err) => setError(err.message)
    ));

    // Inventario
    const qInv = query(inventarioCollection, where('userId', '==', userId));
    unsubscribes.push(onSnapshot(qInv, 
      (snap) => setInventario(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    ));

    // Cuentas por pagar
    const qCxp = query(cuentasPorPagarCollection, where('userId', '==', userId));
    unsubscribes.push(onSnapshot(qCxp, 
      (snap) => setCuentasPorPagar(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    ));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [userId]);

  return { movimientos, inventario, cuentasPorPagar, isLoading, error, setMovimientos, setInventario };
}

