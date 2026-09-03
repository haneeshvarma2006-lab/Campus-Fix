import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Icon } from '../components/ui'
import { formatDate } from '../lib/format'

const ROLES = ['student', 'admin']

const ROLE_HINT = {
  student: 'Files reports and tracks their own. Sees nobody else’s.',
  admin: 'Sees every report, moves it through the stages, and manages categories and roles.',
}

function Categories() {
  const { notify, error: toastError } = useToast()
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api.listCategories(controller.signal)
      .then((d) => setCategories(d.categories))
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
    return () => controller.abort()
  }, [toastError])

  const add = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) return
    setBusy(true)
    try {
      const { category } = await api.addCategory({ name: trimmed })
      setCategories((list) => [...list, category].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      notify(`Added “${category.name}”.`)
    } catch (err) {
      toastError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (category) => {
    if (!window.confirm(`Remove “${category.name}”? Existing reports keep the name.`)) return
    try {
      await api.deleteCategory(category.id)
      setCategories((list) => list.filter((c) => c.id !== category.id))
      notify(`Removed “${category.name}”.`)
    } catch (err) {
      toastError(err.message)
    }
  }

  return (
    <section>
      <h2 className="t-h2" style={{ marginBottom: 5 }}>Categories</h2>
      <p className="t-sm muted" style={{ marginBottom: 18 }}>
        These fill the dropdown when someone files a report. Removing one does not change
        reports already filed under it.
      </p>

      <form onSubmit={add} className="row" style={{ gap: 8, marginBottom: 18 }}>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Streetlight, Water supply, Road damage"
          maxLength={60}
        />
        <button type="submit" className="btn" disabled={busy || name.trim().length < 2}>Add</button>
      </form>

      {categories.length === 0 ? (
        <div className="empty" style={{ padding: 32 }}>
          <p style={{ marginBottom: 0 }}>
            No categories yet. Reporters will see a single “General” option until you add one.
          </p>
        </div>
      ) : (
        <div className="row wrap" style={{ gap: 8 }}>
          {categories.map((c) => (
            <span
              key={c.id}
              className="tag"
              style={{ padding: '6px 6px 6px 12px', gap: 6, fontSize: 13 }}
            >
              {c.name}
              <button
                className="icon-btn"
                style={{ width: 22, height: 22 }}
                onClick={() => remove(c)}
                aria-label={`Remove ${c.name}`}
                title={`Remove ${c.name}`}
              >
                <Icon.Trash width={12} height={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function People() {
  const { user } = useAuth()
  const { notify, error: toastError } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    api.listUsers(controller.signal)
      .then((d) => setUsers(d.users))
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [toastError])

  const changeRole = async (target, role) => {
    try {
      const { user: updated } = await api.setRole(target.id, { role })
      setUsers((list) => list.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u)))
      notify(`${updated.name} is now ${role}.`)
    } catch (err) {
      toastError(err.message)
    }
  }

  return (
    <section>
      <h2 className="t-h2" style={{ marginBottom: 5 }}>People</h2>
      <p className="t-sm muted" style={{ marginBottom: 18 }}>
        Roles are granted here, never chosen at signup. You cannot demote yourself, and the
        last remaining admin cannot be demoted at all — so nobody can lock everyone out.
      </p>

      {loading ? (
        <div className="skel" style={{ height: 180 }} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th style={{ textAlign: 'right' }}>Reports</th>
                <th>Joined</th>
                <th style={{ width: 150 }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span style={{ fontWeight: 550 }}>{u.name}</span>
                    {u.id === user?.id && <span className="t-xs muted"> · you</span>}
                  </td>
                  <td className="muted t-xs">{u.email}</td>
                  <td className="mono t-xs" style={{ textAlign: 'right' }}>{u.reportCount}</td>
                  <td className="muted t-xs">{formatDate(u.createdAt)}</td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: '5px 26px 5px 8px', fontSize: 13 }}
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      title={ROLE_HINT[u.role]}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="col g-2" style={{ marginTop: 14 }}>
        {ROLES.map((r) => (
          <p key={r} className="t-xs muted">
            <strong style={{ color: 'var(--ink-soft)' }}>{r}</strong> — {ROLE_HINT[r]}
          </p>
        ))}
      </div>
    </section>
  )
}

export function AdminSettings() {
  return (
    <div className="wrap-s page in">
      <Link to="/admin" className="btn btn-quiet btn-sm" style={{ marginBottom: 14, marginLeft: -10 }}>
        <Icon.Back /> Dashboard
      </Link>

      <div className="page-head">
        <h1 className="t-h1" style={{ fontSize: 34 }}>Settings</h1>
        <p>Manage the categories reporters can pick from, and who can see the dashboard.</p>
      </div>

      <div className="col g-6">
        <Categories />
        <hr className="sep" style={{ margin: 0 }} />
        <People />
      </div>
    </div>
  )
}
