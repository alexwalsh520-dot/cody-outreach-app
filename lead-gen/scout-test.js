/**
 * scout-test.js — Fast feedback loop for the Scout/Mason pipeline
 *
 * Usage:
 *   node scout-test.js <seed_username>       # discover similar accounts from seed
 *   node scout-test.js cbum                  # from Chris Bumstead's similar accounts
 *   node scout-test.js davidlaid             # from David Laid's similar accounts
 *   node scout-test.js cbum davidlaid        # chain multiple seeds
 *   node scout-test.js --auto                # auto-pick seeds from database
 *   node scout-test.js --auto --seeds=5      # auto-pick 5 seeds
 *   node scout-test.js --daily-batch         # run until 100 emails for today
 *   node scout-test.js --daily-batch --target=50  # custom target
 *
 * Pipeline:
 *   1. DISCOVER — Instagram similar/related accounts from seed(s)
 *   2. ENRICH   — Get bios, follower counts, websites via profile scraper
 *   3. QUALIFY  — Claude Haiku ICP scoring (full reasoning shown)
 *   4. FIND EMAIL — Waterfall: bio → Linktree mailto → landing page → Linktree links
 *   5. YOUTUBE  — Deep YouTube channel discovery (5-layer)
 *   6. DATAOVERCOFFEE — YouTube → business email extraction
 *   7. OUTPUT   — Full detail table + CSV + Supabase write
 */

import dotenv from 'dotenv';
dotenv.config({ override: true });
import { ApifyClient } from 'apify-client';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

// ─── Config ─────────────────────────────────────────────────────────────────

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
// Use service role key for writes (bypasses RLS). Falls back to anon key for reads-only.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = process.env.SUPABASE_URL && supabaseKey
  ? createClient(process.env.SUPABASE_URL, supabaseKey)
  : null;

const MIN_FOLLOWERS = 100_000;
const MAX_FOLLOWERS = 2_000_000;
const QUALIFY_MODEL = 'claude-haiku-4-5-20251001';
const CONCURRENCY = 10;
// No score — binary qualified yes/no
const SIMILAR_ACTOR = 'thenetaji/instagram-related-user-scraper';
const ENRICH_ACTOR = 'apify/instagram-profile-scraper';

if (!existsSync('./output')) mkdirSync('./output', { recursive: true });

const ICP_PROMPT = JSON.parse(readFileSync('./config.json', 'utf-8')).icpPrompt;

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`  ${msg}`); }
function logSection(msg) { console.log(`\n${'─'.repeat(70)}\n  ${msg}\n${'─'.repeat(70)}`); }

function extractEmailsFromText(text) {
  if (!text) return [];
  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g;
  return [...new Set((text.match(re) || []).map(e => e.toLowerCase()))];
}

const JUNK_EMAIL_PATTERNS = [
  'example.com', 'sentry.io', 'schema.org', 'w3.org', 'linktree', 'linktr.ee',
  'wixpress', 'wordpress', 'cloudflare', 'google.com', 'facebook.com',
  'instagram.com', 'twitter.com', 'tiktok.com', 'youtube.com',
  'noreply', 'no-reply', 'donotreply', 'mailer-daemon',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.css', '.js',
  'placeholder', 'test@', 'info@w3', 'yourname@', 'email@email',
  'press@', 'support@', 'help@', 'sales@', 'admin@', 'webmaster@',
];

function isRealEmail(email) {
  if (!email || email.length < 6) return false;
  const lower = email.toLowerCase();
  return !JUNK_EMAIL_PATTERNS.some(p => lower.includes(p));
}

// Known brand/sponsor/supplement domains — NOT the creator's own site
const BRAND_DOMAINS = [
  'gymshark', 'youngla', 'darcsport', '1stphorm', 'alphalete', 'nvgtn',
  'ghostlifestyle', 'rawgear', 'gymreapers', 'gorillawear', 'musclenation',
  'buffbunny', 'rawnutrition', 'revivemd', 'morphogen', 'evogen', 'myprotein',
  'scitec', 'rpstrength', 'marekhealth', 'elev8', 'transparentlabs',
  'celsius', 'armra', 'tlfapparel', 'vqfit', 'kontrolled', 'biowell',
  'mutant', 'iammutant', 'prosupps', 'dragonpharma', 'boohooman',
  'fathersons', 'axeandsledge', 'hugesupplements', 'megafitmeals',
  'bumenergy', 'flexpromeals', 'newtech', 'momentus', 'htltsupps',
  'amazon.com', 'shopify.com', 'gumroad.com', 'stripe.com',
];

function isBrandUrl(url) {
  const lower = (url || '').toLowerCase();
  return BRAND_DOMAINS.some(d => lower.includes(d));
}

// Known talent agency / management domains — email is still useful but tagged differently
const AGENCY_DOMAINS = [
  'selectmanagement', 'wmeagency', 'unitedtalent', 'caa.com', 'endeavorco',
  'icmpartners', 'paradigmagency', 'abramsentertainment', 'brillstein',
  'gersh.com', 'artistfirst', 'outlandgroup', 'talentx', 'night.co',
  'viraltalent', 'viral.co', 'loadedmgmt', 'talentmanagement', 'mgmt.com',
  'unruly.co', 'shade.co', 'theinfluenceagency', 'gleamfutures', 'sixdegrees',
  'digitaltalent', 'influencer.com', 'whalar', 'kairos.co', 'central.co',
  'goatmgmt', 'talentmgmt', 'socialtalen', 'creatoriq',
  'pr@', 'booking@', 'bookings@', 'inquiries@', 'talent@', 'management@',
  'mgmt@', 'agency@', 'represent', 'publicist',
];

function isAgencyEmail(email) {
  const lower = (email || '').toLowerCase();
  return AGENCY_DOMAINS.some(d => lower.includes(d));
}

function isAgencyUrl(url) {
  const lower = (url || '').toLowerCase();
  return AGENCY_DOMAINS.some(d => lower.includes(d));
}

// Fetch a URL and extract emails from it
async function scrapePageForEmails(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const emails = [];
    // Check mailto links first (most reliable)
    const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})/gi);
    if (mailtoMatches) {
      for (const m of mailtoMatches) {
        const email = m.replace(/^mailto:/i, '').toLowerCase();
        if (isRealEmail(email)) emails.push(email);
      }
    }
    // Then plain text emails
    const textEmails = extractEmailsFromText(html).filter(isRealEmail);
    for (const e of textEmails) {
      if (!emails.includes(e)) emails.push(e);
    }
    return emails;
  } catch { return []; }
}

// Find subpage links (contact, about, privacy, terms) from HTML
function findSubpageUrls(html, baseUrl) {
  const subpagePatterns = /contact|about|privacy|terms|legal|impressum|get-in-touch|reach-out|hire|work-with/i;
  const linkRegex = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([^<]*)<\/a>/gi;
  const found = new Set();

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2];
    // Check if the URL path or the link text matches subpage patterns
    if (subpagePatterns.test(href) || subpagePatterns.test(text)) {
      try {
        const resolved = new URL(href, baseUrl).href;
        // Only follow same-domain links
        if (new URL(resolved).hostname === new URL(baseUrl).hostname) {
          found.add(resolved);
        }
      } catch {}
    }
  }
  return [...found].slice(0, 5); // max 5 subpages
}

