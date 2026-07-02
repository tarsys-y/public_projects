// Busto caricatura big-head do jogador: renderiza a árvore SVG determinística
// de avatarTree.ts (aparência curada ?? procedural, camisa nas cores do clube).
// A árvore é cacheada por jogador — a coleção renderiza dezenas de cartas.
import { memo } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { clubById } from '../services/catalog';
import { kitColors, resolveAppearance } from '../services/avatar';
import { buildAvatarTree, type SvgNode } from '../services/avatarTree';

interface Props {
  playerId: string;
  clubId: string;
  isIcon?: boolean;
  size?: number;
}

const TAGS = { path: Path, circle: Circle, ellipse: Ellipse, rect: Rect } as const;

const treeCache = new Map<string, SvgNode[]>();

function treeFor(playerId: string, clubId: string, isIcon: boolean): SvgNode[] {
  const key = `${playerId}:${clubId}:${isIcon ? 1 : 0}`;
  let tree = treeCache.get(key);
  if (!tree) {
    tree = buildAvatarTree(resolveAppearance(playerId), kitColors(clubById.get(clubId), isIcon));
    treeCache.set(key, tree);
  }
  return tree;
}

export const PlayerAvatar = memo(function PlayerAvatar({
  playerId,
  clubId,
  isIcon = false,
  size = 56,
}: Props) {
  const tree = treeFor(playerId, clubId, isIcon);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {tree.map((n, i) => {
        const Tag = TAGS[n.tag];
        return <Tag key={i} {...(n.props as object)} />;
      })}
    </Svg>
  );
});
