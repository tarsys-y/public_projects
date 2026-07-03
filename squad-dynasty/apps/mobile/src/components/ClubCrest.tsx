// Escudo do clube: PNG real (Europa), SVG real (Brasileirão) ou monograma
// estilizado com as cores reais do clube (MLS/Saudita — sem fonte de escudo
// baixável; ver DECISIONS.md).
import { Image, View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { clubById } from '../services/catalog';
import { crestPngs, crestSvgs } from '../services/crests';
import { SvgXml } from 'react-native-svg';

interface Props {
  clubId: string;
  size?: number;
}

/** Escudo (proporção 139×181 dos PNGs reais ≈ 0.77). */
export function ClubCrest({ clubId, size = 24 }: Props) {
  const width = size * 0.78;
  const png = crestPngs[clubId];
  if (png !== undefined) {
    return <Image source={png} style={{ width, height: size, resizeMode: 'contain' }} />;
  }
  const svg = crestSvgs[clubId];
  if (svg !== undefined) {
    return (
      <View style={{ width, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <SvgXml xml={svg} width={width} height={size} />
      </View>
    );
  }
  return <MonogramCrest clubId={clubId} width={width} height={size} />;
}

interface MonogramProps {
  width: number;
  height: number;
  clubId?: string;
  primary?: string;
  secondary?: string;
  initials?: string;
}

/** Escudo genérico (usado por clubes sem escudo real e pelo escudo do time do jogador). */
export function MonogramCrest({ clubId, width, height, primary, secondary, initials }: MonogramProps) {
  const club = clubId ? clubById.get(clubId) : undefined;
  const finalPrimary = primary ?? club?.primaryColor ?? '#444444';
  const finalSecondary = secondary ?? club?.secondaryColor ?? '#cccccc';
  const finalInitials = (initials ?? club?.shortName ?? '?').slice(0, 3).toUpperCase();
  return (
    <Svg width={width} height={height} viewBox="0 0 100 130">
      <Path
        d="M50 4 L92 18 L92 66 C92 96 74 116 50 126 C26 116 8 96 8 66 L8 18 Z"
        fill={finalPrimary}
        stroke={finalSecondary}
        strokeWidth={7}
      />
      <SvgText
        x={50}
        y={72}
        fontSize={finalInitials.length > 2 ? 30 : 38}
        fontWeight="bold"
        fill={finalSecondary}
        textAnchor="middle"
      >
        {finalInitials}
      </SvgText>
    </Svg>
  );
}
