'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Chat GPV global error:', error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f6f5f0' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 24, padding: 32, boxSizing: 'border-box' }}>
            <strong style={{ display: 'inline-block', background: '#ffc400', padding: '10px 14px', borderRadius: 10 }}>GPV</strong>
            <h1 style={{ margin: '24px 0 12px' }}>Não foi possível atualizar o atendimento.</h1>
            <p style={{ lineHeight: 1.6, opacity: 0.7 }}>A conversa continua salva no Firebase. Tente carregar a tela novamente.</p>
            <button onClick={() => reset()} style={{ width: '100%', marginTop: 16, padding: 14, border: 0, borderRadius: 10, fontWeight: 700, background: '#ffc400', cursor: 'pointer' }}>Tentar novamente</button>
          </section>
        </main>
      </body>
    </html>
  );
}
