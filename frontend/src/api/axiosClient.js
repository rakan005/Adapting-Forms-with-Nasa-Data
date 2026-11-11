import axios from 'axios'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
export const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' }, timeout: 25000, paramsSerializer: { indexes: null } })
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (handler) => { onUnauthorized = handler }
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crop-advisor-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use((r) => r, (error) => {
  if (error.response?.status === 401) onUnauthorized()
  return Promise.reject(error)
})
export const errorMessage = (error) => error?.response?.data?.message || (error?.code === 'ECONNABORTED' ? 'استغرق الاتصال وقتًا أطول من المتوقع.' : error?.response ? `تعذر إكمال الطلب (${error.response.status}).` : 'تعذر الاتصال بالخادم. تحقق من تشغيل الـ API واتصالك بالإنترنت.')
