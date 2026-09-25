'use client';

const team = [
  { name: 'Pedro', role: 'Administrador', sector: 'Todos os setores', status: 'Online' },
  { name: 'Ana Souza', role: 'Atendente', sector: 'Financeiro', status: 'Online' },
  { name: 'Lucas Melo', role: 'Atendente', sector: 'Eventos', status: 'Ausente' },
  { name: 'Mariana Lima', role: 'Supervisora', sector: 'Rastreamento', status: 'Online' },
];

export default function AdminPage() {
  return <main className="admin-shell">
    <aside className="admin-side"><div className="side-brand">GPV<span>CHAT</span></div><a href="/equipe">← Central de atendimento</a><nav><button className="nav-item active">Visão geral</button><button className="nav-item">Equipe</button><button className="nav-item">Setores</button><button className="nav-item">Configurações</button></nav></aside>
    <section className="admin-content">
      <header className="admin-header"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Visão geral</h1><p>Acompanhe a operação do Chat GPV.</p></div><span className="demo-tag">DADOS SIMULADOS</span></header>
      <div className="metric-grid"><Metric label="Aguardando" value="7" note="agora" /><Metric label="Em atendimento" value="12" note="agora" /><Metric label="Finalizados hoje" value="184" note="+8% vs. ontem" /><Metric label="Tempo médio" value="03:42" note="primeira resposta" /></div>
      <div className="admin-grid">
        <section className="admin-card"><div className="card-heading"><div><p className="eyebrow">VOLUME</p><h2>Atendimentos por setor</h2></div><span>Hoje</span></div><div className="bars"><Bar label="Financeiro" value={72} number="72" /><Bar label="Eventos" value={54} number="54" /><Bar label="Rastreamento" value={41} number="41" /><Bar label="Cadastro" value={28} number="28" /><Bar label="Outros" value={18} number="18" /></div></section>
        <section className="admin-card"><div className="card-heading"><div><p className="eyebrow">ORIGEM</p><h2>Entrada dos atendimentos</h2></div></div><div className="source-stat"><strong>58%</strong><span>Site / Chat direto</span></div><div className="source-stat"><strong>42%</strong><span>Triagem via WhatsApp</span></div><p className="card-note">Este indicador será útil para medir quanto atendimento deixou de permanecer no WhatsApp.</p></section>
      </div>
      <section className="admin-card team-table-card"><div className="card-heading"><div><p className="eyebrow">EQUIPE</p><h2>Usuários do painel</h2></div><button className="primary-small">+ Novo usuário</button></div><div className="team-table"><div className="team-row head"><span>Nome</span><span>Perfil</span><span>Setor</span><span>Status</span></div>{team.map((person) => <div className="team-row" key={person.name}><strong>{person.name}</strong><span>{person.role}</span><span>{person.sector}</span><span className="team-status"><i className={person.status === 'Online' ? 'green' : ''} />{person.status}</span></div>)}</div></section>
    </section>
  </main>;
}

function Metric({ label, value, note }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Bar({ label, value, number }) { return <div className="bar-row"><div><span>{label}</span><strong>{number}</strong></div><div className="bar-track"><i style={{ width: `${value}%` }} /></div></div>; }
