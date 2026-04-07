import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SMARTLEAD_KEY = process.env.SMARTLEAD_API_KEY || '4cdf539e-cf6a-475f-b308-82fd109c5afb_7qzszm7'
const BASE = 'https://server.smartlead.ai/api/v1'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const res = await fetch(`${BASE}/campaigns?api_key=${SMARTLEAD_KEY}`)
    const campaigns = await res.json()

    if (!Array.isArray(campaigns)) {
      return NextResponse.json({ error: 'Invalid Smartlead response' }, { status: 400 })
    }

    const enriched = await Promise.all(campaigns.map(async (c: any) => {
      try {
        const statsRes = await fetch(`${BASE}/campaigns/${c.id}/analytics?api_key=${SMARTLEAD_KEY}`)
        const s = await statsRes.json()

        const leadStats = s.campaign_lead_stats || {}

        return {
          smartlead_id: String(c.id),
          name: c.name || 'Untitled',
          status: (c.status || 'active').toLowerCase(),
          subject_line: c.subject_line || null,
          emails_sent: parseInt(s.sent_count) || 0,
          opens: parseInt(s.open_count) || 0,
          replies: parseInt(s.reply_count) || 0,
          positive_replies: parseInt(s.positive_reply_count) || 0,
          booked_calls: leadStats.interested || 0,
          signed_clients: 0,
          notes: `Smartlead sync ${new Date().toISOString().split('T')[0]} | ${leadStats.total || 0} total leads, ${leadStats.completed || 0} completed, ${parseInt(s.bounce_count) || 0} bounced`,
        }
      } catch { return null }
    }))

    const valid = enriched.filter(Boolean)

    // Upsert using smartlead_id
    const { error } = await supabase
      .from('campaigns')
      .upsert(valid, { onConflict: 'smartlead_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, synced: valid.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
