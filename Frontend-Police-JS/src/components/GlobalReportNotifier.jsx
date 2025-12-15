import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getMapData, mapReportToMarker } from '../services/mapService'
import { initUserInteractionForSound, playNewReportSound } from '../utils/notifications'

/**
 * GlobalReportNotifier
 *
 * Goal: play a sound anywhere in the Police Web when NEW reports arrive.
 *
 * How it works:
 * - Polls the backend for active reports every 15s (same cadence as Live Map)
 * - Tracks last seen report IDs
 * - If a new report_id appears, plays the "new report" sound once
 *
 * Sound file instructions:
 * - Add file: Frontend-Police-JS/public/sounds/new-report.mp3
 */
export default function GlobalReportNotifier() {
  const { isAuthenticated } = useAuth()

  const lastIdsRef = useRef(new Set())
  const didInitRef = useRef(false)

  useEffect(() => {
    initUserInteractionForSound()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      lastIdsRef.current = new Set()
      didInitRef.current = false
      return
    }

    let cancelled = false
    let interval = null

    async function poll() {
      try {
        const data = await getMapData({ scopeReports: 'our_office' })
        const reports = (data.active_reports || []).map(mapReportToMarker)
        const nextIds = new Set(reports.map((r) => r.id))

        if (didInitRef.current) {
          let hasNew = false
          nextIds.forEach((id) => {
            if (!lastIdsRef.current.has(id)) hasNew = true
          })
          if (hasNew) {
            playNewReportSound()
          }
        }

        lastIdsRef.current = nextIds
        didInitRef.current = true
      } catch {
        // ignore polling errors (no sound)
      }
    }

    // initial + interval
    poll()
    interval = setInterval(poll, 15000)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      // silence unused variable warning
      void cancelled
    }
  }, [isAuthenticated])

  return null
}


