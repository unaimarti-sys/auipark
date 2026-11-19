import { useCallback, useState } from 'react';
import api from '../services/api.js';

export function useReservationController() {
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [reservations, setReservations] = useState([]);
  const [listError, setListError] = useState(null);

  const createReservation = useCallback(async (payload) => {
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    try {
      const data = await api.post('/reservations', payload);
      return data.reservation;
    } catch (err) {
      setSubmitError(err.message);
      setFieldErrors(err.fields || {});
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await api.get('/reservations/mine');
      setReservations(data.results || []);
      return data.results || [];
    } catch (err) {
      setListError(err.message);
      setReservations([]);
      return [];
    } finally {
      setLoadingList(false);
    }
  }, []);

  const cancelReservation = useCallback(async (code) => {
    const data = await api.patch(`/reservations/${encodeURIComponent(code)}/cancel`);
    setReservations((current) => current.map((r) => (r.code === code ? data.reservation : r)));
    return data.reservation;
  }, []);

  const getVehicles = useCallback(async () => {
    const data = await api.get('/vehicles/mine');
    return data.results || [];
  }, []);

  const getParking = useCallback(async (id) => {
    const data = await api.get(`/parkings/${id}`);
    return data.parking;
  }, []);

  return {
    submitting,
    loadingList,
    submitError,
    fieldErrors,
    reservations,
    listError,
    createReservation,
    loadMine,
    getVehicles,
    cancelReservation,
    getParking,
  };
}

export default useReservationController;
