import { supabase } from './supabase';

/**
 * AI Module: Dual LLM with Two-Tier Context Strategy
 *
 * LOCALHOST (Ollama Qwen3.5 4B):
 *   - Full RAG: scans ALL data (every diary entry, full timeline, all moods)
 *   - Rich, detailed prompts with no token limits
 *   - Advanced tag generation, nuanced mood detection
 *   - Deep contextual chat with full relationship history
 *
 * CLOUD (Gemini via Edge Function):
 *   - Lightweight: summarized context to save tokens
 *   - Concise prompts, basic analysis
 *   - Recent-only data (last 10 entries)
 */

function isLocalhost() {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export async function checkOllamaStatus() {
  if (!isLocalhost()) return false;
  try {
    const r = await fetch('http://localhost:8091/health', { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

export function getAIStatusLabel(aetherOnline) {
  if (isLocalhost()) {
    return aetherOnline ? 'Aether local server connected (port 8091)' : 'Aether local offline — start with: aether_server.bat';
  }
  return 'Aether Cloud backend connected';
}

export function isAIAvailable(aetherOnline) {
  if (isLocalhost()) return aetherOnline;
  return true;
}

/**
 * Send a chat message to Aether Cognitive Engine.
 */
export async function sendChatMessage(messages, conversationId) {
  const latestMessage = messages[messages.length - 1]?.content || "";

  if (isLocalhost()) {
    // Post to local Aether dashboard server
    const res = await fetch("http://localhost:8091/api/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: latestMessage,
        conversationId: conversationId || "835e5548-1f2e-4e89-a7e2-ed587ab91ef2"
      })
    });
    if (!res.ok) {
      throw new Error(`Aether local server error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.message?.content || "No response from Aether";
  } else {
    // Post to remote Aether Edge Function
    const res = await fetch("https://zliiojxowhrpibgkjjzw.supabase.co/functions/v1/cognition-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": "sb_publishable_3Z5iyt6RNt0E_NwQ9keCNQ_MWAoSiiC",
        "Authorization": "Bearer sb_publishable_3Z5iyt6RNt0E_NwQ9keCNQ_MWAoSiiC"
      },
      body: JSON.stringify({
        conversationId: conversationId || "835e5548-1f2e-4e89-a7e2-ed587ab91ef2",
        message: latestMessage,
        attachments: [],
        metadata: {
          timezone: "UTC",
          locale: "en-US"
        }
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Aether cloud error: ${text || res.statusText}`);
    }
    const data = await res.json();
    return data.message?.content || "No response from Aether";
  }
}

/**
 * Send a raw chat message directly to the provider (for internal analysis tasks).
 */
export async function sendRawChatMessage(messages, systemPrompt) {
  if (isLocalhost()) {
    return await sendToOllama(messages, systemPrompt);
  } else {
    return await sendToGemini(messages, systemPrompt);
  }
}

async function sendToOllama(messages, systemPrompt) {
  // Add /no_think to disable Qwen3.5's verbose thinking mode
  const ollamaMessages = [
    { role: 'system', content: systemPrompt + '\n/no_think' },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

  try {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'qwen3.5:4b',
        messages: ollamaMessages,
        stream: false,
        options: { num_predict: 1024, temperature: 0.7 }
      })
    });

    clearTimeout(timeout);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error('Ollama error ' + res.status + ': ' + errText);
    }
    const data = await res.json();
    let content = data.message?.content || 'No response from Ollama';
    // Strip <think>...</think> blocks from Qwen3 responses
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return content;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Ollama timed out (2min). Model may still be loading — try again.');
    throw err;
  }
}

async function sendToGemini(messages, systemPrompt) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await supabase.functions.invoke('gemini-chat', {
    body: { messages, systemPrompt }
  });

  if (res.error) throw new Error(res.error.message || 'Gemini request failed');
  return res.data?.reply || 'No response from Gemini';
}

