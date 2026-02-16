
import { useState, useEffect, useCallback } from 'react';
import { Coordinates } from '../types';

export const useGeolocation = () => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    setError(null);
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setError("User denied the request for Geolocation.");
        break;
      case error.POSITION_UNAVAILABLE:
        setError("Location information is unavailable.");
        break;
      case error.TIMEOUT:
        setError("The request to get user location timed out.");
        break;
      default:
        setError("An unknown error occurred.");
        break;
    }
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setEnabled(true);

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleSuccess(position);
          resolve();
        },
        (err) => {
          handleError(err);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 20000 }
      );
    });
  }, [handleSuccess, handleError]);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    // Start watching position once enabled
    const watcher = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000
    });

    return () => navigator.geolocation.clearWatch(watcher);
  }, [enabled, handleSuccess, handleError]);

  return { location, error, requestLocation };
};