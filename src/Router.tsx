import React, { useState, useEffect } from 'react';
import App from './App';
import { RealtimeMonitoring } from './components/RealtimeMonitoring';

/**
 * Router simple basé sur le pathname avec gestion des changements d'URL
 */
export function Router() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Écouter les changements d'URL
    window.addEventListener('popstate', handleLocationChange);
    
    // Fonction pour naviguer programmatiquement
    window.navigateTo = (path: string) => {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Page de monitoring temps réel
  if (currentPath === '/monitoring' || currentPath === '/monitoring/') {
    return <RealtimeMonitoring />;
  }

  // Page de caisse par défaut
  return <App />;
}

