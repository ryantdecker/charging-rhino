import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { handleApi } from './server/handle.ts'

function mountApi(middlewares: Connect.Server): void {
  middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const handled = await handleApi(req, res)
    if (!handled) next()
  })
}

function rhinoApi(): Plugin {
  return {
    name: 'charging-rhino-api',
    configureServer(server: ViteDevServer) {
      mountApi(server.middlewares)
    },
    configurePreviewServer(server) {
      mountApi(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [
    rhinoApi(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['mark-head.png', 'apple-touch-icon.png', 'journey.png'],
      devOptions: { enabled: true },
      manifest: {
        name: 'Charging Rhino',
        short_name: 'Rhino',
        description: 'Make progress. Build momentum.',
        theme_color: '#23334D',
        background_color: '#EDE6DA',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        mode: 'development',
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 4747,
    strictPort: true,
  },
})
