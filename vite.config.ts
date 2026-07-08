import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const buildTime = Date.now()
fs.writeFileSync('public/version.json', JSON.stringify({ time: buildTime }))

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_TIME__: buildTime
  }
})
