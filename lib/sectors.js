export const sectors = [
  { id: 'financeiro', name: 'Financeiro', description: 'Boletos, pagamentos e negociações' },
  { id: 'eventos', name: 'Eventos', description: 'Abertura e acompanhamento de eventos' },
  { id: 'rastreamento', name: 'Rastreamento', description: 'Instalação, manutenção e orientações' },
  { id: 'cadastro', name: 'Cadastro', description: 'Dados cadastrais e proteção' },
  { id: 'assistencia', name: 'Assistência 24h', description: 'Orientações e direcionamento' },
  { id: 'outros', name: 'Outros assuntos', description: 'Fale com nossa equipe' },
];

export function sectorByName(name) {
  return sectors.find((sector) => sector.name === name);
}
