import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MOODS, MOOD_EMOJI } from '../lib/constants';
import { analyzeDiaryEntry, isAIAvailable, checkOllamaStatus } from '../lib/ai';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Diary() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ date:'', time:'', title:'', body:'', mood:'', tags:'', folder:'', is_favorite:false, is_secret:false });
  const [analyzing, setAnalyzing] = useState(false);
  const [allMoods, setAllMoods] = useState([]);
  const toast = useToast();
  const { dataUserId, isOwner, isViewer } = useAuth();

  useEffect(() => { if (dataUserId) load(); }, [dataUserId]);

  async function load() {
    const uid = dataUserId;
    const [dRes, mRes] = await Promise.all([
      supabase.from('diary_entries').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('mood_entries').select('*').eq('user_id', uid).order('date', { ascending: false }),
    ]);
    setEntries(dRes.data || []);
    setAllMoods(mRes.data || []);
  }

  function openAdd() {
    if (isViewer) return;
    setEditId(null);
    setForm({ date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0,5), title:'', body:'', mood:'', tags:'', folder:'', is_favorite:false, is_secret:false });
    setModal(true);
  }

  function openEdit(e) {
    if (isViewer) return;
    setEditId(e.id);
    setForm({ date:e.date, time:e.time||'', title:e.title||'', body:e.body||'', mood:e.mood||'', tags:(e.tags||[]).join(', '), folder:e.folder||'', is_favorite:e.is_favorite, is_secret:e.is_secret });
    setModal(true);
  }

  const handleAIAnalyze = useCallback(async () => {
    if (!form.body || form.body.trim().length < 10) return;
    setAnalyzing(true);
    try {
      const result = await analyzeDiaryEntry(form.body, entries, allMoods);
      setForm(prev => ({
        ...prev,
        title: result.title || prev.title,
        tags: result.tags.length > 0 ? result.tags.join(', ') : prev.tags,
        mood: result.mood || prev.mood,
      }));
      if (result.patterns) toast(result.patterns, 'info');
      else toast('AI analysis complete!', 'success');
    } catch { toast('AI analysis failed', 'error'); }
    setAnalyzing(false);
  }, [form.body, entries, allMoods, toast]);

  async function save() {
    if (!form.date) return toast('Date required', 'error');
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      date: form.date, time: form.time, title: form.title, body: form.body,
      mood: form.mood, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      folder: form.folder, is_favorite: form.is_favorite, is_secret: form.is_secret,
    };
    if (editId) {
      await supabase.from('diary_entries').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId);
    } else {
      await supabase.from('diary_entries').insert({ ...payload, user_id: user.id });
    }
    if (form.mood && form.date) {
      await supabase.from('mood_entries').insert({ user_id: user.id, date: form.date, mood: form.mood, source: 'diary', note: form.title || 'From diary' });
    }
    toast(editId ? 'Updated!' : 'Saved!', 'success');
    setModal(false);
    load();
  }

  async function del(id) {
    if (isViewer) return;
    if (!confirm('Delete this entry?')) return;
    await supabase.from('diary_entries').delete().eq('id', id);
    toast('Deleted', 'success');
    setViewModal(null);
    load();
  }

  const filtered = entries.filter(e =>
    !search || (e.title||'').toLowerCase().includes(search.toLowerCase()) || (e.body||'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Diary</h1><p className="page-subtitle">{entries.length} entries</p></div>
        {isOwner && <button className="btn btn-primary" onClick={openAdd}>+ New Entry</button>}
      </div>
      <div className="filter-bar">
        <input className="search-input" placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="diary-grid">
        {filtered.map(e => (
          <div key={e.id} className="diary-card" onClick={() => setViewModal(e)}>
            {isOwner && (
              <div className="timeline-actions">
                <button className="action-btn" onClick={ev => { ev.stopPropagation(); openEdit(e); }}>✏️</button>
                <button className="action-btn" onClick={ev => { ev.stopPropagation(); del(e.id); }}>🗑️</button>
              </div>
            )}
            <div className="diary-date">{e.date} {e.time && `· ${e.time}`} {e.is_favorite && '⭐'} {e.is_secret && '🔒'}</div>
            <div className="diary-title">{e.title || 'Untitled'}</div>
            <div className="diary-preview">{e.body || ''}</div>
            <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginTop:'8px'}}>
              {e.mood && <span className={`mood-badge mood-${e.mood}`}>{MOOD_EMOJI[e.mood]} {e.mood}</span>}
              {(e.tags||[]).map((t,i) => <span key={i} className="tag">{t}</span>)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-state" style={{gridColumn:'1/-1'}}><p>No diary entries yet</p></div>}
      </div>

      {/* View Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={viewModal?.title || 'Diary Entry'}>
        {viewModal && (
          <>
            <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'1rem'}}>{viewModal.date} {viewModal.time && `· ${viewModal.time}`}</div>
            <div style={{lineHeight:1.7,whiteSpace:'pre-wrap'}}>{viewModal.body}</div>
            <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginTop:'1rem'}}>
              {viewModal.mood && <span className={`mood-badge mood-${viewModal.mood}`}>{MOOD_EMOJI[viewModal.mood]} {viewModal.mood}</span>}
              {(viewModal.tags||[]).map((t,i) => <span key={i} className="tag">{t}</span>)}
            </div>
            {isOwner && (
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => { setViewModal(null); openEdit(viewModal); }}>✏️ Edit</button>
                <button className="btn btn-ghost" style={{color:'var(--danger)'}} onClick={() => del(viewModal.id)}>🗑️ Delete</button>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Edit/Add Modal — owner only */}
      {isOwner && (
        <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Entry' : 'New Diary Entry'}>
          <div className="form-group">
            <label className="form-label">What happened today?</label>
            <textarea className="form-textarea" style={{minHeight:'150px'}} value={form.body} onChange={e => setForm({...form, body: e.target.value})} placeholder="Write your thoughts..." />
            <button type="button" className="btn btn-ghost" style={{marginTop:'8px',fontSize:'13px'}} onClick={handleAIAnalyze} disabled={analyzing || form.body.trim().length < 10}>
              {analyzing ? '🔄 Analyzing...' : '✨ AI: Auto-tag, title & mood'}
            </button>
            {analyzing && <div className="ai-analyzing"><span className="typing-dots"><span></span><span></span><span></span></span> AI is reading your entry...</div>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input type="time" className="form-input" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Title {form.title && <span className="ai-badge">✨ AI</span>}</label>
            <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Auto-generated by AI or type your own" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mood {form.mood && <span className="ai-badge">✨ AI</span>}</label>
              <select className="form-select" value={form.mood} onChange={e => setForm({...form, mood: e.target.value})}>
                <option value="">None</option>
                {MOODS.map(m => <option key={m} value={m}>{MOOD_EMOJI[m]} {m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Folder</label>
              <input className="form-input" value={form.folder} onChange={e => setForm({...form, folder: e.target.value})} placeholder="Optional" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags {form.tags && <span className="ai-badge">✨ AI</span>}</label>
            <input className="form-input" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="comma, separated, tags" />
          </div>
          <div style={{display:'flex',gap:'1rem',marginBottom:'1rem'}}>
            <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_favorite} onChange={e => setForm({...form, is_favorite: e.target.checked})} /> ⭐ Favorite
            </label>
            <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_secret} onChange={e => setForm({...form, is_secret: e.target.checked})} /> 🔒 Secret
            </label>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>{editId ? 'Update' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
