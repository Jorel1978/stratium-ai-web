// src/components/OnboardingWizard.jsx
import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

const OnboardingWizard = ({ onComplete, onSkip }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [respuesta, setRespuesta] = useState(null);

  const handleRespuesta = (value) => {
    setRespuesta(value);
    setStep(3);
    onComplete({ origen: value });
  };

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {t('onboardingWelcome')}
          </h2>
          <p className="text-gray-400 mb-6">
            {t('onboardingQuestion')}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => handleRespuesta('notebook')}
              className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-lg text-left text-white transition"
            >
              📒 {t('notebook')}
            </button>
            <button
              onClick={() => handleRespuesta('excel')}
              className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-lg text-left text-white transition"
            >
              💻 {t('excelSoftware')}
            </button>
            <button
              onClick={() => handleRespuesta('software')}
              className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-lg text-left text-white transition"
            >
              📊 {t('accountingSoftware')}
            </button>
            <button
              onClick={() => handleRespuesta('none')}
              className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-lg text-left text-white transition"
            >
              📭 {t('noControl')}
            </button>
          </div>
          <button onClick={onSkip} className="mt-6 text-gray-500 text-sm hover:text-gray-400">
            {t('skipOnboarding') || 'Omitir'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {t('onboardingDone')}
          </h2>
          <p className="text-gray-400 mb-6">
            {respuesta === 'notebook' && '📝 Empieza registrando una venta o gasto en el formulario de arriba.'}
            {respuesta === 'excel' && '📤 Sube tu archivo Excel usando el botón "Adjuntar".'}
            {respuesta === 'software' && '🔌 Exporta tu reporte y súbelo como CSV o Excel.'}
            {respuesta === 'none' && '🚀 Empieza con una venta o gasto simple usando el formulario.'}
          </p>
          <button
            onClick={onComplete}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 py-3 rounded-lg font-bold text-white"
          >
            {t('startNow') || 'Comenzar'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OnboardingWizard;

