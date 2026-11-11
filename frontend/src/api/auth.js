// Auth endpoints: email OTP registration, sign-in, session restore, and logout.
import { api } from './axiosClient'
export const authApi = {
  requestRegister: (body) => api.post('/api/v1/auth/register/request-code', body),
  verifyRegister: (body) => api.post('/api/v1/auth/register/verify-code', body),
  requestLogin: (body) => api.post('/api/v1/auth/login/request-code', body),
  verifyLogin: (body) => api.post('/api/v1/auth/login/verify-code', body),
  me: () => api.get('/api/v1/auth/me'), logout: () => api.post('/api/v1/auth/logout')
}
