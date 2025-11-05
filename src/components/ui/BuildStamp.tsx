import React from 'react';
import { APP_VERSION, BUILD_INFO } from '../../version';

export const BuildStamp: React.FC = () => {
  const buildDate = new Date(BUILD_INFO.buildTime || BUILD_INFO.buildDate).toLocaleString('fr-FR', {
    year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  const commitShort = (BUILD_INFO.commitRef || '').slice(0, 7);
  const isProduction = BUILD_INFO.context === 'production';
  const buildLabel = isProduction ? `Build ${commitShort}` : `Dev ${commitShort}`;
  const tag = `${buildLabel} • ${buildDate}`;

  return (
    <footer className="fixed bottom-2 right-2 text-[10px] text-gray-600 bg-white/90 px-2 py-1 rounded shadow-md border border-gray-200 font-mono z-50">
      iPad Fix • v{APP_VERSION} • {tag}
    </footer>
  );
};
