'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { roleLabel } from '../../lib/format';

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user || user.isAnonymous) { setReady(true); return; }
    try {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
    } catch (err) { setError(err.message); }
    finally { setReady(true); }
  }), []);

  useEffect(() => {
    if (profile?.role !== 'admin') return undefined;
    const unsubTickets = onSnapshot(query(collection(db, 'atendimentos'), orderBy('ultimaMensagemEm', 'desc')), (snap) => setTickets(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const unsubUsers = onSnapshot(collection(db, 'usuarios'), (snap) => setUsers(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
    return () => { unsubTickets(); unsubUsers(); };
  }, [profile?.role]);

  const stats = useMemo(() => {
    const waiting = tickets.filter((t) => t.status === 'aguardando').length;
    const active = tickets.filter((t) => t.status === 'em_atendimento').length;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const closedToday = tickets.filter((t) => t.status === 'finalizado' && t.finalizadoEm?.toDate?.() >= todayStart).length;
    const bySector = {};
    const byOrigin = {};
    tickets.forEach((t) => { bySector[t.setor || 'Outros'] = (bySector[t.setor || 'Outros'] || 0) + 1; byOrigin[t.origem || 'Outros'] = (byOrigin[t.origem || 'Outros'] || 0) + 1; });
    return { waiting, active, closedToday, bySector, byOrigin };
  }, [tickets]);

  if (!ready) return <main className="loading-shell"><div className="brand-mark">GPV</div><strong>Carregando administração...</strong></main>;
  if (profile?.role !== 'admin') return <main className="access-denied"><div className="brand-mark">GPV</div><h1>Acesso restrito</h1><p>Esta área está disponível somente para administradores do Chat GPV.</p><a className="primary-link" href="/equipe">Voltar para a central</a></main>;

  const sectorEntries = Object.entries(stats.bySector).sort((a, b) => b[1] - a[1]);
  const maxSector = Math.max(...sectorEntries.map(([, n]) => n), 1);
  const site = stats.byOrigin.Site || 0;
  const whatsapp = stats.byOrigin.WhatsApp || 0;
  const originTotal = site + whatsapp || 1;

  return <main className="admin-shell">
    <aside className="admin-side"><div className="side-brand">GPV<span>CHAT</span></div><a href="/equipe">← Central de atendimento</a><nav><button className="nav-item active">Visão geral</button></nav></aside>
    <section className="admin-content">
      <header className="admin-header"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Visão geral</h1><p>Dados reais do Firestore.</p></div><span className="demo-tag">V2 FIREBASE</span></header>
      {error && <div className="error-banner">{error}</div>}
      <div className="metric-grid"><Metric label="Aguardando" value={stats.waiting} note="agora" /><Metric label="Em atendimento" value={stats.active} note="agora" /><Metric label="Finalizados hoje" value={stats.closedToday} note="desde 00:00" /><Metric label="Usuários" value={users.filter((u) => u.ativo).length} note="ativos" /></div>
      <div className="admin-grid">
        <section className="admin-card"><div className="card-heading"><div><p className="eyebrow">VOLUME</p><h2>Atendimentos por setor</h2></div><span>Total</span></div><div className="bars">{sectorEntries.length ? sectorEntries.map(([label, number]) => <Bar key={label} label={label} value={(number / maxSector) * 100} number={number} />) : <p className="muted">Nenhum atendimento criado ainda.</p>}</div></section>
        <section className="admin-card"><div className="card-heading"><div><p className="eyebrow">ORIGEM</p><h2>Entrada dos atendimentos</h2></div></div><div className="source-stat"><strong>{Math.round((site / originTotal) * 100)}%</strong><span>Site / Chat direto</span></div><div className="source-stat"><strong>{Math.round((whatsapp / originTotal) * 100)}%</strong><span>Triagem via WhatsApp</span></div><p className="card-note">Na V2 o Chat direto já registra a origem como Site. A integração do WhatsApp entra em uma etapa posterior.</p></section>
      </div>
      <section className="admin-card team-table-card"><div className="card-heading"><div><p className="eyebrow">EQUIPE</p><h2>Usuários do painel</h2></div><span>Cadastros feitos pelo Firebase nesta V2</span></div><div className="team-table"><div className="team-row head"><span>Nome</span><span>Perfil</span><span>Setor</span><span>Status</span></div>{users.map((person) => <div className="team-row" key={person.id}><strong>{person.nome || person.email}</strong><span>{roleLabel(person.role)}</span><span>{person.setor}</span><span className="team-status"><i className={person.ativo ? 'green' : ''} />{person.ativo ? 'Ativo' : 'Desativado'}</span></div>)}</div></section>
    </section>
  </main>;
}

function Metric({ label, value, note }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Bar({ label, value, number }) { return <div className="bar-row"><div><span>{label}</span><strong>{number}</strong></div><div className="bar-track"><i style={{ width: `${value}%` }} /></div></div>; }
