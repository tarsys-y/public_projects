// Paletas pré-definidas pro escudo do time do jogador (Bloco 1 — first login).
// `teamCrestId` guarda só o id; cor/nome vêm daqui, iniciais vêm do teamName.
export interface CrestPalette {
  id: string;
  label: string;
  primary: string;
  secondary: string;
}

export const CREST_PALETTES: CrestPalette[] = [
  { id: 'vermelho-preto', label: 'Vermelho/Preto', primary: '#c62828', secondary: '#111111' },
  { id: 'azul-branco', label: 'Azul/Branco', primary: '#1565c0', secondary: '#ffffff' },
  { id: 'verde-branco', label: 'Verde/Branco', primary: '#2e7d32', secondary: '#ffffff' },
  { id: 'amarelo-verde', label: 'Amarelo/Verde', primary: '#fdd835', secondary: '#2e7d32' },
  { id: 'roxo-dourado', label: 'Roxo/Dourado', primary: '#6a1b9a', secondary: '#ffd600' },
  { id: 'laranja-preto', label: 'Laranja/Preto', primary: '#ef6c00', secondary: '#111111' },
  { id: 'branco-azul', label: 'Branco/Azul', primary: '#ffffff', secondary: '#1565c0' },
  { id: 'preto-dourado', label: 'Preto/Dourado', primary: '#111111', secondary: '#ffd600' },
  { id: 'celeste-branco', label: 'Azul celeste/Branco', primary: '#29b6f6', secondary: '#ffffff' },
  { id: 'grena-azul', label: 'Grená/Azul', primary: '#7b1030', secondary: '#1565c0' },
  { id: 'rosa-preto', label: 'Rosa/Preto', primary: '#ec407a', secondary: '#111111' },
  { id: 'verde-amarelo', label: 'Verde/Amarelo', primary: '#2e7d32', secondary: '#fdd835' },
];

export const DEFAULT_CREST_ID = CREST_PALETTES[0]!.id;

export function crestPaletteById(id: string): CrestPalette {
  return CREST_PALETTES.find((p) => p.id === id) ?? CREST_PALETTES[0]!;
}
