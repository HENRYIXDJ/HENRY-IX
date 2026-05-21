import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const fontData = await readFile(path.join(process.cwd(), 'app/fonts/avathe.otf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          color: '#D8163F',
          fontFamily: 'Avathe',
        }}
      >
        <div style={{ fontSize: 180, marginBottom: 20 }}>HENRY IX</div>
        <div style={{ fontSize: 40, letterSpacing: '0.2em', color: '#ffffff', fontFamily: 'sans-serif' }}>DJ PORTAL</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Avathe',
          data: fontData,
          style: 'normal',
        },
      ],
    }
  );
}
