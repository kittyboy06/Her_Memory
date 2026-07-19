import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

export default function Favorites() {
  const [grouped, setGrouped] = useState({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category: '', value: '' });
  const toast = useToast();
  const { dataUserId, isOwner, isViewer } = useAuth();

  useEffect(() => { if (dataUserId) load(); }, [dataUserId]);

  async function load() {
    const uid = dataUserId;
    const { data } = await supabase.from('favorites').select('*').eq('user_id', uid).order('category');
    const g = {};
    (data || []).forEach(row => {
      if (!g[row.category]) g[row.category] = [];
      g[row.category].push(row);
    });
    setGrouped(g);
  }

  async function addItem() {
    if (!form.category.trim() || !form.value.trim()) return toast('Both fields required', 'error');
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('favorites').insert({ user_id: user.id, category: form.category.trim(), value: form.value.trim() });
    toast('Added!', 'success');
    setForm({ category: '', value: '' });
    setModal(false);
    load();
  }

  async function del(id) {
    if (isViewer) return;
    await supabase.from('favorites').delete().eq('id', id);
    toast('Removed', 'success');
    load();
  }

  async function delCategory(cat) {
    if (isViewer) return;
    if (!confirm(`Delete all "${cat}" items?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('category', cat);
    toast('Category deleted', 'success');
    load();
  }

  const ICONS = { Anime:'🎬', Songs:'🎵', Hobbies:'🎯', Food:'🍕', Actor:'⭐', Color:'🎨', Book:'📚', Place:'📍', Game:'🎮' };
  const categories = Object.keys(grouped);

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Favorites</h1><p className="page-subtitle">Things she loves</p></div>
        {isOwner && <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Item</button>}
      </div>
      <div className="fav-wrap">
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'1rem'}}>
          {categories.map(cat => (
            <div key={cat} className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                <div className="section-title">{ICONS[cat] || '💫'} {cat}</div>
                {isOwner && <button className="action-btn" onClick={() => delCategory(cat)}>🗑️</button>}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {grouped[cat].map(item => (
                  <span key={item.id} className="chip" style={isOwner ? {cursor:'pointer'} : {}} onClick={() => isOwner && del(item.id)} title={isOwner ? 'Click to remove' : ''}>
                    {item.value} {isOwner && '✕'}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {categories.length === 0 && <div className="empty-state" style={{gridColumn:'1/-1'}}><p>No favorites yet</p></div>}
        </div>
      </div>

      {isOwner && (
        <Modal open={modal} onClose={() => setModal(false)} title="Add Favorite">
          <div className="form-group">
            <label className="form-label">Category</label>
            <input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Anime, Songs, Food..." list="cat-list" />
            <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Item</label>
            <input className="form-input" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="e.g. Your Name, Biryani..." />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addItem}>Add</button>
          </div>
        </Modal>
      )}
    </>
  );
}
