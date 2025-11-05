import React from 'react';
import { ShoppingCart } from 'lucide-react';
import type { Vendor } from '../../types';
import { APP_VERSION } from '../../version';

interface HeaderProps {
  selectedVendor: Vendor | null;
  currentDateTime: Date;
}

export const Header: React.FC<HeaderProps> = ({ selectedVendor, currentDateTime }) => {
  return (
    <header className="shadow-lg safe-top header-white-text" style={{ backgroundColor: 'var(--primary-green)' }}>
      <div className="px-6 py-4 relative">
        {selectedVendor ? (
          <>
            <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
              <h1 className="text-2xl font-bold header-white-text flex items-center gap-2">
                <ShoppingCart size={28} />
                Caisse MyConfort
              </h1>
              {/* Version masquée sur demande utilisateur */}
              {/* <div className="text-xs header-white-text opacity-75 mt-1">
                v{APP_VERSION}
              </div> */}
            </div>
            
            <div className="absolute top-1/2 transform -translate-y-1/2 flex items-center gap-3" style={{ right: '24px' }}>
              <div className="header-white-text text-right">
                <div className="text-lg font-bold">
                  {currentDateTime.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-xl font-mono">
                  {currentDateTime.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center items-center w-full">
              <h2 className="text-5xl font-bold header-white-text tracking-wider animate-pulse">
                {selectedVendor?.name?.toUpperCase() || 'VENDEUSE'}
              </h2>
            </div>
          </>
        ) : (
          <>
            <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
              <h1 className="text-2xl font-bold header-white-text flex items-center gap-2">
                <ShoppingCart size={28} />
                Caisse MyConfort
              </h1>
              {/* Version masquée sur demande utilisateur */}
              {/* <div className="text-xs header-white-text opacity-75 mt-1">
                v{APP_VERSION}
              </div> */}
            </div>
            
            <div className="absolute top-1/2 transform -translate-y-1/2 flex items-center gap-3" style={{ right: '24px' }}>
              <div className="header-white-text text-right">
                <div className="text-lg font-bold">
                  {currentDateTime.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-xl font-mono">
                  {currentDateTime.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center items-center w-full">
              <h2 className="text-5xl font-bold header-white-text tracking-wider animate-pulse">
                VENDEUSE ?
              </h2>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
