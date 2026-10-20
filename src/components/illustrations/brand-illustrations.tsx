import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

type Props = {
  width?: number;
};

export function WelcomeIllustration({ width = 240 }: Props) {
  const height = width * 0.7;
  return (
    <Svg width={width} height={height} viewBox="0 0 240 168" accessibilityRole="image" accessibilityLabel="Illustrated apartment building">
      <Ellipse cx="120" cy="150" rx="86" ry="10" fill={Brand.primaryLight} />
      <Circle cx="188" cy="36" r="16" fill={Brand.accent} />
      <Ellipse cx="46" cy="48" rx="18" ry="8" fill={Brand.white} />
      <Ellipse cx="64" cy="44" rx="14" ry="7" fill={Brand.white} />
      <Rect x="78" y="62" width="84" height="78" rx="16" fill={Brand.primary} />
      <Rect x="92" y="78" width="16" height="14" rx="3" fill={Brand.accentLight} />
      <Rect x="116" y="78" width="16" height="14" rx="3" fill={Brand.white} />
      <Rect x="140" y="78" width="12" height="14" rx="3" fill={Brand.accentLight} />
      <Rect x="92" y="100" width="16" height="14" rx="3" fill={Brand.white} />
      <Rect x="116" y="100" width="16" height="14" rx="3" fill={Brand.accent} />
      <Rect x="140" y="100" width="12" height="14" rx="3" fill={Brand.white} />
      <Path d="M108 140h24v22h-24z" fill={Brand.primaryDark} />
      <Path d="M58 118c8-18 18-28 28-28" stroke={Brand.success} strokeWidth="4" strokeLinecap="round" fill="none" />
      <Circle cx="54" cy="122" r="8" fill={Brand.success} />
    </Svg>
  );
}

export function CityIllustration({ width = 180 }: Props) {
  const height = width * 0.62;
  return (
    <Svg width={width} height={height} viewBox="0 0 180 112" accessibilityRole="image" accessibilityLabel="Illustrated city skyline">
      <Rect x="18" y="48" width="36" height="52" rx="10" fill={Brand.primaryLight} />
      <Rect x="64" y="28" width="48" height="72" rx="12" fill={Brand.primary} />
      <Rect x="122" y="42" width="40" height="58" rx="10" fill={Brand.primaryDark} />
      <Rect x="76" y="42" width="10" height="10" rx="2" fill={Brand.white} />
      <Rect x="92" y="42" width="10" height="10" rx="2" fill={Brand.accent} />
      <Rect x="76" y="58" width="10" height="10" rx="2" fill={Brand.accentLight} />
      <Rect x="92" y="58" width="10" height="10" rx="2" fill={Brand.white} />
      <Circle cx="146" cy="24" r="6" fill={Brand.accent} />
    </Svg>
  );
}

export function EmptyPropertyIllustration({ width = 140 }: Props) {
  const height = width * 0.8;
  return (
    <Svg width={width} height={height} viewBox="0 0 140 112" accessibilityRole="image" accessibilityLabel="Illustrated empty home">
      <Path d="M70 18l46 36v40a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V54z" fill={Brand.primaryLight} />
      <Path d="M70 18l46 36H24z" fill={Brand.primary} />
      <Rect x="58" y="68" width="24" height="34" rx="6" fill={Brand.white} />
    </Svg>
  );
}

export function EmptySavedIllustration({ width = 140 }: Props) {
  const height = width * 0.8;
  return (
    <Svg width={width} height={height} viewBox="0 0 140 112" accessibilityRole="image" accessibilityLabel="Illustrated saved stay">
      <Rect x="34" y="28" width="72" height="64" rx="16" fill={Brand.primaryLight} />
      <Path d="M70 46c8 0 14 7 14 14 0 12-14 22-14 22s-14-10-14-22c0-7 6-14 14-14z" fill={Brand.accent} />
    </Svg>
  );
}

export function EmptyActivityIllustration({ width = 140 }: Props) {
  const height = width * 0.8;
  return (
    <Svg width={width} height={height} viewBox="0 0 140 112" accessibilityRole="image" accessibilityLabel="Illustrated calendar">
      <Rect x="28" y="30" width="84" height="64" rx="14" fill={Brand.primaryLight} />
      <Rect x="28" y="30" width="84" height="18" rx="8" fill={Brand.primary} />
      <Circle cx="48" cy="66" r="6" fill={Brand.accent} />
      <Circle cx="70" cy="66" r="6" fill={Brand.white} />
      <Circle cx="92" cy="66" r="6" fill={Brand.white} />
    </Svg>
  );
}

export function OwnerWelcomeIllustration({ width = 168 }: Props) {
  const height = width * 0.7;
  return (
    <Svg width={width} height={height} viewBox="0 0 168 118" accessibilityRole="image" accessibilityLabel="Illustrated managed building">
      <Rect x="36" y="28" width="96" height="74" rx="16" fill={Brand.primary} />
      <Rect x="52" y="44" width="18" height="14" rx="3" fill={Brand.white} />
      <Rect x="76" y="44" width="18" height="14" rx="3" fill={Brand.accent} />
      <Rect x="100" y="44" width="18" height="14" rx="3" fill={Brand.white} />
      <Rect x="52" y="66" width="18" height="14" rx="3" fill={Brand.accentLight} />
      <Rect x="76" y="66" width="18" height="14" rx="3" fill={Brand.white} />
      <Rect x="100" y="66" width="18" height="14" rx="3" fill={Brand.accentLight} />
    </Svg>
  );
}

export function SuccessIllustration({ width = 96 }: Props) {
  const height = width;
  return (
    <Svg width={width} height={height} viewBox="0 0 96 96" accessibilityRole="image" accessibilityLabel="Illustrated check mark">
      <Circle cx="48" cy="48" r="36" fill={Brand.successLight} />
      <Path d="M32 49l10 10 22-24" stroke={Brand.success} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
