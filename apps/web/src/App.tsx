import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import RequireAuth from '@/components/auth/RequireAuth';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import DashboardPage from '@/pages/DashboardPage';
import RecipesPage from '@/pages/RecipesPage';
import RecipeDetailPage from '@/pages/RecipeDetailPage';
import PrepPlannerPage from '@/pages/PrepPlannerPage';
import ParLevelsPage from '@/pages/ParLevelsPage';
import PrepHistoryPage from '@/pages/PrepHistoryPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="recipes"      element={<RecipesPage />} />
          <Route path="recipes/:id"  element={<RecipeDetailPage />} />
          <Route path="prep"         element={<PrepPlannerPage />} />
          <Route path="par-levels"   element={<ParLevelsPage />} />
          <Route path="prep/history" element={<PrepHistoryPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
