// Alert endpoints: read alerts, mark one as read, and manage in-app/weather preferences.
import { api } from './axiosClient'
export const alertsApi = { list: () => api.get('/api/v1/alerts'), preferences: () => api.get('/api/v1/alerts/preferences'), updatePreferences: (data) => api.put('/api/v1/alerts/preferences',data), markRead: (id) => api.patch(`/api/v1/alerts/${id}/read`) }
