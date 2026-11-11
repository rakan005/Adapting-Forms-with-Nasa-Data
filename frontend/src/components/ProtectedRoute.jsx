import { Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import LoadingSpinner from './LoadingSpinner'
import GuestPreviewPage from '../pages/GuestPreviewPage'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  return isAuthenticated ? <Outlet /> : <GuestPreviewPage />
}
