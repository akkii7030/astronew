import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.akhilesh.astro',
  appName: 'Astro App',
  webDir: 'capacitor-dist',
  server: {
    // Replace this with your actual Vercel hosting URL once deployed
    url: 'http://192.168.0.107:5173',
    cleartext: true
  }
};

export default config;
