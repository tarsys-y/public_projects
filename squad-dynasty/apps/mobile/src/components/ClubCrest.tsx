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

function MonogramCrest({ clubId, width, height }: { clubId: string; width: number; height: number }) {
  const club = clubById.get(clubId);
  const primary = club?.primaryColor ?? '#444444';
  const secondary = club?.secondaryColor ?? '#cccccc';
  const initials = (club?.shortName ?? '?').slice(0, 3).toUpperCase();
  return (
    <Svg width={width} height={height} viewBox="0 0 100 130">
      <Path
        d="M50 4 L92 18 L92 66 C92 96 74 116 50 126 C26 116 8 96 8 66 L8 18 Z"
        fill={primary}
        stroke={secondary}
        strokeWidth={7}
      />
      <SvgText
        x={50}
        y={72}
        fontSize={initials.length > 2 ? 30 : 38}
        fontWeight="bold"
        fill={secondary}
        textAnchor="middle"
      >
        {initials}
      </SvgText>
    </Svg>
  );
}
