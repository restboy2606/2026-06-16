import { supabase, hasSupabase, TABLES } from './supabase'

// 마이페이지(대시보드) 실데이터 조회.
// rest06_enrollments(수강) + rest06_profiles(스트릭) 를 강의 카탈로그와 결합한다.
//
// @param user   summarizeUser() 결과 (없으면 null)
// @param courses _courses() 카탈로그 (course_id → 메타 매핑용)
// @returns {{ list, stats }} | null  (Supabase 미설정 또는 비로그인 시 null)
export async function fetchDashboard(user, courses) {
  if (!hasSupabase || !user) return null

  const byId = Object.fromEntries(courses.map((c) => [c.id, c]))
  let list = []
  let streak = 1

  try {
    const { data: enr } = await supabase
      .from(TABLES.enrollments)
      .select('course_id, status, progress, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    list = (enr || [])
      .filter((e) => e.status !== 'cancelled')
      .map((e) => {
        const c = byId[e.course_id] || { title: e.course_id, instructor: '', thumb: 'linear-gradient(135deg,var(--a1),var(--a2))', mark: '★', lessons: 0 }
        const progress = Math.max(0, Math.min(100, e.progress ?? 0))
        return { ...c, course_id: e.course_id, status: e.status, progress, progressW: progress + '%' }
      })
  } catch (e) {
    console.warn('[dashboard] 수강내역 조회 실패:', e?.message)
  }

  try {
    const { data: prof } = await supabase
      .from(TABLES.profiles)
      .select('streak_days')
      .eq('id', user.id)
      .single()
    if (prof?.streak_days != null) streak = prof.streak_days
  } catch (e) {
    /* 프로필 없으면 기본값 */
  }

  const active = list.filter((c) => c.status === 'active' || c.status === 'trial').length
  const completedLessons = list.reduce((a, c) => a + Math.floor((c.lessons || 0) * (c.progress / 100)), 0)
  const certificates = list.filter((c) => c.progress >= 100).length

  return { list, stats: { active, completedLessons, streak, certificates } }
}

// 로그인 시 연속 학습일(스트릭) 갱신.
// 오늘 접속 → 그대로 / 어제 접속 → +1 / 그 이전 → 1 로 리셋.
export async function touchStreak(userId) {
  if (!hasSupabase || !userId) return
  try {
    const { data: prof } = await supabase
      .from(TABLES.profiles)
      .select('streak_days, last_active')
      .eq('id', userId)
      .single()

    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    let streak = 1
    if (prof?.last_active) {
      if (prof.last_active === todayStr) {
        streak = prof.streak_days || 1
      } else {
        const diff = Math.round((Date.parse(todayStr) - Date.parse(prof.last_active)) / 86400000)
        streak = diff === 1 ? (prof.streak_days || 0) + 1 : 1
      }
    }
    await supabase.from(TABLES.profiles).update({ streak_days: streak, last_active: todayStr }).eq('id', userId)
  } catch (e) {
    console.warn('[dashboard] 스트릭 갱신 생략:', e?.message)
  }
}
