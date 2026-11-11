import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import useAuth from './hooks/useAuth'
import PublicHomePage from './pages/PublicHomePage'
import GuestPreviewPage from './pages/GuestPreviewPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import FarmsPage from './pages/FarmsPage'
import FarmDetailPage from './pages/FarmDetailPage'
import AdvicePage from './pages/AdvicePage'
import DecisionsPage from './pages/DecisionsPage'
import DecisionDetailPage from './pages/DecisionDetailPage'
import AssistantPage from './pages/AssistantPage'
import AlertsPage from './pages/AlertsPage'
import SubscriptionPage from './pages/SubscriptionPage'
import ReportPage from './pages/ReportPage'
import SeasonsPage from './pages/SeasonsPage'
import NotFoundPage from './pages/NotFoundPage'

function HomePage() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  return isAuthenticated ? <DashboardPage /> : <PublicHomePage />
}

export default function App() {
  useEffect(() => {
    const theme = localStorage.getItem('crop-advisor-theme')
    if (theme === 'dark') document.documentElement.classList.add('dark')
  }, [])

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="farms" element={<FarmsPage />} />
            <Route path="farms/new" element={<FarmsPage />} />
            <Route path="farms/:id" element={<FarmDetailPage />} />
            <Route path="farms/:id/advice" element={<AdvicePage />} />
            <Route path="advice" element={<AdvicePage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="farms/:id/decisions" element={<DecisionsPage />} />
            <Route path="decisions/:id" element={<DecisionDetailPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="seasons" element={<SeasonsPage />} />
            <Route path="reports/:id" element={<ReportPage />} />
          </Route>

          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
