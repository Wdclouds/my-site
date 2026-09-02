import { reactive } from 'vue'

const TOKEN_KEY = 'athena_auth_token'
const USER_KEY = 'athena_auth_user'

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  isLoading: false,
  error: null
})

export const authState = {
  state,

  get isLoggedIn() {
    return Boolean(state.token && state.user)
  },

  get user() {
    return state.user
  },

  async login(username, password) {
    state.isLoading = true
    state.error = null
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '登录失败')
      }

      state.token = data.token
      state.user = data.user
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return data
    } catch (err) {
      state.error = err.message
      throw err
    } finally {
      state.isLoading = false
    }
  },

  logout() {
    state.token = ''
    state.user = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getAuthHeaders() {
    return state.token ? { Authorization: `Bearer ${state.token}` } : {}
  }
}
