// Direção de arte (SPEC seção 7): dark mode, cores de raridade
// (cinza/azul/roxo/dourado/prisma), tipografia esportiva condensada.
import type { Rarity } from '@squad-dynasty/engine';

export const colors = {
  bg: '#0d1117',
  bgElevated: '#161b22',
  bgCard: '#1c2129',
  border: '#2d333b',
  text: '#e6edf3',
  textDim: '#8b949e',
  accent: '#2ea043',
  danger: '#f85149',
  warning: '#d29922',
  pitch: '#0a3d1f',
  pitchLines: '#1f6f3f',
};

export const rarityColors: Record<Rarity, { frame: string; glow: string; text: string }> = {
  common: { frame: '#9ca3af', glow: '#6b7280', text: '#111827' },
  rare: { frame: '#3b82f6', glow: '#1d4ed8', text: '#eff6ff' },
  epic: { frame: '#a855f7', glow: '#7e22ce', text: '#faf5ff' },
  legendary: { frame: '#f59e0b', glow: '#b45309', text: '#451a03' },
  icon: { frame: '#22d3ee', glow: '#0e7490', text: '#083344' },
};

export const rarityLabel: Record<Rarity, string> = {
  common: 'Comum',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Lendária',
  icon: 'Ícone',
};

export const versionLabel = {
  base: '',
  inform: 'Em Alta',
  epic_moment: 'Momento Épico',
  icon: 'Lenda',
} as const;

export const categoryLabel = {
  pace: 'Ritmo',
  finishing: 'Finalização',
  passing: 'Passe',
  dribbling: 'Drible',
  defense: 'Defesa',
  physical: 'Físico',
  mental: 'Mental',
} as const;
