import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import RecipesPage from '@/pages/RecipesPage';
import RecipeDetailPage from '@/pages/RecipeDetailPage';
import PrepPlannerPage from '@/pages/PrepPlannerPage';
import DashboardPage from '@/pages/DashboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/:id" element={<RecipeDetailPage />} />
        <Route path="prep" element={<PrepPlannerPage />} />
      </Route>
    </Routes>
  );
}
