import { useState, useRef, useEffect } from 'react'

const SYSTEM_PROMPT = `당신은 픽셀포지 아카데미(PixelForge Academy)의 AI 튜터입니다.
코딩·자격증·AI 학습에 관한 질문에 친절하고 간결하게 한국어로 답변하세요.
픽셀포지 아카데미는 게임처럼 재미있게 배우는 IT 교육 플랫폼입니다.`

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '안녕하세요! 픽셀포지 AI 튜터입니다. 코딩·자격증·AI 학습 관련 질문은 뭐든 물어보세요 🎮' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const next = [...messages, { role: 'user', text }]
    setMessages(next)
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey) throw new Error('API 키 없음')

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 512,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...next.map((m) => ({ role: m.role, content: m.text })),
          ],
        }),
      })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content?.trim() || '응답을 받지 못했습니다.'
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ 오류: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--a1, #a78bfa), var(--a2, #fb923c))',
          color: '#0a0b10', fontSize: 24, display: 'grid', placeItems: 'center',
          boxShadow: '0 8px 28px rgba(167,139,250,.45)',
          transition: 'transform .15s, box-shadow .15s',
        }}
        title="AI 튜터"
      >
        {open ? '✕' : '▓'}
      </button>

      {/* 채팅 창 */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 9998,
          width: 340, maxWidth: 'calc(100vw - 40px)',
          background: 'var(--surface, #0c0e15)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,.6)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Pretendard', sans-serif",
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, var(--a1, #a78bfa), var(--a2, #fb923c))',
            color: '#0a0b10', fontWeight: 700, fontSize: 15,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontFamily: 'monospace' }}>▓</span> PixelForge AI 튜터
          </div>

          {/* 메시지 목록 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', maxHeight: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, var(--a1, #a78bfa), var(--a2, #fb923c))'
                  : 'rgba(255,255,255,.06)',
                color: m.role === 'user' ? '#0a0b10' : 'var(--text, #e8eaf0)',
                fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap',
              }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,.06)', color: 'var(--muted, #9aa0b4)', fontSize: 13 }}>
                생각 중...
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
                flex: 1, resize: 'none', background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.1)', borderRadius: 10,
                padding: '9px 12px', color: 'var(--text, #e8eaf0)', fontSize: 13.5,
                fontFamily: 'inherit', outline: 'none', lineHeight: 1.4,
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                background: 'linear-gradient(135deg, var(--a1, #a78bfa), var(--a2, #fb923c))',
                border: 'none', borderRadius: 10, padding: '0 14px',
                color: '#0a0b10', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                opacity: loading || !input.trim() ? 0.45 : 1, transition: 'opacity .15s',
              }}
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </>
  )
}
