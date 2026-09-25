'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('Chat GPV route error:', error);
  }, [error]);

  return (
    <main className="loading-shell">
      <div className="brand-mark">GPV</div>
      <strong>O Chat GPV encontrou um erro nesta tela.</strong>
      <span style={{ maxWidth: 520, textAlign: 'center', opacity: 0.7 }}>
        Atualize a conexão com o atendimento. Se o problema continuar, copie o erro do Console do navegador para diagnóstico.
      </span>
      <button className="primary-button" style={{ maxWidth: 260 }} onClick={() => reset()}>
        Tentar novamente
      </button>
    </main>
  );
}
