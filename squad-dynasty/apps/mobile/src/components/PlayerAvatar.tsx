// Busto cartunesco do jogador desenhado em SVG a partir das feições
// determinísticas de avatar.ts — mesma cara em qualquer aparelho, camisa nas
// cores reais do clube (ícones: uniforme dourado das lendas).
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { clubById } from '../services/catalog';
import { faceFeatures, kitColors } from '../services/avatar';

interface Props {
  playerId: string;
  clubId: string;
  isIcon?: boolean;
  size?: number;
}

export function PlayerAvatar({ playerId, clubId, isIcon = false, size = 56 }: Props) {
  const face = faceFeatures(playerId);
  const kit = kitColors(clubById.get(clubId), isIcon);
  const hair = face.hairColor;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* camisa com gola e ombros */}
      <Path d="M16 100 C20 78 33 71 50 71 C67 71 80 78 84 100 Z" fill={kit.primary} />
      <Path d="M16 100 C18 88 23 80 30 76 L34 100 Z" fill={kit.secondary} opacity={0.85} />
      <Path d="M84 100 C82 88 77 80 70 76 L66 100 Z" fill={kit.secondary} opacity={0.85} />
      <Path d="M42 72 L50 81 L58 72 L54 71 L50 76 L46 71 Z" fill={kit.secondary} />
      {/* pescoço */}
      <Rect x={44} y={58} width={12} height={16} rx={4} fill={face.skin} />
      {/* orelhas + cabeça */}
      <Circle cx={32.5} cy={45} r={3.6} fill={face.skin} />
      <Circle cx={67.5} cy={45} r={3.6} fill={face.skin} />
      <Ellipse cx={50} cy={43} rx={17} ry={19.5} fill={face.skin} />
      <Hair style={face.hairStyle} color={hair} />
      {/* sobrancelhas, olhos, nariz e boca */}
      <Rect x={39.5} y={38} width={7.5} height={2} rx={1} fill={hair} />
      <Rect x={53} y={38} width={7.5} height={2} rx={1} fill={hair} />
      <Circle cx={43.5} cy={43.5} r={1.9} fill="#1f2430" />
      <Circle cx={56.5} cy={43.5} r={1.9} fill="#1f2430" />
      <Path
        d="M50 45.5 Q51.5 49 50 50.5"
        stroke={face.skinShade}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
      <FacialHair style={face.facialHair} color={hair} />
      <Path
        d="M45 55 Q50 58.5 55 55"
        stroke={face.skinShade}
        strokeWidth={1.7}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

function Hair({ style, color }: { style: string; color: string }) {
  switch (style) {
    case 'buzz':
      return (
        <Path
          d="M33 38 C33 25 40 20 50 20 C60 20 67 25 67 38 C67 31 60 26.5 50 26.5 C40 26.5 33 31 33 38 Z"
          fill={color}
        />
      );
    case 'short':
      return (
        <Path
          d="M32.5 40 C32.5 22 41 17.5 50 17.5 C59 17.5 67.5 22 67.5 40 C67.5 32 61 28.5 50 28.5 C39 28.5 32.5 32 32.5 40 Z"
          fill={color}
        />
      );
    case 'curly':
      return (
        <>
          <Path
            d="M32.5 40 C32.5 24 41 19 50 19 C59 19 67.5 24 67.5 40 C67.5 33 61 29.5 50 29.5 C39 29.5 32.5 33 32.5 40 Z"
            fill={color}
          />
          <Circle cx={36} cy={27} r={4.4} fill={color} />
          <Circle cx={43} cy={21.5} r={4.6} fill={color} />
          <Circle cx={50} cy={19.5} r={4.8} fill={color} />
          <Circle cx={57} cy={21.5} r={4.6} fill={color} />
          <Circle cx={64} cy={27} r={4.4} fill={color} />
        </>
      );
    case 'long':
      return (
        <Path
          d="M31 62 C31 66 34 68 37 66 L36.5 44 C39.5 33 60.5 33 63.5 44 L63 66 C66 68 69 66 69 62 L67.5 36 C67.5 20 59 16 50 16 C41 16 32.5 20 32.5 36 Z"
          fill={color}
        />
      );
    case 'topknot':
      return (
        <>
          <Path
            d="M33.5 38 C33.5 24 41 19.5 50 19.5 C59 19.5 66.5 24 66.5 38 C66.5 31 60 27.5 50 27.5 C40 27.5 33.5 31 33.5 38 Z"
            fill={color}
          />
          <Circle cx={50} cy={14.5} r={5.2} fill={color} />
        </>
      );
    default:
      return null; // bald
  }
}

function FacialHair({ style, color }: { style: string; color: string }) {
  switch (style) {
    case 'stubble':
      return (
        <Path
          d="M36 47 C37 59 43 63.5 50 63.5 C57 63.5 63 59 64 47 C62 56.5 56 60 50 60 C44 60 38 56.5 36 47 Z"
          fill={color}
          opacity={0.35}
        />
      );
    case 'beard':
      return (
        <Path
          d="M35 45 C35.5 60 43 65 50 65 C57 65 64.5 60 65 45 C64 53 60 57.5 55.5 58.5 L55 51.5 L45 51.5 L44.5 58.5 C40 57.5 36 53 35 45 Z"
          fill={color}
          opacity={0.92}
        />
      );
    case 'mustache':
      return <Path d="M43.5 51.5 Q50 55 56.5 51.5 Q50 57 43.5 51.5 Z" fill={color} />;
    default:
      return null;
  }
}
