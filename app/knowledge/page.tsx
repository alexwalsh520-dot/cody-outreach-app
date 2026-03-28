'use client'

import { useEffect, useState } from 'react'
import { supabase, Lead } from '@/lib/supabase'

const agentDocs = [
  {
    name: 'Cody',
    emoji: '🧠',
    role: 'Orchestrator',
    description:
      'Master coordinator. Reads all agent outputs, identifies the current constraint, and reassigns tasks. Runs weekly planning sessions. Obsessed with the Theory of Constraints — always asking "what is the ONE thing slowing us down right now?"',
  },
  {
    name: 'Scout',
    emoji: '🔍',
    role: 'Lead Finder',
    description:
      'Scrapes Instagram for fitness influencers matching ICP. Uses Apify for profile data, MillionVerifier for email validation. Daily runs at 6am. Targets: 10k–500k followers, fitness niche, 2%+ engagement rate, US/AU/UK/CA.',
  },
  {
    name: 'Writer',
    emoji: '✍️',
    role: 'Email Copywriter',
    description:
      'Writes personalized cold email sequences using lead profile data. Manages Smartlead campaigns. Tests subject lines, CTAs, and sequence length. Sends Mon–Fri 9am.',
  },
  {
    name: 'Tracker',
    emoji: '📊',
    role: 'Reply Monitor',
    description:
      'Polls Smartlead every 30 min for new replies. Classifies replies (positive/neutral/unsubscribe/bounce). Updates lead statuses in Supabase. Flags hot leads for human follow-up.',
  },
  {
    name: 'Analyst',
    emoji: '📈',
    role: 'Performance Analyst',
    description:
      'Generates daily reports. Calculates CPL, CPPC, funnel conversion rates. Identifies trends. Writes summary to agent_events table at 8pm daily. Feeds data to Cody for constraint identification.',
  },
]

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

const statusColors: Record<string, string> = {
  new: 'text-blue-400 bg-blue-400/10',
  contacted: 'text-yellow-400 bg-yellow-400/10',
  replied: 'text-purple-400 bg-purple-400/10',
  booked: 'text-orange-400 bg-orange-400/10',
  signed: 'text-emerald-400 bg-emerald-400/10',
  dead: 'text-gray-500 bg-gray-500/10',
}

export default function KnowledgePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<keyof Lead>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'leads' | 'agents' | 'icp'>('leads')

  useEffect(() => {
    supabase
      .from('leads')
      .select('*')
      .order(sortField as string, { ascending: sortDir === 'asc' })
      .limit(200)
      .then(({ data }) => {
        if (data) setLeads(data as Lead[])
      })
  }, [sortField, sortDir])

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase()
    return (
      !q ||
      l.first_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.instagram_username?.toLowerCase().includes(q)
    )
  })

  const toggleSort = (field: keyof Lead) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
        <p className="text-sm text-gray-500 mt-0.5">Agent docs, ICP criteria, and lead database</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-lg w-fit">
        {(['leads', 'agents', 'icp'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'icp' ? 'ICP Criteria' : tab === 'leads' ? 'Lead Database' : 'Agent Docs'}
          </button>
        ))}
      </div>

      {/* Lead Database */}
      {activeTab === 'leads' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-gray-500">{filtered.length} leads</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  {[
                    { key: 'first_name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'instagram_username', label: 'Instagram' },
                    { key: 'followers', label: 'Followers' },
                    { key: 'engagement_rate', label: 'Eng Rate' },
                    { key: 'status', label: 'Status' },
                    { key: 'created_at', label: 'Added' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key as keyof Lead)}
                      className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                    >
                      {col.label} {sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                      No leads yet. Scout will populate this table.
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead) => (
                    <tr key={lead.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-2.5 text-white font-medium">{lead.first_name || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{lead.email || '—'}</td>
                      <td className="px-4 py-2.5">
                        {lead.instagram_username ? (
                          <a
                            href={lead.instagram_url || `https://instagram.com/${lead.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline text-xs"
                          >
                            @{lead.instagram_username}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-300">
                        {lead.followers ? lead.followers.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-300">
                        {lead.engagement_rate ? `${lead.engagement_rate.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[lead.status] || statusColors.new}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agent Docs */}
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

      {/* ICP Criteria */}
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
