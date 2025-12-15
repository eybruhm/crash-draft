/**
 * Manual Report Page (Admin)
 *
 * Day 1 cleanup: this page relied on mock endpoints. We intentionally disable it
 * until admin-only backend endpoints are added.
 */

/**
 * Manual Report Insertion Page Component
 * 
 * Three-column layout:
 * - Left: Report Form (Primary Input)
 * - Center: Search User Tool (Helper Component)
 * - Right: Search Police Office Tool (Helper Component)
 * 
 * @returns {JSX.Element} Manual report insertion interface
 */
export default function ManualReport() {
  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-2">Manual Report (Not Available Yet)</h2>
      <p className="text-slate-300">
        This page needs dedicated backend endpoints (admin-only) for:
        <span className="font-mono text-slate-200"> user search</span> and
        <span className="font-mono text-slate-200"> manual report creation</span>.
      </p>
      <p className="text-slate-400 mt-3 text-sm">
        We will enable this during the roadmap’s “Manual Report” day, so Admin doesn’t use mock data.
      </p>
    </div>
  )
}
