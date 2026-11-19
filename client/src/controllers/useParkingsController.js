import { useCallback, useState } from 'react';
import api from '../services/api.js';

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useParkingsController() {
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadParkings = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/parkings${buildQuery(params)}`);
      setParkings(data.results || []);
      return data.results || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { parkings, setParkings, loading, error, setError, loadParkings };
}

export default useParkingsController;
