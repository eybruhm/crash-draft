import {
  AlertTriangle,
  CheckCircle,
  Download,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavigationTabs from '../components/NavigationTabs'
import PageHeader from '../components/PageHeader'
import ResolvedCaseDetailsModal from '../components/ResolvedCaseDetailsModal'
import { useAuth } from '../contexts/AuthContext'
import { 
  getResolvedCases, 
  exportResolvedCasesPDF, 
  exportSingleCasePDF,
  mapResolvedCaseToFrontend 
} from '../services/resolvedCasesService'

const ResolvedCases = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [resolvedCases, setResolvedCases] = useState([])
  const [availableCities, setAvailableCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [dateRange, setDateRange] = useState('30')
  const [scopeFilter, setScopeFilter] = useState('our_office') // 'all' or 'our_office'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [barangayFilter, setBarangayFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedCase, setSelectedCase] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  // Build filter object for API calls
  const buildFilters = useCallback(() => ({
    days: dateRange,
    scope: scopeFilter, // 'all' or 'our_office'
    office_id: user?.office_id,
    city: cityFilter !== 'all' ? cityFilter : undefined,
    barangay: barangayFilter !== 'all' ? barangayFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  }), [dateRange, scopeFilter, user?.office_id, cityFilter, barangayFilter, categoryFilter])

  // Fetch resolved cases from API with filters
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    const fetchResolvedCases = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const filters = buildFilters()
        const response = await getResolvedCases(filters)
        
        // Transform backend data to frontend format
        const transformedCases = (response.results || []).map(mapResolvedCaseToFrontend)
        setResolvedCases(transformedCases)
        setTotalCount(response.count || transformedCases.length)

        // Keep a stable full list of available cities.
        // Only refresh the city list when cityFilter is "all" (or initial load),
        // otherwise the dropdown shrinks to the current city.
        const cities = [...new Set(transformedCases.map((c) => c.city).filter(Boolean))].sort()
        setAvailableCities((prev) => {
          if (cityFilter === 'all' || prev.length === 0) return cities
          return prev
        })
        
      } catch (err) {
        console.error('Failed to fetch resolved cases:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchResolvedCases()
  }, [isAuthenticated, navigate, buildFilters])

  // Get barangays for selected city
  const barangaysForCity = useMemo(() => {
    if (cityFilter === 'all') return []
    const barangays = [...new Set(
      resolvedCases
        .filter(c => c.city === cityFilter)
        .map(c => c.barangay)
        .filter(Boolean)
    )]
    return barangays.sort()
  }, [cityFilter, resolvedCases])

  useEffect(() => {
    if (cityFilter === 'all') setBarangayFilter('all')
  }, [cityFilter])

  // Export all resolved cases as PDF - opens in new tab
  const handleExportAll = () => {
    const filters = buildFilters()
    exportResolvedCasesPDF(filters)
  }

  // Export single case as PDF - opens in new tab
  const handleExportCase = (caseId) => {
    exportSingleCasePDF(caseId)
  }

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const openCase = (case_) => {
    setSelectedCase(case_)
    setShowModal(true)
  }

  const closeCase = () => {
    setShowModal(false)
    setSelectedCase(null)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const categoryColor = (category) => {
    switch (category.toLowerCase()) {
      case 'violence':
        return 'text-red-600'
      case 'threat':
        return 'text-amber-600'
      case 'theft':
        return 'text-orange-600'
      case 'vandalism':
        return 'text-purple-600'
      case 'suspicious':
        return 'text-indigo-600'
      case 'emergency':
        return 'text-cyan-600'
      default:
        return 'text-gray-600'
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

  return (
    <div className="min-h-screen pb-10">
      <PageHeader />
      <main className="w-full max-w-7xl mx-auto px-6 pt-20">
        <NavigationTabs activeTab="resolved-cases" />

        <div className="mb-8">
          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Resolved Cases
                </h2>
              </div>
              <div className="flex items-center space-x-4 flex-wrap">
                <div className="flex items-center space-x-2">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="input-field"
                  >
                    <option value="0">All time</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="180">Last 180 days</option>
                    <option value="365">Last year</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Offices</option>
                    <option value="our_office">Our Office</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Categories</option>
                    <option value="violence">Violence</option>
                    <option value="threat">Threat</option>
                    <option value="theft">Theft</option>
                    <option value="vandalism">Vandalism</option>
                    <option value="suspicious">Suspicious</option>
                    <option value="emergency">Emergency</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
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
                {cityFilter !== 'all' && barangaysForCity.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <select
                      value={barangayFilter}
                      onChange={(e) => setBarangayFilter(e.target.value)}
                      className="input-field"
                    >
                      <option value="all">All Barangays</option>
                      {barangaysForCity.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={handleExportAll}
                  disabled={resolvedCases.length === 0}
                  className="btn-outline flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toast notification */}
        {toast && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {toast.message}
          </div>
        )}

        <div className="mt-8">
          <div className="glass-card-strong">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Resolved Cases
              </h3>
              <p className="text-sm text-gray-500">
                {totalCount} resolved cases
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white/50 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reporter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Resolved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resolution Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/30 divide-y divide-gray-200/50">
                  {resolvedCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No resolved cases found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    resolvedCases.map((case_) => (
                      <tr key={case_.id} className="hover:bg-white/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {case_.reporterName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${categoryColor(case_.category)}`}>
                            {case_.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {case_.barangay}, {case_.city}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(case_.dateResolved)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600">
                            {case_.resolutionTime}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => openCase(case_)}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleExportCase(case_.id)}
                              className="text-green-600 hover:text-green-800 transition-colors flex items-center"
                              title="Export case report"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Export
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showModal && selectedCase && (
          <ResolvedCaseDetailsModal case_={selectedCase} onClose={closeCase} />
        )}
      </main>
    </div>
  )
}

export default ResolvedCases
