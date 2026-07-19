import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState({ caption: '', type: 'image' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const { dataUserId, isOwner, isViewer } = useAuth();

  useEffect(() => { if (dataUserId) load(); }, [dataUserId]);

  function getPublicUrl(path) {
    return supabase.storage.from('diary-media').getPublicUrl(path).data.publicUrl;
  }

  async function load() {
    const uid = dataUserId;
    const { data } = await supabase.from('gallery_items').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    setItems((data || []).map(item => ({ ...item, url: getPublicUrl(item.storage_path) })));
  }

  async function upload() {
    if (!file) return toast('Select a file', 'error');
    
    // Simple size check (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return toast('File too large (max 50MB)', 'error');
    }

    setUploading(true);
    
    // Auto-detect type from file mime
    const isVideo = file.type.startsWith('video/');
    const detectedType = isVideo ? 'video' : 'image';
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      // Upload with explicit content type
      const { error: uploadErr } = await supabase.storage.from('diary-media').upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

      if (uploadErr) {
        toast('Upload failed: ' + uploadErr.message, 'error');
        setUploading(false);
        return;
      }

      await supabase.from('gallery_items').insert({
        user_id: user.id,
        storage_path: path,
        caption: form.caption,
        type: detectedType,
        file_name: file.name
      });

      toast('Uploaded!', 'success');
      setModal(false);
      setFile(null);
      setForm({ caption: '', type: 'image' });
      load();
    } catch (err) {
      toast('An unexpected error occurred', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function del(item) {
    if (isViewer) return;
    if (!confirm('Delete?')) return;
    if (item.storage_path) await supabase.storage.from('diary-media').remove([item.storage_path]);
    await supabase.from('gallery_items').delete().eq('id', item.id);
    toast('Deleted', 'success');
    setViewItem(null);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Gallery</h1><p className="page-subtitle">{items.length} memories</p></div>
        {isOwner && <button className="btn btn-primary" onClick={() => setModal(true)}>+ Upload</button>}
      </div>
      <div className="gallery-wrap">
        <div className="gallery-grid">
          {items.map(item => (
            <div key={item.id} className="gallery-item" onClick={() => setViewItem(item)}>
              {item.type === 'video' ? (
                <div className="video-container">
                  <video src={item.url} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  <div className="video-badge">▶</div>
                </div>
              ) : (
                <img src={item.url} alt={item.caption || ''} style={{width:'100%',height:'100%',objectFit:'cover'}} loading="lazy" />
              )}
            </div>
          ))}
          {items.length === 0 && <div className="empty-state" style={{gridColumn:'1/-1'}}><p>No photos yet</p></div>}
        </div>
      </div>

      {isOwner && (
        <Modal open={modal} onClose={() => setModal(false)} title="Upload Media">
          <div className="form-group">
            <label className="form-label">File</label>
            <input type="file" accept="image/*,video/*" className="form-input" onChange={e => setFile(e.target.files[0])} />
            <p className="form-hint" style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>
              Supports photos and videos (max 50MB)
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Caption</label>
            <input className="form-input" value={form.caption} onChange={e => setForm({...form, caption: e.target.value})} placeholder="Optional caption" />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
          </div>
        </Modal>
      )}

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={viewItem?.caption || 'Media'}>
        {viewItem && (
          <>
            {viewItem.type === 'video' ? (
              <video src={viewItem.url} controls style={{width:'100%',borderRadius:'8px'}} />
            ) : (
              <img src={viewItem.url} alt="" style={{width:'100%',borderRadius:'8px'}} />
            )}
            {viewItem.caption && <p style={{marginTop:'0.75rem',fontSize:'14px',color:'var(--text-muted)'}}>{viewItem.caption}</p>}
            {isOwner && (
              <div className="modal-footer">
                <button className="btn btn-ghost" style={{color:'var(--danger)'}} onClick={() => del(viewItem)}>🗑️ Delete</button>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
