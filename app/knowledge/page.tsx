'use client'

import { useEffect, useState } from 'react'
import { supabase, Lead } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

type Memory = {
  id: string
  agent: string
  file_path: string
  title: string
  content: string
  category: string
  updated_at: string
  created_at: string
}

// ─── Agent Docs ───────────────────────────────────────────────────────────────

const agentDocs = [
  {
    name: 'Cody',
    emoji: '🎯',
    role: 'Chief of Outreach',
    description:
      'Owns the entire client acquisition pipeline. Master coordinator — reads all agent outputs, identifies the current constraint using Theory of Constraints, and reassigns tasks. Runs weekly planning sessions. Always asking: what is the ONE thing slowing us down right now?',
  },
  {
    name: 'Scout',
    emoji: '🔍',
    role: 'Lead Researcher',
    description:
      'Scrapes and qualifies fitness influencer profiles. Uses Apify for Instagram data, MillionVerifier for email validation. Targets: 10k–500k followers, fitness niche, 2%+ engagement, US/AU/UK/CA. Daily runs at 6 AM.',
  },
  {
    name: 'Writer',
    emoji: '✍️',
    role: 'Email Copywriter',
    description:
      'Writes personalized cold email sequences using lead profile data. Manages Smartlead campaigns. Tests subject lines, CTAs, and sequence length. Sends Mon–Fri 9 AM.',
  },
  {
    name: 'Tracker',
    emoji: '📊',
    role: 'Reply Monitor',
    description:
      'Watches Smartlead for replies and updates lead status. Polls every 30 min for new replies. Classifies replies (positive/neutral/unsubscribe/bounce). Updates lead statuses in Supabase. Flags hot leads for human follow-up.',
  },
  {
    name: 'Analyst',
    emoji: '📈',
    role: 'Performance Auditor',
    description:
      'Weekly constraint identification and reporting. Generates daily performance reports, calculates CPL, CPPC, and funnel conversion rates. Writes summary to agent_events at 8 PM daily. Feeds data to Cody for constraint identification.',
  },
]

// ─── ICP Criteria ─────────────────────────────────────────────────────────────

const icpCriteria = [
  { label: 'Platform', value: 'Instagram' },
  { label: 'Niche', value: 'Fitness, health, wellness' },
  { label: 'Followers', value: '10,000 – 500,000' },
  { label: 'Engagement rate', value: '≥ 2%' },
  { label: 'Geography', value: 'US, AU, UK, CA' },
  { label: 'Content type', value: 'Workout videos, transformation content, nutrition' },
  { label: 'Audience', value: 'Adults 18–45 wanting to lose weight or build muscle' },
  { label: 'Disqualifiers', value: 'Already running coaching, fitness brands/companies, < 1 post/week' },
]

// ─── Status colors ────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  email_ready: 'text-emerald-400 bg-emerald-400/10',
  mgmt_email:  'text-yellow-400 bg-yellow-400/10',
  youtube_only:'text-cyan-400 bg-cyan-400/10',
  no_contact:  'text-gray-500 bg-gray-500/10',
  contacted:   'text-purple-400 bg-purple-400/10',
  replied:     'text-orange-400 bg-orange-400/10',
  booked:      'text-orange-400 bg-orange-400/10',
  signed:      'text-emerald-400 bg-emerald-400/10',
  new:         'text-blue-400 bg-blue-400/10',
  discovered:  'text-blue-400 bg-blue-400/10',
  qualified:   'text-emerald-400 bg-emerald-400/10',
  dead:        'text-gray-500 bg-gray-500/10',
}

const categoryLabels: Record<string, string> = {
  system: '⚙️ System Files',
  daily:  '📅 Daily Notes',
  topic:  '📚 Topics',
  lesson: '💡 Lessons',
  general: '📁 General',
}

// ─── Simple markdown renderer (inline only) ──────────────────────────────────

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n').slice(0, 100) // cap for perf
  return (
    <div className="text-xs text-gray-400 leading-relaxed font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
      {lines.join('\n')}
    </div>
  )
}

// ─── Memory Card ──────────────────────────────────────────────────────────────

