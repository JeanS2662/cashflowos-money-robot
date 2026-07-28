import type { MetadataRoute } from 'next'

// PWA manifest. Next's App Router serves this at /manifest.webmanifest (NOT
// /manifest.json) — which is why proxy.ts excludes that exact path, so
// Add-to-Home-Screen can read it without the passcode. `display: standalone`
// makes the installed app open full-screen, like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CashFlowOS AI Agents',
    short_name: 'CashFlowOS',
    description: 'Your Money Robot — one AI HQ for the whole business.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF7F2',
    theme_color: '#D97757',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