/**
 * AI-powered diary analysis: auto-generates tags, title, and mood.
 *
 * LOCAL: Deep analysis with full diary history for pattern recognition.
 * CLOUD: Basic single-entry analysis to save tokens.
 */
export async function analyzeDiaryEntry(body, allDiaryEntries = [], allMoods = []) {
  if (!body || body.trim().length < 10) {
    return { title: '', tags: [], mood: 'neutral' };
  }

  let analysisPrompt;

  if (isLocalhost()) {
    // ── FULL RAG MODE (Local) ──
    // Provide all past diary entries for pattern recognition
    const pastEntries = allDiaryEntries
      .slice(0, 50)
      .map(d => `[${d.date}] ${d.title || 'Untitled'} | mood: ${d.mood || '?'} | tags: ${(d.tags || []).join(', ')} | ${(d.body || '').substring(0, 300)}`)
      .join('\n');

    const pastMoods = allMoods
      .slice(0, 30)
      .map(m => `${m.date}: ${m.mood} — ${m.note || ''}`)
      .join('\n');

    analysisPrompt = `You are an advanced diary analysis AI. The diary is written by someone about a girl named Aashifa — documenting their interactions, feelings, and memories.

You have access to the FULL diary history for context and pattern recognition:

=== PAST DIARY ENTRIES (${allDiaryEntries.length} total) ===
${pastEntries || 'No past entries yet.'}

=== MOOD HISTORY (${allMoods.length} total) ===
${pastMoods || 'No mood history yet.'}

=== NEW ENTRY TO ANALYZE ===
"""
${body}
"""

Perform deep analysis and return a JSON object with:
- "title": A short, emotionally resonant title (max 8 words). Reference specific names/events from the entry.
- "tags": An array of 3-7 precise tags. Include: emotional themes, people mentioned, locations, activities, relationship dynamics. Look at past tags for consistency. Tags should be lowercase.
- "mood": The dominant mood. Choose from: happy, sad, nervous, excited, hopeful, angry, neutral. Consider emotional nuances — if mixed, pick the strongest.
- "mood_note": A brief (max 15 words) explanation of why you chose this mood.
- "patterns": Any patterns you notice compared to past entries (e.g., "mood improving", "recurring theme of trust"). Max 2 sentences.

Return ONLY valid JSON, no markdown:`;
  } else {
    // ── LIGHTWEIGHT MODE (Cloud) ──
    analysisPrompt = `Analyze this diary entry about a girl named Aashifa. Return ONLY JSON with:
- "title": short emotional title (max 8 words)
- "tags": array of 2-4 tags (lowercase)
- "mood": one of: happy, sad, nervous, excited, hopeful, angry, neutral

Entry:
"""
${body.substring(0, 500)}
"""

JSON only:`;
  }

  try {
    const systemMsg = isLocalhost()
      ? 'You are a diary analysis AI with full context. Return only valid JSON, no markdown.'
      : 'Return only valid JSON.';

    const response = await sendRawChatMessage(
      [{ role: 'user', content: analysisPrompt }],
      systemMsg
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 7) : [],
        mood: parsed.mood && ['happy', 'sad', 'nervous', 'excited', 'hopeful', 'angry', 'neutral', 'curious'].includes(parsed.mood)
          ? parsed.mood : 'neutral',
        moodNote: parsed.mood_note || '',
        patterns: parsed.patterns || ''
      };
    }
  } catch (err) {
    console.warn('AI diary analysis failed:', err);
  }

  return { title: '', tags: [], mood: 'neutral', moodNote: '', patterns: '' };
}

/**
 * Build the system prompt for chat.
 *
 * LOCAL: Full RAG — dumps ALL data for maximum context.
 * CLOUD: Summarized — recent entries only, compact format.
 */
