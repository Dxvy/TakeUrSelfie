import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.capsule.selfie',
  appName: 'TakeUrSelfie',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"]
    },
    Geolocation: {
      permissions: ["location"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#667eea",
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Splash"
    }
  }
};

export default config;
