import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';

const AdminPanel = ({ usuarioActual }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (usuarioActual?.rol !== 'admin') return;
    
    const cargarUsuarios = async () => {
      const q = query(collection(db, 'usuarios'), orderBy('fechaRegistro', 'desc'));
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() }));
      setUsuarios(data);
      setLoading(false);
    };
    cargarUsuarios();
  }, [usuarioActual]);

  if (usuarioActual?.rol !== 'admin') return null;

  const cambiarPlan = async (userId, nuevoPlan) => {
    const planCreditos = { gratis: 3, pro: 30, business: 100, elite: 500 };
    await updateDoc(doc(db, 'usuarios', userId), {
      plan: nuevoPlan,
      creditosOCR: planCreditos[nuevoPlan]
    });
    // Recargar lista
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 mb-8">
      <h2 className="text-xl font-bold text-white mb-4">Panel de Administración</h2>
      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Plan</th>
                <th className="text-left py-2">Escaneos</th>
                <th className="text-left py-2">Registro</th>
                <th className="text-left py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(user => (
                <tr key={user.id} className="border-b border-gray-800">
                  <td className="py-2">{user.email}</td>
                  <td className="py-2 capitalize">{user.plan}</td>
                  <td className="py-2">{(user.creditosOCR || 0) - (user.creditosUsados || 0)}/{user.creditosOCR || 0}</td>
                  <td className="py-2">{user.fechaRegistro?.toDate().toLocaleDateString() || 'N/A'}</td>
                  <td className="py-2">
                    <select onChange={(e) => cambiarPlan(user.id, e.target.value)} defaultValue={user.plan}>
                      <option value="gratis">Gratis</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                      <option value="elite">Elite</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

