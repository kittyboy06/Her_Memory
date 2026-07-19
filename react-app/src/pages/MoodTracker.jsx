import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MOODS, MOOD_EMOJI } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

export default function MoodTracker() {
  const [moods, setMoods] = useState([]);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], mood: '', note: '' });
  const toast = useToast();
  const { dataUserId, isOwner, isViewer } = useAuth();

  useEffect(() => { if (dataUserId) load(); }, [dataUserId]);

  async function load() {
    const uid = dataUserId;
    const { data } = await supabase.from('mood_entries').select('*').eq('user_id', uid).order('date', { ascending: false });
    setMoods(data || []);
  }

  async function save() {
    if (!form.mood || !form.date) return toast('Select a mood and date', 'error');
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('mood_entries').insert({ user_id: user.id, date: form.date, mood: form.mood, note: form.note, source: 'manual' });
    toast('Mood logged!', 'success');
    setForm({ date: new Date().toISOString().split('T')[0], mood: '', note: '' });
    load();
  }

  async function del(id) {
    if (isViewer) return;
    await supabase.from('mood_entries').delete().eq('id', id);
    toast('Deleted', 'success');
    load();
  }

  const moodCounts = {};
  moods.forEach(m => moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1);
  const topMood = Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0];

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Mood Tracker</h1><p className="page-subtitle">{moods.length} entries logged</p></div>
      </div>
      <div className="mood-wrap">
        {isOwner && (
          <div className="card" style={{marginBottom:'1.5rem'}}>
            <div className="section-title" style={{marginBottom:'1rem'}}>How is she feeling today?</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'1rem'}}>
              {MOODS.map(m => (
                <button key={m} className={`mood-select-btn${form.mood === m ? ' selected' : ''}`}
                  onClick={() => setForm({...form, mood: m})}
                  style={{padding:'8px 14px',borderRadius:'20px',border:form.mood===m?'2px solid var(--pink)':'1px solid var(--border)',background:form.mood===m?'var(--pink-light)':'var(--white)',cursor:'pointer',fontSize:'14px',fontFamily:'var(--font-body)'}}>
                  {MOOD_EMOJI[m]} {m}
                </button>
              ))}
            </div>
            <div className="form-row">
              <div className="form-group">
                <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <input className="form-input" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Optional note..." />
              </div>
            </div>
            <button className="btn btn-primary" onClick={save} disabled={!form.mood}>Log Mood</button>
          </div>
        )}

        {topMood && (
          <div className="card" style={{marginBottom:'1.5rem'}}>
            <div className="section-title" style={{marginBottom:'0.5rem'}}>Most Frequent Mood</div>
            <div style={{fontSize:'24px'}}>{MOOD_EMOJI[topMood[0]]} {topMood[0]} <span style={{fontSize:'14px',color:'var(--text-muted)'}}>({topMood[1]} times)</span></div>
          </div>
        )}

        <div className="section-divider"><div className="section-title">Mood History</div></div>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {moods.map(m => (
            <div key={m.id} className="card" style={{padding:'0.75rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'20px'}}>{MOOD_EMOJI[m.mood]}</span>
                <div>
                  <div style={{fontWeight:500,fontSize:'14px'}}>{m.mood}</div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)'}}>{m.date} {m.source === 'diary' && '· from diary'}</div>
                  {m.note && <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{m.note}</div>}
                </div>
              </div>
              {isOwner && <button className="action-btn" onClick={() => del(m.id)}>✕</button>}
            </div>
          ))}
          {moods.length === 0 && <div className="empty-state"><p>No moods tracked yet</p></div>}
        </div>
      </div>
    </>
  );
}
