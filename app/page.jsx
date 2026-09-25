'use client';

import { useEffect, useRef, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { sectors } from '../lib/sectors';
import { firstName, formatTime, protocol as createProtocol } from '../lib/format';

export default function PublicChat() {
  const [step, setStep] = useState('identify');
  const [form, setForm] = useState({ name: '', contact: '' });
  const [sector, setSector] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [customerUid, setCustomerUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        let user = auth.currentUser;
        if (!user) {
          const credential = await signInAnonymously(auth);
          user = credential.user;
        }
        if (!user.isAnonymous) {
          throw new Error('Há uma sessão interna ativa neste navegador. Abra o Chat GPV em uma janela anônima ou saia do painel da equipe.');
        }
        if (cancelled) return;
        setCustomerUid(user.uid);

        const savedTicketId = window.localStorage.getItem('gpv_chat_ticket');
        if (savedTicketId) {
          const snap = await getDoc(doc(db, 'atendimentos', savedTicketId));
          if (snap.exists() && snap.data().clienteUid === user.uid && snap.data().status !== 'finalizado') {
            const restored = { id: snap.id, ...snap.data() };
            setTicket(restored);
            setSector(sectors.find((item) => item.name === restored.setor) || { name: restored.setor });
            setForm({ name: restored.clienteNome || '', contact: restored.contato || '' });
            setStep('chat');
          } else {
            window.localStorage.removeItem('gpv_chat_ticket');
          }
        }
      } catch (err) {
        console.error(err);
        if (err?.code === 'auth/operation-not-allowed') {
          setError('O acesso anônimo ainda não está ativado no Firebase Authentication. Ative “Anônimo” para liberar o Chat do associado.');
        } else {
          setError(err?.message || 'Não foi possível iniciar o Chat GPV.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ticket?.id || !customerUid) return undefined;

    const ticketUnsub = onSnapshot(doc(db, 'atendimentos', ticket.id), (snap) => {
      if (snap.exists()) setTicket({ id: snap.id, ...snap.data() });
    }, (err) => setError(readableError(err)));

    const messagesQuery = query(
      collection(db, 'atendimentos', ticket.id, 'mensagens'),
      orderBy('criadoEm', 'asc'),
    );
    const messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, (err) => setError(readableError(err)));

    return () => {
      ticketUnsub();
      messagesUnsub();
    };
  }, [ticket?.id, customerUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function identify(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.contact.trim()) return;
    setStep('sector');
  }

  async function chooseSector(item) {
    if (!customerUid) return;
    setError('');
    setSending(true);
    try {
      const protocolo = createProtocol();
      const ref = await addDoc(collection(db, 'atendimentos'), {
        protocolo,
        clienteUid: customerUid,
        clienteNome: form.name.trim(),
        contato: form.contact.trim(),
        setorId: item.id,
        setor: item.name,
        status: 'aguardando',
        atendenteUid: null,
        atendenteNome: null,
        origem: 'Site',
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        ultimaMensagemEm: serverTimestamp(),
        ultimaMensagem: 'Novo atendimento iniciado',
      });
      const created = { id: ref.id, protocolo, clienteNome: form.name.trim(), contato: form.contact.trim(), setor: item.name, status: 'aguardando' };
      setSector(item);
      setTicket(created);
      window.localStorage.setItem('gpv_chat_ticket', ref.id);
      setStep('chat');
    } catch (err) {
      console.error(err);
      setError(readableError(err));
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text || !ticket?.id || !customerUid || ticket.status === 'finalizado') return;
    setMessage('');
    setSending(true);
    setError('');
    try {
      const ticketRef = doc(db, 'atendimentos', ticket.id);
      const messageRef = doc(collection(db, 'atendimentos', ticket.id, 'mensagens'));
      const batch = writeBatch(db);
      batch.set(messageRef, {
        remetenteUid: customerUid,
        remetenteTipo: 'cliente',
        remetenteNome: form.name.trim(),
        texto: text,
        tipo: 'texto',
        criadoEm: serverTimestamp(),
      });
      batch.update(ticketRef, {
        ultimaMensagem: text.slice(0, 180),
        ultimaMensagemEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
      setMessage(text);
      setError(readableError(err));
    } finally {
      setSending(false);
    }
  }

  function newAttendance() {
    window.localStorage.removeItem('gpv_chat_ticket');
    setTicket(null);
    setMessages([]);
    setSector(null);
    setMessage('');
    setStep('identify');
  }

  if (loading) return <LoadingScreen text="Conectando ao Chat GPV..." />;

  return (
    <main className="public-shell">
      <section className="brand-panel">
        <div>
          <div className="brand-mark">GPV</div>
          <p className="eyebrow light">CENTRAL DIGITAL</p>
          <h1>Atendimento GPV, direto e simples.</h1>
          <p className="brand-copy">Um canal próprio para conversar com nossa equipe e manter seu atendimento em um só lugar.</p>
        </div>
        <div className="brand-footer"><span className="status-dot" /> Atendimento online</div>
      </section>

      <section className="public-content">
        <div className="top-links">
          <span>Chat GPV · Firebase conectado</span>
          <a href="/equipe">Acesso da equipe →</a>
        </div>

        <div className="chat-card public-card">
          {error && <div className="error-banner floating-error">{error}</div>}

          {step === 'identify' && (
            <div className="step-content">
              <span className="step-number">01</span>
              <p className="eyebrow">BEM-VINDO</p>
              <h2>Vamos iniciar seu atendimento.</h2>
              <p className="muted">Informe seus dados para criarmos um protocolo e direcionarmos sua solicitação.</p>
              <form onSubmit={identify} className="stack-form">
                <label>Nome completo<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Digite seu nome" autoComplete="name" /></label>
                <label>CPF ou telefone<input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Informe CPF ou telefone" autoComplete="tel" /></label>
                <button className="primary-button" type="submit" disabled={!customerUid}>Continuar</button>
              </form>
              <p className="privacy-note">Ao continuar, você concorda com o tratamento dos dados necessários para realizar o atendimento.</p>
            </div>
          )}

          {step === 'sector' && (
            <div className="step-content wide-step">
              <div className="back-row"><button className="text-button" onClick={() => setStep('identify')}>← Voltar</button><span className="protocol-preview">Olá, {firstName(form.name)}</span></div>
              <p className="eyebrow">DIRECIONAMENTO</p>
              <h2>Sobre o que você precisa falar?</h2>
              <p className="muted">Escolha o assunto para entrar diretamente na fila correta.</p>
              <div className="sector-grid">
                {sectors.map((item) => (
                  <button className="sector-card" key={item.id} onClick={() => chooseSector(item)} disabled={sending}>
                    <span className="sector-icon">{item.name.slice(0, 1)}</span>
                    <span><strong>{item.name}</strong><small>{item.description}</small></span><b>→</b>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'chat' && ticket && (
            <div className="conversation-layout public-conversation">
              <header className="conversation-header">
                <div><span className="queue-pill">{ticket.setor || sector?.name}</span><h3>{ticket.status === 'finalizado' ? 'Atendimento finalizado' : 'Atendimento em andamento'}</h3><small>Protocolo {ticket.protocolo}</small></div>
                {ticket.status === 'finalizado' && <button className="outline-button" onClick={newAttendance}>Novo atendimento</button>}
              </header>
              <div className="message-list">
                <div className="queue-notice"><span className="status-dot" /> {ticket.status === 'aguardando' ? 'Você está na fila de atendimento.' : ticket.atendenteNome ? `Atendimento com ${ticket.atendenteNome}.` : 'Você está conectado ao Chat GPV.'}</div>
                {messages.length === 0 && <div className="system-message">Envie uma mensagem explicando como podemos ajudar.</div>}
                {messages.map((item) => <Message key={item.id} item={item} customerUid={customerUid} />)}
                <div ref={bottomRef} />
              </div>
              <form className="composer" onSubmit={sendMessage}>
                <button type="button" className="attach-button" title="Anexos entram na próxima versão" disabled>＋</button>
                <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={ticket.status === 'finalizado' ? 'Este atendimento foi finalizado.' : 'Digite sua mensagem...'} disabled={ticket.status === 'finalizado' || sending} />
                <button className="send-button" type="submit" disabled={ticket.status === 'finalizado' || sending || !message.trim()}>Enviar</button>
              </form>
              <div className="demo-warning">V2 · mensagens e fila já são armazenadas no Firebase. Anexos ainda estão desativados.</div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Message({ item, customerUid }) {
  if (item.remetenteTipo === 'sistema') return <div className="system-message">{item.texto}</div>;
  const mine = item.remetenteUid === customerUid;
  return <div className={`message-row ${mine ? 'mine' : ''}`}><div className="message-bubble"><p>{item.texto}</p><span>{formatTime(item.criadoEm)}</span></div></div>;
}

function LoadingScreen({ text }) {
  return <main className="loading-shell"><div className="brand-mark">GPV</div><strong>{text}</strong></main>;
}

function readableError(err) {
  if (err?.code === 'permission-denied') return 'O Firebase bloqueou esta operação. Verifique se as regras do Firestore da V2 foram publicadas.';
  if (err?.code === 'auth/operation-not-allowed') return 'Ative o provedor Anônimo no Firebase Authentication.';
  return err?.message || 'Ocorreu um erro no atendimento.';
}
