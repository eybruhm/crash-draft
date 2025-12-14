import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  Download,
  Filter,
  Map,
  MapPin,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavigationTabs from '../components/NavigationTabs'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { 
  getLocationHotspots, 
  getCategoryStats, 
  getOverview,
  exportAnalyticsPDF,
  rebuildAnalyticsCache,
} from '../services/analyticsService'

// Date range options for the filter dropdown
const dateRangeOptions = [
  { value: '0', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 180 days' },
  { value: '365', label: 'Last year' },
]

// Report categories for filter dropdown
const reportCategories = ['Violence', 'Threat', 'Theft', 'Vandalism', 'Suspicious', 'Emergency', 'Others']

const Analytics = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [analyticsData, setAnalyticsData] = useState(null)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState('30')
  const [scopeFilter, setScopeFilter] = useState('our_office') // 'all' or 'our_office'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [barangayFilter, setBarangayFilter] = useState('all')
  
  // Track available cities/barangays from the data
  const [availableCities, setAvailableCities] = useState([])
  const [availableBarangays, setAvailableBarangays] = useState([])
  const [toast, setToast] = useState(null)
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [lastRebuildAt, setLastRebuildAt] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Build filter object for API calls
  const buildFilters = useCallback(() => ({
    days: dateRange,
    scope: scopeFilter, // 'all' or 'our_office'
    office_id: user?.office_id,
    city: cityFilter !== 'all' ? cityFilter : undefined,
    barangay: barangayFilter !== 'all' ? barangayFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  }), [dateRange, scopeFilter, user?.office_id, cityFilter, barangayFilter, categoryFilter])

  // Fetch analytics data from API
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const filters = buildFilters()
        
        // Fetch all data in parallel
        const [hotspotsData, categoriesData, overviewData] = await Promise.all([
          getLocationHotspots(filters),
          getCategoryStats(filters),
          getOverview(filters),
        ])
        
        // Transform location hotspots for display
        const topLocations = (hotspotsData.results || []).map(loc => ({
          city: loc.location_city || 'Unknown',
          barangay: loc.location_barangay || 'Unknown',
          count: loc.report_count || 0,
          percentage: loc.report_percent || 0,
        }))
        
        // Transform category stats for display
        const categoryStats = (categoriesData.results || []).map(cat => ({
          category: cat.category || 'Unknown',
          count: cat.report_count || 0,
          percentage: cat.percentage || 0,
        }))
        
        // City/barangay dropdown options:
        // Use backend-provided full distinct list (not just "top 5" locations),
        // so the dropdown doesn't miss cities like Caloocan/Pasig.
        const backendCities = (hotspotsData.available_cities || []).filter(Boolean)
        if (backendCities.length) {
          setAvailableCities(backendCities)
        } else {
          // Fallback (older backend): derive from top locations only
          const cities = [...new Set(topLocations.map(l => l.city).filter(Boolean))].sort()
          setAvailableCities((prev) => (prev.length ? prev : cities))
        }

        // If a city is selected, prefer backend-provided barangay list for that city.
        if (cityFilter !== 'all') {
          const backendBarangays = (hotspotsData.available_barangays || []).filter(Boolean)
          if (backendBarangays.length) {
            setAvailableBarangays(backendBarangays)
          }
        }
        
        setOverview(overviewData)
        setAnalyticsData({ 
          topLocations, 
          categoryStats,
          totalResolved: hotspotsData.total_resolved || 0,
        })
        
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [isAuthenticated, navigate, buildFilters])

  // Update available barangays when city filter changes
  useEffect(() => {
    if (cityFilter === 'all') {
      setAvailableBarangays([])
      setBarangayFilter('all')
      return
    }
    // Fallback only: derive from displayed top locations
    const barangays = analyticsData?.topLocations
      ?.filter(loc => loc.city === cityFilter)
      ?.map(loc => loc.barangay)
      ?.filter(Boolean) || []
    setAvailableBarangays((prev) => (prev.length ? prev : [...new Set(barangays)].sort()))
  }, [cityFilter, analyticsData])

  // Handle PDF export - opens in new tab
  const handleExport = () => {
    const filters = buildFilters()
    exportAnalyticsPDF(filters)
  }

  const REBUILD_COOLDOWN_MS = 60_000
  const rebuildCooldownRemaining = useMemo(() => {
    if (!lastRebuildAt) return 0
    const elapsed = Date.now() - lastRebuildAt
    return Math.max(0, REBUILD_COOLDOWN_MS - elapsed)
  }, [lastRebuildAt])

  const handleRebuildCache = async () => {
    const ok = window.confirm(
      'Rebuild Analytics Cache?\n\nUse this if you edited/deleted reports directly in Supabase and analytics looks wrong.\nThis may take a few seconds.'
    )
    if (!ok) return
    if (rebuildCooldownRemaining > 0) {
      showToast(`Please wait ${(rebuildCooldownRemaining / 1000).toFixed(0)}s before rebuilding again.`, 'error')
      return
    }
    try {
      setIsRebuilding(true)
      const res = await rebuildAnalyticsCache()
      setLastRebuildAt(Date.now())
      showToast(res?.detail || 'Analytics cache rebuilt successfully.')
      // Refresh analytics data after rebuild
      const filters = buildFilters()
      const [hotspotsData, categoriesData, overviewData] = await Promise.all([
        getLocationHotspots(filters),
        getCategoryStats(filters),
        getOverview(filters),
      ])
      const topLocations = (hotspotsData.results || []).map(loc => ({
        city: loc.location_city || 'Unknown',
        barangay: loc.location_barangay || 'Unknown',
        count: loc.report_count || 0,
        percentage: loc.report_percent || 0,
      }))
      const categoryStats = (categoriesData.results || []).map(cat => ({
        category: cat.category || 'Unknown',
        count: cat.report_count || 0,
        percentage: cat.percentage || 0,
      }))
      const backendCities = (hotspotsData.available_cities || []).filter(Boolean)
      if (backendCities.length) setAvailableCities(backendCities)
      if (cityFilter !== 'all') {
        const backendBarangays = (hotspotsData.available_barangays || []).filter(Boolean)
        if (backendBarangays.length) setAvailableBarangays(backendBarangays)
      }
      setOverview(overviewData)
      setAnalyticsData({
        topLocations,
        categoryStats,
        totalResolved: hotspotsData.total_resolved || 0,
      })
    } catch (err) {
      showToast(err.message || 'Failed to rebuild analytics cache', 'error')
    } finally {
      setIsRebuilding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show empty state if no data
  const hasNoData = !analyticsData || 
    (analyticsData.topLocations?.length === 0 && analyticsData.categoryStats?.length === 0)

  return (
    <div className="min-h-screen pb-10">
      <PageHeader />
      <main className="w-full max-w-7xl mx-auto px-6 pt-20">
        <NavigationTabs activeTab="analytics" />

        {/* Toast notification */}
        {toast && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {toast.message}
          </div>
        )}

        <div className="mb-8">
          <div className="glass-card">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Reports Analytics</h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="input-field"
                  >
                    {dateRangeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-gray-400" />
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Offices</option>
                    <option value="our_office">Our Office</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Categories</option>
                    {reportCategories.map((category) => (
                      <option key={category.toLowerCase()} value={category.toLowerCase()}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Cities</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                {cityFilter !== 'all' && availableBarangays.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={barangayFilter}
                      onChange={(e) => setBarangayFilter(e.target.value)}
                      className="input-field"
                    >
                      <option value="all">All Barangays</option>
                      {availableBarangays.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button 
                  onClick={handleExport} 
                  className="btn-outline flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  onClick={handleRebuildCache}
                  disabled={isRebuilding || rebuildCooldownRemaining > 0}
                  className="btn-outline flex items-center gap-2"
                  title="Refresh analytics cache (use if you edited reports directly in Supabase)"
                >
                  <RefreshCw className={`h-4 w-4 ${isRebuilding ? 'animate-spin' : ''}`} />
                  {isRebuilding
                    ? 'Refreshing...'
                    : rebuildCooldownRemaining > 0
                      ? `Refresh (${Math.ceil(rebuildCooldownRemaining / 1000)}s)`
                      : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="glass-card bg-blue-50/50 border-blue-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Total Reports (Resolved)</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.total_resolved ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total reports (all statuses): {overview.total_assigned ?? 0}
                  </p>
                </div>
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <div className="glass-card bg-green-50/50 border-green-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Avg Resolution Time</p>
                  <p className="text-3xl font-bold text-gray-900">{overview.average_resolution_time || 'N/A'}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {hasNoData ? (
          <div className="glass-card text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Analytics Data</h3>
            <p className="text-gray-500">
              No reports found for the selected filters. Try adjusting the date range or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" /> Top Locations
                </h3>
                {analyticsData.topLocations?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No location data available</p>
                ) : (
                  <div className="space-y-4">
                    {analyticsData.topLocations.map((loc, index) => (
                      <div key={`${loc.city}-${loc.barangay}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-input">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-semibold text-primary-600">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {loc.barangay}, {loc.city}
                            </p>
                            <p className="text-xs text-gray-500">
                              {loc.count} reports
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {loc.percentage.toFixed(1)}%
                          </p>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-gradient-primary h-2 rounded-full" 
                              style={{ width: `${Math.min(loc.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" /> Category Statistics
                </h3>
                {analyticsData.categoryStats?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No category data available</p>
                ) : (
                  <div className="space-y-4">
                    {analyticsData.categoryStats.map((stat) => (
                      <div key={stat.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-input">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            stat.category.toLowerCase() === 'violence' ? 'bg-red-500' :
                            stat.category.toLowerCase() === 'threat' ? 'bg-amber-500' :
                            stat.category.toLowerCase() === 'theft' ? 'bg-orange-500' :
                            stat.category.toLowerCase() === 'vandalism' ? 'bg-purple-500' :
                            stat.category.toLowerCase() === 'suspicious' ? 'bg-indigo-500' :
                            stat.category.toLowerCase() === 'emergency' ? 'bg-cyan-500' :
                            'bg-gray-400'
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {stat.category}
                            </p>
                            <p className="text-xs text-gray-500">
                              {stat.count} reports
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {stat.percentage.toFixed(1)}%
                          </p>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                stat.category.toLowerCase() === 'violence' ? 'bg-red-500' :
                                stat.category.toLowerCase() === 'threat' ? 'bg-amber-500' :
                                stat.category.toLowerCase() === 'theft' ? 'bg-orange-500' :
                                stat.category.toLowerCase() === 'vandalism' ? 'bg-purple-500' :
                                stat.category.toLowerCase() === 'suspicious' ? 'bg-indigo-500' :
                                stat.category.toLowerCase() === 'emergency' ? 'bg-cyan-500' :
                                'bg-gradient-primary'
                              }`}
                              style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Analytics
