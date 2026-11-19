import { useCallback, useEffect, useRef, useState } from 'react';

export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);
  const watchId = useRef(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización');
      return Promise.resolve(null);
    }
    setLocating(true);
    setError(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setPosition(next);
          setLocating(false);
          resolve(next);
        },
        (err) => {
          setError(
            err.code === err.PERMISSION_DENIED
              ? 'Has denegado el acceso a tu ubicación'
              : 'No se pudo obtener tu ubicación'
          );
          setLocating(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  useEffect(() => {
    const currentWatch = watchId.current;
    return () => {
      if (currentWatch != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(currentWatch);
      }
    };
  }, []);

  return { position, error, locating, locate };
}

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default useGeolocation;
