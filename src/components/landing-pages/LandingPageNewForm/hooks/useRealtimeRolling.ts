import { useEffect } from 'react'
import { useLandingPageForm } from '../context'

// Demo realtime data (will be replaced with actual DB data in production)
const DEMO_REALTIME_DATA = [
  { name: '김민수', location: '서울 강남구' },
  { name: '이지은', location: '경기 성남시' },
  { name: '박준영', location: '인천 남동구' },
  { name: '최서연', location: '부산 해운대구' },
  { name: '정현우', location: '대전 유성구' },
]

/**
 * Hook for managing realtime status rolling animation
 * Updates currentRealtimeIndex based on speed setting
 */
export const useRealtimeRolling = () => {
  const { state, actions } = useLandingPageForm()

  useEffect(() => {
    if (!state.realtimeEnabled || !state.collectData) return

    const interval = setInterval(() => {
      actions.setCurrentRealtimeIndex((state.currentRealtimeIndex + 1) % DEMO_REALTIME_DATA.length)
    }, state.realtimeSpeed * 1000)

    return () => clearInterval(interval)
  }, [state.realtimeEnabled, state.collectData, state.realtimeSpeed, state.currentRealtimeIndex, actions])

  return {
    currentRealtimeData: DEMO_REALTIME_DATA[state.currentRealtimeIndex],
    demoRealtimeData: DEMO_REALTIME_DATA,
  }
}
