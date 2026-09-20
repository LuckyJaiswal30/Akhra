import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Akhra — Where Society Meets Innovation',
    short_name: 'Akhra',
    description: "The gathering ground for Jharkhand's challenges and the people solving them",
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F9F8',
    theme_color: '#1F6B45',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