// Extract ALL YouTube channel/handle URLs from any text (returns array)
function extractYoutubeUrls(text) {
  if (!text) return [];
  const patterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/@[\w.-]+/gi,
    /https?:\/\/(?:www\.)?youtube\.com\/channel\/[\w-]+/gi,
    /https?:\/\/(?:www\.)?youtube\.com\/c\/[\w.-]+/gi,
    /https?:\/\/(?:www\.)?youtube\.com\/user\/[\w.-]+/gi,
    /https?:\/\/youtu\.be\/[\w-]+/gi,
  ];
  const found = new Set();
  for (const re of patterns) {
    const matches = text.match(re) || [];
    for (const m of matches) found.add(m);
  }
  return [...found];
}

// First match convenience wrapper
function extractYoutubeUrl(text) {
  const urls = extractYoutubeUrls(text);
  return urls.length > 0 ? urls[0] : null;
}

// Resolve a youtu.be video link or youtube.com/watch link to the channel URL via YouTube Data API
async function resolveYoutubeVideoToChannel(videoUrl) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  // Extract video ID from youtu.be/ID or youtube.com/watch?v=ID
  let videoId = null;
  const shortMatch = videoUrl.match(/youtu\.be\/([\w-]+)/);
  if (shortMatch) videoId = shortMatch[1];
  if (!videoId) {
    const longMatch = videoUrl.match(/[?&]v=([\w-]+)/);
    if (longMatch) videoId = longMatch[1];
  }
  if (!videoId) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const channelId = data.items[0].snippet.channelId;
      return `https://www.youtube.com/channel/${channelId}`;
    }
  } catch {}
  return null;
}

// Search YouTube Data API for a channel by name/username
async function searchYoutubeChannel(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'channel',
      maxResults: '1',
      key: apiKey,
    });
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const channelId = data.items[0].id.channelId;
      const channelTitle = data.items[0].snippet.channelTitle;
      return { url: `https://www.youtube.com/channel/${channelId}`, title: channelTitle };
    }
  } catch {}
  return null;
}

// ─── STEP 1: DISCOVER — Similar/Related Accounts ───────────────────────────

async function discoverSimilar(seedUsername) {
  log(`Seed: @${seedUsername} → ${SIMILAR_ACTOR}`);

  const run = await apify.actor(SIMILAR_ACTOR).call(
    { username: [seedUsername] },
    { waitSecs: 120 }
  );

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  log(`Found ${items.length} related accounts`);
  await logCost('apify', `Discovery: ${items.length} related from @${seedUsername}`, run.usageTotalUsd || 0);

  return items.map(item => ({
    username: (item.username || '').toLowerCase(),
    fullName: item.full_name || '',
    biography: '',
    followersCount: 0,
    externalUrl: '',
    _source: `similar:${seedUsername}`,
  }));
}

// ─── STEP 2: ENRICH — Get bios, follower counts, websites ──────────────────

async function enrichProfiles(profiles) {
  logSection(`ENRICH: Scraping ${profiles.length} profiles (${ENRICH_ACTOR})`);

  const usernames = profiles.map(p => p.username);
  const enrichedMap = new Map();

  for (let i = 0; i < usernames.length; i += 50) {
    const batch = usernames.slice(i, i + 50);
    try {
      const run = await apify.actor(ENRICH_ACTOR).call(
        { usernames: batch },
        { waitSecs: 300 }
      );
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();
      for (const item of items) {
        const u = (item.username || item.profileUsername || '').toLowerCase();
        if (u) enrichedMap.set(u, item);
      }
      log(`Batch ${Math.floor(i / 50) + 1}: ${items.length}/${batch.length} profiles returned`);
      await logCost('apify', `Enrich: ${items.length} profiles @ $0.0023`, run.usageTotalUsd || (items.length * 0.0023));
    } catch (err) {
      log(`Batch error: ${(err.message || '').slice(0, 80)}`);
    }
    if (i + 50 < usernames.length) await sleep(1000);
  }

  // Merge and extract ALL useful signal
  const result = profiles.map(p => {
    const e = enrichedMap.get(p.username);
    if (!e) return p;

    // Extract recent post captions (huge context for qualification)
    const recentCaptions = (e.latestPosts || []).slice(0, 5)
      .map(post => (post.caption || '').replace(/\n/g, ' ').replace(/[\uD800-\uDFFF]/g, '').slice(0, 150))
      .filter(c => c.length > 10);

    return {
      ...p,
      biography: e.biography || e.bio || e.profileBio || '',
      fullName: e.full_name || e.fullName || e.name || p.fullName || '',
      followersCount: e.followersCount || e.followers || 0,
      externalUrl: e.externalUrl || e.website || e.profileWebsite || '',
      isBusinessAccount: e.isBusinessAccount || false,
      businessCategory: e.businessCategoryName || e.category || '',
      verified: e.verified || false,
      postsCount: e.postsCount || 0,
      recentCaptions,
      // Collect ALL YouTube URLs from every available source
      _youtubeUrls: [
        ...extractYoutubeUrls(e.biography || ''),
        ...extractYoutubeUrls(e.externalUrl || ''),
        ...extractYoutubeUrls(JSON.stringify(e.externalUrls || [])),
        ...extractYoutubeUrls(recentCaptions.join(' ')),
        ...extractYoutubeUrls((e.latestIgtvVideos || []).map(v => v.caption || '').join(' ')),
      ].filter((v, i, a) => a.indexOf(v) === i), // deduplicate
      // Detect "mentions YouTube but no link" — for API search later
      _mentionsYoutube: /youtube/i.test(`${e.biography || ''} ${recentCaptions.join(' ')} ${(e.latestIgtvVideos || []).map(v => v.caption || '').join(' ')}`),
    };
  });

  // Show enrichment results for transparency
  log('');
  log('Enriched profiles:');
  for (const p of result) {
    const fc = p.followersCount ? `${(p.followersCount / 1000).toFixed(0)}K` : '?';
    const bio = (p.biography || '').replace(/\n/g, ' ').slice(0, 70);
    const web = p.externalUrl || '-';
    const range = p.followersCount >= MIN_FOLLOWERS && p.followersCount <= MAX_FOLLOWERS;
    const mark = range ? '\x1b[32m✓\x1b[0m' : '\x1b[90m✗\x1b[0m';
    log(`  ${mark} @${p.username.padEnd(22)} ${fc.padStart(7)}  ${web.padEnd(35).slice(0, 35)}  ${bio}`);
  }

  return result;
}

// ─── STEP 3: QUALIFY — Claude Haiku binary pass/fail ────────────────────────

