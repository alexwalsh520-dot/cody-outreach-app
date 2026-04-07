'use client'

import { useEffect, useState } from 'react'
import { supabase, Campaign } from '@/lib/supabase'
import { RefreshCw, Send, Phone, UserPlus, MessageSquare, Mail } from 'lucide-react'

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-[16px] font-bold tabular-nums font-mono ${accent ? 'text-[#c9a96e]' : 'text-white/70'}`}>{value}</p>
      <p className="text-[9px] text-white/20 mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const openRate = campaign.emails_sent > 0 ? ((campaign.opens / campaign.emails_sent) * 100).toFixed(1) : '0'
  const replyRate = campaign.emails_sent > 0 ? ((campaign.replies / campaign.emails_sent) * 100).toFixed(1) : '0'
  const posRate = campaign.replies > 0 ? ((campaign.positive_replies / campaign.replies) * 100).toFixed(1) : '0'
  const closeRate = campaign.booked_calls > 0 ? Math.round((campaign.signed_clients / campaign.booked_calls) * 100) : 0

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.03] flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-[13px] font-semibold text-white/70">{campaign.name}</h3>
          {campaign.subject_line && (
            <p className="text-[11px] text-white/20 mt-0.5 italic">"{campaign.subject_line}"</p>
          )}
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded font-medium uppercase tracking-wider ${
          campaign.status === 'active'
            ? 'text-emerald-400/60 bg-emerald-400/[0.06] border border-emerald-400/10'
            : 'text-white/20 bg-white/[0.03] border border-white/[0.04]'
        }`}>
          {campaign.status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-0 border-b border-white/[0.03]">
        <div className="py-4 border-r border-white/[0.03]"><Stat label="Sent" value={campaign.emails_sent.toLocaleString()} /></div>
        <div className="py-4 border-r border-white/[0.03]"><Stat label="Open %" value={`${openRate}%`} /></div>
        <div className="py-4 border-r border-white/[0.03]"><Stat label="Reply %" value={`${replyRate}%`} /></div>
        <div className="py-4"><Stat label="+ Reply %" value={`${posRate}%`} accent /></div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-0">
        <div className="py-3.5 border-r border-white/[0.03] text-center">
          <p className="text-[14px] font-bold text-white/50 tabular-nums font-mono">{campaign.booked_calls}</p>
          <p className="text-[9px] text-white/15 mt-0.5 uppercase tracking-wider">Booked</p>
        </div>
        <div className="py-3.5 border-r border-white/[0.03] text-center">
          <p className="text-[14px] font-bold text-[#c9a96e]/70 tabular-nums font-mono">{campaign.signed_clients}</p>
          <p className="text-[9px] text-white/15 mt-0.5 uppercase tracking-wider">Signed</p>
        </div>
        <div className="py-3.5 text-center">
          <p className="text-[14px] font-bold text-white/40 tabular-nums font-mono">{closeRate}%</p>
          <p className="text-[9px] text-white/15 mt-0.5 uppercase tracking-wider">Close</p>
        </div>
      </div>

      {/* Notes */}
      {campaign.notes && (
        <div className="px-5 py-3 border-t border-white/[0.03] bg-white/[0.01]">
          <p className="text-[10px] text-white/25 leading-relaxed">{campaign.notes}</p>
        </div>
      )}
    </div>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const loadCampaigns = () => {
    supabase.from('campaigns').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCampaigns(data as Campaign[]); setLoading(false) })
  }

  useEffect(() => { loadCampaigns() }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/smartlead-sync', { method: 'POST' })
      await res.json()
      loadCampaigns()
    } catch {} finally { setSyncing(false) }
  }

  const totalSent = campaigns.reduce((s, c) => s + c.emails_sent, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.replies, 0)
  const totalBooked = campaigns.reduce((s, c) => s + c.booked_calls, 0)
  const totalSigned = campaigns.reduce((s, c) => s + c.signed_clients, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-white/80 tracking-[0.01em]">Campaigns</h1>
          <p className="text-[11px] text-white/15 mt-1">Email sequences managed by Writer</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 text-[11px] font-medium text-white/30 hover:text-white/50 px-3 py-1.5 glass rounded-lg transition-colors disabled:opacity-30"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.6} />
          <span>Sync Smartlead</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 stagger">
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <Mail className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          <div>
            <p className="text-[20px] font-bold text-white/70 tabular-nums font-mono">{totalSent.toLocaleString()}</p>
            <p className="text-[9px] text-white/15 uppercase tracking-wider">Emails sent</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          <div>
            <p className="text-[20px] font-bold text-white/70 tabular-nums font-mono">{totalReplies}</p>
            <p className="text-[9px] text-white/15 uppercase tracking-wider">Replies</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <Phone className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          <div>
            <p className="text-[20px] font-bold text-white/70 tabular-nums font-mono">{totalBooked}</p>
            <p className="text-[9px] text-white/15 uppercase tracking-wider">Calls booked</p>
          </div>
        </div>
        <div className="glass-gold rounded-xl p-4 flex items-center gap-3">
          <UserPlus className="w-4 h-4 text-[#c9a96e]/30" strokeWidth={1.5} />
          <div>
            <p className="text-[20px] font-bold text-[#c9a96e] tabular-nums font-mono">{totalSigned}</p>
            <p className="text-[9px] text-[#c9a96e]/30 uppercase tracking-wider">Clients signed</p>
          </div>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-[11px] text-white/15 py-12 text-center">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <Send className="w-6 h-6 text-white/10 mx-auto mb-3" strokeWidth={1.2} />
          <p className="text-[12px] text-white/25">No campaigns yet</p>
          <p className="text-[10px] text-white/10 mt-1">Sync from Smartlead or Writer will create them</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
          {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  )
}
