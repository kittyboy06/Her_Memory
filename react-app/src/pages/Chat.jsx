import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { sendChatMessage, buildChatSystemPrompt } from '../lib/ai';
import { useToast } from '../components/Toast';
import DOMPurify from 'dompurify';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const toast = useToast();

  useEffect(() => { load(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('chat_history').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function buildContext() {
    const { data: { user } } = await supabase.auth.getUser();
    const [p, t, d, m, f] = await Promise.all([
      supabase.from('profiles').select('key, value').eq('user_id', user.id),
      supabase.from('timeline_events').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('diary_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
      supabase.from('mood_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      supabase.from('favorites').select('*').eq('user_id', user.id),
    ]);
    const profileMap = {};
    (p.data || []).forEach(x => profileMap[x.key] = x.value);
    return buildChatSystemPrompt(profileMap, t.data||[], d.data||[], m.data||[], f.data||[]);
  }

  async function send() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    const userMsg = { user_id: user.id, role: 'user', content: text };
    await supabase.from('chat_history').insert(userMsg);
    setMessages(prev => [...prev, { ...userMsg, id: 'tmp-user', created_at: new Date().toISOString() }]);

    try {
      const chatHistory = [...messages, { role: 'user', content: text }].map(m => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(chatHistory, user.id);

      const aiMsg = { user_id: user.id, role: 'assistant', content: reply };
      await supabase.from('chat_history').insert(aiMsg);
      load();
    } catch (err) {
      toast('AI error: ' + (err.message || 'Unknown error'), 'error');
    }
    setSending(false);
  }

  async function clearHistory() {
    if (!confirm('Clear all chat history?')) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('chat_history').delete().eq('user_id', user.id);
    setMessages([]);
    toast('Chat cleared', 'success');
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="chat-page">
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><h1 className="page-title">Yap Corner</h1><p className="page-subtitle">Talk about her with AI</p></div>
        <button className="btn btn-ghost" onClick={clearHistory} style={{fontSize:'13px'}}>🗑️ Clear</button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state" style={{textAlign:'center',padding:'3rem 0'}}>
            <p style={{fontSize:'32px',marginBottom:'0.5rem'}}>💬</p>
            <p>Start a conversation about Aashifa</p>
            <p style={{fontSize:'13px',color:'var(--text-muted)',marginTop:'4px'}}>Ask anything — patterns, analysis, memories...</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id || i} className={`chat-msg ${m.role}`}>
            <div className="chat-bubble" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.content.replace(/\n/g, '<br>')) }} />
            <div className="chat-meta">{m.role === 'user' ? 'You' : '✨ AI'} · {m.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg assistant">
            <div className="chat-bubble"><span className="typing-dots"><span></span><span></span><span></span></span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="chat-input-area">
        <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask about her..." rows={1} disabled={sending} />
        <button className="chat-send" onClick={send} disabled={sending || !input.trim()}>💌</button>
      </div>
    </div>
  );
}