async function qualifyOne(profile) {
  // Build rich context from everything we have
  const captions = (profile.recentCaptions || []).map((c, i) => `  ${i + 1}. ${c}`).join('\n');

  const prompt = `${ICP_PROMPT}

PROFILE:
- Username: @${profile.username}
- Display name: ${profile.fullName}
- Bio: "${profile.biography}"
- Website: ${profile.externalUrl || 'None'}
- Instagram category: ${profile.businessCategory || 'None set'}
- Verified: ${profile.verified ? 'Yes' : 'No'}
- Posts: ${profile.postsCount || '?'}
${captions ? `\nRECENT POST CAPTIONS:\n${captions}` : ''}`;

  try {
    const response = await anthropic.messages.create({
      model: QUALIFY_MODEL,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    try { return JSON.parse(text); } catch {}
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (err) {
    log(`AI error for @${profile.username}: ${err.message}`);
  }
  return { qualified: true, reject_reason: null };
}

async function qualifyBatch(profiles) {
  logSection(`QUALIFY: ${profiles.length} profiles (${QUALIFY_MODEL}) — binary YES/NO`);

  const results = [];
  for (let i = 0; i < profiles.length; i += CONCURRENCY) {
    const batch = profiles.slice(i, i + CONCURRENCY);
    const scored = await Promise.all(batch.map(async p => {
      const result = await qualifyOne(p);
      return { ...p, ...result };
    }));
    results.push(...scored);
    const yes = results.filter(r => r.qualified).length;
    process.stdout.write(`  ${results.length}/${profiles.length} checked — ${yes} YES so far\r`);
    if (i + CONCURRENCY < profiles.length) await sleep(300);
  }

  console.log('');
  // Haiku cost estimate: ~150 input tokens + ~30 output tokens per call
  // Haiku pricing: $0.80/M input, $4.00/M output
  const haikuCost = profiles.length * ((150 * 0.80 / 1_000_000) + (30 * 4.00 / 1_000_000));
  await logCost('anthropic', `Qualification: ${profiles.length} profiles via Haiku`, haikuCost);
  log('');
  log('QUALIFICATION RESULTS:');
  log('');

  // Show YES first, then NO with reasons
  const yesResults = results.filter(r => r.qualified);
  const noResults = results.filter(r => !r.qualified);

  for (const r of yesResults) {
    const fc = `${(r.followersCount / 1000).toFixed(0)}K`;
    log(`\x1b[32mYES\x1b[0m  @${r.username.padEnd(22)} ${fc.padStart(7)}  "${(r.biography || '').replace(/\n/g, ' ').slice(0, 90)}"`);
  }
  log('');
  for (const r of noResults) {
    const fc = `${(r.followersCount / 1000).toFixed(0)}K`;
    log(`\x1b[31mNO\x1b[0m   @${r.username.padEnd(22)} ${fc.padStart(7)}  reason: ${r.reject_reason || '?'}  "${(r.biography || '').replace(/\n/g, ' ').slice(0, 70)}"`);
  }

  log('');
  log(`RESULT: ${yesResults.length} YES / ${noResults.length} NO out of ${results.length}`);
  return results;
}

// ─── STEP 4: FIND EMAIL — Multi-source Waterfall ───────────────────────────

function emailFromBio(profile) {
  const text = `${profile.biography || ''} ${profile.externalUrl || ''}`;
  const emails = extractEmailsFromText(text).filter(isRealEmail);
  return emails.length > 0 ? { email: emails[0], source: 'ig_bio', detail: `matched in bio text` } : null;
}

async function emailFromLinktree(profile) {
  const text = `${profile.biography || ''} ${profile.externalUrl || ''}`;
  const ltMatch = text.match(/(?:https?:\/\/)?(?:linktr\.ee|linktree\.com)\/([\w.-]+)/i);
  if (!ltMatch) return null;

  const ltUrl = `https://linktr.ee/${ltMatch[1]}`;

  try {
    const res = await fetch(ltUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})/gi);
    if (mailtoMatches) {
      for (const m of mailtoMatches) {
        const email = m.replace(/^mailto:/i, '').toLowerCase();
        if (isRealEmail(email)) return { email, source: 'linktree_mailto', detail: `mailto link on ${ltUrl}` };
      }
    }

    const realEmails = extractEmailsFromText(html).filter(isRealEmail);
    if (realEmails.length > 0) {
      return { email: realEmails[0], source: 'linktree_text', detail: `plain text on ${ltUrl}` };
    }
  } catch {}
  return null;
}

async function emailFromLandingPage(profile) {
  let url = profile.externalUrl || '';
  if (!url) return null;
  if (/linktree|linktr\.ee|youtube|youtu\.be|tiktok|twitter|facebook|snapchat/i.test(url)) return null;
  if (!url.startsWith('http')) url = `https://${url}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1. Check main page for mailto links
    const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})/gi);
    if (mailtoMatches) {
      for (const m of mailtoMatches) {
        const email = m.replace(/^mailto:/i, '').toLowerCase();
        if (isRealEmail(email)) return { email, source: 'landing_page_mailto', detail: `mailto link on ${url}` };
      }
    }

    // 2. Check footer of main page
    const footerHtml = html.slice(Math.floor(html.length * 0.8));
    const footerEmails = extractEmailsFromText(footerHtml).filter(isRealEmail);
    if (footerEmails.length > 0) {
      return { email: footerEmails[0], source: 'landing_page_footer', detail: `footer of ${url}` };
    }

    // 3. Check body of main page
    const allEmails = extractEmailsFromText(html).filter(isRealEmail);
    if (allEmails.length > 0) {
      return { email: allEmails[0], source: 'landing_page_body', detail: `body of ${url}` };
    }

    // 4. NEW: Find and scrape contact/about/privacy/terms subpages
    const subpages = findSubpageUrls(html, url);
    for (const subUrl of subpages) {
      const subEmails = await scrapePageForEmails(subUrl);
      if (subEmails.length > 0) {
        const pageName = subUrl.split('/').pop() || 'subpage';
        return { email: subEmails[0], source: 'landing_subpage', detail: `found on /${pageName} (${subUrl})` };
      }
    }
  } catch {}
  return null;
}

async function emailFromLinktreeLinks(profile) {
  const text = `${profile.biography || ''} ${profile.externalUrl || ''}`;
  const ltMatch = text.match(/(?:https?:\/\/)?(?:linktr\.ee|linktree\.com)\/([\w.-]+)/i);
  if (!ltMatch) return null;

  const ltUrl = `https://linktr.ee/${ltMatch[1]}`;

  try {
    const res = await fetch(ltUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const urlMatches = html.match(/https?:\/\/[^\s"'<>]+/g) || [];

    // Collect YouTube URLs for DataOverCoffee (store on profile for later)
    for (const u of urlMatches) {
      const ytUrls = extractYoutubeUrls(u);
      for (const yt of ytUrls) {
        if (!profile._youtubeUrls) profile._youtubeUrls = [];
        if (!profile._youtubeUrls.includes(yt)) profile._youtubeUrls.push(yt);
      }
    }

    // Filter to personal/coaching domains — skip social media, brands, assets
    const personalUrls = urlMatches.filter(u => {
      const lower = u.toLowerCase();
      // Skip social media
      if (/linktree|linktr\.ee|instagram|youtube|tiktok|twitter|facebook|snapchat|spotify|apple\.com|x\.com/i.test(lower)) return false;
      // Skip assets
      if (/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff)/.test(lower)) return false;
      // Skip known brand/sponsor domains
      if (isBrandUrl(lower)) return false;
      // Skip Google/fonts/CDN
      if (/google|fonts\.|cdn\.|cloudflare|sentry/i.test(lower)) return false;
      // Must look like a real URL (has a proper domain)
      return /^https?:\/\/[^/]+\.[a-z]{2,6}/i.test(lower);
    });

    // Deduplicate by domain
    const seenDomains = new Set();
    const uniqueUrls = personalUrls.filter(u => {
      try {
        const domain = new URL(u).hostname;
        if (seenDomains.has(domain)) return false;
        seenDomains.add(domain);
        return true;
      } catch { return false; }
    });

    for (const siteUrl of uniqueUrls.slice(0, 3)) {
      try {
        const pageRes = await fetch(siteUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        });
        if (!pageRes.ok) continue;
        const pageHtml = await pageRes.text();

        // Check main page
        const mailtoMatches = pageHtml.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})/gi);
        if (mailtoMatches) {
          for (const m of mailtoMatches) {
            const email = m.replace(/^mailto:/i, '').toLowerCase();
            if (isRealEmail(email)) return { email, source: 'linktree_site', detail: `mailto on ${siteUrl} (via ${ltUrl})` };
          }
        }

        const emails = extractEmailsFromText(pageHtml).filter(isRealEmail);
        if (emails.length > 0) {
          return { email: emails[0], source: 'linktree_site', detail: `scraped from ${siteUrl} (via ${ltUrl})` };
        }

        // Check contact/about/privacy subpages of this coaching site
        const subpages = findSubpageUrls(pageHtml, siteUrl);
        for (const subUrl of subpages) {
          const subEmails = await scrapePageForEmails(subUrl);
          if (subEmails.length > 0) {
            const pageName = subUrl.split('/').pop() || 'subpage';
            return { email: subEmails[0], source: 'linktree_site_subpage', detail: `/${pageName} on ${siteUrl} (via ${ltUrl})` };
          }
        }
      } catch { continue; }
    }
  } catch {}
  return null;
}

