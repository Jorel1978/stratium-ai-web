import React, { useState } from 'react';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { db, registrosCollection } from '../../services/firebase';

const RegistroManual = ({ usuarioActual, t, saldoActual = 0, guardarProductoEnCatalogo, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    tipo: 'egreso',
    concepto: '',
    valor: '',
    categoria: 'General',
    cantidad: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!usuarioActual?.uid) {
      onError?.('Debes iniciar sesión');
      return;
    }

    if (!formData.concepto.trim()) {
      onError?.('El concepto es obligatorio');
      return;
    }

    const valorNumerico = parseFloat(formData.valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      onError?.('Ingresa un valor válido');
      return;
    }

    // ✅ Validación robusta de saldo para egresos
    const saldoNumero = typeof saldoActual === 'number' ? saldoActual : 0;
    if (formData.tipo === 'egreso' && valorNumerico > saldoNumero) {
      onError?.(`Saldo insuficiente. Saldo actual: $${saldoNumero.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Guardar el movimiento
      const docRef = await addDoc(registrosCollection, {
        texto: `${formData.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}: ${formData.concepto}`,
        concepto: formData.concepto,
        valor: valorNumerico,
        tipo: formData.tipo,
        categoria: formData.categoria,
        emoji: formData.tipo === 'ingreso' ? '💰' : '💸',
        cantidad: parseInt(formData.cantidad) || 1,
        fecha: serverTimestamp(),
        userId: usuarioActual.uid,
        registroManual: true
      });

      // Guardar producto en catálogo si es compra (para auditoría de inventario)
      if (formData.tipo === 'egreso' && formData.categoria === 'Compra') {
        if (guardarProductoEnCatalogo) {
          await guardarProductoEnCatalogo(formData.concepto, usuarioActual.uid);
        }
      }

      onSuccess?.('Movimiento registrado exitosamente');

      // Resetear formulario
      setFormData({
        tipo: 'egreso',
        concepto: '',
        valor: '',
        categoria: 'General',
        cantidad: 1
      });

    } catch (err) {
      console.error('Error registrando movimiento:', err);
      
      // Mensajes de error amigables
      if (err.code === 'permission-denied') {
        onError?.('No tienes permisos para registrar movimientos');
      } else if (err.code === 'unavailable') {
        onError?.('Error de conexión. Intenta nuevamente');
      } else {
        onError?.(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#1e293b] rounded-2xl p-6 border border-blue-900/30">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        ✍️ {t?.registroManual || 'Registro Manual de Movimientos'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Tipo de movimiento */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tipo"
                value="ingreso"
                checked={formData.tipo === 'ingreso'}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-emerald-400">💰 Ingreso</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tipo"
                value="egreso"
                checked={formData.tipo === 'egreso'}
                onChange={handleChange}
                className="w-4 h-4 text-red-500 focus:ring-red-500"
              />
              <span className="text-red-400">💸 Egreso</span>
            </label>
          </div>

          {/* Categoría */}
          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="General">General</option>
            <option value="Venta">Venta</option>
            <option value="Compra">Compra</option>
            <option value="Gasto Fijo">Gasto Fijo</option>
            <option value="Servicio">Servicio</option>
            <option value="Inversión">Inversión</option>
          </select>

          {/* Concepto */}
          <input
            type="text"
            name="concepto"
            value={formData.concepto}
            onChange={handleChange}
            placeholder="Concepto *"
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />

          {/* Valor */}
          <input
            type="number"
            name="valor"
            value={formData.valor}
            onChange={handleChange}
            placeholder="Valor *"
            step="any"
            min="0.01"
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />

          {/* Cantidad (opcional) */}
          <input
            type="number"
            name="cantidad"
            value={formData.cantidad}
            onChange={handleChange}
            placeholder="Cantidad (opcional)"
            min="1"
            className="bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Saldo actual */}
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
          <span className="text-gray-400 text-sm">Saldo actual en caja:</span>
          <span className={`ml-2 font-bold ${saldoActual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${(typeof saldoActual === 'number' ? saldoActual : 0).toLocaleString()}
          </span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '⏳ Registrando...' : '📝 Registrar Movimiento'}
        </button>
      </form>
    </div>
  );
};

export default RegistroManual;

