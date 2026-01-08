import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import AccessControl from './pages/porteria/AccessControl';
import Inventario from './pages/porteria/Inventario';
import BasculaDashboard from './pages/bascula/BasculaDashboard';
import BasculaReportes from './pages/bascula/BasculaReportes';
import CapacitacionesDashboard from './pages/capacitaciones/CapacitacionesDashboard';
import CapacitacionesProgramacion from './pages/capacitaciones/CapacitacionesProgramacion';
import CapacitacionesEvaluaciones from './pages/capacitaciones/CapacitacionesEvaluaciones';
import RealizarEvaluacion from './pages/capacitaciones/RealizarEvaluacion';
import CapacitacionesSesiones from './pages/capacitaciones/CapacitacionesSesiones';
import EvaluacionBuilder from './pages/capacitaciones/EvaluacionBuilder';
import CapacitacionesConfig from './pages/capacitaciones/CapacitacionesConfig';
import CapacitacionesReportes from './pages/capacitaciones/CapacitacionesReportes';
import AdminUnified from './pages/admin/AdminUnified';
import AgronomiaPermisos from './pages/agronomia/AgronomiaPermisos';
import AgronomiaDashboard from './pages/agronomia/AgronomiaDashboard';
import FechaCorte from './pages/agronomia/FechaCorte';
import TanquesDashboard from './pages/laboratorio/TanquesDashboard';
import CalidadDashboard from './pages/laboratorio/CalidadDashboard';
import ProgramacionDashboard from './pages/logistica/ProgramacionDashboard';
import NuevaRemision from './pages/logistica/NuevaRemision';
import ProtectedRoute from './components/layout/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/porteria" element={<AccessControl />} />
              <Route path="/porteria/inventario" element={<Inventario />} />
              <Route path="/bascula" element={<BasculaDashboard />} />
              <Route path="/bascula/reportes" element={<BasculaReportes />} />
              <Route path="/capacitaciones/dashboard" element={<CapacitacionesDashboard />} />
              <Route path="/capacitaciones/programacion" element={<CapacitacionesProgramacion />} />
              <Route path="/evaluaciones" element={<CapacitacionesEvaluaciones />} />
              <Route path="/evaluaciones/realizar/:id_formulario/:id_header" element={<RealizarEvaluacion />} />
              <Route path="/capacitaciones/sesiones" element={<CapacitacionesSesiones />} />
              <Route path="/capacitaciones/sesiones/:id/evaluacion" element={<EvaluacionBuilder />} />
              <Route path="/capacitaciones/config" element={<CapacitacionesConfig />} />
              <Route path="/capacitaciones/reportes" element={<CapacitacionesReportes />} />
              <Route path="/agronomia/permisos" element={<AgronomiaPermisos />} />
              <Route path="/agronomia/dashboard" element={<AgronomiaDashboard />} />
              <Route path="/agronomia/fecha-corte" element={<FechaCorte />} />
              <Route path="/laboratorio" element={<Navigate to="/laboratorio/tanques" replace />} />
              <Route path="/laboratorio/tanques" element={<TanquesDashboard />} />
              <Route path="/laboratorio/calidad" element={<CalidadDashboard />} />
              <Route path="/logistica" element={<Navigate to="/logistica/programacion" replace />} />
              <Route path="/logistica/programacion" element={<ProgramacionDashboard />} />
              <Route path="/logistica/remision" element={<NuevaRemision />} />
              <Route path="/admin/gestion" element={<AdminUnified />} />
              <Route path="/admin/usuarios" element={<AdminUnified />} /> {/* Redirect/Alias */}
              <Route path="/admin/colaboradores" element={<AdminUnified />} /> {/* Redirect/Alias */}
              {/* Add more routes here */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
