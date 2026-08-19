const COLOR_MAP: Record<string, string> = {
  Ivory: '#F6F4EE', Sage: '#9CAF88', Black: '#1A1A1A', Cherry: '#9B2230', Navy: '#1F2A44',
  White: '#FFFFFF', Blush: '#F2D7D5', Cream: '#F4EFE6', Olive: '#6B6B3A',
  'Mid Wash': '#6B8AAE', 'Stonewash': '#A8B8C8', Ecru: '#E8E2D5', Camel: '#C19A6B',
  Champagne: '#EDE3D2',
};

export function colorHex(name: string): string {
  return COLOR_MAP[name] ?? '#E5E5E5';
}
