import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 서브경로 배포: restboy2606.github.io/2026-06-16
export default defineConfig({
  plugins: [react()],
  base: '/2026-06-16/',
})
