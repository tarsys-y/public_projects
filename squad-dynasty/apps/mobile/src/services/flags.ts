// Bandeira emoji por código de nacionalidade (ISO 3166-1 alpha-2 + home
// nations EN/SC/WL/NI usados pela química). Emoji renderiza nativo no RN.
const REGIONAL_A = 0x1f1e6;

// Home nations: Inglaterra/Escócia/País de Gales têm emoji próprio (tag
// sequences 🏴 gb*); Irlanda do Norte não tem — cai no Reino Unido.
const TAG_FLAGS: Record<string, string> = {
  EN: flagTag('gbeng'),
  SC: flagTag('gbsct'),
  WL: flagTag('gbwls'),
  NI: regionalFlag('GB'),
};

function flagTag(code: string): string {
  const BLACK_FLAG = 0x1f3f4;
  const TAG_BASE = 0xe0000;
  const CANCEL = 0xe007f;
  return String.fromCodePoint(
    BLACK_FLAG,
    ...[...code].map((ch) => TAG_BASE + ch.charCodeAt(0)),
    CANCEL,
  );
}

function regionalFlag(iso2: string): string {
  return String.fromCodePoint(
    REGIONAL_A + (iso2.charCodeAt(0) - 65),
    REGIONAL_A + (iso2.charCodeAt(1) - 65),
  );
}

export function flagEmoji(nationality: string): string {
  const code = nationality.toUpperCase();
  if (TAG_FLAGS[code]) return TAG_FLAGS[code];
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return regionalFlag(code);
}
