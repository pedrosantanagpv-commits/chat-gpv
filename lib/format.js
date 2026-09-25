export function firstName(value = '') {
  return value.trim().split(' ')[0] || 'Associado';
}

export function initials(value = '') {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'GP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
}

export function formatTime(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp instanceof Date ? timestamp : null;
  if (!date) return 'agora';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatDateTime(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp instanceof Date ? timestamp : null;
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function protocol() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `GPV-${y}${m}${d}-${random}`;
}

export function statusLabel(status) {
  if (status === 'aguardando') return 'Aguardando';
  if (status === 'em_atendimento') return 'Em atendimento';
  if (status === 'finalizado') return 'Finalizado';
  return status || '—';
}

export function roleLabel(role) {
  if (role === 'admin') return 'Administrador';
  if (role === 'supervisor') return 'Supervisor';
  return 'Atendente';
}
