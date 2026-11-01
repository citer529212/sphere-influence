import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react(),{
    name:'versioned-screen-cache',
    generateBundle(_options,bundle){this.emitFile({type:'asset',fileName:'build-assets.json',source:JSON.stringify(Object.keys(bundle).filter(file=>/\.(js|css)$/.test(file)).map(file=>'./'+file))});}
  }],
  base:'./',
  build:{
    manifest:true,
    rollupOptions:{output:{manualChunks(id){
      if(id.includes('/node_modules/three/'))return 'three-engine';
      if(/\/node_modules\/(react|react-dom|scheduler)\//.test(id))return 'react-runtime';
    }}}
  }
});
