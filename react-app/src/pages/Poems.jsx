import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DEFAULT_POEMS from '../lib/poems.json';

export default function Poems() {
  const [poems, setPoems] = useState(DEFAULT_POEMS);
  const [bookState, setBookState] = useState('closed'); // 'closed' | 'opening' | 'open'
  const [currentPage, setCurrentPage] = useState(0); // 0 is Index, 1 is Poem 1, etc.
  const [coverUrl, setCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const { dataUserId, isOwner } = useAuth();

  useEffect(() => {
    if (dataUserId) {
      loadPoems();
      loadCover();
    }
  }, [dataUserId]);

  useEffect(() => {
    if (bookState !== 'closed') {
      document.body.classList.add('immersive-book-active');
    } else {
      document.body.classList.remove('immersive-book-active');
    }
    return () => {
      document.body.classList.remove('immersive-book-active');
    };
  }, [bookState]);

  async function loadCover() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('value')
        .eq('user_id', dataUserId)
        .eq('key', 'book_cover_url');
      
      if (data && data.length > 0 && !error) {
        setCoverUrl(data[0].value);
      }
    } catch (err) {
      console.warn('Failed to load book cover url:', err.message);
    }
  }

  async function loadPoems() {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', dataUserId)
        .order('date', { ascending: true });

      if (error) throw error;

      const dbPoems = (data || [])
        .filter(entry => {
          const tags = entry.tags || [];
          return tags.some(t => t.toLowerCase() === 'poem' || t.toLowerCase() === 'poetry');
        })
        .map(entry => ({
          id: entry.id,
          title: entry.title,
          date: entry.date,
          body: entry.body,
          story: entry.folder ? `A memory preserved in folder: ${entry.folder}` : 'A poem written in the diary.',
          isDb: true
        }));

      // Combine default poems from JSON file with database tagged poems
      const combined = [...DEFAULT_POEMS];
      dbPoems.forEach(dbP => {
        if (!combined.some(p => p.title.toLowerCase() === dbP.title.toLowerCase())) {
          combined.push(dbP);
        }
      });

      setPoems(combined);
    } catch (err) {
      console.warn('Failed to load user poems from database, using JSON defaults:', err.message);
    }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return alert('Photo too large (max 8MB)');
    
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${dataUserId}/book-cover-${Date.now()}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage.from('diary-media').upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

      if (uploadErr) throw uploadErr;

      const publicUrl = supabase.storage.from('diary-media').getPublicUrl(path).data.publicUrl;
      
      // Save cover url to profiles table
      const { error: dbErr } = await supabase.from('profiles').upsert({
        user_id: dataUserId,
        key: 'book_cover_url',
        value: publicUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,key' });

      if (dbErr) throw dbErr;

      setCoverUrl(publicUrl);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleOpen() {
    setBookState('opening');
    setTimeout(() => {
      setBookState('open');
      setCurrentPage(0);
    }, 1200);
  }

  function handleClose() {
    setBookState('closed');
  }

  const nextPage = () => {
    if (currentPage < Math.ceil(poems.length / 2)) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (bookState === 'closed') {
    return (
      <div className="poems-page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">📖 Book of Poems</h1>
            <p className="page-subtitle">A collection of verses and memories</p>
          </div>
        </div>

        <div className="closed-book-scene">
          <div className="closed-book-card" onClick={handleOpen}>
            <div className="book-cover-binding"></div>
            <div 
              className="book-cover-front" 
              style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              <div className={`book-gold-border ${coverUrl ? 'has-cover-image' : ''}`}>
                <div className="book-title-wrap">
                  <span className="book-ornament">✿</span>
                  <h2 className="book-cover-title">Her Memory</h2>
                  <p className="book-cover-subtitle">A Collection of Poetry & Verses</p>
                  <span className="book-ornament">✿</span>
                </div>
                <div className="book-cover-footer">
                  <p>Dedicated to Aashifa</p>
                  <div className="book-heart-lock">🔒</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="closed-book-actions">
            <button className="open-book-btn" onClick={handleOpen}>
              📖 Open Book of Poems
            </button>

            {isOwner && (
              <label className="cover-change-btn">
                {uploading ? '⌛ Uploading...' : '📷 Upload Custom Cover'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleCoverUpload} 
                  disabled={uploading} 
                  style={{ display: 'none' }} 
                />
              </label>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Immersive Open Book Layout
  return (
    <div className={`immersive-book-container ${bookState === 'opening' ? 'anim-opening' : ''}`}>
      <div className="immersive-book-bg-glow"></div>
      
      <div className="immersive-book">
        {/* Book Spine Center line */}
        <div className="book-spine-spine"></div>
        
        {currentPage === 0 ? (
          // TABLE OF CONTENTS / INDEX PAGE
          <div className="book-spread">
            {/* Left Page: Index List */}
            <div className="book-page book-page-left paper-texture">
              <div className="page-content">
                <h3 className="index-title">Table of Contents</h3>
                <div className="index-divider"></div>
                <ul className="index-list">
                  {poems.map((poem, idx) => (
                    <li key={poem.id} className="index-item" onClick={() => setCurrentPage(Math.floor(idx / 2) + 1)}>
                      <span className="index-item-title">{poem.title}</span>
                      <span className="index-item-dots"></span>
                      <span className="index-item-page">Page {idx + 1}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="page-footer-num">Index</div>
            </div>

            {/* Right Page: Introduction */}
            <div className="book-page book-page-right paper-texture">
              <div className="page-content index-intro-side">
                <div className="intro-rose-decor">🌹</div>
                <p className="intro-quote">
                  "Poetry is when an emotion has found its thought and the thought has found words."
                </p>
                <p className="intro-author">— Robert Frost</p>
                <div className="intro-explanation">
                  This book preserves the verses written in memory of Aashifa. Each page contains a poem on the left, paired with the story behind the lines on the right.
                </div>
                
                <button className="book-exit-btn" onClick={handleClose}>
                  🚪 Close Book & Exit
                </button>
              </div>
              <div className="page-footer-num">Cover</div>
            </div>
          </div>
        ) : (
          // POEM PAGE (currentPage > 0)
          (() => {
            const leftIdx = 2 * currentPage - 2;
            const rightIdx = 2 * currentPage - 1;
            const leftPoem = poems[leftIdx];
            const rightPoem = rightIdx < poems.length ? poems[rightIdx] : null;

            return (
              <div className="book-spread">
                {/* Left Page: First Poem */}
                <div className="book-page book-page-left paper-texture">
                  <div className="page-content poem-read-side">
                    <div className="poem-meta">
                      <span className="poem-date">{leftPoem.date}</span>
                    </div>
                    <h3 className="poem-title">{leftPoem.title}</h3>
                    <div className="poem-verses">
                      {leftPoem.body.split('\n').map((line, i) => (
                        <p key={i} className={line.trim() === '' ? 'verse-space' : 'verse-line'}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="page-footer-num">Page {currentPage * 2 - 1}</div>
                </div>

                {/* Right Page: Second Poem or Ending Ornament */}
                <div className="book-page book-page-right paper-texture">
                  <button className="back-to-index-btn" onClick={() => setCurrentPage(0)}>
                    📋 Return to Index
                  </button>

                  {rightPoem ? (
                    <div className="page-content poem-read-side">
                      <div className="poem-meta">
                        <span className="poem-date">{rightPoem.date}</span>
                      </div>
                      <h3 className="poem-title">{rightPoem.title}</h3>
                      <div className="poem-verses">
                        {rightPoem.body.split('\n').map((line, i) => (
                          <p key={i} className={line.trim() === '' ? 'verse-space' : 'verse-line'}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="page-content" style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                      <div className="intro-rose-decor" style={{ fontSize: '48px', marginBottom: '1.5rem' }}>🌹</div>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '2rem' }}>End of Collection</p>
                    </div>
                  )}
                  <div className="page-footer-num">Page {currentPage * 2}</div>
                </div>
              </div>
            );
          })()
        )}

        {/* Navigation Controls */}
        <div className="book-controls">
          <button 
            className="book-control-btn" 
            onClick={prevPage} 
            disabled={currentPage === 0}
            title="Previous Page"
          >
            ◀ Previous
          </button>
          <button 
            className="book-control-btn btn-secondary" 
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
          >
            Index
          </button>
          <button 
            className="book-control-btn" 
            onClick={nextPage} 
            disabled={currentPage === Math.ceil(poems.length / 2)}
            title="Next Page"
          >
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}
