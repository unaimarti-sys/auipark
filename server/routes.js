import { Router } from 'express';
import { handle } from './errors.js';
import { requireRole } from './middlewares/auth.js';
import * as Public from './controllers/public.controller.js';
import * as Client from './controllers/client.controller.js';
import * as Empleado from './controllers/empleado.controller.js';
import * as Admin from './controllers/admin.controller.js';

const r = Router();
const logged = requireRole();
const empleado = requireRole('empleado');
const admin = requireRole('admin');

// Público
r.get('/health', handle(Public.health));
r.get('/parkings', handle(Public.listParkings));
r.get('/parkings/:id', handle(Public.showParking));
r.get('/parkings/:id/quote', handle(Public.quote));
r.get('/services', handle(Public.services));
r.get('/geo/search', handle(Public.geoSearch));

// Usuario con sesión (cualquier rol)
r.get('/me', handle(Client.me));
r.patch('/me', logged, handle(Client.updateMe));
r.post('/reservations', logged, handle(Client.createReservation));
r.get('/reservations/mine', logged, handle(Client.myReservations));
r.get('/reservations/code/:code', logged, handle(Client.showReservation));
r.patch('/reservations/:code/cancel', logged, handle(Client.cancelReservation));
r.get('/vehicles/mine', logged, handle(Client.myVehicles));

// Empleado de parking
r.get('/empleado/parking', empleado, handle(Empleado.myParking));
r.get('/empleado/reservations', empleado, handle(Empleado.reservations));
r.patch('/empleado/reservations/:code/salida', empleado, handle(Empleado.registerExit));

// Administración
r.get('/admin/stats', admin, handle(Admin.stats));
r.get('/admin/parkings', admin, handle(Admin.parkings));
r.post('/admin/parkings', admin, handle(Admin.createParking));
r.put('/admin/parkings/:id', admin, handle(Admin.updateParking));
r.delete('/admin/parkings/:id', admin, handle(Admin.deleteParking));
r.post('/admin/services', admin, handle(Admin.createService));
r.delete('/admin/services/:id', admin, handle(Admin.deleteService));
r.get('/admin/users', admin, handle(Admin.users));
r.patch('/admin/users/:id', admin, handle(Admin.updateUser));
r.get('/admin/reservations', admin, handle(Admin.reservations));
r.patch('/admin/reservations/:code/status', admin, handle(Admin.updateReservationStatus));

export default r;
