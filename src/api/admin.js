import { authState } from '../stores/authState.js'

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authState.getAuthHeaders(),
    ...options.headers
  }
  const res = await fetch(url, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) {
      authState.logout()
    }
    throw new Error(data.error || `请求失败 (HTTP ${res.status})`)
  }
  return data
}

export const adminApi = {
  // 获取所有文章列表
  getPosts() {
    return request('/api/admin/posts')
  },

  // 获取单篇完整文章（含正文）
  getPostDetail(slug) {
    return request(`/api/posts/${slug}`)
  },

  // 创建新文章
  createPost(postData) {
    return request('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    })
  },

  // 修改文章
  updatePost(slug, postData) {
    return request(`/api/admin/posts/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(postData)
    })
  },

  // 删除文章
  deletePost(slug) {
    return request(`/api/admin/posts/${slug}`, {
      method: 'DELETE'
    })
  }
}
