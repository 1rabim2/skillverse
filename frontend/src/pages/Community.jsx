import React from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../lib/apiFetch'
import '../styles/community.css'
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const LIST_LIMIT = 20
const POLL_MS = 5000

function formatTime(value, locale) {
  try {
    return new Date(value).toLocaleString(locale)
  } catch {
    return ''
  }
}

function shortText(text, max = 120) {
  const str = String(text || '').trim().replace(/\s+/g, ' ')
  if (!str) return ''
  return str.length > max ? `${str.slice(0, max)}…` : str
}

function atBottom(el, threshold = 90) {
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
}

async function fetchJson(path, opts = {}) {
  const res = await apiFetch(path, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Request failed')
  return data
}

function Stat({ label, value }) {
  return (
    <div className="svc-stat">
      <div className="svc-stat-label">{label}</div>
      <div className="svc-stat-value">{value ?? '—'}</div>
    </div>
  )
}

export default function Community() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US'
  const [authed, setAuthed] = React.useState(false)
  const [authChecked, setAuthChecked] = React.useState(false)

  const [stats, setStats] = React.useState(null)
  const [items, setItems] = React.useState([])
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [loadingList, setLoadingList] = React.useState(true)

  const [selectedId, setSelectedId] = React.useState('')
  const [thread, setThread] = React.useState(null)
  const [loadingThread, setLoadingThread] = React.useState(false)

  const [error, setError] = React.useState('')

  const [search, setSearch] = React.useState('')
  const [mineOnly, setMineOnly] = React.useState(false)
  const [answered, setAnswered] = React.useState('all') // all | unanswered | answered
  const [sort, setSort] = React.useState('last_activity') // last_activity | newest | most_answered | oldest

  const [askOpen, setAskOpen] = React.useState(false)
  const [askText, setAskText] = React.useState('')
  const [asking, setAsking] = React.useState(false)

  const [commentText, setCommentText] = React.useState('')
  const [commentBusy, setCommentBusy] = React.useState(false)
  const [live, setLive] = React.useState(true)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editText, setEditText] = React.useState('')
  const [editBusy, setEditBusy] = React.useState(false)

  const listAbortRef = React.useRef(null)
  const threadAbortRef = React.useRef(null)
  const threadScrollRef = React.useRef(null)
  const commentInputRef = React.useRef(null)

  const threadIsMine = !!thread?.isMine
  const threadIsApproved = String(thread?.status || '').toLowerCase() === 'approved'

  React.useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const res = await apiFetch('/user/me')
        if (!mounted) return
        setAuthed(res.ok)
      } catch {
        if (!mounted) return
        setAuthed(false)
      } finally {
        if (mounted) setAuthChecked(true)
      }
    }
    check()
    return () => {
      mounted = false
    }
  }, [])

  async function loadList({ nextPage = 1, mode = 'replace' } = {}) {
    if (!authed) return
    if (listAbortRef.current) listAbortRef.current.abort()
    const ac = new AbortController()
    listAbortRef.current = ac

    setLoadingList(true)
    if (mode === 'replace') setError('')

    try {
      const params = new URLSearchParams()
      params.set('page', String(nextPage))
      params.set('limit', String(LIST_LIMIT))
      params.set('sort', sort)
      if (search.trim()) params.set('search', search.trim())
      if (mineOnly) params.set('mine', 'true')
      if (answered === 'answered') params.set('answered', 'true')
      if (answered === 'unanswered') params.set('answered', 'false')
      if (nextPage === 1) params.set('includeStats', 'true')

      const data = await fetchJson(`/community?${params.toString()}`, {
        signal: ac.signal
      })

      const fetched = data.items || []
      setItems((prev) => (mode === 'append' ? [...prev, ...fetched] : fetched))
      setPage(data.page || nextPage)
      setTotalPages(data.totalPages || 1)
      if (nextPage === 1) setStats(data.stats || null)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err?.message || t('community.errors.loadQuestions'))
    } finally {
      setLoadingList(false)
    }
  }

  async function loadThread(id, { silent = false } = {}) {
    if (!authed || !id) return
    if (threadAbortRef.current) threadAbortRef.current.abort()
    const ac = new AbortController()
    threadAbortRef.current = ac

    if (!silent) setLoadingThread(true)
    if (!silent) setError('')

    const wasAtBottom = atBottom(threadScrollRef.current)
    try {
      const data = await fetchJson(`/community/${encodeURIComponent(id)}`, {
        signal: ac.signal
      })
      const nextThread = data.post || null
      setThread(nextThread)
      if (wasAtBottom) {
        setTimeout(() => {
          const el = threadScrollRef.current
          if (!el) return
          el.scrollTop = el.scrollHeight
        }, 0)
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err?.message || t('community.errors.loadThread'))
    } finally {
      if (!silent) setLoadingThread(false)
    }
  }

  React.useEffect(() => {
    setItems([])
    setStats(null)
    setPage(1)
    setTotalPages(1)
    setSelectedId('')
    setThread(null)
    setAskOpen(false)
    setAskText('')
    setCommentText('')
    setEditOpen(false)
    setEditText('')

    if (!authed) return
    loadList({ nextPage: 1, mode: 'replace' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, mineOnly, answered, sort])

  React.useEffect(() => {
    if (!authed) return
    if (!selectedId) return
    loadThread(selectedId, { silent: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, selectedId])

  React.useEffect(() => {
    if (!authed) return
    if (!selectedId) return
    if (!live) return
    const t = setInterval(() => {
      loadThread(selectedId, { silent: true })
      loadList({ nextPage: 1, mode: 'replace' })
    }, POLL_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, selectedId, live])

  async function submitAsk(e) {
    e.preventDefault()
    if (!authed) return
    setAsking(true)
    setError('')
    try {
      await fetchJson('/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: askText })
      })
      setAskText('')
      setAskOpen(false)
      setMineOnly(true)
      setAnswered('all')
      setSort('last_activity')
      await loadList({ nextPage: 1, mode: 'replace' })
    } catch (err) {
      setError(err?.message || t('community.errors.postQuestion'))
    } finally {
      setAsking(false)
    }
  }

  async function submitComment() {
    if (!authed || !selectedId) return
    const content = String(commentText || '').trim()
    if (content.length < 2) return
    setCommentBusy(true)
    setError('')
    try {
      await fetchJson(`/community/${encodeURIComponent(selectedId)}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })
      setCommentText('')
      await loadThread(selectedId, { silent: true })
      await loadList({ nextPage: 1, mode: 'replace' })
    } catch (err) {
      setError(err?.message || t('community.errors.sendReply'))
    } finally {
      setCommentBusy(false)
    }
  }

  async function reportPost(id) {
    if (!authed) return
    setError('')
    try {
      await fetchJson(`/community/${encodeURIComponent(id)}/report`, { method: 'PATCH' })
      await loadThread(id, { silent: true })
      await loadList({ nextPage: 1, mode: 'replace' })
    } catch (err) {
      setError(err?.message || t('community.errors.reportPost'))
    }
  }

  async function reportComment(commentId) {
    if (!authed || !selectedId) return
    setError('')
    try {
      await fetchJson(`/community/${encodeURIComponent(selectedId)}/comments/${encodeURIComponent(commentId)}/report`, { method: 'PATCH' })
      await loadThread(selectedId, { silent: true })
    } catch (err) {
      setError(err?.message || t('community.errors.reportComment'))
    }
  }

  async function deletePost() {
    if (!authed || !selectedId) return
    if (!window.confirm(t('community.confirmDeleteQuestion'))) return
    setError('')
    try {
      await fetchJson(`/community/${encodeURIComponent(selectedId)}`, { method: 'DELETE' })
      setSelectedId('')
      setThread(null)
      await loadList({ nextPage: 1, mode: 'replace' })
    } catch (err) {
      setError(err?.message || t('community.errors.deletePost'))
    }
  }

  async function deleteComment(commentId) {
    if (!authed || !selectedId) return
    setError('')
    try {
      await fetchJson(`/community/${encodeURIComponent(selectedId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' })
      await loadThread(selectedId, { silent: true })
      await loadList({ nextPage: 1, mode: 'replace' })
    } catch (err) {
      setError(err?.message || t('community.errors.deleteComment'))
    }
  }

  async function saveEdit() {
    if (!authed || !selectedId) return
    const content = String(editText || '').trim()
    if (content.length < 8) return
    setEditBusy(true)
    setError('')
    try {
      await fetchJson(`/community/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })
      setEditOpen(false)
      await loadThread(selectedId, { silent: true })
      await loadList({ nextPage: 1, mode: 'replace' })
    } catch (err) {
      setError(err?.message || t('community.errors.updateQuestion'))
    } finally {
      setEditBusy(false)
    }
  }

  function onReplyTo(name) {
    const prefix = `@${String(name || '').trim()} `
    setCommentText((prev) => (prev && prev.startsWith(prefix) ? prev : `${prefix}${prev || ''}`))
    setTimeout(() => commentInputRef.current?.focus(), 0)
  }

  if (authChecked && !authed) {
    return (
      <div className="p-4">
        <Card className="p-6">
          <div className="text-lg font-extrabold tracking-tight">{t('community.title')}</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('community.signInPrompt')}</p>
          <div className="mt-4">
            <Button variant="primary" onClick={() => { window.location.href = '/login' }}>
              {t('community.goToLogin')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="svc-wrap">
      <div className="svc-head">
        <div>
          <div className="svc-title">{t('community.title')}</div>
          <div className="svc-sub">{t('community.subtitle')}</div>
        </div>
        <div className="svc-stats">
          <Stat label={t('community.stats.approved')} value={stats?.approvedPosts} />
          <Stat label={t('community.stats.pending')} value={stats?.pendingPosts} />
          <Stat label={t('community.stats.answers')} value={stats?.answersTotal} />
          <Stat label={t('community.stats.mine')} value={stats?.myPosts} />
        </div>
      </div>

      {error && <div className="svc-error">{error}</div>}

      <div className="svc-grid">
        {/* Left: list */}
        <aside className={`svc-left ${selectedId ? 'mobile-hidden' : ''}`}>
          <div className="svc-controls">
            <button type="button" className="svc-primary" onClick={() => setAskOpen((v) => !v)}>
              {askOpen ? t('community.close') : t('community.ask')}
            </button>
            <button type="button" className="svc-btn" onClick={() => loadList({ nextPage: 1, mode: 'replace' })}>
              {t('community.refresh')}
            </button>
          </div>

          {askOpen && (
            <form className="svc-ask" onSubmit={submitAsk}>
              <div className="svc-ask-title">{t('community.askQuestion')}</div>
              <textarea
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                rows={4}
                placeholder={t('community.askPlaceholder')}
              />
              <div className="svc-ask-actions">
                <button className="svc-primary" type="submit" disabled={asking || askText.trim().length < 8}>
                  {asking ? t('community.posting') : t('community.post')}
                </button>
                <div className="svc-hint">{t('community.reviewHint')}</div>
              </div>
            </form>
          )}

          <div className="svc-filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('community.searchPlaceholder')}
            />
            <button type="button" className="svc-btn" onClick={() => loadList({ nextPage: 1, mode: 'replace' })}>{t('community.go')}</button>
          </div>

          <div className="svc-row">
            <label className="svc-check">
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
              {t('community.myQuestions')}
            </label>
            <select value={answered} onChange={(e) => setAnswered(e.target.value)}>
              <option value="all">{t('community.filters.all')}</option>
              <option value="unanswered">{t('community.filters.unanswered')}</option>
              <option value="answered">{t('community.filters.answered')}</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="last_activity">{t('community.sort.lastActivity')}</option>
              <option value="newest">{t('community.sort.newest')}</option>
              <option value="most_answered">{t('community.sort.mostAnswered')}</option>
              <option value="oldest">{t('community.sort.oldest')}</option>
            </select>
          </div>

          <div className="svc-list">
            {loadingList && <div className="svc-muted">{t('community.loadingQuestions')}</div>}
            {!loadingList && items.length === 0 && <div className="svc-muted">{t('community.noQuestions')}</div>}

            {items.map((q) => {
              const status = String(q.status || '').toLowerCase()
              const active = selectedId === q._id
              return (
                <button
                  key={q._id}
                  type="button"
                  className={`svc-q ${active ? 'active' : ''}`}
                  onClick={() => setSelectedId(q._id)}
                >
                  <div className="svc-q-top">
                    <div className="svc-q-author">{q.authorName}</div>
                    {status !== 'approved' && q.isMine ? <span className="svc-pill warn">{t('community.pending')}</span> : null}
                    <span className="svc-pill">{t('community.replies', { count: q.commentsCount || 0 })}</span>
                  </div>
                  <div className="svc-q-body">{shortText(q.content, 120)}</div>
                  <div className="svc-q-meta">
                    <span>{t('community.last', { time: formatTime(q.lastActivityAt || q.createdAt, locale) })}</span>
                  </div>
                </button>
              )
            })}

            {!loadingList && page < totalPages && (
              <button type="button" className="svc-btn full" onClick={() => loadList({ nextPage: page + 1, mode: 'append' })}>
                {t('community.loadMore')}
              </button>
            )}
          </div>
        </aside>

        {/* Right: thread */}
        <section className={`svc-right ${selectedId ? '' : 'mobile-hidden'}`}>
          {!selectedId && (
            <div className="svc-empty">
              <div className="svc-empty-title">{t('community.openQuestion')}</div>
              <div className="svc-empty-sub">{t('community.openQuestionSub')}</div>
            </div>
          )}

          {selectedId && (
            <>
              <div className="svc-thread-head">
                <button type="button" className="svc-btn" onClick={() => { setSelectedId(''); setThread(null) }}>
                  {t('common.back')}
                </button>
                <div className="svc-thread-title">{t('community.thread')}</div>
                <div className="svc-thread-actions">
                  <label className="svc-check">
                    <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
                    {t('community.live')}
                  </label>
                  <button type="button" className="svc-btn" onClick={() => loadThread(selectedId, { silent: false })}>
                    {t('community.refresh')}
                  </button>
                </div>
              </div>

              {loadingThread && <div className="svc-muted p-3">{t('community.loadingThread')}</div>}

              {thread && (
                <>
                  <div className="svc-question">
                    <div className="svc-question-top">
                      <div>
                        <div className="svc-question-author">{thread.authorName}</div>
                        <div className="svc-question-time">{formatTime(thread.createdAt, locale)}</div>
                      </div>
                      <div className="svc-question-actions">
                        <button type="button" className="svc-btn" onClick={() => reportPost(thread._id)}>{t('community.report')}</button>
                        {threadIsMine && String(thread.status || '').toLowerCase() === 'pending' && (
                          <button
                            type="button"
                            className="svc-btn"
                            onClick={() => { setEditOpen((v) => !v); setEditText((t) => t || thread.content) }}
                          >
                            {editOpen ? t('community.cancelEdit') : t('community.edit')}
                          </button>
                        )}
                        {threadIsMine && <button type="button" className="svc-danger" onClick={deletePost}>{t('community.delete')}</button>}
                      </div>
                    </div>

                    {editOpen ? (
                      <div className="svc-edit">
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
                        <div className="svc-edit-actions">
                          <button type="button" className="svc-primary" disabled={editBusy || editText.trim().length < 8} onClick={saveEdit}>
                            {editBusy ? t('community.saving') : t('community.save')}
                          </button>
                          <button type="button" className="svc-btn" onClick={() => setEditOpen(false)}>{t('community.cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="svc-question-body">{thread.content}</div>
                    )}
                  </div>

                  <div className="svc-messages" ref={threadScrollRef}>
                    {(thread.comments || []).length === 0 && (
                      <div className="svc-muted p-3">{t('community.noReplies')}</div>
                    )}
                    {(thread.comments || []).map((m) => (
                      <div key={m._id} className={`svc-msg ${m.isMine ? 'mine' : ''}`}>
                        <div className="svc-msg-meta">
                          <span className="svc-msg-name">{m.isMine ? t('community.you') : m.authorName}</span>
                          <span className="svc-msg-time">{formatTime(m.createdAt, locale)}</span>
                        </div>
                        <div className="svc-msg-bubble">{m.content}</div>
                        <div className="svc-msg-actions">
                          <button type="button" className="svc-link" onClick={() => onReplyTo(m.authorName)}>{t('community.reply')}</button>
                          <button type="button" className="svc-link" onClick={() => reportComment(m._id)}>{t('community.report')}</button>
                          {m.isMine && (
                            <button type="button" className="svc-link danger" onClick={() => deleteComment(m._id)}>{t('community.delete')}</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="svc-compose">
                    {!threadIsApproved && threadIsMine && (
                      <div className="svc-muted pb-2">
                        {t('community.pendingApprovalNote')}
                      </div>
                    )}
                    {threadIsApproved && (
                      <div className="svc-compose-row">
                        <input
                          ref={commentInputRef}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={t('community.replyPlaceholder')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              submitComment()
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="svc-primary"
                          disabled={commentBusy || commentText.trim().length < 2}
                          onClick={submitComment}
                        >
                          {commentBusy ? t('community.sending') : t('community.send')}
                        </button>
                      </div>
                    )}
                    <div className="svc-compose-hint">{t('community.liveHint', { seconds: Math.round(POLL_MS / 1000) })}</div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
