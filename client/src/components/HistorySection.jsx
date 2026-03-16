import { CheckCircle, XCircle, Clock, Calendar, MapPin, User, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const statusColors = {
  approved: 'bg-green-500/20 text-green-400 border-green-500/40',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/40',
  pending_hod: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  pending_abc: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  pending_superadmin: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  modification_pending: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
}

const statusLabel = (s) =>
  s?.replace('pending_', 'Pending ').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown'

const HistoryCard = ({ event, role }) => {
  const [expanded, setExpanded] = useState(false)

  // Find this role's action in the history
  const myAction = [...(event.history || [])].reverse().find(h => h.role === role)
  const actionLabel = myAction?.action === 'approved' ? 'Approved' : myAction?.action === 'rejected' ? 'Rejected' : 'Reviewed'
  const actionColor = myAction?.action === 'approved' ? 'text-green-400' : myAction?.action === 'rejected' ? 'text-red-400' : 'text-gray-400'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[event.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/40'}`}>
                {statusLabel(event.status)}
              </span>
              {myAction && (
                <span className={`text-xs font-semibold ${actionColor}`}>
                  {myAction.action === 'approved' ? '✅' : '❌'} You {actionLabel}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{event.reason || 'No title'}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {event.venueId?.name || 'N/A'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </span>
              <span className="flex items-center gap-1">
                <User size={11} /> {event.facultyId?.name || event.studentName || 'N/A'}
              </span>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">Approval Timeline</p>
            {(event.history || []).map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${h.action === 'approved' ? 'bg-green-500/20' : h.action === 'rejected' ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
                  {h.action === 'approved' ? <CheckCircle size={12} className="text-green-400" /> : h.action === 'rejected' ? <XCircle size={12} className="text-red-400" /> : <Clock size={12} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-semibold capitalize">{h.role}</span>
                    {' — '}{h.userName}
                    {' '}<span className={h.action === 'approved' ? 'text-green-500' : h.action === 'rejected' ? 'text-red-500' : 'text-gray-400'}>{h.action}</span>
                  </p>
                  {h.reason && <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5">"{h.reason}"</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">{h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN') : ''}</p>
                </div>
              </div>
            ))}
            {myAction?.reason && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Your note: <span className="text-gray-700 dark:text-gray-300 italic">"{myAction.reason}"</span></p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const HistorySection = ({ events, role }) => {
  const [filter, setFilter] = useState('all')

  const approved = events.filter(e => (e.history || []).some(h => h.role === role && h.action === 'approved'))
  const rejected = events.filter(e => (e.history || []).some(h => h.role === role && h.action === 'rejected'))

  const filtered = filter === 'approved' ? approved : filter === 'rejected' ? rejected : events

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: `All (${events.length})`, color: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
          { key: 'approved', label: `✅ Approved (${approved.length})`, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
          { key: 'rejected', label: `❌ Rejected (${rejected.length})`, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === f.key ? f.color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
          <Clock className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No history found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => (
            <HistoryCard key={event._id} event={event} role={role} />
          ))}
        </div>
      )}
    </div>
  )
}

export default HistorySection
