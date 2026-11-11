import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth'
import { errorMessage, setUnauthorizedHandler } from '../api/axiosClient'
export const AuthContext = createContext(null)
export function AuthProvider({children}) {
  const [token,setToken] = useState(() => localStorage.getItem('crop-advisor-token'))
  const [user,setUser] = useState(null); const [loading,setLoading] = useState(Boolean(token)); const navigate=useNavigate()
  const clear = useCallback(() => { localStorage.removeItem('crop-advisor-token');setToken(null);setUser(null) },[])
  useEffect(()=>{setUnauthorizedHandler(()=>{clear();navigate('/login');toast.error('انتهت الجلسة. سجل الدخول من جديد.')})},[clear,navigate])
  useEffect(()=>{if(!token){setLoading(false);return}authApi.me().then(r=>setUser(r.data)).catch(()=>clear()).finally(()=>setLoading(false))},[token,clear])
  const accept = (data) => { localStorage.setItem('crop-advisor-token',data.accessToken);setToken(data.accessToken);setUser(data.farmer);return data }
  const logout=async()=>{try{await authApi.logout()}catch{}finally{clear();navigate('/login');toast.success('تم تسجيل الخروج')}}
  const value=useMemo(()=>({user,token,isAuthenticated:Boolean(token),loading,accept,logout,errorMessage}),[user,token,loading,logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
