'use client';

import { useMemo, useState } from 'react';
import { initialTickets, sectors } from '../../lib/mockData';

export default function TeamPanel() {
  const [logged, setLogged] = useState(false);
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(initialTickets[0].id);
  const [filter, setFilter] = useState('waiting');
  const [message, setMessage] = useState('');

  const selected = tickets.find((ticket) => ticket.id === selectedId) || tickets[0];
  const filtered = useMemo(() => tickets.filter((ticket) => filter === 'all' || ticket.status === filter), [tickets, filter]);

  if (!logged) return <TeamLogin onLogin={() => setLogged(true)} />;

  function updateTicket(id, patch) {
    setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, ...patch } : ticket));
  }

  function assumeTicket() {
    updateTicket(selected.id, { status: 'active', agent: 'Pedro' });
    setFilter('active');
  }

  function finishTicket() {
    updateTicket(selected.id, { status: 'closed' });
  }

  function transferTicket(sector) {
    updateTicket(selected.id, { sector });
  }

  function sendMessage(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? {
      ...ticket,
      messages: [...ticket.messages, { id: Date.now(), from: 'agent', text, time: now() }],
    } : ticket));
    setMessage('');
  }

  return (
    <main className="agent-shell">
      <aside className="agent-sidebar">
        <div className="side-brand">GPV<span>CHAT</span></div>
        <nav>
          <button className="nav-item active"><span>◫</span>Atendimentos</button>
          <button className="nav-item"><span>⌕</span>Histórico</button>
          <a className="nav-item" href="/admin"><span>◇</span>Administração</a>
        </nav>
        <div className="side-bottom">
          <div className="agent-profile"><div className="avatar small">P</div><div><strong>Pedro</strong><small>Administrador</small></div></div>
          <button className="logout" onClick={() => setLogged(false)}>Sair</button>
        </div>
      </aside>

      <section className="queue-column">
        <header className="queue-header">
          <div><p className="eyebrow">CENTRAL GPV</p><h2>Atendimentos</h2></div>
          <span className="online-badge"><i /> Online</span>
        </header>
        <div className="queue-tabs">
          <button className={filter === 'waiting' ? 'active' : ''} onClick={() => setFilter('waiting')}>Aguardando <b>{tickets.filter(t => t.status === 'waiting').length}</b></button>
          <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Meus <b>{tickets.filter(t => t.status === 'active').length}</b></button>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
        </div>
        <div className="ticket-list">
          {filtered.map((ticket) => (
            <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`ticket-item ${selected?.id === ticket.id ? 'selected' : ''}`}>
              <div className="avatar">{ticket.initials}</div>
              <div className="ticket-copy"><div><strong>{ticket.customer}</strong><time>{ticket.wait}</time></div><p>{ticket.messages.at(-1)?.text}</p><div className="ticket-meta"><span>{ticket.sector}</span><small>{ticket.origin}</small></div></div>
            </button>
          ))}
          {filtered.length === 0 && <div className="empty-list">Nenhum atendimento nesta fila.</div>}
        </div>
      </section>

      <section className="agent-conversation">
        {selected ? (
          <>
            <header className="agent-chat-header">
              <div className="customer-title"><div className="avatar">{selected.initials}</div><div><h3>{selected.customer}</h3><span>{selected.id}</span></div></div>
              <div className="header-actions">
                {selected.status === 'waiting' && <button className="primary-small" onClick={assumeTicket}>Atender agora</button>}
                {selected.status === 'active' && <button className="outline-small" onClick={finishTicket}>Finalizar</button>}
              </div>
            </header>
            <div className="agent-messages">
              <div className="date-divider"><span>Hoje</span></div>
              {selected.messages.map((item) => <AgentMessage key={item.id} item={item} />)}
            </div>
            <form className="agent-composer" onSubmit={sendMessage}>
              <button type="button" className="attach-button">＋</button>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} disabled={selected.status !== 'active'} placeholder={selected.status === 'active' ? 'Digite sua mensagem...' : 'Assuma o atendimento para responder'} />
              <button disabled={selected.status !== 'active'} className="send-button" type="submit">Enviar</button>
            </form>
          </>
        ) : <div className="empty-center">Selecione um atendimento</div>}
      </section>

      {selected && <aside className="details-panel">
        <p className="eyebrow">ASSOCIADO</p>
        <div className="detail-person"><div className="avatar large">{selected.initials}</div><h3>{selected.customer}</h3><span>{selected.phone}</span></div>
        <div className="detail-section"><label>SETOR</label><select value={selected.sector} onChange={(e) => transferTicket(e.target.value)}>{sectors.map((s) => <option key={s.id}>{s.name}</option>)}</select></div>
        <div className="detail-section"><label>ORIGEM</label><strong>{selected.origin}</strong></div>
        <div className="detail-section"><label>VEÍCULO</label><strong>{selected.vehicle}</strong><small>{selected.plate}</small></div>
        <div className="detail-section"><label>STATUS</label><span className={`status-chip ${selected.status}`}>{statusLabel(selected.status)}</span></div>
        <div className="detail-note"><strong>V1 demonstrativa</strong><p>Na próxima etapa, estes dados serão carregados do Firestore e protegidos por permissões.</p></div>
      </aside>}
    </main>
  );
}

function TeamLogin({ onLogin }) {
  return <main className="login-shell"><section className="login-brand"><div className="brand-mark">GPV</div><p className="eyebrow light">CENTRAL INTERNA</p><h1>Atendimento que acompanha a operação.</h1><p>Painel unificado para filas, conversas e histórico.</p></section><section className="login-card"><form onSubmit={(e) => {e.preventDefault(); onLogin();}}><p className="eyebrow">ACESSO RESTRITO</p><h2>Entrar na central</h2><p className="muted">Nesta V1, qualquer usuário e senha liberam o ambiente demonstrativo.</p><label>E-mail<input type="email" placeholder="seuemail@gpv.com.br" required /></label><label>Senha<input type="password" placeholder="••••••••" required /></label><button className="primary-button">Entrar</button><a href="/">← Voltar ao Chat GPV</a></form></section></main>;
}

function AgentMessage({ item }) {
  if (item.from === 'system') return <div className="system-message">{item.text}</div>;
  return <div className={`message-row ${item.from === 'agent' ? 'mine' : ''}`}><div className="message-bubble"><p>{item.text}</p><span>{item.time}</span></div></div>;
}

function statusLabel(status) {
  return status === 'waiting' ? 'Aguardando' : status === 'active' ? 'Em atendimento' : 'Finalizado';
}
function now() { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date()); }
