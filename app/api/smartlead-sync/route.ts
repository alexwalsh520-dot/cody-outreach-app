// Fetches campaigns from Smartlead and upserts to Supabase
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const SMARTLEAD_KEY = '4cdf539e-cf6a-475f-b308-82fd109c5afb_7qzszm7'
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Fetch campaigns from Smartlead
    const res = await fetch(`https://server.smartlead.ai/api/v1/campaigns?api_key=${SMARTLEAD_KEY}`)
    const campaigns = await res.json()

    if (!Array.isArray(campaigns)) {
      return NextResponse.json({ error: 'Invalid Smartlead response', data: campaigns }, { status: 400 })
    }

    // For each campaign, fetch stats
    const enriched = await Promise.all(campaigns.map(async (c: any) => {
      try {
        const statsRes = await fetch(`https://server.smartlead.ai/api/v1/campaigns/${c.id}/analytics?api_key=${SMARTLEAD_KEY}`)
        const stats = await statsRes.json()
        return {
          id: c.id.toString(),
          name: c.name,
          status: c.status?.toLowerCase() || 'active',
          subject_line: c.subject_line || '',
          emails_sent: stats?.sent_count || 0,
          opens: stats?.open_count || 0,
          replies: stats?.reply_count || 0,
          positive_replies: stats?.positive_reply_count || 0,
          booked_calls: 0, // manual tracking
          signed_clients: 0, // manual tracking
          notes: `Synced from Smartlead at ${new Date().toISOString()}`,
        }
      } catch {
        return null
      }
    }))

    const valid = enriched.filter(Boolean)

    // Upsert to Supabase
    const { error } = await supabase
      .from('campaigns')
      .upsert(valid, { onConflict: 'id' })

    if (error) throw error

    return NextResponse.json({ ok: true, synced: valid.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
