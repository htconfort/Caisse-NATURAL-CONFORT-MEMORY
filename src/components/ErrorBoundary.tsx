import React from 'react';

type ErrorBoundaryProps = { children: React.ReactNode };
type ErrorBoundaryState = { hasError: boolean; error?: any; errorInfo?: any };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('❌ ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    if (confirm('Vider le cache et recharger l\'application ?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('Erreur vidage cache:', e);
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fee 0%, #fdd 100%)',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            border: '3px solid #ef4444'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 20px',
                background: '#ef4444',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px'
              }}>
                ⚠️
              </div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#ef4444', fontWeight: 'bold' }}>
                Erreur de chargement
              </h1>
              <p style={{ margin: '10px 0 0 0', color: '#666', fontSize: '16px' }}>
                L'application a rencontré un problème
              </p>
            </div>

            {this.state.error && (
              <div style={{
                background: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '25px',
                fontSize: '14px',
                color: '#991b1b',
                fontFamily: 'monospace',
                overflowX: 'auto'
              }}>
                <strong>Erreur :</strong> {this.state.error.toString()}
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '14px 24px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔄 Recharger l'application
              </button>

              <button
                onClick={this.handleClearCache}
                style={{
                  padding: '14px 24px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🧹 Vider le cache et recharger
              </button>
            </div>

            <div style={{
              marginTop: '25px',
              padding: '15px',
              background: '#f0f9ff',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#1e40af'
            }}>
              <strong>💡 Conseil iPad :</strong>
              <br />
              Réglages → Safari → Effacer historique et données de sites
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;



