import { useState, useEffect, useCallback } from 'react';
import { Coordinates } from '../types';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface GeolocationOptions extends PositionOptions {
  autoEnable?: boolean;
}

export const useGeolocation = (options?: GeolocationOptions) => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const handleSuccess = useCallback((position: any) => {
    // Both standard GeolocationPosition and Capacitor Position have these coords
    const coords = position.coords;
    setLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    setAccuracy(coords.accuracy);
    setError(null);
  }, []);

  const requestLocation = useCallback(async () => {
    setEnabled(true);
    
    if (isNative) {
      try {
        const permissions = await Geolocation.requestPermissions();
        if (permissions.location !== 'granted') {
          setError('Location permission denied');
          return;
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 20000
        });
        handleSuccess(position);
      } catch (err: any) {
        setError(err.message || 'Failed to get native location');
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleSuccess(position);
          resolve();
        },
        (err) => {
          setError(err.message);
          reject(err);
        },
        { 
          enableHighAccuracy: options?.enableHighAccuracy ?? true, 
          timeout: options?.timeout ?? 20000 
        }
      );
    });
  }, [handleSuccess, isNative, options?.enableHighAccuracy, options?.timeout]);

  useEffect(() => {
    if (options?.autoEnable && !enabled) {
        setEnabled(true);
    }
  }, [options?.autoEnable, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let watcher: any;

    if (isNative) {
      const startNativeWatch = async () => {
        watcher = await Geolocation.watchPosition(
          { 
            enableHighAccuracy: options?.enableHighAccuracy ?? true,
            timeout: options?.timeout ?? 20000 
          }, 
          (pos) => pos && handleSuccess(pos)
        );
      };
      startNativeWatch();
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watcher = navigator.geolocation.watchPosition(handleSuccess, (err) => setError(err.message), {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 20000,
        maximumAge: options?.maximumAge ?? 60000
      });
    }

    return () => {
      if (isNative && watcher) {
        Geolocation.clearWatch({ id: watcher });
      } else if (watcher !== undefined) {
        navigator.geolocation.clearWatch(watcher);
      }
    };
  }, [enabled, handleSuccess, isNative, options?.enableHighAccuracy, options?.timeout, options?.maximumAge]);

  return { location, error, requestLocation, accuracy };
};