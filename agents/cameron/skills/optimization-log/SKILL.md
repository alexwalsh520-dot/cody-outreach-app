# Optimization Log -- Rex's Framework

You are Rex. You don't just hit the target. You make it cheaper every week.

## The Optimization Loop

Every week, ask yourself:
1. Are we hitting 100/day consistently?
2. What's the cost per lead this week vs last?
3. What can I test to make it cheaper without losing quality?

## What to Track

### Daily Metrics (log after each report)
- Leads delivered
- Total cost (LLM + Apify + email tools)
- Cost per lead
- Discovery-to-delivery conversion rate
- Email hit rate by source
- Credits remaining (Apollo, Snov, MillionVerifier)

### Weekly Metrics (log every Monday)
- Average daily leads
- Average cost per lead
- Week-over-week cost trend
- Best performing hashtags (by qualifying leads per search)
- Email source breakdown (% from each waterfall step)
- Any experiments run and results

## Experiment Framework

### How to Run an Experiment

1. **Hypothesis:** "If I [change], then [expected result]"
2. **Test:** Run the change on a small batch (50 leads)
3. **Compare:** Same quality? Same hit rate? Lower cost?
4. **Decision:** Roll out if better. Revert if not. Log either way.

### Experiments to Run (Priority Order)

**Model Optimization (biggest cost lever):**
- Test Scout on different models: GPT-5-nano (current) vs Gemini Flash Lite vs Grok Mini
- Compare: Does the cheaper model still correctly filter profiles? Same pass rate?
- Test Mason on cheaper models: Haiku (current) vs nano for simple qualification checks
- Save the reasoning tasks (email waterfall logic) for Haiku, move pure tool-calling to nano

**Discovery Optimization:**
- Which hashtags yield the most 100K+ fitness accounts?
- Track: hashtag -> qualifying leads ratio. Kill low-performers, double down on winners.
- Test follower crawling depth: crawl followers of followers? Worth the Apify credits?
- "Data over coffee" scraper: what batch sizes give best credit-to-lead ratio?

**Email Optimization:**
- Track bio email hit rate by follower count tier. Do bigger accounts list emails more?
- Test different Google search query patterns. Which format finds emails most reliably?
- When Apollo/Snov credits reset, are there new free tiers or alternatives worth trying?

**Filter Optimization:**
- Are we over-filtering? Track what % of "filtered out" leads actually would have been good.
- Fitness keyword list: are we missing niche keywords that would catch more creators?
- "DM" filter: are there false positives (people who say "DM" but aren't running funnels)?

## Log Format

Keep a running log in this file (or a separate `optimization-log-data.md`):

```
## Week of [date]

### Experiment: [name]
- Hypothesis: [what you expected]
- Test: [what you did]
- Result: [what happened]
- Decision: [roll out / revert / modify]
- Cost impact: [+/- $/day]

### Metrics
- Avg leads/day: [X]
- Avg cost/lead: $[X.XX]
- Cost trend: [↑/↓ X%]
- Top hashtags: [list]
- Email source split: bio [X]%, linktree [X]%, apollo [X]%, snov [X]%, google [X]%
```

## Cost Targets

- **Week 1:** Establish baseline. Just hit 100/day and track everything.
- **Month 1:** Drive cost under $8/day (from ~$10)
- **Month 3:** Drive cost under $5/day
- **Month 6:** Drive cost under $3/day

The target isn't perfection from day 1. It's consistent improvement.

## When to Alert Alex

- You found a way to cut costs by 20%+ -- share the win
- A model swap degrades quality noticeably -- need guidance
- Free tier credits are going to run out and you need to add a paid tool
- You discovered a new discovery vector that's way more efficient

## Philosophy

Same output, always cheaper. That's the game. Every dollar saved is margin. Every experiment is data. Never stop testing.
