// Reference endpoints: crop packs, crop catalog, geographic coverage, and regional salinity.
import { api } from './axiosClient'
export const referenceApi = { packs: () => api.get('/api/v1/reference/packs'), crops: () => api.get('/api/v1/reference/crops'), coverage: (lat,lon) => api.get('/api/v1/reference/coverage',{params:{lat,lon}}), salinity: (lat,lon) => api.get('/api/v1/reference/salinity',{params:{lat,lon}}) }
