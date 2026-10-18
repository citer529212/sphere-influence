import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react()],
  base:'./',
  build:{
    manifest:true,
    rollupOptions:{output:{manualChunks(id){
      if(id.includes('/node_modules/three/'))return 'three-engine';
      if(/\/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'react-runtime';
    }}}
  }
});
