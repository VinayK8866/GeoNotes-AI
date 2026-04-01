import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.geonotes.ai',
  appName: 'GeoNotes AI',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BackgroundGeolocation: {
      locationAuthorization: 'always',
      fastestInterval: 10000,
      notificationTitle: 'GeoNotes Tracking Active',
      notificationText: 'Tracking your location for reminders.',
      notificationIconColor: '#4f46e5',
      notificationSmallIcon: 'notification_icon'
    }
  }
};

export default config;
