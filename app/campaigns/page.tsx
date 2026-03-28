'use client'

import { useEffect, useState } from 'react'
import { supabase, Campaign } from '@/lib/supabase'

function StatPill({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const openRate = campaign.emails_sent > 0 ? ((campaign.opens / campaign.emails_sent) * 100).toFixed(1) : '0.0'
  const replyRate = campaign.emails_sent > 0 ? ((campaign.replies / campaign.emails_sent) * 100).toFixed(1) : '0.0'
  const positiveReplyRate = campaign.replies > 0 ? ((campaign.positive_replies / campaign.replies) * 100).toFixed(1) : '0.0'

  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-400',
    paused: 'bg-yellow-500/10 text-yellow-400',
    completed: 'bg-gray-500/10 text-gray-400',
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-semibold text-white text-sm">{campaign.name}</h3>
          {campaign.subject_line && (
            <p className="text-xs text-gray-500 mt-0.5">"{campaign.subject_line}"</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColors[campaign.status as keyof typeof statusColors] || statusColors.active}`}>
          {campaign.status}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 py-3 border-y border-gray-700 mb-3">
        <StatPill label="Sent" value={campaign.emails_sent.toLocaleString()} />
        <StatPill label="Open rate" value={`${openRate}%`} />
        <StatPill label="Reply rate" value={`${replyRate}%`} />
        <StatPill label="+ replies" value={`${positiveReplyRate}%`} accent />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-orange-400">{campaign.booked_calls}</p>
          <p className="text-xs text-gray-500">Calls booked</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-emerald-400">{campaign.signed_clients}</p>
          <p className="text-xs text-gray-500">Signed</p>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
          <p className="text-sm font-bold text-white">
            {campaign.booked_calls > 0 ? `${Math.round((campaign.signed_clients / campaign.booked_calls) * 100)}%` : '—'}
          </p>
          <p className="text-xs text-gray-500">Close rate</p>
        </div>
      </div>

      {campaign.notes && (
        <div className="bg-gray-700/40 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1 font-medium">🧠 Cody's notes</p>
          <p className="text-xs text-gray-300 leading-relaxed">{campaign.notes}</p>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-3">
        Created {new Date(campaign.created_at).toLocaleDateString()}
      </p>
    </div>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setCampaigns(data as Campaign[])
        setLoading(false)
      })
  }, [])

  const active = campaigns.filter((c) => c.status === 'active')
  const inactive = campaigns.filter((c) => c.status !== 'active')

  const totalSent = campaigns.reduce((s, c) => s + c.emails_sent, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.replies, 0)
  const totalBooked = campaigns.reduce((s, c) => s + c.booked_calls, 0)
  const totalSigned = campaigns.reduce((s, c) => s + c.signed_clients, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Campaigns</h1>
        <p className="text-sm text-gray-500 mt-0.5">Email campaigns managed by Writer</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-2xl font-bold text-white">{totalSent.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total emails sent</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-2xl font-bold text-white">{totalReplies}</p>
          <p className="text-xs text-gray-500 mt-1">Total replies</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-2xl font-bold text-orange-400">{totalBooked}</p>
          <p className="text-xs text-gray-500 mt-1">Calls booked</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-emerald-500/30">
          <p className="text-2xl font-bold text-emerald-400">{totalSigned}</p>
          <p className="text-xs text-gray-500 mt-1">Clients signed</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-8 text-center">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <p className="text-gray-400">No campaigns yet.</p>
          <p className="text-gray-600 text-sm mt-1">Writer will create campaigns in Smartlead and log them here.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Active ({active.length})
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {active.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Inactive ({inactive.length})
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {inactive.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
