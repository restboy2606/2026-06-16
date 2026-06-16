import { useState, useRef, useEffect } from 'react'

// ── API 설정 ─────────────────────────────────────────────────────────────────
const PROVIDERS = {
  solar: {
    label: 'Solar',
    badge: '☀',
    url: 'https://api.upstage.ai/v1/chat/completions',
    model: 'solar-mini',
    keyField: 'solar_api_key',
  },
  openai: {
    label: 'OpenAI',
    badge: '⬡',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    keyField: 'openai_api_key',
  },
}

const SYSTEM_PROMPT = `당신은 픽셀포지 아카데미(PixelForge Academy)의 AI 튜터입니다.
코딩·자격증·AI 학습에 관한 질문에 친절하고 간결하게 한국어로 답변하세요.
픽셀포지 아카데미는 게임처럼 재미있게 배우는 온라인 IT 교육 플랫폼입니다.`

const TABLE = 'rest06_settings'

// ── 스타일 상수 ──────────────────────────────────────────────────────────────
const S = {
  btn: (disabled) => ({
    background: disabled
      ? 'rgba(255,255,255,.08)'
      : 'linear-gradient(135deg, var(--a1,#a78bfa), var(--a2,#fb923c))',
    border: 'none', borderRadius: 10, padding: '0 14px',
    color: disabled ? 'var(--muted,#9aa0b4)' : '#0a0b10',
    fontWeight: 700, fontSize: 16, cursor: disabled ? 'default' : 'pointer',
    transition: 'opacity .15s',
  }),
  bubble: (isUser) => ({
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    background: isUser
      ? 'linear-gradient(135deg, var(--a1,#a78bfa), var(--a2,#fb923c))'
      : 'rgba(255,255,255,.07)',
    color: isUser ? '#0a0b10' : 'var(--text,#e8eaf0)',
    fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap',
  }),
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [provider, setProvider] = useState('solar')
  const [keys, setKeys] = useState({})      // { solar_api_key: '...', openai_api_key: '...' }
  const [keyStatus, setKeyStatus] = useState('idle') // idle | loading | ok | error
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '안녕하세요! 픽셀포지 AI 튜터입니다. 코딩·자격증·AI 학습 관련 질문은 뭐든 물어보세요 🎮' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // 채팅창 열릴 때 Supabase에서 키 로드
  useEffect(() => {
    if (!open || keyStatus !== 'idle') return
    fetchKeys()
  }, [open])

  // 메시지 추가될 때 스크롤
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const fetchKeys = async () => {
    setKeyStatus('loading')
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!baseUrl || !anonKey) throw new Error('Supabase 환경변수 미설정')
      const res = await fetch(
        `${baseUrl}/rest/v1/${TABLE}?key=in.(solar_api_key,openai_api_key)&select=key,value`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      )
      if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`)
      const data = await res.json()
      const map = Object.fromEntries((data || []).map((r) => [r.key, r.value]))
      setKeys(map)
      setKeyStatus('ok')
    } catch (e) {
      console.error('[ChatBot] 키 로드 실패:', e)
      setKeyStatus('error')
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const next = [...messages, { role: 'user', text }]
    setMessages(next)
    setLoading(true)

    const cfg = PROVIDERS[provider]
    const apiKey = keys[cfg.keyField]

    try {
      if (!apiKey) throw new Error(`${cfg.label} API 키가 Supabase에 없습니다.`)

      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: 512,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...next.map((m) => ({ role: m.role, content: m.text })),
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content?.trim() || '응답을 받지 못했습니다.'
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const currentKey = keys[PROVIDERS[provider].keyField]
  const canSend = !loading && Boolean(currentKey) && input.trim()

  return (
    <>
      {/* ── 플로팅 버튼 ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--a1,#a78bfa), var(--a2,#fb923c))',
          color: '#0a0b10', fontSize: 22, display: 'grid', placeItems: 'center',
          boxShadow: '0 8px 28px rgba(167,139,250,.45)',
          transition: 'transform .15s, box-shadow .15s',
        }}
        title="AI 튜터 열기"
      >
        {open ? '✕' : '▓'}
      </button>

      {/* ── 채팅 창 ────────────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 9998,
          width: 340, maxWidth: 'calc(100vw - 40px)',
          background: 'var(--surface,#0c0e15)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,.65)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Pretendard', sans-serif",
        }}>

          {/* 헤더 */}
          <div style={{
            padding: '13px 16px',
            background: 'linear-gradient(135deg, var(--a1,#a78bfa), var(--a2,#fb923c))',
            color: '#0a0b10',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'monospace' }}>▓</span> PixelForge AI 튜터
            </span>
            {/* 프로바이더 토글 */}
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(PROVIDERS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setProvider(key)}
                  style={{
                    background: provider === key ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.1)',
                    border: provider === key ? '1.5px solid rgba(0,0,0,.4)' : '1.5px solid transparent',
                    borderRadius: 8, padding: '3px 9px',
                    color: '#0a0b10', fontWeight: 700, fontSize: 11.5, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cfg.badge} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* 키 상태 표시 */}
          {keyStatus === 'loading' && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--muted,#9aa0b4)', background: 'rgba(255,255,255,.03)', textAlign: 'center' }}>
              Supabase에서 API 키 불러오는 중...
            </div>
          )}
          {keyStatus === 'error' && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: '#fb923c', background: 'rgba(251,146,60,.08)', textAlign: 'center' }}>
              ⚠️ API 키 로드 실패 — Supabase 연결을 확인하세요
            </div>
          )}
          {keyStatus === 'ok' && !currentKey && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: '#fb923c', background: 'rgba(251,146,60,.08)', textAlign: 'center' }}>
              ⚠️ {PROVIDERS[provider].label} 키가 Supabase에 없습니다
            </div>
          )}

          {/* 메시지 목록 */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 12px',
            maxHeight: 320, display: 'flex', flexDirection: 'column', gap: 9,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={S.bubble(m.role === 'user')}>{m.text}</div>
            ))}
            {loading && (
              <div style={S.bubble(false)}>
                <span style={{ opacity: .6 }}>생각 중</span>
                <span style={{ animation: 'pf-dots 1.2s infinite', display: 'inline-block', letterSpacing: 2 }}>...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', gap: 8 }}>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="메시지 입력 (Enter 전송)"
              style={{
                flex: 1, resize: 'none',
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 10, padding: '9px 12px',
                color: 'var(--text,#e8eaf0)', fontSize: 13.5,
                fontFamily: 'inherit', outline: 'none', lineHeight: 1.4,
              }}
            />
            <button onClick={send} disabled={!canSend} style={S.btn(!canSend)}>▶</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pf-dots {
          0%,20%  { content:''; opacity:.3 }
          40%     { opacity:1 }
          100%    { opacity:.3 }
        }
      `}</style>
    </>
  )
}