export function buildChatSystemPrompt(profileData, timelineData, diaryData, moodData, favoritesData) {
  const base = `You are a warm, supportive AI companion inside a personal diary app. The diary owner (the person you're talking to) writes about a girl named Aashifa — someone they deeply care about.

IMPORTANT: The person chatting with you is NOT Aashifa. They are writing about Aashifa. Your role is to be their confidant, offering support, perspective, and gentle wisdom about their feelings and memories with Aashifa.`;

  const guidelines = `
Guidelines:
- Be empathetic, warm, and supportive
- Reference specific memories when relevant
- Never judge or be preachy
- You can use Tamil/Tanglish naturally since the diary mixes languages
- If they seem stressed or sad, be extra gentle
- Remember: you're talking TO the diary owner ABOUT Aashifa`;

  if (isLocalhost()) {
    // ── FULL RAG (Local) ── No token limits, dump everything
    const profileStr = Array.isArray(profileData) ? profileData.map(p => `${p.key}: ${p.value}`).join('\n') : Object.entries(profileData).map(([k,v]) => `${k}: ${v}`).join('\n');
    const timelineStr = timelineData.map(t => `[${t.date}] ${t.title} (${t.mood || 'no mood'})\n${t.body || 'No details'}`).join('\n\n');
    // Send recent 15 entries with full body, rest as summaries only
    const recentDiary = diaryData.slice(0, 15).map(d => `[${d.date}] "${d.title || 'Untitled'}" | mood: ${d.mood || '?'} | tags: ${(d.tags || []).join(', ')}\n${(d.body || '').substring(0, 200)}`).join('\n---\n');
    const olderDiary = diaryData.slice(15).map(d => `[${d.date}] ${d.title || 'Untitled'} (${d.mood || '?'})`).join('; ');
    const diaryStr = recentDiary + (olderDiary ? '\n\n--- OLDER ENTRIES (summary) ---\n' + olderDiary : '');
    const moodStr = moodData.slice(0, 20).map(m => `${m.date}: ${m.mood} — ${m.note || ''}`).join('\n');
    const favStr = favoritesData.reduce((acc, f) => {
      acc[f.category] = acc[f.category] || [];
      acc[f.category].push(f.value);
      return acc;
    }, {});
    const favFormatted = Object.entries(favStr).map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n');

    return `${base}

You have COMPLETE access to the diary. Use this for deep, contextual responses.

═══ AASHIFA'S PROFILE ═══
${profileStr}

═══ FULL TIMELINE (${timelineData.length} events) ═══
${timelineStr}

═══ ALL DIARY ENTRIES (${diaryData.length} entries) ═══
${diaryStr}

═══ MOOD HISTORY (${moodData.length} entries) ═══
${moodStr}

═══ AASHIFA'S FAVORITES ═══
${favFormatted}
${guidelines}
- You have ALL the data. Draw deep connections, notice patterns, reference obscure details.
- Be proactive: mention if you notice mood trends, suggest reflections on past events.
- Keep responses conversational but insightful.`;
  } else {
    // ── LIGHTWEIGHT (Cloud) ── Summarized to save tokens
    const profileStr = Array.isArray(profileData) ? profileData.map(p => `${p.key}: ${p.value}`).join(', ') : Object.entries(profileData).map(([k,v]) => `${k}: ${v}`).join(', ');
    const timelineStr = timelineData.slice(0, 5).map(t => `${t.date}: ${t.title}`).join('; ');
    const diaryStr = diaryData.slice(0, 5).map(d => `${d.date}: ${d.title || 'Untitled'} (${d.mood || '?'})`).join('; ');
    const moodStr = moodData.slice(0, 5).map(m => `${m.date}: ${m.mood}`).join('; ');
    const favStr = favoritesData.slice(0, 10).map(f => f.value).join(', ');

    return `${base}

Context (summary):
Profile: ${profileStr}
Key events: ${timelineStr}
Recent diary: ${diaryStr}
Recent moods: ${moodStr}
Favorites: ${favStr}
${guidelines}
- Keep responses concise (2-3 paragraphs max).`;
  }
}
