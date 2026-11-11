// Season endpoints: maintain the farm's planting season history.
import { api } from './axiosClient'
export const seasonsApi = { list: (farmId) => api.get(`/api/v1/farms/${farmId}/seasons`), create: (farmId,data) => api.post(`/api/v1/farms/${farmId}/seasons`,data), remove: (farmId,seasonId) => api.delete(`/api/v1/farms/${farmId}/seasons/${seasonId}`) }
