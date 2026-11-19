import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import LandingPage from './views/LandingPage.jsx';
import MapPage from './views/MapPage.jsx';
import ReservePage from './views/ReservePage.jsx';
import MyReservationsPage from './views/MyReservationsPage.jsx';
import LoginPage from './views/LoginPage.jsx';
import RegisterPage from './views/RegisterPage.jsx';
import EmpleadoPage from './views/EmpleadoPage.jsx';
import AdminPage from './views/AdminPage.jsx';
import NotFoundPage from './views/NotFoundPage.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          {/* Públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />

          {/* Requieren sesión (cualquier rol) */}
          <Route
            path="/reservar/:parkingId"
            element={
              <ProtectedRoute>
                <ReservePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservas"
            element={
              <ProtectedRoute>
                <MyReservationsPage />
              </ProtectedRoute>
            }
          />

          {/* Por rol */}
          <Route
            path="/empleado"
            element={
              <ProtectedRoute roles={['empleado']}>
                <EmpleadoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
