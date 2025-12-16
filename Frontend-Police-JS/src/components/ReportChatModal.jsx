import { useEffect, useRef, useState, useCallback } from 'react'
import { AlertTriangle, MessageSquare, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMessages, sendMessage, mapMessageToFrontend } from '../services/messagesService'
import { POLLING_INTERVALS } from '../constants'

/**
 * ReportChatModal - Chat interface between police and reporter
 * 
 * Props:
 * - report: The report object with id, reporterName, category, location, reporterId
 * - onClose: Function to close the modal
 * 
 * Features:
 * - Fetches messages from backend API
 * - Polls every 5 seconds for new messages
 * - Sends messages via API
 * - Shows loading/error states
 */
const ReportChatModal = ({ report, onClose }) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const chatContainerRef = useRef(null)

  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [])

  // Fetch messages from API
  const fetchMessages = useCallback(async () => {
    if (!report?.id) return
    
    try {
      const backendMessages = await getMessages(report.id)
      const frontendMessages = backendMessages.map(mapMessageToFrontend)
      setMessages(frontendMessages)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch messages:', err)
      // Only show error on initial load, not during polling
      if (loading) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [report?.id, loading])

  // Initial fetch and polling setup
  useEffect(() => {
    fetchMessages()
    
    // Poll for new messages every report_chat seconds
    const pollInterval = setInterval(fetchMessages, POLLING_INTERVALS.REPORT_CHAT)
    
    return () => clearInterval(pollInterval)
  }, [fetchMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Format timestamp for display in Philippine Time (Asia/Manila)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    
    // Format in Philippine timezone: "MM/DD - HH:mm"
    const options = {
      timeZone: 'Asia/Manila',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // 24-hour format
    }
    
    const formatter = new Intl.DateTimeFormat('en-PH', options)
    const parts = formatter.formatToParts(date)
    
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''
    const hour = parts.find(p => p.type === 'hour')?.value || ''
    const minute = parts.find(p => p.type === 'minute')?.value || ''
    
    return `${month}/${day} - ${hour}:${minute}`
  }

  // Handle sending a message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    const text = messageText.trim()
    if (!text || sending) return

    // Get sender (police office) and receiver (reporter) IDs
    const senderId = user?.office_id || user?.id
    const receiverId = report.reporterId // Reporter's user_id
    
    if (!senderId) {
      setError('Unable to identify sender. Please re-login.')
      return
    }

    // Optimistically add message to UI
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      text,
      timestamp: new Date(),
      senderType: 'police',
      senderId,
      receiverId,
    }
    setMessages((prev) => [...prev, optimisticMessage])
    setMessageText('')

    try {
      setSending(true)
      const savedMessage = await sendMessage(
        report.id,
        text,
        senderId,
        'police',
        receiverId || senderId // Fallback if no reporter ID
      )
      
      // Replace optimistic message with saved one
      const mappedMessage = mapMessageToFrontend(savedMessage)
      setMessages((prev) => 
        prev.map((m) => m.id === optimisticMessage.id ? mappedMessage : m)
      )
    } catch (err) {
      console.error('Failed to send message:', err)
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      setError('Failed to send message. Please try again.')
      setMessageText(text) // Restore message text
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg mr-3">
              <MessageSquare className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Chat - Report #{report.id?.slice(0, 8)}...</h2>
              <p className="text-sm text-gray-600 font-medium">
                {report.category} - {report.location?.address || 'Address pending'}
              </p>
              <p className="text-sm mt-2">
                <span className="text-gray-600">Reporter: </span>
                <span className="font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                  {report.reporterName}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100/80 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Chat Body */}
        <div className="p-6 flex-1 flex flex-col overflow-hidden">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button 
                onClick={() => setError(null)} 
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Messages Container */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 glass-card p-4 mb-4">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-400 text-lg">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.senderType === 'police' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                      message.senderType === 'police' 
                        ? 'bg-gradient-primary text-white' 
                        : 'bg-gray-300 text-gray-800'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1 break-words">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.senderType === 'police' ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="mt-4 bg-white border-t border-gray-200 p-3 rounded-b-lg flex items-center gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={500}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className="px-6 py-2 bg-gradient-primary text-white rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ReportChatModal
