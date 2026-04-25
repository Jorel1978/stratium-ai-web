import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

const PantallaLogin = () => {
  const {
    t,
    idioma,
    moneda,
    errorAuth,
    validationMessage,
    handleLogin,
    handleRegistro,
    reenviarVerificacion,
    handleResetPassword,
    dispatch
  } = useApp();

  // Estados locales del formulario
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [nombreRegistro, setNombreRegistro] = useState('');
  const [planSeleccionado, setPlanSeleccionado] = useState('gratis');
  const [esRegistro, setEsRegistro] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onChangeIdioma = (lang) => {
    dispatch({ type: 'SET_IDIOMA', payload: lang });
  };

  const toggleModo = () => {
    setEsRegistro(!esRegistro);
    setAceptaTerminos(false);
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      if (esRegistro) {
        if (!aceptaTerminos) {
          throw new Error(t.aceptarTerminos || 'Debes aceptar los términos y condiciones');
        }
        if (passwordLogin !== confirmPassword) {
          throw new Error(t.passwordsDontMatch || 'Las contraseñas no coinciden');
        }
        if (passwordLogin.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        await handleRegistro(emailLogin, passwordLogin, nombreRegistro, planSeleccionado, aceptaTerminos);
        dispatch({ type: 'SET_VALIDATION', payload: `📧 Se ha enviado un correo de verificación a ${emailLogin}. Revisa tu bandeja de entrada o spam.` });
        setEmailLogin('');
        setPasswordLogin('');
        setConfirmPassword('');
        setNombreRegistro('');
        setAceptaTerminos(false);
        setEsRegistro(false);
      } else {
        await handleLogin(emailLogin, passwordLogin);
      }
    } catch (err) {
      console.error('Error:', err);
      
      // Mensajes de error amigables como en el original
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        dispatch({ type: 'SET_ERROR', payload: '❌ Contraseña incorrecta. Por favor, inténtalo de nuevo.' });
      } else if (err.code === 'auth/user-not-found') {
        dispatch({ type: 'SET_ERROR', payload: '❌ No existe una cuenta con este correo electrónico.' });
      } else if (err.code === 'auth/too-many-requests') {
        dispatch({ type: 'SET_ERROR', payload: '❌ Demasiados intentos fallidos. Intenta más tarde.' });
      } else if (err.code === 'auth/invalid-email') {
        dispatch({ type: 'SET_ERROR', payload: '❌ El correo electrónico no es válido.' });
      } else if (err.code === 'auth/user-disabled') {
        dispatch({ type: 'SET_ERROR', payload: '❌ Esta cuenta ha sido deshabilitada. Contacta a soporte.' });
      } else if (err.code === 'auth/email-already-in-use') {
        dispatch({ type: 'SET_ERROR', payload: '❌ Este correo electrónico ya está registrado.' });
      } else if (err.code === 'auth/weak-password') {
        dispatch({ type: 'SET_ERROR', payload: '❌ La contraseña es muy débil. Usa al menos 6 caracteres.' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onReenviarVerificacion = async () => {
    if (!emailLogin) {
      dispatch({ type: 'SET_ERROR', payload: 'Ingresa tu correo electrónico primero.' });
      return;
    }
    setIsLoading(true);
    try {
      await reenviarVerificacion(emailLogin, passwordLogin);
      dispatch({ type: 'SET_VALIDATION', payload: `📧 Nuevo correo de verificación enviado a ${emailLogin}. Válido por 30 minutos.` });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async () => {
    if (!emailLogin) {
      dispatch({ type: 'SET_ERROR', payload: 'Ingresa tu correo electrónico primero.' });
      return;
    }
    setIsLoading(true);
    try {
      await handleResetPassword(emailLogin);
      dispatch({ type: 'SET_VALIDATION', payload: `📧 Se ha enviado un correo de recuperación a ${emailLogin}. Revisa tu bandeja de entrada o spam.` });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl p-8 max-w-md w-full border border-blue-900/30 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            {t.title || 'STRATIUM AI'}
          </h1>
          <p className="text-gray-400 text-sm mt-2">{t.loginSubtitle || 'Tu asistente financiero con IA'}</p>
          {!moneda?.mostrarCOP && (
            <p className="text-xs text-cyan-400 mt-1">💱 Precios mostrados en USD</p>
          )}
        </div>

        {/* Selector de idioma */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-800/50 rounded-lg p-1 flex gap-1">
            <button
              type="button"
              onClick={() => onChangeIdioma('es')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                idioma === 'es' 
                  ? 'bg-cyan-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              🇪🇸 Español
            </button>
            <button
              type="button"
              onClick={() => onChangeIdioma('en')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                idioma === 'en' 
                  ? 'bg-cyan-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* Mensajes de error y éxito */}
        {errorAuth && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {errorAuth}
          </div>
        )}
        {validationMessage && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {validationMessage}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">{t.email || 'Correo electrónico'}</label>
            <input
              type="email"
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">{t.password || 'Contraseña'}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-20"
                required
                autoComplete={esRegistro ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-400 text-sm hover:text-cyan-300 px-2 py-1"
              >
                {showPassword ? (t.hidePassword || 'Ocultar') : (t.showPassword || 'Mostrar')}
              </button>
            </div>
          </div>

          {esRegistro && (
            <>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">{t.confirmPassword || 'Confirmar Contraseña'}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-20"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-400 text-sm hover:text-cyan-300 px-2 py-1"
                  >
                    {showConfirmPassword ? (t.hidePassword || 'Ocultar') : (t.showPassword || 'Mostrar')}
                  </button>
                </div>
                {confirmPassword && passwordLogin !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">{t.passwordsDontMatch || 'Las contraseñas no coinciden'}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">{t.nombre || 'Nombre (opcional)'}</label>
                <input
                  type="text"
                  value={nombreRegistro}
                  onChange={(e) => setNombreRegistro(e.target.value)}
                  className="w-full bg-[#0f172a] border border-blue-900/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  autoComplete="name"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">{t.plan || 'Plan'}</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanSeleccionado('gratis')}
                    className={`p-2 rounded-lg text-sm font-bold transition-all ${
                      planSeleccionado === 'gratis'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                    }`}
                  >
                    Starter
                    <span className="block text-[10px] opacity-80">
                      {moneda?.mostrarCOP ? '$0 / 15 días' : '$0 / 15 days'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanSeleccionado('pro')}
                    className={`p-2 rounded-lg text-sm font-bold transition-all ${
                      planSeleccionado === 'pro'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                    }`}
                  >
                    Pro
                    <span className="block text-[10px] opacity-80">
                      {moneda?.mostrarCOP ? '$79,900/mes' : '$29.99/mes'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanSeleccionado('business')}
                    className={`p-2 rounded-lg text-sm font-bold transition-all ${
                      planSeleccionado === 'business'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                    }`}
                  >
                    Business
                    <span className="block text-[10px] opacity-80">
                      {moneda?.mostrarCOP ? '$199,900/mes' : '$79.99/mes'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanSeleccionado('elite')}
                    className={`p-2 rounded-lg text-sm font-bold transition-all ${
                      planSeleccionado === 'elite'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                    }`}
                  >
                    Elite
                    <span className="block text-[10px] opacity-80">
                      {moneda?.mostrarCOP ? '$499,900/mes' : '$199.99/mes'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-blue-900/20 bg-[#0f172a] text-cyan-500 focus:ring-cyan-500 focus:ring-2"
                    required
                  />
                  <span className="text-gray-400 text-xs">
                    {t.aceptarTerminos || 'Acepto los Términos y Condiciones y autorizo el tratamiento de mis datos personales.'}
                    <a 
                      href={idioma === 'es' ? '/terminos.html' : '/terms.html'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline ml-1"
                    >
                      {t.terminosLink || 'Términos y Condiciones'}
                    </a>
                  </span>
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Cargando...' : (esRegistro ? (t.register || 'Registrarse') : (t.login || 'Iniciar Sesión'))}
          </button>
        </form>

        {!esRegistro && errorAuth && errorAuth.includes('verificado') && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onReenviarVerificacion}
              disabled={isLoading}
              className="text-cyan-400 text-xs hover:underline cursor-pointer disabled:opacity-50"
            >
              📧 Reenviar correo de verificación
            </button>
          </div>
        )}

        {!esRegistro && (
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={onResetPassword}
              disabled={isLoading}
              className="text-cyan-400 text-xs hover:underline cursor-pointer disabled:opacity-50"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={toggleModo}
            className="text-cyan-400 text-sm hover:underline cursor-pointer"
          >
            {esRegistro 
              ? `${t.hasAccount || '¿Ya tienes cuenta?'} ${t.switchToLogin || 'Inicia sesión aquí'}`
              : `${t.noAccount || '¿No tienes cuenta?'} ${t.switchToRegister || 'Regístrate aquí'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PantallaLogin;