function MemoryCard({ memory }: { memory: Memory }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-700/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{memory.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{memory.file_path}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {formatDistanceToNow(new Date(memory.updated_at), { addSuffix: true })}
          </span>
          <span className="text-gray-500">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700">
          <SimpleMarkdown content={memory.content} />
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'leads' | 'agents' | 'memories' | 'icp'

type BatchGroup = {
  key: string
  date: string
  seed: string
  leads: Lead[]
  emailCount: number
  youtubeCount: number
  mgmtCount: number
}

export default function KnowledgePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<keyof Lead>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<Tab>('leads')
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('leads')
      .select('*')
      .order('batch_date', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setLeads(data as Lead[])
      })
  }, [])

  useEffect(() => {
    if (activeTab === 'memories' && memories.length === 0) {
      setMemoriesLoading(true)
      supabase
        .from('memories')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
          if (data) setMemories(data as Memory[])
          setMemoriesLoading(false)
        })
    }
  }, [activeTab])

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase()
    return (
      !q ||
      l.first_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.instagram_handle?.toLowerCase().includes(q)
    )
  })

  const toggleSort = (field: keyof Lead) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  // Group leads into batches by date + seed
  const batches: BatchGroup[] = (() => {
    const groups: Record<string, Lead[]> = {}
    filtered.forEach(l => {
      const seed = (l.source_detail || '').replace('similar:', '') || 'manual'
      const date = l.batch_date || 'unknown'
      const key = `${date}__${seed}`
      if (!groups[key]) groups[key] = []
      groups[key].push(l)
    })
    return Object.entries(groups)
      .map(([key, batchLeads]) => ({
        key,
        date: key.split('__')[0],
        seed: key.split('__')[1],
        leads: batchLeads,
        emailCount: batchLeads.filter(l => l.email).length,
        youtubeCount: batchLeads.filter(l => l.youtube_channel).length,
        mgmtCount: batchLeads.filter(l => l.status === 'mgmt_email').length,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  })()

  // Group memories by category
  const memoriesByCategory: Record<string, Memory[]> = {}
  memories.forEach((m) => {
    const cat = m.category || 'general'
    if (!memoriesByCategory[cat]) memoriesByCategory[cat] = []
    memoriesByCategory[cat].push(m)
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'leads', label: 'Lead Database' },
    { key: 'agents', label: 'Agent Docs' },
    { key: 'memories', label: 'Memories' },
    { key: 'icp', label: 'ICP Criteria' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agent docs, ICP criteria, lead database, and Cody's memories</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Lead Database — Batch View ── */}
      {activeTab === 'leads' && (
        <div className="space-y-3">
          {/* Top bar */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-gray-500">{filtered.length} leads in {batches.length} batches</span>
            <button
              onClick={() => {
                const headers = ['first_name','full_name','email','email_source','instagram_handle','follower_count','youtube_channel','status','batch_date','bio','notes']
                const csvRows = [headers.join(',')]
                filtered.forEach(l => {
                  csvRows.push(headers.map(h => {
                    const v = String((l as Record<string,unknown>)[h] ?? '')
                    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g,'""')}"` : v
                  }).join(','))
                })
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
            >
              Download All CSV
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 px-4 py-12 text-center text-gray-500 text-sm">
              No leads yet. Scout will populate this table.
            </div>
          ) : (
            batches.map((batch) => (
              <div key={batch.key} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* Batch header — clickable */}
                <button
                  onClick={() => setExpandedBatch(expandedBatch === batch.key ? null : batch.key)}
                  className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-gray-700/40 transition-colors"
                >
                  <span className="text-gray-500 text-sm">{expandedBatch === batch.key ? '▼' : '▶'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">@{batch.seed}</span>
                      <span className="text-gray-600 text-xs">{batch.date}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{batch.leads.length} leads</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {batch.emailCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-emerald-400 bg-emerald-400/10">
                        {batch.emailCount} emails
                      </span>
                    )}
                    {batch.mgmtCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-yellow-400 bg-yellow-400/10">
                        {batch.mgmtCount} mgmt
                      </span>
                    )}
                    {batch.youtubeCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-cyan-400 bg-cyan-400/10">
                        {batch.youtubeCount} YT
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const headers = ['first_name','email','email_source','instagram_handle','follower_count','youtube_channel','status']
                      const csvRows = [headers.join(',')]
                      batch.leads.forEach(l => {
                        csvRows.push(headers.map(h => {
                          const v = String((l as Record<string,unknown>)[h] ?? '')
                          return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v
                        }).join(','))
                      })
                      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `batch_${batch.seed}_${batch.date}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                  >
                    CSV
                  </button>
                </button>

                {/* Expanded detail table */}
                {expandedBatch === batch.key && (
                  <div className="border-t border-gray-700 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instagram</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Followers</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">YouTube</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batch.leads.map((lead) => (
                          <tr key={lead.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-2 text-white font-medium text-xs">{lead.first_name || '—'}</td>
                            <td className="px-4 py-2 text-gray-400 font-mono text-xs">{lead.email || <span className="text-gray-600">—</span>}</td>
                            <td className="px-4 py-2 text-gray-500 font-mono text-xs">{lead.email_source || '—'}</td>
                            <td className="px-4 py-2">
                              {lead.instagram_handle ? (
                                <a href={`https://instagram.com/${lead.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline text-xs">
                                  @{lead.instagram_handle}
                                </a>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2 text-gray-300 text-xs">{lead.follower_count ? lead.follower_count.toLocaleString() : '—'}</td>
                            <td className="px-4 py-2">
                              {lead.youtube_channel ? (
                                <a href={lead.youtube_channel} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline text-xs">YT</a>
                              ) : <span className="text-gray-600">—</span>}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[lead.status] || statusColors.new}`}>
                                {lead.status?.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Agent Docs ── */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agentDocs.map((agent) => (
            <div key={agent.name} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{agent.emoji}</span>
                <div>
                  <p className="font-semibold text-white">{agent.name}</p>
                  <p className="text-xs text-emerald-400">{agent.role}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{agent.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Memories ── */}
      {activeTab === 'memories' && (
        <div className="space-y-6">
          {memoriesLoading ? (
            <div className="text-sm text-gray-500 py-8 text-center">Loading memories...</div>
          ) : memories.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
              <p className="text-3xl mb-3">🧠</p>
              <p className="text-gray-400 font-medium">No memories synced yet.</p>
              <p className="text-gray-600 text-sm mt-1">
                Run <code className="bg-gray-700 px-1 py-0.5 rounded text-xs">node tools/sync-memories.mjs</code> in Cody's workspace to sync memory files here.
              </p>
            </div>
          ) : (
            Object.entries(memoriesByCategory).map(([category, mems]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {categoryLabels[category] || category} ({mems.length})
                </p>
                <div className="space-y-2">
                  {mems.map((mem) => (
                    <MemoryCard key={mem.id} memory={mem} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ICP Criteria ── */}
      {activeTab === 'icp' && (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 max-w-2xl">
          <h3 className="text-sm font-semibold text-white mb-4">Ideal Client Profile (ICP)</h3>
          <div className="space-y-3">
            {icpCriteria.map((c) => (
              <div key={c.label} className="flex gap-4">
                <p className="text-xs font-medium text-gray-500 w-36 shrink-0">{c.label}</p>
                <p className="text-sm text-gray-300">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
