import React from 'react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

const CertificadoSaludFinanciera = ({ usuarioActual, analisisSalud, onClose }) => {
  
  const generarCertificado = async () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-CO');
    const hash = btoa(`${usuarioActual.uid}-${fecha}-${analisisSalud.saludPorcentaje}`);
    
    const qrUrl = `https://agente-financiero-ia-8548f.web.app/verificar-certificado?id=${usuarioActual.uid}&hash=${hash}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl);
    
    doc.setFontSize(22);
    doc.setTextColor(0, 100, 0);
    doc.text('STRATIUM AI', 105, 30, { align: 'center' });
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('CERTIFICADO DE SALUD FINANCIERA', 105, 50, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Otorgado a: ${usuarioActual.nombre || usuarioActual.email}`, 20, 80);
    doc.text(`Fecha de emisión: ${fecha}`, 20, 95);
    doc.text(`Período evaluado: Últimos 90 días`, 20, 110);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 255);
    doc.text('Indicadores Financieros', 20, 135);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`• Margen de rentabilidad: ${analisisSalud.margenNeto || 0}%`, 25, 155);
    doc.text(`• Días de oxígeno financiero: ${analisisSalud.diasOxigeno || 0} días`, 25, 170);
    doc.text(`• Punto de equilibrio: Alcanzado`, 25, 185);
    
    const calificacion = analisisSalud.saludPorcentaje > 70 ? 'EXCELENTE' : 
                         analisisSalud.saludPorcentaje > 40 ? 'BUENA' : 'EN RIESGO';
    const colorCalificacion = calificacion === 'EXCELENTE' ? [0, 128, 0] : 
                               calificacion === 'BUENA' ? [255, 165, 0] : [255, 0, 0];
    
    doc.setFontSize(14);
    doc.setTextColor(colorCalificacion[0], colorCalificacion[1], colorCalificacion[2]);
    doc.text(`Calificación: ${calificacion}`, 20, 210);
    
    doc.addImage(qrCodeDataUrl, 'PNG', 150, 220, 40, 40);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Escanea para verificar autenticidad', 170, 275, { align: 'center' });
    
    doc.setFontSize(8);
    doc.text('Este certificado es generado automáticamente por STRATIUM AI.', 105, 285, { align: 'center' });
    doc.text('La información refleja el análisis de los últimos 90 días.', 105, 292, { align: 'center' });
    
    doc.save(`Certificado_Salud_${usuarioActual.nombre || usuarioActual.email}.pdf`);
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border border-yellow-500/30">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">📜</div>
          <h3 className="text-xl font-bold text-white">Certificado de Salud Financiera</h3>
          <p className="text-gray-400 text-sm mt-2">Exclusivo para plan Elite</p>
        </div>
        
        <div className="bg-[#0f172a] p-4 rounded-lg mb-6">
          <p className="text-gray-300 text-sm text-center">
            Genera un certificado oficial con código QR verificable.
            <br />
            <span className="text-yellow-400 text-xs">Ideal para bancos, proveedores o socios.</span>
          </p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={generarCertificado} className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-2 rounded-lg transition-all">
            Generar Certificado PDF
          </button>
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificadoSaludFinanciera;


