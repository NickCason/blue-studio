// JSX-based layout for satori. Note: satori supports a SUBSET of CSS — flexbox,
// fixed sizes, basic colors, font-family, etc. No grid, no transforms, no
// pseudo-elements.
export interface OgPayload {
  title: string;
  type: string;       // 'ESSAY' | 'NOTE' | 'PHOTO' | ...
  year: string | number;
}

export function ogJsx({ title, type, year }: OgPayload) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        background: 'linear-gradient(135deg, #2A1E34 0%, #1a0e24 100%)',
        color: '#E8E4DF',
        fontFamily: 'Fraunces',
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', fontSize: '28px', fontStyle: 'italic', color: '#E8E4DF' },
            children: [
              { type: 'span', props: { children: 'blue' } },
              { type: 'span', props: { style: { color: '#B8A4D6', padding: '0 6px' }, children: '·' } },
              { type: 'span', props: { children: 'studio' } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: title.length > 50 ? '64px' : '88px',
              lineHeight: 1.1,
              fontStyle: 'italic',
              maxWidth: '1040px',
              color: '#E8E4DF',
              fontWeight: 400,
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              gap: '14px',
              fontSize: '20px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#B8A4D6',
              fontFamily: 'Fraunces',
              fontStyle: 'italic',
            },
            children: [
              { type: 'span', props: { children: String(type) } },
              { type: 'span', props: { children: '·' } },
              { type: 'span', props: { children: String(year) } },
            ],
          },
        },
      ],
    },
  } as const;
}
