import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const buildTime = Date.now()
const versionFile = path.resolve(__dirname, 'public', 'version.json')
fs.writeFileSync(versionFile, JSON.stringify({ time: buildTime }))

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_TIME__: buildTime
  }
})
