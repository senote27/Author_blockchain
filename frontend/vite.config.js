// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ipfs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ipfs/, '/ipfs')
      }
    }
  },
  define: {
    'process.env': {
      VITE_API_URL: JSON.stringify('http://localhost:8000'),
      VITE_IPFS_API_URL: JSON.stringify('http://localhost:5001'),
      VITE_IPFS_GATEWAY: JSON.stringify('http://localhost:8080'),
      VITE_CONTRACT_ADDRESS: JSON.stringify(process.env.VITE_CONTRACT_ADDRESS)
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'web3-vendor': ['ethers', 'web3'],
          'ipfs-vendor': ['ipfs-http-client']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['buffer']
  }
});