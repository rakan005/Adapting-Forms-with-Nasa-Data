// Reports endpoint: fetch a JSON decision snapshot for print/PDF formatting.
import { api } from './axiosClient'
export const reportsApi = { get: (farmId,decisionId) => api.get(`/api/v1/farms/${farmId}/decisions/${decisionId}/report`) }
