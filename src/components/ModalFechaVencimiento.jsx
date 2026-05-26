const ModalFechaVencimiento = ({ isOpen, onClose, onGuardar, onSaltar, producto }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-4">Fecha de Vencimiento</h3>
        <p className="text-gray-400 mb-4">¿El producto {producto} tiene fecha de vencimiento?</p>
        <div className="flex gap-3">
          <button onClick={onSaltar} className="flex-1 bg-slate-700 text-white py-2 rounded-lg">No tiene</button>
          <button onClick={onGuardar} className="flex-1 bg-cyan-500 text-white py-2 rounded-lg">Sí, tiene</button>
        </div>
      </div>
    </div>
  );
};

export default ModalFechaVencimiento;

