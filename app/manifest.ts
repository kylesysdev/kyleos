import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KyleOS 4.0',
    short_name: 'KyleOS',
    description: 'The Ultimate Lifelike Engine',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#00f3ff',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  };
}
