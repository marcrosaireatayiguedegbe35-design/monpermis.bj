import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Search } from 'lucide-react'
import { fetchAdmins, fetchAuditLogs, type AdminAccount, type AuditLogEntry } from '../api/admins'
import { DirectionSection } from '../components/model/DirectionSection'
import { PhonePage, PhoneSearch } from '../components/phone/PhoneKit'
import { useIsPhone } from './MobileHome'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../ui'
import { actionLabel, formatAuditDate, resourceLabel, summarizeMetadata } from '../utils/auditLabels'

/** Journal des opérations administrateur : barre de filtres unique, tableau sobre. */
export function AuditLogPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [adminId, setAdminId] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const isPhone = useIsPhone()

  // La recherche texte n'interroge le serveur qu'après une courte pause de frappe.
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    fetchAdmins(token)
      .then((data) => setAdmins(data.admins))
      .catch(() => {})
  }, [])

  const load = useCallback(
    async (nextPage = 1) => {
      const token = getAdminToken()
      if (!token) {
        setError('Session expirée. Reconnectez-vous.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAuditLogs(token, {
          page: nextPage,
          limit: 25,
          adminId: adminId || undefined,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
          q: q || undefined,
        })
        setLogs(data.logs)
        setPage(data.pagination.page)
        setPages(data.pagination.pages)
        setTotal(data.pagination.total)
        setActions(data.filters.actions)
      } catch (err) {
        setError(isAuthError(err) ? err.message : 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    },
    [adminId, action, from, to, q],
  )

  useEffect(() => {
    void load(1)
  }, [load])

  const hasFilters = Boolean(adminId || action || from || to || search)
  const reset = () => {
    setAdminId('')
    setAction('')
    setFrom('')
    setTo('')
    setSearch('')
    setQ('')
  }

  if (isPhone) {
    return (
      <PhonePage title="Journal">
        {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
        <PhoneSearch id="audit-search-m" value={search} onChange={setSearch} placeholder="Opération, nom…" />
        <div className="ap-selects">
          <select value={adminId} onChange={(e) => setAdminId(e.target.value)} aria-label="Administrateur">
            <option value="">Tous les admins</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
            <option value="">Toutes les actions</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {actionLabel(item)}
              </option>
            ))}
          </select>
        </div>
        <p className="ap-count">
          {total} opération{total > 1 ? 's' : ''}
          {hasFilters ? (
            <>
              {' · '}
              <button type="button" className="ap-link" onClick={reset}>
                Réinitialiser
              </button>
            </>
          ) : null}
        </p>
        <div className="ap-list">
          {loading && logs.length === 0 ? (
            <p className="ap-empty">Chargement…</p>
          ) : logs.length === 0 ? (
            <p className="ap-empty">Aucune opération pour ces critères.</p>
          ) : (
            logs.map((entry) => {
              const details = summarizeMetadata(entry.metadata)
              return (
                <div key={entry.id} className="ap-row ap-row-tall">
                  <span className="ap-row-t">
                    <b className="ap-wrap">{actionLabel(entry.action)} · {resourceLabel(entry.resource)}</b>
                    <small>{entry.adminName} · {formatAuditDate(entry.createdAt)}</small>
                    {details !== '—' && details ? <small className="ap-wrap">{details}</small> : null}
                  </span>
                </div>
              )
            })
          )}
        </div>
        {pages > 1 ? (
          <div className="ap-pager">
            <button type="button" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Précédent</button>
            <span>{page} / {pages}</span>
            <button type="button" disabled={page >= pages || loading} onClick={() => void load(page + 1)}>Suivant</button>
          </div>
        ) : null}
      </PhonePage>
    )
  }

  return (
    <DirectionSection
      kicker="Direction"
      title="Journal"
      subtitle="Historique des opérations effectuées par les administrateurs."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load(page)} disabled={loading}>
          <RefreshCw aria-hidden />
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
      }
    >
      {error ? (
        <p className="cx-note cx-note-err" role="alert">
          {error}
        </p>
      ) : null}

      <section className="cx-panel cx-journal">
        <div className="cx-journal-bar">
          <label className="cx-journal-search">
            <Search aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une opération, un nom…"
              aria-label="Rechercher dans le journal"
            />
          </label>
          <select value={adminId} onChange={(e) => setAdminId(e.target.value)} aria-label="Administrateur">
            <option value="">Tous les administrateurs</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
            <option value="">Toutes les actions</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {actionLabel(item)}
              </option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Du" title="Du" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Au" title="Au" />
          {hasFilters ? (
            <button type="button" className="cx-journal-reset" onClick={reset}>
              Réinitialiser
            </button>
          ) : null}
        </div>

        {loading && logs.length === 0 ? (
          <SkeletonBlock rows={6} />
        ) : !loading && logs.length === 0 ? (
          <EmptyState title="Aucune opération" description="Aucune entrée ne correspond à ces critères." />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-journal-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Administrateur</th>
                  <th>Opération</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => {
                  const details = summarizeMetadata(entry.metadata)
                  return (
                    <tr key={entry.id}>
                      <td className="cx-journal-date">{formatAuditDate(entry.createdAt)}</td>
                      <td>
                        {entry.adminId ? (
                          <Link to={`/administrateurs/${entry.adminId}`} className="cx-journal-admin">
                            {entry.adminName}
                          </Link>
                        ) : (
                          entry.adminName
                        )}
                      </td>
                      <td>
                        <b className="cx-journal-op">{actionLabel(entry.action)}</b>
                        <span className="cx-journal-res">{resourceLabel(entry.resource)}</span>
                      </td>
                      <td className="cx-journal-det">{details === '—' ? '' : details}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="cx-journal-foot">
          <span>
            {total} opération{total > 1 ? 's' : ''}
          </span>
          {pages > 1 ? (
            <div className="cx-journal-pager">
              <button type="button" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>
                Précédent
              </button>
              <span>
                {page} / {pages}
              </span>
              <button type="button" disabled={page >= pages || loading} onClick={() => void load(page + 1)}>
                Suivant
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </DirectionSection>
  )
}
