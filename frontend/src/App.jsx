import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import useAuth from './hooks/useAuth'
import { PublicHomePage, GuestPreviewPage } from './pages/PublicPages'
import {
  AuthPage,
  DashboardPage,
  FarmsPage,
  FarmDetailPage,
  AdvicePage,
  DecisionsPage,
  DecisionDetailPage,
  AssistantPage,
  AlertsPage,
  SubscriptionPage,
  ReportPage,
  SeasonsPage,
  NotFoundPage,
} from './pages/Pages'

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
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage register />} />

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
