import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // A token in storage is only a claim — confirm it against the API before
  // treating the session as real, so a revoked, expired, or tampered token
  // logs out cleanly instead of showing a half-broken signed-in shell.
  useEffect(() => {
    const controller = new AbortController()
    if (!getToken()) {
      setLoading(false)
      return () => controller.abort()
    }
    api.me(controller.signal)
      .then((data) => setUser(data.user))
      .catch((err) => {
        if (err.name === 'AbortError') return
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(async (details) => {
    const data = await api.signup(details)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  /** Takes a token handed back by an OAuth redirect and establishes the session. */
  const adoptToken = useCallback(async (token) => {
    setToken(token)
    try {
      const data = await api.me()
      setUser(data.user)
      return data.user
    } catch (err) {
      setToken(null)
      setUser(null)
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    signup,
    logout,
    adoptToken,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'admin' || user?.role === 'staff',
  }), [user, loading, login, signup, logout, adoptToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
