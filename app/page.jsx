'use client';

import { useMemo, useState } from 'react';
import { sectors } from '../lib/mockData';

export default function PublicChat() {
  const [step, setStep] = useState('identify');
  const [form, setForm] = useState({ name: '', contact: '' });
  const [sector, setSector] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const protocol = useMemo(() => 'GPV-260925-' + String(1100 + Math.floor(Math.random() * 700)), []);

  function identify(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) return;
    setStep('sector');
  }

  function chooseSector(item) {
    setSector(item);
    setMessages([
      { id: 1, from: 'system', text: `Seu atendimento foi direcionado para ${item.name}.`, time: now() },
      { id: 2, from: 'agent', text: `Olá, ${firstName(form.name)}! Recebemos sua solicitação. Escreva abaixo como podemos ajudar.`, time: now() },
    ]);
    setStep('chat');
  }

  function sendMessage(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: Date.now(), from: 'customer', text, time: now() }]);
    setMessage('');
  }

  return (
    <main className="public-shell">
      <section className="brand-panel">
        <div>
          <div className="brand-mark">GPV</div>
          <p className="eyebrow light">CENTRAL DIGITAL</p>
          <h1>Atendimento GPV, direto e simples.</h1>
          <p className="brand-copy">Um canal próprio para conversar com nossa equipe, acompanhar o atendimento e manter tudo em um só lugar.</p>
        </div>
        <div className="brand-footer">
          <span className="status-dot" /> Atendimento online
        </div>
      </section>

      <section className="public-content">
        <div className="top-links">
          <span>Chat GPV · Versão demonstrativa</span>
          <a href="/equipe">Acesso da equipe →</a>
        </div>

        <div className="chat-card public-card">
          {step === 'identify' && (
            <div className="step-content">
              <span className="step-number">01</span>
              <p className="eyebrow">BEM-VINDO</p>
              <h2>Vamos iniciar seu atendimento.</h2>
              <p className="muted">Informe seus dados para criarmos o protocolo. Nesta demonstração, nenhuma informação é armazenada.</p>
              <form onSubmit={identify} className="stack-form">
                <label>
                  Nome completo
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Digite seu nome" />
                </label>
                <label>
                  CPF ou telefone
                  <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Somente para identificação" />
                </label>
                <button className="primary-button" type="submit">Continuar</button>
              </form>
              <p className="privacy-note">Ao continuar, você concorda com o tratamento dos dados necessários para realizar o atendimento.</p>
            </div>
          )}

          {step === 'sector' && (
            <div className="step-content wide-step">
              <div className="back-row">
                <button className="text-button" onClick={() => setStep('identify')}>← Voltar</button>
                <span className="protocol-preview">Olá, {firstName(form.name)}</span>
              </div>
              <p className="eyebrow">DIRECIONAMENTO</p>
              <h2>Sobre o que você precisa falar?</h2>
              <p className="muted">Escolha o assunto para entrar diretamente na fila correta.</p>
              <div className="sector-grid">
                {sectors.map((item) => (
                  <button className="sector-card" key={item.id} onClick={() => chooseSector(item)}>
                    <span className="sector-icon">{item.name.slice(0, 1)}</span>
                    <span><strong>{item.name}</strong><small>{item.description}</small></span>
                    <b>→</b>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'chat' && (
            <div className="conversation-layout public-conversation">
              <header className="conversation-header">
                <div>
                  <span className="queue-pill">{sector?.name}</span>
                  <h3>Atendimento em andamento</h3>
                  <small>Protocolo {protocol}</small>
                </div>
                <button className="outline-button" onClick={() => setStep('sector')}>Trocar assunto</button>
              </header>
              <div className="message-list">
                <div className="queue-notice"><span className="status-dot" /> Você está conectado ao Chat GPV.</div>
                {messages.map((item) => <Message key={item.id} item={item} />)}
              </div>
              <form className="composer" onSubmit={sendMessage}>
                <button type="button" className="attach-button" title="Anexos serão habilitados com o Firebase">＋</button>
                <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Digite sua mensagem..." />
                <button className="send-button" type="submit">Enviar</button>
              </form>
              <div className="demo-warning">Demonstração local · anexos e tempo real serão conectados na próxima etapa.</div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Message({ item }) {
  if (item.from === 'system') return <div className="system-message">{item.text}</div>;
  return (
    <div className={`message-row ${item.from === 'customer' ? 'mine' : ''}`}>
      <div className="message-bubble">
        <p>{item.text}</p>
        <span>{item.time}</span>
      </div>
    </div>
  );
}

function firstName(value) {
  return value.trim().split(' ')[0] || 'Associado';
}

function now() {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}
