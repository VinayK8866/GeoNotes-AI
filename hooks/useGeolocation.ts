
import { useState, useEffect, useCallback } from 'react';
import { Coordinates, LocationAccuracy } from '../types';

export const useGeolocation = (accuracy: LocationAccuracy = 'high') => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (position: GeolocationPosition) => {
    console.log("Geolocation success:", position.coords);
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    setError(null);
  };

  const handleError = (error: GeolocationPositionError) => {
    console.error("Geolocation error:", error.code, error.message);
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
  };

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: accuracy === 'high'
    });
  }, [accuracy]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: accuracy === 'high',
      timeout: accuracy === 'high' ? 10000 : 30000,
      maximumAge: accuracy === 'high' ? 5000 : 60000
    };

    const watcher = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    return () => navigator.geolocation.clearWatch(watcher);
  }, [accuracy]);

  return { location, error, requestLocation };
};
