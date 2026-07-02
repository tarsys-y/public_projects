// Clássicos e rivalidades (Brasfoot/FM): num derby o bigGame conta desde o
// primeiro minuto (MatchInput.isDerby) e a carreira paga bônus.
const PAIRS: Array<[string, string, string]> = [
  // Brasil
  ['flamengo', 'fluminense', 'Fla-Flu'],
  ['flamengo', 'vasco', 'Clássico dos Milhões'],
  ['flamengo', 'botafogo', 'Clássico da Rivalidade'],
  ['fluminense', 'botafogo', 'Clássico Vovô'],
  ['vasco', 'botafogo', 'Clássico da Amizade'],
  ['corinthians', 'palmeiras', 'Derby Paulista'],
  ['corinthians', 'sao-paulo', 'Majestoso'],
  ['sao-paulo', 'palmeiras', 'Choque-Rei'],
  ['santos', 'corinthians', 'Clássico Alvinegro'],
  ['santos', 'sao-paulo', 'San-São'],
  ['gremio', 'internacional', 'Grenal'],
  ['atletico-mg', 'cruzeiro', 'Clássico Mineiro'],
  ['bahia', 'vitoria', 'Ba-Vi'],
  ['coritiba', 'athletico-pr', 'Atletiba'],
  ['ceara', 'fortaleza', 'Clássico-Rei'],
  // Europa
  ['real-madrid', 'fc-barcelona', 'El Clásico'],
  ['real-madrid', 'atletico-de-madrid', 'Derby de Madrid'],
  ['ac-milan', 'inter', 'Derby della Madonnina'],
  ['juventus', 'inter', 'Derby d’Italia'],
  ['roma', 'lazio', 'Derby della Capitale'],
  ['liverpool', 'manchester-united', 'Clássico da Inglaterra'],
  ['manchester-city', 'manchester-united', 'Derby de Manchester'],
  ['arsenal-fc', 'tottenham-hotspur', 'North London Derby'],
  ['borussia-dortmund', 'fc-bayern-munchen', 'Der Klassiker'],
  ['ajax', 'feyenoord', 'De Klassieker'],
  ['sl-benfica', 'fc-porto', 'O Clássico'],
  ['sl-benfica', 'sporting-cp', 'Derby de Lisboa'],
  ['paris-saint-germain', 'olympique-de-marseille', 'Le Classique'],
  // Saudita / MLS
  ['al-hilal', 'al-nassr', 'Derby de Riade'],
  ['al-ittihad', 'al-ahli-sfc', 'Derby de Gidá'],
  ['la-galaxy', 'lafc', 'El Tráfico'],
  ['inter-miami', 'orlando-city', 'Clásico del Sol'],
];

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const MAP = new Map(PAIRS.map(([a, b, name]) => [key(a, b), name]));

export function rivalryName(clubA: string, clubB: string): string | null {
  return MAP.get(key(clubA, clubB)) ?? null;
}

export function isRivalry(clubA: string, clubB: string): boolean {
  return MAP.has(key(clubA, clubB));
}
