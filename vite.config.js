import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Rekap-Data-PM/',  // ← UBAH INI (tambah nama repo)
});
