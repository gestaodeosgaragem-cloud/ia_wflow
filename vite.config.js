import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/webhook': {
                target: 'https://webhook.garagem.dev.br',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/webhook/, '/webhook'),
                secure: true,
            }
        }
    }
})
