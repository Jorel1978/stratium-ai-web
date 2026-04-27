import React from 'react';

const Header = ({ 
  usuarioActual, movimientos, isLoading, validationMessage, error, t,
  exportarACSV, generarReportePDF, generarReportePreview,
  seleccionarImagenFactura, handleFileUpload, subiendoArchivo, procesandoOCR,
  puedeAccederAFuncion, setMostrarLogsEliminaciones, mostrarLogsEliminaciones,
  generandoReporte,
  onChangeIdioma,    // ✅ Recibe la función
  handleLogout,      // ✅ Recibe el logout
  abrirModalPlanes   // ✅ Recibe la función para abrir planes
}) => {
  return (
    <header className="py-6 px-4 border-b border-blue-900/30 sticky top-0 bg-[#0f172a]/95 backdrop-blur-sm z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          {t.title}
        </h1>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Selector de idioma - FUNCIONAL */}
          <select
            onChange={(e) => onChangeIdioma(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇺🇸 English</option>
          </select>

          {/* Indicador de plan - CLICKEABLE para abrir modal */}
          <button
            onClick={abrirModalPlanes}
            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition-all ${
              usuarioActual?.plan === 'gratis' ? 'bg-gray-600/30 text-gray-400' :
              usuarioActual?.plan === 'pro' ? 'bg-cyan-500/20 text-cyan-400' :
              usuarioActual?.plan === 'business' ? 'bg-purple-500/20 text-purple-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {usuarioActual?.plan === 'gratis' ? 'Starter' :
             usuarioActual?.plan === 'pro' ? 'Pro' :
             usuarioActual?.plan === 'business' ? 'Business' : 'Elite'}
          </button>

          {/* Indicador de créditos OCR */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            (usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0) > 0 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            📷 {(usuarioActual?.creditosOCR || 0) - (usuarioActual?.creditosUsados || 0)}/{usuarioActual?.creditosOCR || 0} escaneos
          </div>

          {/* Email del usuario */}
          <div className="text-sm text-gray-400 hidden sm:block">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              {usuarioActual?.email}
            </span>
          </div>

          {/* Botón Reporte PDF */}
          <button
            onClick={generarReportePDF}
            disabled={generandoReporte || movimientos?.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
          >
            📊 {generandoReporte ? 'Generando...' : 'Reporte PDF'}
          </button>

          {/* Botón Exportar CSV */}
          <button
            onClick={exportarACSV}
            disabled={movimientos?.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30"
          >
            📎 Exportar CSV
          </button>

          {/* Botón Adjuntar */}
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer">
            📎 Adjuntar
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" disabled={subiendoArchivo} />
          </label>

          {/* Botón Escanear */}
          <button
            onClick={seleccionarImagenFactura}
            disabled={procesandoOCR}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
          >
            {procesandoOCR ? '⏳ Procesando...' : '📷 Escanear'}
          </button>

          {/* Logs (solo premium) */}
          {puedeAccederAFuncion('puedeVerLogs') && (
            <button
              onClick={() => setMostrarLogsEliminaciones(!mostrarLogsEliminaciones)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"
            >
              📋 Logs
            </button>
          )}

          {/* Cerrar Sesión */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
          >
            🚪 Cerrar
          </button>

          {/* Estado de conexión */}
          <div className="text-sm text-gray-400">
            <span className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              {isLoading ? 'Conectando...' : 'En línea'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

