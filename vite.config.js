import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        obs: resolve(__dirname, 'obs-widget.html'),
        mobile: resolve(__dirname, 'mobile.html'),
      }
    }
  },
  server: {
    proxy: {
      '/api/webrtc': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
