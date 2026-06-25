import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Sidebar from './components/common/Sidebar';
import Login from './pages/Login';
import Surveys from './pages/Surveys';
import Dashboard from './pages/Dashboard';
import CompanyView from './pages/CompanyView';
import SurveyDetail from './pages/SurveyDetail';
import TakeSurvey from './pages/TakeSurvey';
import UsersList from './pages/UsersList';
import CreateSurvey from './pages/CreateSurvey';
import ImportSurvey from './pages/ImportSurvey';

const DashboardLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      {/* Se añade el basename para encapsular toda la app bajo /dashboard */}
      <BrowserRouter basename="/dashboard">
        <Routes>
          {/* Esto ahora se renderizará en la URL: /dashboard/login */}
          <Route path="/login" element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            {/* Esto ahora será la raíz de la app: /dashboard/ */}
            <Route path="/" element={<Surveys />} />
            
            {/* AQUÍ: Esto se convertirá en /dashboard/dashboard */}
            <Route path="/metrics" element={<Dashboard />} />
            
            <Route path="/companies" element={<CompanyView />} />
            <Route path="/surveys/:id" element={<SurveyDetail />} />
            <Route path="/surveys/new" element={<CreateSurvey />} />
            <Route path="/surveys/import" element={<ImportSurvey />} />
            <Route path="/users" element={<UsersList />} />
          </Route>

          <Route path="/attempts/:attemptId/take" element={
            <ProtectedRoute>
              <TakeSurvey />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
