import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const layout = {
  type: 'div',
  props: {
    style: {
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', padding: '80px',
      background: 'linear-gradient(135deg, #2A1E34 0%, #1a0e24 100%)',
      color: '#E8E4DF', fontFamily: 'Fraunces', fontStyle: 'italic',
    },
    children: [
      { type: 'div', props: { style: { fontSize: '32px', display: 'flex', alignItems: 'center' },
        children: [
          { type: 'span', props: { children: 'blue' } },
          { type: 'span', props: { style: { color: '#B8A4D6', padding: '0 8px' }, children: '·' } },
          { type: 'span', props: { children: 'studio' } },
        ] } },
      { type: 'div', props: { style: { fontSize: '88px', lineHeight: 1.1, maxWidth: '1040px', display: 'flex' },
        children: 'A reading room, kept lit.' } },
      { type: 'div', props: { style: { fontSize: '20px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B8A4D6', fontFamily: 'Fraunces', fontStyle: 'italic', display: 'flex' },
        children: 'blue studio · 2026' } },
    ],
  },
};

const fontPath = path.resolve('public/fonts/Fraunces-Italic.ttf');
const fontData = await fs.readFile(fontPath);
const svg = await satori(layout, {
  width: 1200, height: 630,
  fonts: [
    { name: 'Fraunces', data: fontData, weight: 400, style: 'italic' },
  ],
});
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
await fs.writeFile(path.resolve('public/og-default.png'), png);
console.log('Wrote public/og-default.png');
