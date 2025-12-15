/**
 * New report sound notification helper.
 *
 * Browser autoplay rules:
 * - Most browsers block audio unless the user has interacted with the page.
 * - So we only play sound after the user clicks/taps at least once.
 *
 * How to add a real sound:
 * 1) Create folder: Frontend-Police-JS/public/sounds/
 * 2) Put file: Frontend-Police-JS/public/sounds/new-report.mp3
 * 3) Restart `npm run dev`
 *
 * If you want a different filename, change SOUND_URL below.
 */

const SOUND_URL = '/sounds/new-report.mp3' // <- put your mp3 here (public folder)

let userInteracted = false

export function initUserInteractionForSound() {
  if (userInteracted) return
  const mark = () => {
    userInteracted = true
    window.removeEventListener('pointerdown', mark)
    window.removeEventListener('keydown', mark)
  }
  window.addEventListener('pointerdown', mark, { once: true })
  window.addEventListener('keydown', mark, { once: true })
}

export async function playNewReportSound() {
  if (!userInteracted) return
  try {
    const audio = new Audio(SOUND_URL)
    audio.volume = 1
    await audio.play()
  } catch {
    // ignore (missing file, autoplay blocked, etc.)
  }
}


