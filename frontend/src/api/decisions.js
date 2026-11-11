// Decision endpoints: fetch farm history, inspect a recommendation, record farmer action.
import { api } from './axiosClient'
export const decisionsApi = { byFarm: (farmId,params={}) => api.get(`/api/v1/farms/${farmId}/decisions`,{params}), get: (id) => api.get(`/api/v1/decisions/${id}`), action: (id,data) => api.patch(`/api/v1/decisions/${id}`,data) }
