// Advice endpoint: request a localized recommendation, optionally filtering crops.
import { api } from './axiosClient'
export const adviceApi = { generate: (farmId, {lang='ar', crops, asOf}={}) => api.post(`/api/v1/farms/${farmId}/advice`, null, { params: { lang, ...(asOf?{asOf}:{}), ...(crops?.length?{crops}: {}) } }) }
