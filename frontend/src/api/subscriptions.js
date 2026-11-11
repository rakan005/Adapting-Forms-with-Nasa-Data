// Subscription endpoints: read plans/current plan and request plan selection.
import { api } from './axiosClient'
export const subscriptionsApi = { plans: () => api.get('/api/v1/subscriptions/plans'), me: () => api.get('/api/v1/subscriptions/me'), update: (planCode) => api.put('/api/v1/subscriptions/me',{planCode}) }
