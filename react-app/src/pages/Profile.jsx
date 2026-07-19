import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const FIELD_DEFS = [
  { key: 'name', label: 'Name' }, { key: 'nickname', label: 'Nickname' },
  { key: 'born', label: 'Birthday' }, { key: 'native', label: 'Native' },
  { key: 'area', label: 'Area' }, { key: 'department', label: 'Department' },
  { key: 'club', label: 'Club' }, { key: 'status', label: 'Relationship Status' },
  { key: 'started', label: 'Talking Since' }, { key: 'sister', label: 'Sister' },
];

export default function Profile() {
  const [fields, setFields] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [editModal, setEditModal] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const { dataUserId, isOwner, isViewer } = useAuth();

  useEffect(() => { if (dataUserId) load(); }, [dataUserId]);

  async function load() {
    const uid = dataUserId;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', uid);
    const map = {};
    const knownKeys = FIELD_DEFS.map(f => f.key);
    const custom = [];
    (data || []).forEach(p => {
      map[p.key] = p.value;
      if (!knownKeys.includes(p.key) && !['college','school','address','personality','friends','avatar_url'].includes(p.key)) {
        custom.push({ key: p.key, value: p.value });
      }
    });
    setFields(map);
    setCustomFields(custom);
  }

  async function saveField(key, value) {
    if (isViewer) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').upsert({ user_id: user.id, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
    toast('Saved!', 'success');
    setEditModal(null);
    load();
  }

  async function addField() {
    if (!newKey.trim()) return;
    await saveField(newKey.trim().toLowerCase(), newValue);
    setAddModal(false);
    setNewKey('');
    setNewValue('');
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('Photo too large (max 5MB)', 'error');
    
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage.from('diary-media').upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

      if (uploadErr) throw uploadErr;

      const publicUrl = supabase.storage.from('diary-media').getPublicUrl(path).data.publicUrl;
      await saveField('avatar_url', publicUrl);
      toast('Profile photo updated!', 'success');
    } catch (err) {
      toast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  function handleFieldClick(fieldDef, value) {
    if (isViewer) return; // Viewers can't edit
    setEditModal(fieldDef);
    setEditValue(value || '');
  }

  const friendsList = (fields.friends || '').split(',').map(f => f.trim()).filter(Boolean);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Her Profile</h1>
          <p className="page-subtitle">{isOwner ? 'Tap any field to edit' : 'View only'}</p>
        </div>
        {isOwner && <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Add Field</button>}
      </div>
      <div className="profile-wrap">
        <div className="profile-section">
          <div className="hero-card" style={{marginBottom:'1.25rem'}}>
            <div 
              className={`hero-avatar${isOwner ? ' clickable' : ''}`} 
              style={{width:'72px',height:'72px',fontSize:'26px', cursor: isOwner ? 'pointer' : 'default'}}
              onClick={() => isOwner && document.getElementById('avatar-input').click()}
            >
              {fields.avatar_url ? (
                <img src={fields.avatar_url} alt="Avatar" />
              ) : (
                (fields.name || 'A')[0].toUpperCase()
              )}
              {uploading && <div className="avatar-loader">...</div>}
            </div>
            <input 
              id="avatar-input" 
              type="file" 
              accept="image/*" 
              style={{display:'none'}} 
              onChange={handlePhotoUpload} 
            />
            <div>
              <div className="hero-name">{fields.name || 'Aashifa'} <span style={{fontSize:'16px',fontStyle:'normal'}}>{fields.nickname || ''}</span></div>
              <div className="hero-meta">{fields.born || ''} · {fields.area || ''}</div>
              <div className="hero-meta" style={{marginTop:'4px'}}>{fields.status || ''}</div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <div className="section-header"><div className="section-title">Basic Info</div></div>
          <div className="profile-fields">
            {FIELD_DEFS.map(f => (
              <div key={f.key} className={`profile-field${isViewer ? '' : ' clickable'}`} onClick={() => handleFieldClick(f, fields[f.key])}>
                <div className="profile-field-label">{f.label}</div>
                <div className="profile-field-value">{fields[f.key] || <span style={{color:'var(--text-muted)',fontStyle:'italic'}}>{isOwner ? 'tap to add' : '—'}</span>}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <div className="section-header"><div className="section-title">Personality</div></div>
          <div className={`profile-field${isViewer ? '' : ' clickable'}`} onClick={() => handleFieldClick({key:'personality',label:'Personality'}, fields.personality)}>
            <div className="profile-field-value">{fields.personality || <span style={{color:'var(--text-muted)',fontStyle:'italic'}}>{isOwner ? 'tap to add' : '—'}</span>}</div>
          </div>
        </div>

        <div className="profile-section">
          <div className="section-header"><div className="section-title">Friends</div></div>
          <div className="friends-list">
            {friendsList.map((f, i) => <span key={i} className="chip">{f}</span>)}
            {isOwner && (
              <button className="chip" onClick={() => handleFieldClick({key:'friends',label:'Friends (comma separated)'}, fields.friends)} style={{cursor:'pointer',border:'1px dashed var(--pink-muted)'}}>+ Edit</button>
            )}
          </div>
        </div>

        <div className="profile-section">
          <div className="section-header"><div className="section-title">Education</div></div>
          <div className="profile-fields">
            {['college','school'].map(k => (
              <div key={k} className={`profile-field${isViewer ? '' : ' clickable'}`} onClick={() => handleFieldClick({key:k,label:k.charAt(0).toUpperCase()+k.slice(1)}, fields[k])}>
                <div className="profile-field-label">{k.charAt(0).toUpperCase()+k.slice(1)}</div>
                <div className="profile-field-value">{fields[k] || <span style={{color:'var(--text-muted)',fontStyle:'italic'}}>{isOwner ? 'tap to add' : '—'}</span>}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <div className="section-header"><div className="section-title">Address</div></div>
          <div className={`profile-field${isViewer ? '' : ' clickable'}`} onClick={() => handleFieldClick({key:'address',label:'Address'}, fields.address)}>
            <div className="profile-field-value">{fields.address || <span style={{color:'var(--text-muted)',fontStyle:'italic'}}>{isOwner ? 'tap to add' : '—'}</span>}</div>
          </div>
        </div>

        {customFields.length > 0 && (
          <div className="profile-section">
            <div className="section-header"><div className="section-title">Custom Fields</div></div>
            <div className="profile-fields">
              {customFields.map(f => (
                <div key={f.key} className={`profile-field${isViewer ? '' : ' clickable'}`} onClick={() => handleFieldClick({key:f.key,label:f.key}, f.value)}>
                  <div className="profile-field-label">{f.key}</div>
                  <div className="profile-field-value">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOwner && (
        <>
          <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit ${editModal?.label || ''}`}>
            <div className="form-group">
              <label className="form-label">{editModal?.label}</label>
              <textarea className="form-textarea" value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => saveField(editModal.key, editValue)}>Save</button>
            </div>
          </Modal>

          <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Custom Field">
            <div className="form-group">
              <label className="form-label">Field Name</label>
              <input className="form-input" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g. favorite color" />
            </div>
            <div className="form-group">
              <label className="form-label">Value</label>
              <input className="form-input" value={newValue} onChange={e => setNewValue(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addField}>Add</button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
}
