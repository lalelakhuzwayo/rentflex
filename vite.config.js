import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react()
    ],
    envPrefix: ['VITE_', 'SUPABASE_'],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});