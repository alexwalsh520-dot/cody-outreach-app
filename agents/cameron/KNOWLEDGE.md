# KNOWLEDGE.md - Living Reference

## Alex's Links

- **Agency business context (full doc):** https://docs.google.com/document/d/1cz9zKAIWKaMGWNm4HY-EcETD3tzHCgluaiAqGuuUyPI/edit?usp=sharing
- **Instagram:** https://www.instagram.com/realalexwalsh
- **YouTube:** https://www.youtube.com/@alexwalsh1172/videos

## Competitors

- https://www.youtube.com/@alexsedlak1/videos
- https://www.youtube.com/@Pierre.Khoury
- https://www.youtube.com/@brezscales
- https://www.youtube.com/@champtgram
- https://www.youtube.com/@ArlinMoore

## File Storage

- Local files: Alex's other laptop
- Cloud: Google Drive
- (Update this as new locations are confirmed)

## Social Handles (incomplete — update when known)

- YouTube: https://www.youtube.com/@alexwalsh1172/videos
- Instagram: https://www.instagram.com/realalexwalsh
- Twitter/X: TBD
- LinkedIn: TBD

## Business Model Summary

50/50 profit split with Instagram fitness influencers. We build and run the entire coaching business (challenge funnel, retargeting ads, DM setters, closers, coaches). Influencer just posts content.

## Influencers Alex Looks Up To / Learns From

- Sam Ovens
- Alex Hormozi
- Matt Gray
- Parmahansa Yogananda (spiritual)

## Available AI Models for Agents

**Default:** `openrouter/anthropic/claude-sonnet-4-6`
**Fallbacks:** `anthropic/claude-opus-4-5`, `anthropic/claude-haiku-4-5`

All OpenRouter models use the `openrouter/` prefix.

### Anthropic (direct)
- `anthropic/claude-sonnet-4-6` (alias: sonnet)
- `anthropic/claude-opus-4-5`
- `anthropic/claude-haiku-4-5`

### Anthropic (via OpenRouter)
- `openrouter/anthropic/claude-sonnet-4.6`
- `openrouter/anthropic/claude-opus-4.6`
- `openrouter/anthropic/claude-haiku-4.5`
- `openrouter/anthropic/claude-3.5-haiku`

### Google (via OpenRouter)
- `openrouter/google/gemini-2.5-flash-lite`
- `openrouter/google/gemini-3-flash-preview`
- `openrouter/google/gemini-3-pro-preview`

### DeepSeek (via OpenRouter)
- `openrouter/deepseek/deepseek-r1`

### Moonshotai / Kimi (via OpenRouter)
- `openrouter/moonshotai/kimi-k2-thinking`
- `openrouter/moonshotai/kimi-k2.5`

### OpenAI (via OpenRouter)
- `openrouter/openai/gpt-5`
- `openrouter/openai/gpt-5-nano`
- `openrouter/openai/gpt-5.1`
- `openrouter/openai/gpt-5.2`
- `openrouter/openai/gpt-5.2-pro`
- `openrouter/openai/gpt-5.3-codex`

### xAI / Grok (via OpenRouter)
- `openrouter/x-ai/grok-3`
- `openrouter/x-ai/grok-3-mini`
- `openrouter/x-ai/grok-4`

### Qwen (via OpenRouter)
- `openrouter/qwen/qwen3-235b-a22b`

### Auto-routing
- `openrouter/auto` — let OpenRouter pick the best available model

**When to use what:**
- Default tasks: `openrouter/anthropic/claude-sonnet-4-6`
- Reasoning/complex: `openrouter/x-ai/grok-4` or `openrouter/deepseek/deepseek-r1`
- Fast/cheap: `openrouter/google/gemini-2.5-flash-lite` or `openrouter/openai/gpt-5-nano`
- Code: `openrouter/openai/gpt-5.3-codex`
- Thinking tasks: `openrouter/moonshotai/kimi-k2-thinking`
