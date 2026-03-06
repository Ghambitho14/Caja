import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'inline',
			includeAssets: ['icon.png'],
			manifest: {
				name: 'Sistema de Caja',
				short_name: 'Caja',
				description: 'Control de caja, pedidos y gastos',
				start_url: '/',
				display: 'standalone',
				background_color: '#f1f5f9',
				theme_color: '#0ea5e9',
				orientation: 'portrait-primary',
				lang: 'es',
				icons: [
					{ src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
				],
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts',
							expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
						},
					},
				],
			},
			devOptions: { enabled: true },
		}),
	],
});
