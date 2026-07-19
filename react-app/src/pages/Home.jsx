import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MOOD_EMOJI } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const [stats, setStats] = useState({ timelines: 0, diaries: 0, gallery: 0 });
  const [profile, setProfile] = useState({});
  const [recentMoods, setRecentMoods] = useState([]);
  const [onThisDay, setOnThisDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const { dataUserId, isViewer } = useAuth();

  useEffect(() => { if (dataUserId) loadData(); }, [dataUserId]);

  async function loadData() {
    const uid = dataUserId;

    const [pRes, tRes, dRes, gRes, mRes] = await Promise.all([
      supabase.from('profiles').select('key, value').eq('user_id', uid),
      supabase.from('timeline_events').select('id, date, title, body').eq('user_id', uid),
      supabase.from('diary_entries').select('id').eq('user_id', uid),
      supabase.from('gallery_items').select('id').eq('user_id', uid),
      supabase.from('mood_entries').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(5),
    ]);

    const pMap = {};
    (pRes.data || []).forEach(p => pMap[p.key] = p.value);
    setProfile(pMap);
    setStats({
      timelines: (tRes.data || []).length,
      diaries: (dRes.data || []).length,
      gallery: (gRes.data || []).length,
    });
    setRecentMoods(mRes.data || []);

    const today = new Date().toISOString().split('T')[0];
    const otd = (tRes.data || []).filter(t => t.date && t.date.slice(5) === today.slice(5));
    setOnThisDay(otd);
    setLoading(false);
  }

  const started = profile.started || '';
  const daysSince = started ? Math.floor((Date.now() - new Date(started.split('/').reverse().join('-'))) / 86400000) : 0;
  const lastMood = recentMoods[0];

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Our Story</h1>
          <p className="page-subtitle">{daysSince} days since we first talked</p>
        </div>
      </div>

      <div className="home-hero">
        <div className="hero-card">
          <div className="hero-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" />
            ) : (
              (profile.name || 'A')[0].toUpperCase()
            )}
          </div>
          <div>
            <div className="hero-name">{profile.name || 'Aashifa'}</div>
            <div className="hero-meta">{profile.status || ''} · Started {started}</div>
            <div className="hero-tags">
              <span className="tag">Tharamani 📍</span>
              <span className="tag">September baby 🎂</span>
              <span className="tag">Poet ✍️</span>
              <span className="tag">AIDS dept</span>
            </div>
          </div>
        </div>
      </div>

      <div className="home-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{fontSize:'22px'}}>🗓️</div>
          <div><div className="stat-num">{stats.timelines}</div><div className="stat-label">Timeline events</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{fontSize:'22px'}}>📓</div>
          <div><div className="stat-num">{stats.diaries}</div><div className="stat-label">Diary entries</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{fontSize:'22px'}}>🖼️</div>
          <div><div className="stat-num">{stats.gallery}</div><div className="stat-label">Photos & videos</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{fontSize:'22px'}}>💭</div>
          <div>
            <div className="stat-num">{lastMood ? `${MOOD_EMOJI[lastMood.mood]} ${lastMood.mood}` : 'N/A'}</div>
            <div className="stat-label">Last tracked mood</div>
          </div>
        </div>

        {onThisDay.length > 0 && (
          <div className="card onthisday">
            <div className="section-title" style={{marginBottom:'0.75rem'}}>🗓️ On This Day</div>
            {onThisDay.map(e => (
              <div key={e.id} style={{padding:'0.5rem 0',borderBottom:'1px solid var(--border)'}}>
                <strong style={{fontSize:'14px'}}>{e.title}</strong>
                <p style={{fontSize:'13px',color:'var(--text-muted)',marginTop:'2px'}}>{(e.body || '').substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{gridColumn:'1/-1'}}>
          <div className="section-title" style={{marginBottom:'0.75rem'}}>Recent mood timeline</div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {recentMoods.map((m, i) => (
              <span key={m.id} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',color:'var(--text-muted)'}}>
                {i > 0 && <span style={{color:'var(--border)'}}>·</span>}
                <span style={{fontSize:'16px'}}>{MOOD_EMOJI[m.mood]}</span>
                <span><div style={{fontSize:'12px'}}>{m.date}</div><div style={{fontSize:'13px',color:'var(--dark)',fontWeight:500}}>{m.mood}</div></span>
              </span>
            ))}
            {recentMoods.length === 0 && <span style={{color:'var(--text-muted)',fontSize:'13px'}}>No moods tracked yet</span>}
          </div>
        </div>
      </div>
    </>
  );
}