async function findEmail(profile) {
  const bioResult = emailFromBio(profile);
  if (bioResult) return bioResult;

  const ltResult = await emailFromLinktree(profile);
  if (ltResult) return ltResult;

  const lpResult = await emailFromLandingPage(profile);
  if (lpResult) return lpResult;

  const ltLinksResult = await emailFromLinktreeLinks(profile);
  if (ltLinksResult) return ltLinksResult;

  return null;
}

// Haiku validates whether an email actually belongs to this creator
async function validateEmailWithAI(email, profile) {
  const prompt = `You are an email validation filter for a fitness influencer outreach system.

Given this Instagram creator and an email address we found by scraping their links, decide: does this email belong to this person (or their personal business), or is it a platform, brand, sponsor, or unrelated third party?

CREATOR:
- Username: @${profile.username}
- Display name: ${profile.fullName}
- Bio: "${(profile.biography || '').slice(0, 200)}"

EMAIL FOUND: ${email}
Found via: ${profile._emailSource || 'web scraping'}

Respond with ONLY this JSON:
{"valid": true/false, "type": "personal" | "management" | "platform" | "brand" | "spam", "reason": "one sentence why"}

Examples of what each type means:
- personal: their own email (gmail, custom domain matching their name/brand, coaching business)
- management: talent agency, booking agent, PR rep — still useful but different outreach
- platform: cameo.com, typeform.com, calendly.com — not anyone's contact email
- brand: a supplement company, apparel brand, sponsor email — not the creator
- spam: clearly junk, scraping artifact, or placeholder`;

  try {
    const response = await anthropic.messages.create({
      model: QUALIFY_MODEL,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].text.trim();
    try { return JSON.parse(text); } catch {}
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return { valid: true, type: 'personal', reason: 'validation failed, assuming valid' };
}

async function findEmailsBatch(profiles) {
  logSection(`FIND EMAIL: Waterfall on ${profiles.length} qualified profiles`);
  log('Order: bio regex → Linktree mailto → landing page (+subpages) → Linktree→coaching site (+subpages)');
  log('Then: Haiku validates every email found');
  log('');

  const results = [];
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const emailResult = await findEmail(p);

    let email = emailResult?.email || '';
    let emailSource = emailResult?.source || 'not_found';
    let emailDetail = emailResult?.detail || '';
    let emailType = '';
    let emailRejected = false;

    // Validate with Haiku if we found an email
    if (email) {
      p._emailSource = emailResult.detail; // pass context to validator
      const validation = await validateEmailWithAI(email, p);
      emailType = validation.type || '';

      if (!validation.valid || validation.type === 'platform' || validation.type === 'brand' || validation.type === 'spam') {
        // Reject this email — it's not the creator's
        log(`\x1b[31m✗\x1b[0m @${p.username.padEnd(22)} ${email} → \x1b[31mREJECTED (${validation.type}: ${validation.reason})\x1b[0m`);
        email = '';
        emailSource = 'rejected';
        emailDetail = `${emailResult.email} rejected: ${validation.type} — ${validation.reason}`;
        emailRejected = true;
      } else {
        const typeTag = validation.type === 'management'
          ? ` \x1b[33m⚠ MGMT: ${validation.reason}\x1b[0m`
          : '';
        log(`\x1b[32m✓\x1b[0m @${p.username.padEnd(22)} ${email}${typeTag}`);
        log(`  └─ source: ${emailSource}  |  how: ${emailDetail}`);
        log(`  └─ AI: ${validation.type} — ${validation.reason}`);
      }
    } else {
      const hasLinktree = /linktr\.ee|linktree/i.test(`${p.biography} ${p.externalUrl}`);
      const hasWebsite = p.externalUrl && !/linktree|linktr\.ee|youtube|tiktok|twitter|facebook/i.test(p.externalUrl);
      log(`\x1b[31m✗\x1b[0m @${p.username.padEnd(22)} NO EMAIL FOUND`);
      log(`  └─ tried: bio(no match)${hasLinktree ? ' → linktree(no mailto)' : ''}${hasWebsite ? ` → ${p.externalUrl}(no email)` : ''}`);
    }
    log('');

    results.push({
      ...p,
      email,
      emailSource,
      emailDetail,
      emailType,
      emailIsAgency: emailType === 'management',
    });
  }

  const found = results.filter(r => r.email).length;
  const rejected = results.filter(r => r.emailSource === 'rejected').length;
  const bySource = {};
  for (const r of results.filter(r => r.email)) bySource[r.emailSource] = (bySource[r.emailSource] || 0) + 1;

  log(`EMAILS: ${found} valid, ${rejected} rejected by AI, ${results.length - found - rejected} not found`);
  if (Object.keys(bySource).length > 0) log(`BY SOURCE: ${JSON.stringify(bySource)}`);
  // Log Haiku cost for email validation calls
  const validationCalls = found + rejected; // every email found gets validated
  if (validationCalls > 0) {
    const valCost = validationCalls * ((200 * 0.80 / 1_000_000) + (50 * 4.00 / 1_000_000));
    await logCost('anthropic', `Email validation: ${validationCalls} emails via Haiku`, valCost);
  }
  return results;
}

// ─── STEP 5: YOUTUBE DEEP DISCOVERY ─────────────────────────────────────────

async function deepYoutubeDiscovery(profiles) {
  const qualified = profiles.filter(p => p.qualified);
  if (qualified.length === 0) return profiles;

  logSection(`YOUTUBE DISCOVERY: Deep search for ${qualified.length} qualified profiles`);

  let resolved = 0;
  let apiSearched = 0;
  let alreadyHad = 0;

  for (const p of qualified) {
    if (!p._youtubeUrls) p._youtubeUrls = [];

    // Check if any are youtu.be video links → resolve to channel
    const videoLinks = p._youtubeUrls.filter(u => /youtu\.be\//i.test(u) || /youtube\.com\/watch/i.test(u));
    const channelLinks = p._youtubeUrls.filter(u => !videoLinks.includes(u));

    if (channelLinks.length > 0) {
      alreadyHad++;
      log(`\x1b[32m✓\x1b[0m @${p.username.padEnd(22)} already has channel: ${channelLinks[0]}`);
      p._youtubeUrl = channelLinks[0]; // best one
      continue;
    }

    // Resolve video links to channels
    if (videoLinks.length > 0) {
      for (const vUrl of videoLinks) {
        const channelUrl = await resolveYoutubeVideoToChannel(vUrl);
        if (channelUrl) {
          p._youtubeUrls.push(channelUrl);
          p._youtubeUrl = channelUrl;
          resolved++;
          log(`\x1b[33m→\x1b[0m @${p.username.padEnd(22)} video ${vUrl} → ${channelUrl}`);
          break;
        }
      }
      if (p._youtubeUrl) continue;
    }

    // If they mention YouTube but we have no link, search YouTube Data API
    if (p._mentionsYoutube && p._youtubeUrls.length === 0) {
      // Search by display name first (more unique), then username
      const searchQueries = [
        p.fullName ? `${p.fullName} fitness` : null,
        p.username,
      ].filter(Boolean);

      for (const query of searchQueries) {
        const result = await searchYoutubeChannel(query);
        if (result) {
          // Verify it's plausibly the same person (channel title contains part of their name/username)
          const titleLower = result.title.toLowerCase();
          const nameParts = (p.fullName || '').toLowerCase().split(/\s+/);
          const userLower = p.username.toLowerCase();
          const isMatch = nameParts.some(part => part.length > 2 && titleLower.includes(part)) ||
                          titleLower.includes(userLower) ||
                          userLower.includes(titleLower.replace(/\s+/g, ''));

          if (isMatch) {
            p._youtubeUrls.push(result.url);
            p._youtubeUrl = result.url;
            apiSearched++;
            log(`\x1b[36m🔍\x1b[0m @${p.username.padEnd(22)} YouTube search "${query}" → ${result.url} (${result.title})`);
            break;
          } else {
            log(`\x1b[90m?\x1b[0m  @${p.username.padEnd(22)} YouTube search "${query}" → "${result.title}" — name mismatch, skipped`);
          }
        }
      }
      if (p._youtubeUrl) continue;
      await sleep(200); // gentle on API quota
    }

    if (!p._youtubeUrl && p._youtubeUrls.length === 0) {
      const signal = p._mentionsYoutube ? ' (mentions YouTube!)' : '';
      log(`\x1b[90m✗\x1b[0m  @${p.username.padEnd(22)} no YouTube found${signal}`);
    }
  }

  log('');
  const total = qualified.filter(p => p._youtubeUrl || (p._youtubeUrls && p._youtubeUrls.length > 0)).length;
  log(`YOUTUBE: ${total}/${qualified.length} channels found`);
  log(`  already had: ${alreadyHad} | video→channel: ${resolved} | API search: ${apiSearched}`);

  return profiles;
}

// ─── STEP 6: DATAOVERCOFFEE — YouTube → Business Email ─────────────────────

const DATAOVERCOFFEE_ACTOR = 'dataovercoffee/youtube-channel-business-email-scraper';

async function dataOverCoffeeEmails(profiles) {
  // Find qualified profiles with YouTube but no email
  const candidates = profiles.filter(p =>
    p.qualified && !p.email &&
    (p._youtubeUrl || (p._youtubeUrls && p._youtubeUrls.length > 0))
  );

  if (candidates.length === 0) return profiles;

  logSection(`DATAOVERCOFFEE: Submitting ${candidates.length} YouTube channels for email extraction`);
  log(`Actor: ${DATAOVERCOFFEE_ACTOR} | $0.12/result`);
  log('');

  const channels = candidates.map(p => p._youtubeUrl || p._youtubeUrls[0]);
  for (const c of channels) log(`  → ${c}`);
  log('');

  try {
    // Submit and wait up to 5 minutes
    const run = await apify.actor(DATAOVERCOFFEE_ACTOR).call(
      { channels },
      { waitSecs: 300 }
    );

    log(`Run status: ${run.status} | Cost: $${run.usageTotalUsd}`);

    if (run.status === 'SUCCEEDED' || run.status === 'RUNNING') {
      const { items } = await apify.dataset(run.defaultDatasetId).listItems();

      // Map results back to profiles by matching channel URLs/handles
      let matched = 0;
      for (const item of items) {
        if (!item.Email || item.Status !== 'EMAIL_AVAILABLE') continue;

        // Find which profile this result belongs to
        const channelId = item.ChannelId;
        const channelHandle = (item.ChannelHandle || '').toLowerCase();

        for (const p of candidates) {
          if (p.email) continue; // already has one
          const ytUrl = p._youtubeUrl || (p._youtubeUrls && p._youtubeUrls[0]) || '';
          const ytLower = ytUrl.toLowerCase();
          if (ytLower.includes(channelId) || (channelHandle && ytLower.includes(channelHandle.replace('@', '')))) {
            p.email = item.Email;
            p.emailSource = 'dataovercoffee';
            p.emailDetail = `YouTube ${item.ChannelHandle || item.ChannelName} (${item.SubscriberCount?.toLocaleString()} subs)`;
            p.emailIsAgency = isAgencyEmail(item.Email);
            matched++;

            const agencyTag = p.emailIsAgency ? ' \x1b[33m⚠ AGENCY\x1b[0m' : '';
            log(`\x1b[32m✓\x1b[0m @${p.username.padEnd(22)} ${item.Email}${agencyTag}`);
            log(`  └─ from: ${item.ChannelHandle} | ${(item.SubscriberCount || 0).toLocaleString()} subs`);
            break;
          }
        }
      }

      // Show channels with no email available
      const noEmail = items.filter(i => i.Status !== 'EMAIL_AVAILABLE');
      for (const item of noEmail) {
        log(`\x1b[31m✗\x1b[0m ${item.ChannelHandle || item.Query} → ${item.Status}`);
      }

      log('');
      log(`DataOverCoffee: ${matched} new emails from ${items.length} results (cost: $${run.usageTotalUsd})`);
      await logCost('dataovercoffee', `YouTube emails: ${matched} found from ${items.length} channels`, run.usageTotalUsd || (items.length * 0.12));

      // If run was still going, save the run ID so we can check later
      if (run.status === 'RUNNING') {
        log(`\x1b[33m⏳ Run still processing — check later: run ID ${run.id}\x1b[0m`);
      }
    }
  } catch (err) {
    log(`DataOverCoffee error: ${err.message}`);
  }

  return profiles;
}

// ─── SUPABASE: Write leads + dedup ──────────────────────────────────────────

async function checkDuplicates(usernames) {
  if (!supabase || usernames.length === 0) return new Set();
  try {
    const { data } = await supabase
      .from('leads')
      .select('instagram_handle')
      .in('instagram_handle', usernames);
    return new Set((data || []).map(d => d.instagram_handle?.toLowerCase()));
  } catch { return new Set(); }
}

async function writeLeadsToSupabase(results) {
  if (!supabase) {
    log('Supabase not configured — skipping database write');
    return;
  }

  const qualified = results.filter(r => r.qualified);
  if (qualified.length === 0) return;

  logSection(`SUPABASE: Writing ${qualified.length} qualified leads (actionable only) to database`);

  // Only write leads that have an email OR a YouTube channel (actionable)
  const actionable = qualified.filter(r =>
    r.email || r._youtubeUrl || (r._youtubeUrls && r._youtubeUrls.length > 0)
  );
  const skipped = qualified.length - actionable.length;
  if (skipped > 0) log(`  Skipping ${skipped} leads with no email and no YouTube (dead ends)`);

  const rows = actionable.map(r => {
    // Clear status labels
    let status = 'no_contact';
    if (r.email && r.emailType !== 'management') status = 'email_ready';
    else if (r.email && r.emailType === 'management') status = 'mgmt_email';
    else if (r._youtubeUrl || (r._youtubeUrls && r._youtubeUrls.length > 0)) status = 'youtube_only';

    // Extract a clean first name
    const rawFirst = (r.fullName || '').split(' ')[0] || '';
    // Clean: strip emojis, URLs, .COM, all-caps normalization
    let firstName = rawFirst
      .replace(/[^\w\s'-]/g, '') // strip emojis/special chars
      .replace(/\.com/gi, '')    // strip .COM
      .trim();
    // If it's clearly not a name (all caps slogan, URL, single char), fall back to username
    if (!firstName || firstName.length < 2 || /^[A-Z\s.]+$/.test(firstName) && firstName.length > 6) {
      firstName = r.username;
    }
    // Proper case: first letter up, rest lower
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    return {
      first_name: firstName,
      full_name: r.fullName || '',
      email: r.email || null,
      email_source: r.emailSource || null,
      instagram_handle: r.username,
      instagram_url: `https://instagram.com/${r.username}`,
      follower_count: r.followersCount || null,
      bio: (r.biography || '').slice(0, 500),
      business_category: r.businessCategory || null,
      is_business_account: r.isBusinessAccount || false,
      youtube_channel: r._youtubeUrl || (r._youtubeUrls && r._youtubeUrls[0]) || null,
      external_url: r.externalUrl || null,
      status,
      source: 'scout',
      source_detail: r._source || '',
      batch_date: new Date().toISOString().split('T')[0],
      qualification_reasoning: r.reject_reason || 'qualified',
      notes: r.emailType === 'management' ? 'EMAIL IS MANAGEMENT — use different sequence' : (r.emailDetail || '').includes('rejected') ? r.emailDetail : null,
    };
  });

  // Upsert to handle reruns of same seed gracefully
  const { data, error } = await supabase
    .from('leads')
    .upsert(rows, { onConflict: 'instagram_handle', ignoreDuplicates: false })
    .select('id');

  if (error) {
    log(`Supabase error: ${error.message}`);
    // Try inserting one by one to see which ones fail
    let inserted = 0;
    for (const row of rows) {
      const { error: rowErr } = await supabase.from('leads').upsert(row, { onConflict: 'instagram_handle' });
      if (!rowErr) inserted++;
    }
    log(`Inserted ${inserted}/${rows.length} individually`);
  } else {
    log(`\x1b[32m✓\x1b[0m ${data?.length || rows.length} leads written to Supabase`);
  }

  // Log the run as an agent event
  const withEmail = qualified.filter(r => r.email);
  const seed = (results[0]?._source || '').replace('similar:', '') || 'unknown';
  await supabase.from('agent_events').insert({
    agent: 'scout',
    event: `${seed}: ${withEmail.length} emails from ${qualified.length} qualified`,
    data: { seed, discovered: results.length, qualified: qualified.length, emails: withEmail.length },
    status: 'ok',
  });

  // Log pipeline funnel data
  if (results._pipelineStats) {
    const s = results._pipelineStats;
    await supabase.from('pipeline_runs').insert({
      seed,
      batch_date: new Date().toISOString().split('T')[0],
      discovered: s.discovered || 0,
      in_range: s.inRange || 0,
      qualified: s.qualified || 0,
      emails_found: withEmail.length,
      emails_rejected: s.emailsRejected || 0,
      youtube_channels: s.youtubeChannels || 0,
      dataovercoffee_submitted: s.docSubmitted || 0,
      dataovercoffee_returned: s.docReturned || 0,
      duration_seconds: s.durationSecs || 0,
    });
    log('✓ Pipeline run logged');
  }
}

// ─── OUTPUT ─────────────────────────────────────────────────────────────────

function printSummary(results) {
  logSection('SUMMARY');

  const qualified = results.filter(r => r.qualified);
  const rejected = results.filter(r => !r.qualified);
  const withEmail = qualified.filter(r => r.email);

  console.log('');
  console.log(`  TOTAL DISCOVERED: ${results.length}`);
  console.log(`  QUALIFIED: ${qualified.length} YES / ${rejected.length} NO`);
  console.log(`  WITH EMAIL: ${withEmail.length} (${qualified.length > 0 ? Math.round(withEmail.length / qualified.length * 100) : 0}% of qualified)`);

  const sources = {};
  for (const r of withEmail) sources[r.emailSource] = (sources[r.emailSource] || 0) + 1;
  if (Object.keys(sources).length > 0) {
    console.log(`  EMAIL SOURCES: ${Object.entries(sources).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }

  // Rejection breakdown
  const rejectReasons = {};
  for (const r of rejected) rejectReasons[r.reject_reason || 'unknown'] = (rejectReasons[r.reject_reason || 'unknown'] || 0) + 1;
  if (Object.keys(rejectReasons).length > 0) {
    console.log(`  REJECTIONS: ${Object.entries(rejectReasons).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }

  // Write CSV
  if (results.length > 0) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const csvFile = `output/scout_${ts}.csv`;
    const headers = ['qualified', 'reject_reason', 'username', 'full_name', 'email', 'email_source', 'email_type', 'email_detail', 'followers', 'youtube_url', 'biography', 'website', 'source'];
    const rows = results.map(r => [
      r.qualified ? 'YES' : 'NO', r.reject_reason || '', r.username || '', r.fullName || '',
      r.email || '', r.emailSource || '', r.emailType || '',
      r.emailDetail || '',
      r.followersCount || '',
      r._youtubeUrl || (r._youtubeUrls && r._youtubeUrls[0]) || '',
      (r.biography || '').replace(/[\n\r,]/g, ' ').slice(0, 200),
      r.externalUrl || '', r._source || ''
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    writeFileSync(csvFile, csv);
    console.log(`\n  CSV: ${csvFile}`);
  }

  if (withEmail.length > 0) {
    const directEmails = withEmail.filter(r => !r.emailIsAgency);
    const agencyEmails = withEmail.filter(r => r.emailIsAgency);

    if (directEmails.length > 0) {
      console.log(`\n  READY FOR SMARTLEAD — DIRECT (${directEmails.length} leads):`);
      for (const r of directEmails) {
        const firstName = (r.fullName || '').split(' ')[0] || r.username;
        console.log(`    ${firstName.padEnd(15)} ${r.email.padEnd(35)} via=${r.emailSource}`);
      }
    }
    if (agencyEmails.length > 0) {
      console.log(`\n  READY FOR SMARTLEAD — AGENCY/MGMT (${agencyEmails.length} leads, different sequence):`);
      for (const r of agencyEmails) {
        const firstName = (r.fullName || '').split(' ')[0] || r.username;
        console.log(`    ${firstName.padEnd(15)} ${r.email.padEnd(35)} via=${r.emailSource} ⚠ AGENCY`);
      }
    }
  }

  // Show YouTube URLs found (for DataOverCoffee email extraction)
  const withYoutube = results.filter(r => r.qualified && (r._youtubeUrl || (r._youtubeUrls && r._youtubeUrls.length > 0)));
  const noEmailWithYoutube = results.filter(r => r.qualified && !r.email && (r._youtubeUrl || (r._youtubeUrls && r._youtubeUrls.length > 0)));
  if (withYoutube.length > 0) {
    console.log(`\n  YOUTUBE CHANNELS FOUND: ${withYoutube.length} total (${noEmailWithYoutube.length} need DataOverCoffee for email)`);
    console.log('  ALL YouTube channels:');
    for (const r of withYoutube) {
      const url = r._youtubeUrl || r._youtubeUrls[0];
      const emailStatus = r.email ? `\x1b[32m✓ ${r.email}\x1b[0m` : '\x1b[33m→ DataOverCoffee\x1b[0m';
      console.log(`    @${r.username.padEnd(22)} ${url.padEnd(50)} ${emailStatus}`);
    }
  }

  // Show profiles that mention YouTube but we couldn't find their channel
  const mentionsButNoChannel = results.filter(r => r.qualified && r._mentionsYoutube && !r._youtubeUrl && (!r._youtubeUrls || r._youtubeUrls.length === 0));
  if (mentionsButNoChannel.length > 0) {
    console.log(`\n  ⚠ MENTION YOUTUBE BUT NO CHANNEL FOUND: ${mentionsButNoChannel.length}`);
    for (const r of mentionsButNoChannel) {
      const bio = (r.biography || '').replace(/\n/g, ' ').slice(0, 80);
      console.log(`    @${r.username.padEnd(22)} "${bio}"`);
    }
  }
}

// ─── AUTO-SEED: Pull seeds from Supabase ────────────────────────────────────

async function getAutoSeeds(count = 3) {
  if (!supabase) return [];

  // Pick qualified leads with most followers that haven't been used as seeds recently
  // These are real, validated IG handles — guaranteed to work
  const { data } = await supabase
    .from('leads')
    .select('instagram_handle, follower_count, source_detail')
    .not('instagram_handle', 'is', null)
    .gte('follower_count', MIN_FOLLOWERS)
    .lte('follower_count', MAX_FOLLOWERS)
    .order('follower_count', { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return [];

  // Filter out handles that have already been used as seeds (source_detail = "similar:handle")
  const usedSeeds = new Set(
    data.map(d => (d.source_detail || '').replace('similar:', '')).filter(Boolean)
  );

  // Pick leads that haven't been used as seeds yet
  const unused = data.filter(d => !usedSeeds.has(d.instagram_handle));
  // If all have been used, just pick random ones (their similar accounts will dedup anyway)
  const pool = unused.length >= count ? unused : data;

  // Shuffle and pick
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(d => d.instagram_handle);
}

// ─── DAILY BATCH HELPERS ───────────────────────────────────────────────────

async function getTodayEmailCount() {
  if (!supabase) return 0;
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('batch_date', today)
    .in('status', ['email_ready', 'mgmt_email']);
  return count || 0;
}

async function logCost(service, description, costUsd) {
  if (!supabase) return;
  await supabase.from('usage_events').insert({
    agent: 'scout',
    service,
    description,
    cost_usd: costUsd,
  });
}

// ─── RUN SINGLE SEED — Extracted pipeline steps 1-7 ───────────────────────

async function runSingleSeed(seed) {
  const seedStart = Date.now();
  const stats = { discovered: 0, inRange: 0, qualified: 0, emailsFound: 0 };

  try {
    // ── Step 1: Discover similar accounts from seed ──
    logSection(`DISCOVER: Similar accounts from @${seed}`);

    let allProfiles = [];
    try {
      const profiles = await discoverSimilar(seed);
      allProfiles.push(...profiles);
    } catch (err) {
      log(`Error discovering from @${seed}: ${err.message}`);
      return { emailsFound: 0, stats };
    }

    // Deduplicate
    const seen = new Set();
    const unique = allProfiles.filter(p => {
      if (!p.username || seen.has(p.username)) return false;
      seen.add(p.username);
      return true;
    });

    // Remove seed itself
    const filtered = unique.filter(p => p.username !== seed);

    // Dedup against Supabase — skip profiles we've already processed
    const existingHandles = await checkDuplicates(filtered.map(p => p.username));
    const fresh = existingHandles.size > 0
      ? filtered.filter(p => !existingHandles.has(p.username))
      : filtered;

    if (existingHandles.size > 0) {
      log(`\nDedup: ${existingHandles.size} already in database, ${fresh.length} new`);
    }
    log(`\nTotal discovered: ${allProfiles.length} → ${fresh.length} new unique (excl. seed + dupes)`);
    stats.discovered = allProfiles.length;

    if (fresh.length === 0) {
      log('No new profiles discovered. All already in database or no results.');
      return { emailsFound: 0, stats };
    }

    // ── Step 2: Enrich (get bios, follower counts, websites) ──
    const enriched = await enrichProfiles(fresh.slice(0, 50));

    // Filter by follower count
    const inRange = enriched.filter(p => p.followersCount >= MIN_FOLLOWERS && p.followersCount <= MAX_FOLLOWERS);
    log(`\nIn follower range (${(MIN_FOLLOWERS/1000)}K-${(MAX_FOLLOWERS/1_000_000)}M): ${inRange.length}/${enriched.length}`);
    stats.inRange = inRange.length;

    if (inRange.length === 0) {
      log('No profiles in range. See enrichment output above for all follower counts.');
      return { emailsFound: 0, stats };
    }

    // ── Step 3: Qualify with Haiku ──
    const checked = await qualifyBatch(inRange);
    const qualified = checked.filter(r => r.qualified);
    stats.qualified = qualified.length;

    // ── Step 4: Find emails for qualified leads ──
    let finalResults = checked;
    if (qualified.length > 0) {
      const withEmails = await findEmailsBatch(qualified);
      const emailMap = new Map(withEmails.map(w => [w.username, w]));
      finalResults = checked.map(s => emailMap.get(s.username) || s);
    }

    // ── Step 5: Deep YouTube discovery ──
    finalResults = await deepYoutubeDiscovery(finalResults);

    // ── Step 6: DataOverCoffee — extract emails from YouTube channels ──
    finalResults = await dataOverCoffeeEmails(finalResults);

    // ── Summary ──
    printSummary(finalResults);

    // Attach pipeline funnel stats for Supabase logging
    const qualifiedWithEmail = finalResults.filter(r => r.qualified && r.email);
    const qualifiedWithYT = finalResults.filter(r => r.qualified && (r._youtubeUrl || (r._youtubeUrls && r._youtubeUrls.length > 0)));
    const elapsed = ((Date.now() - seedStart) / 1000).toFixed(1);

    finalResults._pipelineStats = {
      discovered: allProfiles.length,
      inRange: inRange.length,
      qualified: qualified.length,
      emailsRejected: finalResults.filter(r => r.emailSource === 'rejected').length,
      youtubeChannels: qualifiedWithYT.length,
      docSubmitted: 0,
      docReturned: 0,
      durationSecs: parseFloat(elapsed),
    };

    stats.emailsFound = qualifiedWithEmail.length;

    // ── Step 7: Write to Supabase (permanent database + dedup) ──
    await writeLeadsToSupabase(finalResults);

    return { emailsFound: qualifiedWithEmail.length, stats };
  } catch (err) {
    log(`Pipeline error for seed @${seed}: ${err.message}`);
    return { emailsFound: 0, stats };
  }
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now();
  const rawArgs = process.argv.slice(2);
  const isAuto = rawArgs.includes('--auto');
  const isDailyBatch = rawArgs.includes('--daily-batch');
  const batchTarget = parseInt(rawArgs.find(a => a.startsWith('--target='))?.split('=')[1] || '100');
  const seedCount = parseInt(rawArgs.find(a => a.startsWith('--seeds='))?.split('=')[1] || '3');
  let args = rawArgs.filter(a => !a.startsWith('--')).map(a => a.replace(/^@/, ''));

  if (args.length === 0 && !isAuto && !isDailyBatch) {
    console.log('Usage:');
    console.log('  node scout-test.js <seed_username>           # similar accounts from one seed');
    console.log('  node scout-test.js cbum davidlaid            # chain multiple seeds');
    console.log('  node scout-test.js --auto                    # auto-pick seeds from database');
    console.log('  node scout-test.js --auto --seeds=5          # auto-pick 5 seeds');
    console.log('  node scout-test.js --daily-batch             # run until 100 emails for today');
    console.log('  node scout-test.js --daily-batch --target=50 # custom target');
    console.log('');
    console.log('Examples:');
    console.log('  node scout-test.js cbum');
    console.log('  node scout-test.js --auto');
    console.log('  node scout-test.js --daily-batch');
    process.exit(0);
  }

  if (!process.env.APIFY_API_TOKEN) { console.error('APIFY_API_TOKEN not set'); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  // ─── DAILY BATCH MODE ──────────────────────────────────────────────────────
  if (isDailyBatch) {
    console.log('\n' + '='.repeat(70));
    console.log(`  DAILY BATCH — Target: ${batchTarget} emails`);
    console.log('='.repeat(70));

    let currentCount = await getTodayEmailCount();
    let cycleNum = 0;
    const maxCycles = 30; // safety limit
    let totalDiscovered = 0, totalInRange = 0, totalQualified = 0, totalEmails = 0;

    console.log(`\n  Starting count: ${currentCount}/${batchTarget}`);

    while (currentCount < batchTarget && cycleNum < maxCycles) {
      cycleNum++;
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`  CYCLE ${cycleNum} — ${currentCount}/${batchTarget} emails so far`);
      console.log('─'.repeat(70));

      const seeds = await getAutoSeeds(3);
      if (seeds.length === 0) {
        console.log('  No more seeds available. Stopping.');
        break;
      }
      console.log(`  Seeds: ${seeds.map(s => '@' + s).join(', ')}`);

      for (const seed of seeds) {
        try {
          const result = await runSingleSeed(seed);
          if (result.stats) {
            totalDiscovered += result.stats.discovered || 0;
            totalInRange += result.stats.inRange || 0;
            totalQualified += result.stats.qualified || 0;
            totalEmails += result.emailsFound || 0;
          }
        } catch (err) {
          console.log(`  Error on seed @${seed}: ${err.message}`);
        }
      }

      currentCount = await getTodayEmailCount();
      console.log(`\n  After cycle ${cycleNum}: ${currentCount}/${batchTarget} emails`);
    }

    // Log pipeline run
    const today = new Date().toISOString().split('T')[0];
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const finalCount = await getTodayEmailCount();

    if (supabase) {
      await supabase.from('pipeline_runs').insert({
        seed: `daily-batch-${cycleNum}-cycles`,
        batch_date: today,
        discovered: totalDiscovered,
        in_range: totalInRange,
        qualified: totalQualified,
        emails_found: finalCount,
        duration_seconds: parseFloat(elapsed),
      });

      await supabase.from('agent_events').insert({
        agent: 'scout',
        event: `Daily batch complete: ${finalCount}/${batchTarget} emails (${cycleNum} cycles, ${elapsed}s)`,
        status: finalCount >= batchTarget ? 'ok' : 'warning',
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log(`  DAILY BATCH COMPLETE`);
    console.log(`  Emails: ${finalCount}/${batchTarget}`);
    console.log(`  Cycles: ${cycleNum}`);
    console.log(`  Time: ${elapsed}s`);
    console.log('='.repeat(70));

  } else {
    // ─── SINGLE-RUN MODE (original behavior) ────────────────────────────────

    // Auto-seed from Supabase if --auto flag
    if (isAuto) {
      args = await getAutoSeeds(seedCount);
      if (args.length === 0) {
        console.error('No seeds available in database. Run manually first with: node scout-test.js cbum');
        process.exit(1);
      }
      console.log(`  AUTO-SEED: Selected ${args.length} seeds from database: ${args.map(a => '@' + a).join(', ')}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('  SCOUT/MASON TEST — Full Pipeline (verbose)');
    console.log('='.repeat(70));

    for (const seed of args) {
      await runSingleSeed(seed);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n  Time: ${elapsed}s`);
    console.log('');
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
