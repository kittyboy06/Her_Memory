import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPasswords(); }, []);

  async function loadPasswords() {
    const { data } = await supabase
      .from('viewer_passwords')
      .select('*')
      .order('position');
    setPasswords(data || []);
    setLoading(false);
  }

  async function resetAllPasswords() {
    // Deactivate all, then activate the first one
    await supabase.from('viewer_passwords').update({ is_active: false }).neq('id', 0);
    await supabase.from('viewer_passwords').update({ is_active: true }).eq('position', 1);
    await loadPasswords();
  }

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  const activeOne = passwords.find(p => p.is_active);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Settings</h1>
          <p className="page-subtitle">Manage access codes</p>
        </div>
      </div>

      <div className="settings-section">
        <div className="card" style={{padding: '1.5rem', marginBottom: '1rem'}}>
          <h3 style={{margin: '0 0 0.5rem', fontSize: '15px', color: 'var(--dark)'}}>
            🔑 Currently Active Code
          </h3>
          <div className="active-code-display">
            {activeOne ? (
              <>
                <span className="active-code-value">{activeOne.code}</span>
                <span className="active-code-pos">Password #{activeOne.position}</span>
              </>
            ) : (
              <span style={{color: 'var(--text-muted)'}}>None active</span>
            )}
          </div>
          <p style={{fontSize: '12px', color: 'var(--text-muted)', margin: '0.75rem 0 0'}}>
            Share this code with someone to give them read-only access. 
            Once used, it auto-rotates to the next password.
          </p>
        </div>

        <div className="card" style={{padding: '1.5rem'}}>
          <h3 style={{margin: '0 0 1rem', fontSize: '15px', color: 'var(--dark)'}}>
            📋 All Access Codes
          </h3>
          <div className="viewer-password-list">
            {passwords.map(p => (
              <div key={p.id} className={`viewer-password-row${p.is_active ? ' active' : ''}`}>
                <div className="vp-position">#{p.position}</div>
                <div className="vp-code">{p.code}</div>
                <div className="vp-status">
                  {p.is_active ? (
                    <span className="vp-badge active">🟢 Active</span>
                  ) : (
                    <span className="vp-badge used">⚪ Standby</span>
                  )}
                </div>
                <div className="vp-used">
                  Used {p.used_count || 0}x
                  {p.last_used_at && (
                    <span className="vp-date">
                      · {new Date(p.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="login-btn" style={{marginTop: '1rem', width: '100%'}} onClick={resetAllPasswords}>
            🔄 Reset — Activate Password #1
          </button>
        </div>
      </div>
    </>
  );
}
