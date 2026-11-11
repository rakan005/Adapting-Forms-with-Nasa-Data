// Farm endpoints: list, create, read, update, and delete farmer-owned farms.
import { api } from './axiosClient'
export const farmsApi = { list: (params={}) => api.get('/api/v1/farms', { params }), get: (id) => api.get(`/api/v1/farms/${id}`), create: (data) => api.post('/api/v1/farms', data), update: (id,data) => api.put(`/api/v1/farms/${id}`,data), remove: (id) => api.delete(`/api/v1/farms/${id}`) }
