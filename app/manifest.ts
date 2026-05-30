// app/manifest.ts
import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finance Dashboard',
    short_name: 'Finance',
    description: 'Track your long-term target indices and back them with assets',
    start_url: '/dashboard/goals', // Where the app should open
    display: 'standalone', // This hides the Safari browser UI
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}