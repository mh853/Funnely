import { useEffect } from 'react'
import { useLandingPageForm } from '../context'

/**
 * Calculate time remaining from deadline
 * @param deadline Deadline in datetime-local format
 * @returns Formatted countdown string (D-n일 HH:MM:SS)
 */
const calculateTimeRemaining = (deadline: string): string => {
  if (!deadline) return 'D-0일 00:00:00'

  const now = new Date().getTime()
  const target = new Date(deadline).getTime()
  const diff = target - now

  if (diff <= 0) return 'D-0일 00:00:00'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return `D-${days}일 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Hook for managing timer countdown
 * Updates countdown every second when timer is enabled and deadline is set
 */
export const useTimerCountdown = () => {
  const { state, actions } = useLandingPageForm()

  useEffect(() => {
    if (!state.timerEnabled || !state.timerDeadline) {
      actions.setTimerCountdown('00:00:00')
      return
    }

    // Update immediately
    actions.setTimerCountdown(calculateTimeRemaining(state.timerDeadline))

    // Then update every second
    const interval = setInterval(() => {
      actions.setTimerCountdown(calculateTimeRemaining(state.timerDeadline))
    }, 1000)

    return () => clearInterval(interval)
  }, [state.timerEnabled, state.timerDeadline, actions])

  return {
    timerCountdown: state.timerCountdown,
  }
}
