import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MOODS, MOOD_EMOJI } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Timeline() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ date: '', title: '', body: '', mood: '', type: 'memory' });
  const toast = useToast();
  const { dataUserId, isOwner, isViewer } = useAuth();

  useEffect(() => { if (dataUserId) load(); }, [dataUserId]);

  async function load() {
    const uid = dataUserId;
    const { data } = await supabase.from('timeline_events').select('*').eq('user_id', uid).order('date', { ascending: true });
    setEvents(data || []);
  }

  function openAdd() {
    if (isViewer) return;
    setEditId(null);
    setForm({ date: new Date().toISOString().split('T')[0], title: '', body: '', mood: '', type: 'memory' });
    setModal(true);
  }

  function openEdit(e) {
    if (isViewer) return;
    setEditId(e.id);
    setForm({ date: e.date, title: e.title, body: e.body || '', mood: e.mood || '', type: e.type || 'memory' });
    setModal(true);
  }

  async function save() {
    if (!form.title || !form.date) return toast('Title and date required', 'error');
    const { data: { user } } = await supabase.auth.getUser();
    if (editId) {
      await supabase.from('timeline_events').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId);
    } else {
      await supabase.from('timeline_events').insert({ ...form, user_id: user.id });
    }
    toast(editId ? 'Updated!' : 'Added!', 'success');
    setModal(false);
    load();
  }

  async function del(id) {
    if (isViewer) return;
    if (!confirm('Delete this event?')) return;
    await supabase.from('timeline_events').delete().eq('id', id);
    toast('Deleted', 'success');
    load();
  }

  const filtered = events.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || (e.body || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Timeline</h1><p className="page-subtitle">{events.length} memories</p></div>
        {isOwner && <button className="btn btn-primary" onClick={openAdd}>+ Add Memory</button>}
      </div>
      <div className="filter-bar">
        <input className="search-input" placeholder="Search memories..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="timeline-wrap">
        <div className="timeline">
          {filtered.map(e => (
            <div key={e.id} className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-date">{e.date} {e.type === 'milestone' ? '⭐' : ''}</div>
              <div className="timeline-card">
                {isOwner && (
                  <div className="timeline-actions">
                    <button className="action-btn" onClick={() => openEdit(e)}>✏️</button>
                    <button className="action-btn" onClick={() => del(e.id)}>🗑️</button>
                  </div>
                )}
                <div className="timeline-title">{e.title}</div>
                {e.body && <div className="timeline-body">{e.body}</div>}
                {e.mood && <span className={`mood-badge mood-${e.mood}`}>{MOOD_EMOJI[e.mood]} {e.mood}</span>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="empty-state"><p>No memories yet. Add your first one!</p></div>}
        </div>
      </div>

      {isOwner && (
        <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Memory' : 'New Memory'}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="memory">Memory</option>
                <option value="milestone">Milestone ⭐</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="What happened?" />
          </div>
          <div className="form-group">
            <label className="form-label">Details</label>
            <textarea className="form-textarea" value={form.body} onChange={e => setForm({...form, body: e.target.value})} placeholder="Write more..." />
          </div>
          <div className="form-group">
            <label className="form-label">Mood</label>
            <select className="form-select" value={form.mood} onChange={e => setForm({...form, mood: e.target.value})}>
              <option value="">None</option>
              {MOODS.map(m => <option key={m} value={m}>{MOOD_EMOJI[m]} {m}</option>)}
            </select>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>{editId ? 'Update' : 'Add'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
