'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { sectors } from '../../lib/sectors';
import { formatTime, initials, roleLabel, statusLabel } from '../../lib/format';

export default function TeamPanel() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('aguardando');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, async (current) => {
    setAuthReady(false);
    setProfileError('');
    if (!current || current.isAnonymous) {
      setUser(null);
      setProfile(null);
      setAuthReady(true);
      return;
    }

    try {
      const profileSnap = await getDoc(doc(db, 'usuarios', current.uid));
      if (!profileSnap.exists()) {
        setProfileError(`Usuário autenticado, mas sem perfil em usuarios/${current.uid}.`);
        setUser(current);
        setProfile(null);
      } else if (profileSnap.data().ativo !== true) {
        setProfileError('Seu acesso ao Chat GPV está desativado.');
        setUser(current);
        setProfile(null);
      } else {
        setUser(current);
        setProfile({ id: profileSnap.id, ...profileSnap.data() });
      }
    } catch (err) {
      setProfileError(readableError(err));
    } finally {
      setAuthReady(true);
    }
  }), []);

  useEffect(() => {
    if (!user || !profile) return undefined;
    let ticketsQuery;
    if (profile.role === 'admin' || profile.role === 'supervisor') {
      ticketsQuery = query(collection(db, 'atendimentos'), orderBy('ultimaMensagemEm', 'desc'), limit(150));
    } else {
      ticketsQuery = query(collection(db, 'atendimentos'), where('setor', '==', profile.setor), limit(150));
    }

    const unsub = onSnapshot(ticketsQuery, (snapshot) => {
      const list = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      list.sort((a, b) => timestampMs(b.ultimaMensagemEm) - timestampMs(a.ultimaMensagemEm));
      setTickets(list);
      setSelectedId((current) => current || list[0]?.id || null);
    }, (err) => setError(readableError(err)));
    return unsub;
  }, [user?.uid, profile?.role, profile?.setor]);

  const selected = tickets.find((ticket) => ticket.id === selectedId) || null;

  useEffect(() => {
    if (!selected?.id) {
      setMessages([]);
      return undefined;
    }
    const messagesQuery = query(collection(db, 'atendimentos', selected.id, 'mensagens'), orderBy('criadoEm', 'asc'));
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, (err) => setError(readableError(err)));
  }, [selected?.id]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages.length]);

  const filtered = useMemo(() => {
    if (filter === 'aguardando') return tickets.filter((ticket) => ticket.status === 'aguardando');
    if (filter === 'meus') return tickets.filter((ticket) => ticket.status === 'em_atendimento' && ticket.atendenteUid === user?.uid);
    return tickets.filter((ticket) => ticket.status !== 'finalizado');
  }, [tickets, filter, user?.uid]);

  async function assumeTicket() {
    if (!selected || !user || !profile) return;
    setBusy(true); setError('');
    try {
      const ticketRef = doc(db, 'atendimentos', selected.id);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ticketRef);
        if (!snap.exists()) throw new Error('Atendimento não encontrado.');
        const data = snap.data();
        if (data.status !== 'aguardando') throw new Error('Este atendimento já foi assumido por outra pessoa.');
        transaction.update(ticketRef, {
          status: 'em_atendimento',
          atendenteUid: user.uid,
          atendenteNome: profile.nome,
          atualizadoEm: serverTimestamp(),
        });
      });
      await addSystemMessage(selected.id, `${profile.nome} iniciou o atendimento.`, profile);
      setFilter('meus');
    } catch (err) {
      setError(readableError(err));
    } finally { setBusy(false); }
  }

  async function finishTicket() {
    if (!selected || !profile) return;
    setBusy(true); setError('');
    try {
      const ticketRef = doc(db, 'atendimentos', selected.id);
      await updateDoc(ticketRef, { status: 'finalizado', finalizadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
      await addSystemMessage(selected.id, `Atendimento finalizado por ${profile.nome}.`, profile);
    } catch (err) { setError(readableError(err)); }
    finally { setBusy(false); }
  }

  async function transferTicket(nextSectorName) {
    if (!selected || !profile || nextSectorName === selected.setor) return;
    const next = sectors.find((item) => item.name === nextSectorName);
    if (!next) return;
    setBusy(true); setError('');
    try {
      const ticketRef = doc(db, 'atendimentos', selected.id);
      await updateDoc(ticketRef, {
        setor: next.name,
        setorId: next.id,
        status: 'aguardando',
        atendenteUid: null,
        atendenteNome: null,
        atualizadoEm: serverTimestamp(),
        ultimaMensagem: `Transferido para ${next.name}`,
        ultimaMensagemEm: serverTimestamp(),
      });
      await addSystemMessage(selected.id, `Atendimento transferido para ${next.name} por ${profile.nome}.`, profile);
      setSelectedId(null);
    } catch (err) { setError(readableError(err)); }
    finally { setBusy(false); }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text || !selected || !user || !profile || selected.status !== 'em_atendimento') return;
    if (selected.atendenteUid !== user.uid && profile.role === 'agent') {
      setError('Este atendimento está atribuído a outro atendente.');
      return;
    }
    setMessage(''); setBusy(true); setError('');
    try {
      const ticketRef = doc(db, 'atendimentos', selected.id);
      const messageRef = doc(collection(db, 'atendimentos', selected.id, 'mensagens'));
      const batch = writeBatch(db);
      batch.set(messageRef, {
        remetenteUid: user.uid,
        remetenteTipo: 'atendente',
        remetenteNome: profile.nome,
        texto: text,
        tipo: 'texto',
        criadoEm: serverTimestamp(),
      });
      batch.update(ticketRef, { ultimaMensagem: text.slice(0, 180), ultimaMensagemEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
      await batch.commit();
    } catch (err) { setMessage(text); setError(readableError(err)); }
    finally { setBusy(false); }
  }

  async function logout() {
    await signOut(auth);
    setTickets([]); setSelectedId(null); setMessages([]);
  }

  if (!authReady) return <Loading text="Carregando central..." />;
  if (!user || !profile) return <TeamLogin profileError={profileError} />;

  return (
    <main className="agent-shell">
      <aside className="agent-sidebar">
        <div className="side-brand">GPV<span>CHAT</span></div>
        <nav>
          <button className="nav-item active"><span>◫</span>Atendimentos</button>
          {profile.role === 'admin' && <a className="nav-item" href="/admin"><span>◇</span>Administração</a>}
        </nav>
        <div className="side-bottom">
          <div className="agent-profile"><div className="avatar small">{initials(profile.nome)}</div><div><strong>{profile.nome}</strong><small>{roleLabel(profile.role)} · {profile.setor}</small></div></div>
          <button className="logout" onClick={logout}>Sair</button>
        </div>
      </aside>

      <section className="queue-column">
        <header className="queue-header"><div><p className="eyebrow">CENTRAL GPV</p><h2>Atendimentos</h2></div><span className="online-badge"><i /> Online</span></header>
        <div className="queue-tabs">
          <button className={filter === 'aguardando' ? 'active' : ''} onClick={() => setFilter('aguardando')}>Aguardando <b>{tickets.filter(t => t.status === 'aguardando').length}</b></button>
          <button className={filter === 'meus' ? 'active' : ''} onClick={() => setFilter('meus')}>Meus <b>{tickets.filter(t => t.status === 'em_atendimento' && t.atendenteUid === user.uid).length}</b></button>
          <button className={filter === 'todos' ? 'active' : ''} onClick={() => setFilter('todos')}>Abertos</button>
        </div>
        <div className="ticket-list">
          {filtered.map((ticket) => (
            <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`ticket-item ${selected?.id === ticket.id ? 'selected' : ''}`}>
              <div className="avatar">{initials(ticket.clienteNome)}</div>
              <div className="ticket-copy"><div><strong>{ticket.clienteNome}</strong><time>{formatTime(ticket.ultimaMensagemEm)}</time></div><p>{ticket.ultimaMensagem || 'Novo atendimento'}</p><div className="ticket-meta"><span>{ticket.setor}</span><small>{ticket.origem}</small></div></div>
            </button>
          ))}
          {filtered.length === 0 && <div className="empty-list">Nenhum atendimento nesta fila.</div>}
        </div>
      </section>

      <section className="agent-conversation">
        {error && <div className="error-banner panel-error">{error}</div>}
        {selected ? <>
          <header className="agent-chat-header">
            <div className="customer-title"><div className="avatar">{initials(selected.clienteNome)}</div><div><h3>{selected.clienteNome}</h3><span>{selected.protocolo}</span></div></div>
            <div className="header-actions">
              {selected.status === 'aguardando' && <button className="primary-small" disabled={busy} onClick={assumeTicket}>Atender agora</button>}
              {selected.status === 'em_atendimento' && <button className="outline-small" disabled={busy} onClick={finishTicket}>Finalizar</button>}
            </div>
          </header>
          <div className="agent-messages"><div className="date-divider"><span>Conversa</span></div>{messages.length === 0 && <div className="system-message">Ainda não há mensagens neste atendimento.</div>}{messages.map((item) => <AgentMessage key={item.id} item={item} currentUid={user.uid} />)}<div ref={bottomRef} /></div>
          <form className="agent-composer" onSubmit={sendMessage}><button type="button" className="attach-button" disabled title="Anexos entram na próxima versão">＋</button><textarea value={message} onChange={(e) => setMessage(e.target.value)} disabled={selected.status !== 'em_atendimento' || busy} placeholder={selected.status === 'em_atendimento' ? 'Digite sua mensagem...' : 'Assuma o atendimento para responder'} /><button disabled={selected.status !== 'em_atendimento' || busy || !message.trim()} className="send-button" type="submit">Enviar</button></form>
        </> : <div className="empty-center">Selecione um atendimento</div>}
      </section>

      {selected && <aside className="details-panel">
        <p className="eyebrow">ASSOCIADO</p>
        <div className="detail-person"><div className="avatar large">{initials(selected.clienteNome)}</div><h3>{selected.clienteNome}</h3><span>{selected.contato}</span></div>
        <div className="detail-section"><label>SETOR</label><select value={selected.setor} disabled={busy || selected.status === 'finalizado'} onChange={(e) => transferTicket(e.target.value)}>{sectors.map((s) => <option key={s.id}>{s.name}</option>)}</select></div>
        <div className="detail-section"><label>ORIGEM</label><strong>{selected.origem}</strong></div>
        <div className="detail-section"><label>ATENDENTE</label><strong>{selected.atendenteNome || 'Ainda não atribuído'}</strong></div>
        <div className="detail-section"><label>STATUS</label><span className={`status-chip ${cssStatus(selected.status)}`}>{statusLabel(selected.status)}</span></div>
        <div className="detail-note"><strong>V2 Firebase</strong><p>Fila, atendimento e mensagens já são dados reais do Firestore. Arquivos permanecem desativados nesta etapa.</p></div>
      </aside>}
    </main>
  );
}

function TeamLogin({ profileError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(profileError || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => setError(profileError || ''), [profileError]);

  async function login(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch (err) { setError(loginError(err)); }
    finally { setBusy(false); }
  }

  return <main className="login-shell"><section className="login-brand"><div><div className="brand-mark">GPV</div><p className="eyebrow light">CENTRAL INTERNA</p><h1>Atendimento que acompanha a operação.</h1><p>Painel unificado para filas, conversas e histórico.</p></div></section><section className="login-card"><form onSubmit={login}><p className="eyebrow">ACESSO RESTRITO</p><h2>Entrar na central</h2><p className="muted">Use o usuário criado no Firebase Authentication.</p>{error && <div className="error-banner">{error}</div>}<label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@gpv.com.br" required /></label><label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></label><button className="primary-button" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button><a href="/">← Voltar ao Chat GPV</a></form></section></main>;
}

function AgentMessage({ item, currentUid }) {
  if (item.remetenteTipo === 'sistema') return <div className="system-message">{item.texto}</div>;
  const mine = item.remetenteUid === currentUid;
  return <div className={`message-row ${mine ? 'mine' : ''}`}><div className="message-bubble"><p>{item.texto}</p><span>{item.remetenteNome ? `${item.remetenteNome} · ` : ''}{formatTime(item.criadoEm)}</span></div></div>;
}

async function addSystemMessage(ticketId, text, profile) {
  const messageRef = doc(collection(db, 'atendimentos', ticketId, 'mensagens'));
  const ticketRef = doc(db, 'atendimentos', ticketId);
  const batch = writeBatch(db);
  batch.set(messageRef, { remetenteUid: profile.id, remetenteTipo: 'sistema', remetenteNome: 'GPV', texto: text, tipo: 'sistema', criadoEm: serverTimestamp() });
  batch.update(ticketRef, { ultimaMensagem: text.slice(0, 180), ultimaMensagemEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
  await batch.commit();
}

function cssStatus(status) { return status === 'aguardando' ? 'waiting' : status === 'em_atendimento' ? 'active' : 'closed'; }
function timestampMs(value) { return value?.toMillis ? value.toMillis() : 0; }
function readableError(err) {
  if (err?.code === 'permission-denied') return 'A operação foi bloqueada pelas regras do Firestore. Confira o perfil do usuário e as regras da V2.';
  if (err?.code === 'failed-precondition') return 'O Firestore pediu um índice para esta consulta. Envie a mensagem de erro para configurarmos.';
  return err?.message || 'Não foi possível concluir a operação.';
}
function loginError(err) {
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(err?.code)) return 'E-mail ou senha inválidos.';
  if (err?.code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  return err?.message || 'Não foi possível entrar.';
}
function Loading({ text }) { return <main className="loading-shell"><div className="brand-mark">GPV</div><strong>{text}</strong></main>; }
