// Schemas zod da base de dados editável (SPEC seção 8): valida chaves exatas
// e faixas 0–99. Compartilhado por validate.ts e pelos geradores.
import { z } from 'zod';
import {
  GK_ATTRIBUTE_KEYS,
  OUTFIELD_ATTRIBUTE_KEYS,
} from '@squad-dynasty/engine';

const attr = z.number().int().min(0).max(99);

export const outfieldAttributesSchema = z
  .object(Object.fromEntries(OUTFIELD_ATTRIBUTE_KEYS.map((k) => [k, attr])))
  .strict();

export const gkAttributesSchema = z
  .object(Object.fromEntries(GK_ATTRIBUTE_KEYS.map((k) => [k, attr])))
  .strict();

export const anyAttributesSchema = z.union([gkAttributesSchema, outfieldAttributesSchema]);

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'esperado kebab-case');

export const POSITIONS = [
  'GK',
  'CB',
  'LB',
  'RB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'ST',
] as const;

export const positionSchema = z.enum(POSITIONS);

export const basePlayerSchema = z
  .object({
    id: slug,
    name: z.string().min(1),
    nationality: z.string().regex(/^[A-Z]{2}$/),
    clubId: slug,
    leagueId: slug,
    birthYear: z.number().int().min(1900).max(2015),
    positions: z.array(positionSchema).min(1),
    attributes: anyAttributesSchema,
  })
  .strict()
  .superRefine((player, ctx) => {
    const isGk = player.positions[0] === 'GK';
    const hasGkAttrs = 'reflexes' in player.attributes;
    if (isGk !== hasGkAttrs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${player.id}: posição principal ${player.positions[0]} incompatível com o tipo de atributos`,
      });
    }
  });

export const clubSchema = z
  .object({
    id: slug,
    name: z.string().min(1),
    shortName: z.string().min(2).max(4),
    leagueId: slug,
    country: z.string().regex(/^[A-Z]{2}$/),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })
  .strict();

export const raritySchema = z.enum(['common', 'rare', 'epic', 'legendary', 'icon']);
export const cardVersionSchema = z.enum(['base', 'inform', 'epic_moment', 'icon']);

export const epicMomentSchema = z
  .object({
    id: slug,
    basePlayerId: slug,
    label: z.string().min(1),
    rarity: z.enum(['epic', 'legendary']),
    attributes: anyAttributesSchema,
  })
  .strict();

export const cardDefinitionSchema = z
  .object({
    id: slug,
    basePlayerId: slug,
    version: cardVersionSchema,
    rarity: raritySchema,
    label: z.string().min(1).optional(),
    attributes: anyAttributesSchema,
    frozen: z.boolean(),
  })
  .strict();
