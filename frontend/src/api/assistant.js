// Assistant endpoints: contextual AI chat and natural-language farm-data drafts.
import { api } from './axiosClient'
export const assistantApi = { chat: (data) => api.post('/api/v1/assistant/chat',data), organize: (data) => api.post('/api/v1/assistant/organize',data) }
