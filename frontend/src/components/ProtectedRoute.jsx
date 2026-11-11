import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import LoadingSpinner from './LoadingSpinner'
export default function ProtectedRoute(){const {isAuthenticated,loading}=useAuth();if(loading)return <LoadingSpinner/>;return isAuthenticated?<Outlet/>:<Navigate to="/login" replace/>}
