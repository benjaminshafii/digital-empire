import type { APIRoute } from 'astro';
import satori from 'satori';
import sharp from 'sharp';

export const GET: APIRoute = async ({ params }) => {
  const title = decodeURIComponent(params.title || 'Blog Post');

  // Fetch Inter font
  const fontResponse = await fetch(
    'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2'
  );
  const fontData = await fontResponse.arrayBuffer();

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          padding: '60px',
          fontFamily: 'Inter',
        },
        children: [
          // Top bar
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '3px solid #050505',
                paddingBottom: '20px',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.2em',
                      color: '#666',
                    },
                    children: 'BENJAMIN SHAFII',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      gap: '8px',
                    },
                    children: [
                      { type: 'div', props: { style: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#050505' } } },
                      { type: 'div', props: { style: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#050505' } } },
                      { type: 'div', props: { style: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#050505' } } },
                    ],
                  },
                },
              ],
            },
          },
          // Title
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                flex: 1,
                paddingTop: '40px',
                paddingBottom: '40px',
              },
              children: {
                type: 'h1',
                props: {
                  style: {
                    fontSize: title.length > 50 ? '48px' : title.length > 30 ? '56px' : '72px',
                    fontWeight: 900,
                    lineHeight: 1.1,
                    letterSpacing: '-0.03em',
                    color: '#050505',
                    textTransform: 'uppercase',
                    margin: 0,
                  },
                  children: title,
                },
              },
            },
          },
          // Bottom bar
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '3px solid #050505',
                paddingTop: '20px',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: '#666',
                    },
                    children: 'blog.benjaminshafii.com',
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '18px',
                      fontWeight: 700,
                      backgroundColor: '#050505',
                      color: '#fff',
                      padding: '8px 16px',
                    },
                    children: 'B.SHAFII',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          weight: 900,
          style: 'normal',
        },
      ],
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

export const prerender = false;
