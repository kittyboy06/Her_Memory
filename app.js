let currentPage = 'home';
let ollamaOnline = false;
let chatHistory = [];
let currentFolder = 'All';

const MOODS = ['happy', 'sad', 'nervous', 'excited', 'hopeful', 'angry', 'neutral'];
const MOOD_EMOJI = { happy: '😊', sad: '😢', nervous: '😰', excited: '🤩', hopeful: '🌸', angry: '😤', neutral: '😐' };
const MOOD_COLORS = { happy: '#2d8a58', sad: '#2d5a8a', nervous: '#8a6a2d', excited: '#8a2d7a', hopeful: '#5a2d8a', angry: '#8a2d3a', neutral: '#666' };

async function init() {
  await initDB();
  await seedInitialData();
  checkOllama();
  navigate('home');
}

async function checkOllama() {
  try {
    const r = await fetch('http://localhost:8091/health', { signal: AbortSignal.timeout(2000) });
    ollamaOnline = r.ok;
  } catch {
    ollamaOnline = false;
  }
  updateOllamaStatus();
}

function updateOllamaStatus() {
  const dots = document.querySelectorAll('.status-dot');
  const labels = document.querySelectorAll('.status-label');
  dots.forEach(d => { d.className = 'status-dot ' + (ollamaOnline ? 'online' : 'offline'); });
  labels.forEach(l => { l.textContent = ollamaOnline ? 'Aether connected' : 'Aether offline — start with: aether_server.bat'; });
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  renderPage(page);
}

async function renderPage(page) {
  const main = document.getElementById('mainContent');
  switch (page) {
    case 'home': main.innerHTML = await renderHome(); break;
    case 'profile': main.innerHTML = await renderProfile(); break;
    case 'timeline': main.innerHTML = await renderTimeline(); break;
    case 'diary': main.innerHTML = await renderDiary(); break;
    case 'gallery': main.innerHTML = await renderGallery(); break;
    case 'mood': main.innerHTML = await renderMood(); break;
    case 'chat': main.innerHTML = renderChat(); initChat(); break;
    case 'favorites': main.innerHTML = await renderFavorites(); break;
  }
}

async function renderHome() {
  const timelines = await getAll(STORES.timeline);
  const diaries = await getAll(STORES.diary);
  const gallery = await getAll(STORES.gallery);
  const moods = await getAll(STORES.mood);
  const profile = await getAll(STORES.profile);
  const name = profile.find(p => p.key === 'name')?.value || 'Aashifa';
  const status = profile.find(p => p.key === 'status')?.value || '';
  const started = profile.find(p => p.key === 'started')?.value || '';

  const today = new Date().toISOString().split('T')[0];
  const onThisDay = timelines.filter(t => t.date && t.date.slice(5) === today.slice(5));
  const recentMoods = moods.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const lastMood = recentMoods[0];

  const daysSince = started ? Math.floor((Date.now() - new Date(started.split('/').reverse().join('-'))) / 86400000) : 0;

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Our Story</h1>
        <p class="page-subtitle">${daysSince} days since we first talked</p>
      </div>
    </div>

    <div class="home-hero">
      <div class="hero-card">
        <div class="hero-avatar">A</div>
        <div>
          <div class="hero-name">${name}</div>
          <div class="hero-meta">${status} · Started ${started}</div>
          <div class="hero-tags">
            <span class="tag">Tharamani 📍</span>
            <span class="tag">September baby 🎂</span>
            <span class="tag">Poet ✍️</span>
            <span class="tag">AIDS dept</span>
          </div>
        </div>
      </div>
    </div>

    <div class="home-grid">
      <div class="stat-card">
        <div class="stat-icon" style="font-size:22px">🗓️</div>
        <div>
          <div class="stat-num">${timelines.length}</div>
          <div class="stat-label">Timeline events</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="font-size:22px">📓</div>
        <div>
          <div class="stat-num">${diaries.length}</div>
          <div class="stat-label">Diary entries</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="font-size:22px">🖼️</div>
        <div>
          <div class="stat-num">${gallery.length}</div>
          <div class="stat-label">Photos & videos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="font-size:22px">💭</div>
        <div>
          <div class="stat-num">${lastMood ? MOOD_EMOJI[lastMood.mood] + ' ' + lastMood.mood : 'N/A'}</div>
          <div class="stat-label">Last tracked mood</div>
        </div>
      </div>

      ${onThisDay.length > 0 ? `
        <div class="card onthisday">
          <div class="section-title" style="margin-bottom:0.75rem">🗓️ On This Day</div>
          ${onThisDay.map(e => `
            <div style="padding:0.5rem 0;border-bottom:1px solid var(--border)">
              <strong style="font-size:14px">${e.title}</strong>
              <p style="font-size:13px;color:var(--text-muted);margin-top:2px">${e.body?.substring(0, 100)}...</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="card" style="grid-column:1/-1">
        <div class="section-title" style="margin-bottom:0.75rem">Recent mood timeline</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${recentMoods.map(m => `
            <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-muted)">
              <span style="font-size:16px">${MOOD_EMOJI[m.mood]}</span>
              <div>
                <div style="font-size:12px;color:var(--text-muted)">${m.date}</div>
                <div style="font-size:13px;color:var(--dark);font-weight:500">${m.mood}</div>
              </div>
            </div>
          `).join('<span style="color:var(--border)">·</span>')}
        </div>
      </div>
    </div>`;
}

async function renderProfile() {
  const profile = await getAll(STORES.profile);
  const fields = {};
  profile.forEach(p => fields[p.key] = p.value);

  const fieldDefs = [
    { key: 'name', label: 'Name' }, { key: 'nickname', label: 'Nickname' },
    { key: 'born', label: 'Birthday' }, { key: 'native', label: 'Native' },
    { key: 'area', label: 'Area' }, { key: 'department', label: 'Department' },
    { key: 'club', label: 'Club' }, { key: 'status', label: 'Relationship Status' },
    { key: 'started', label: 'Talking Since' }, { key: 'sister', label: 'Sister' },
  ];

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Her Profile</h1>
        <p class="page-subtitle">Tap any field to edit</p>
      </div>
      <button class="btn btn-primary" onclick="addProfileField()">+ Add Field</button>
    </div>
    <div class="profile-wrap">
      <div class="profile-section">
        <div class="hero-card" style="margin-bottom:1.25rem">
          <div class="hero-avatar" style="width:72px;height:72px;font-size:26px">A</div>
          <div>
            <div class="hero-name">${fields.name || 'Aashifa'} <span style="font-size:16px;font-style:normal">${fields.nickname || ''}</span></div>
            <div class="hero-meta">${fields.born || ''} · ${fields.area || ''}</div>
            <div class="hero-meta" style="margin-top:4px">${fields.status || ''}</div>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <div class="section-header">
          <div class="section-title">Basic Info</div>
        </div>
        <div class="profile-fields">
          ${fieldDefs.map(f => `
            <div class="profile-field" onclick="editProfileField('${f.key}', '${(fields[f.key] || '').replace(/'/g, "\\'")}')">
              <div class="profile-field-label">${f.label}</div>
              <div class="profile-field-value">${fields[f.key] || '<span style="color:var(--text-muted);font-style:italic">tap to add</span>'}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="profile-section">
        <div class="section-header">
          <div class="section-title">Personality & Bio</div>
        </div>
        <div class="card" onclick="editProfileField('personality', '${(fields.personality || '').replace(/'/g, "\\'")}')" style="cursor:pointer">
          <div class="profile-field-label" style="margin-bottom:6px">About her</div>
          <div style="font-size:14px;line-height:1.7;color:var(--text)">${fields.personality || '<span style="color:var(--text-muted);font-style:italic">tap to add</span>'}</div>
        </div>
      </div>

      <div class="profile-section">
        <div class="section-header">
          <div class="section-title">Friends</div>
          <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px" onclick="editProfileField('friends', '${(fields.friends || '').replace(/'/g, "\\'")}')">Edit</button>
        </div>
        <div class="friends-list">
          ${(fields.friends || '').split(',').filter(Boolean).map(f => `
            <span class="chip">${f.trim()}</span>
          `).join('')}
        </div>
      </div>

      <div class="profile-section">
        <div class="section-header">
          <div class="section-title">Schools & Education</div>
        </div>
        <div class="profile-fields">
          <div class="profile-field" onclick="editProfileField('school', '${(fields.school || '').replace(/'/g, "\\'")}')">
            <div class="profile-field-label">School</div>
            <div class="profile-field-value">${fields.school || '<span style="color:var(--text-muted);font-style:italic">tap to add</span>'}</div>
          </div>
          <div class="profile-field" onclick="editProfileField('college', '${(fields.college || '').replace(/'/g, "\\'")}')">
            <div class="profile-field-label">College</div>
            <div class="profile-field-value">${fields.college || '<span style="color:var(--text-muted);font-style:italic">tap to add</span>'}</div>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <div class="section-header">
          <div class="section-title">Address</div>
        </div>
        <div class="card" onclick="editProfileField('address', '${(fields.address || '').replace(/'/g, "\\'")}')" style="cursor:pointer">
          <div style="font-size:14px;color:var(--text)">${fields.address || '<span style="color:var(--text-muted);font-style:italic">tap to add</span>'}</div>
        </div>
      </div>
    </div>`;
}

function editProfileField(key, currentValue) {
  const labels = { name:'Name', nickname:'Nickname', born:'Birthday', native:'Native', area:'Area', department:'Department', club:'Club', status:'Status', started:'Talking Since', sister:'Sister', personality:'About Her', friends:'Friends', school:'School', college:'College', address:'Address' };
  openModal(`Edit ${labels[key] || key}`, `
    <div class="form-group">
      <label class="form-label">${labels[key] || key}</label>
      <textarea class="form-textarea" id="profileInput" rows="3">${currentValue}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveProfileField('${key}')">Save</button>
    </div>
  `);
}

async function saveProfileField(key) {
  const val = document.getElementById('profileInput').value.trim();
  await put(STORES.profile, { key, value: val });
  closeModal();
  navigate('profile');
}

function addProfileField() {
  openModal('Add Profile Field', `
    <div class="form-group">
      <label class="form-label">Field name</label>
      <input class="form-input" id="newFieldKey" placeholder="e.g. favorite color">
    </div>
    <div class="form-group">
      <label class="form-label">Value</label>
      <input class="form-input" id="newFieldVal" placeholder="e.g. pink">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewField()">Add</button>
    </div>
  `);
}

async function saveNewField() {
  const key = document.getElementById('newFieldKey').value.trim().replace(/\s+/g, '_');
  const val = document.getElementById('newFieldVal').value.trim();
  if (!key) return;
  await put(STORES.profile, { key, value: val });
  closeModal();
  navigate('profile');
}

async function renderTimeline() {
  const items = await getAll(STORES.timeline);
  items.sort((a, b) => a.date.localeCompare(b.date));

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Our Timeline</h1>
        <p class="page-subtitle">${items.length} moments captured</p>
      </div>
      <button class="btn btn-primary" onclick="addTimelineEntry()">+ Add Moment</button>
    </div>
    <div class="filter-bar">
      <input class="search-input" placeholder="Search timeline..." oninput="filterTimeline(this.value)">
    </div>
    <div class="timeline-wrap">
      <div class="timeline" id="timelineList">
        ${items.length === 0 ? `<div class="empty-state"><p>No moments yet.<br>Add your first memory!</p></div>` : ''}
        ${items.map(item => renderTimelineItem(item)).join('')}
      </div>
    </div>`;
}

function renderTimelineItem(item) {
  return `
    <div class="timeline-item" data-id="${item.id}">
      <div class="timeline-dot"></div>
      <div class="timeline-date">${item.date}</div>
      <div class="timeline-card">
        <div class="timeline-actions">
          <button class="action-btn" onclick="editTimelineEntry(${item.id})" title="Edit">✏️</button>
          <button class="action-btn" onclick="deleteEntry('timeline', ${item.id})" title="Delete">🗑️</button>
        </div>
        <div class="timeline-title">${item.title}</div>
        <div class="timeline-body">${(item.body || '').replace(/\n/g, '<br>')}</div>
        ${item.mood ? `<span class="mood-badge mood-${item.mood}">${MOOD_EMOJI[item.mood]} ${item.mood}</span>` : ''}
        ${item.type === 'milestone' ? '<span class="chip" style="margin-left:6px;margin-top:8px;display:inline-flex">⭐ Milestone</span>' : ''}
      </div>
    </div>`;
}

function filterTimeline(query) {
  document.querySelectorAll('.timeline-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
}

function addTimelineEntry() {
  openModal('Add Timeline Moment', timelineForm());
}

async function editTimelineEntry(id) {
  const item = await get(STORES.timeline, id);
  openModal('Edit Moment', timelineForm(item));
}

function timelineForm(item = {}) {
  return `
    <div class="form-group">
      <label class="form-label">Date</label>
      <input class="form-input" id="tDate" type="date" value="${item.date || new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label class="form-label">Title</label>
      <input class="form-input" id="tTitle" placeholder="What happened?" value="${item.title || ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Story</label>
      <textarea class="form-textarea" id="tBody" rows="5" placeholder="Describe the moment...">${item.body || ''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Mood</label>
        <select class="form-select" id="tMood">
          <option value="">None</option>
          ${MOODS.map(m => `<option value="${m}" ${item.mood === m ? 'selected' : ''}>${MOOD_EMOJI[m]} ${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-select" id="tType">
          <option value="memory" ${item.type === 'memory' ? 'selected' : ''}>Memory</option>
          <option value="milestone" ${item.type === 'milestone' ? 'selected' : ''}>Milestone ⭐</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveTimeline(${item.id || 'null'})">Save</button>
    </div>`;
}

async function saveTimeline(id) {
  const data = {
    date: document.getElementById('tDate').value,
    title: document.getElementById('tTitle').value,
    body: document.getElementById('tBody').value,
    mood: document.getElementById('tMood').value,
    type: document.getElementById('tType').value
  };
  if (id) { data.id = id; await put(STORES.timeline, data); }
  else await add(STORES.timeline, data);
  closeModal();
  navigate('timeline');
}

async function renderDiary() {
  const entries = await getAll(STORES.diary);
  entries.sort((a, b) => b.date.localeCompare(a.date));

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Diary</h1>
        <p class="page-subtitle">Your private thoughts about her</p>
      </div>
      <button class="btn btn-primary" onclick="addDiaryEntry()">+ New Entry</button>
    </div>
    <div class="filter-bar">
      <input class="search-input" placeholder="Search diary..." oninput="filterDiary(this.value)" id="diarySearch">
    </div>
    <div class="diary-grid" id="diaryGrid">
      ${entries.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><p>No diary entries yet.<br>Start writing!</p></div>` : ''}
      ${entries.map(e => `
        <div class="diary-card" data-id="${e.id}" onclick="viewDiaryEntry(${e.id})">
          <div class="timeline-actions">
            <button class="action-btn" onclick="event.stopPropagation();editDiaryEntry(${e.id})" title="Edit">✏️</button>
            <button class="action-btn" onclick="event.stopPropagation();deleteEntry('diary', ${e.id})" title="Delete">🗑️</button>
          </div>
          <div class="diary-date">${e.date} ${e.mood ? MOOD_EMOJI[e.mood] : ''} ${e.isFavorite ? '⭐' : ''} ${e.folder ? `· 📁 ${e.folder}` : ''}</div>
          <div class="diary-title">${e.title || 'Untitled'}</div>
          <div class="diary-preview">${e.body || ''}</div>
          ${e.tags?.length ? `<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">${e.tags.map(t => `<span class="chip" style="font-size:11px">${t}</span>`).join('')}</div>` : ''}
        </div>
      `).join('')}
    </div>`;
}

function filterDiary(q) {
  document.querySelectorAll('.diary-card').forEach(c => {
    c.style.display = c.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

async function viewDiaryEntry(id) {
  const e = await get(STORES.diary, id);
  const meta = [];
  if (e.date) meta.push(e.date + (e.time ? ' ' + e.time : ''));
  if (e.mood) meta.push(MOOD_EMOJI[e.mood] + ' ' + e.mood);
  if (e.folder) meta.push('📁 ' + e.folder);
  if (e.isFavorite) meta.push('⭐ Favorite');
  if (e.isSecret) meta.push('🔒 Secret');
  if (e.importedFrom) meta.push('Imported from ' + e.importedFrom);

  const imageHtml = e.imageUrl ? `<img src="${e.imageUrl}" style="width:100%;border-radius:8px;margin-bottom:1rem;max-height:300px;object-fit:cover" onerror="this.style.display='none'">` : '';

  const habitsHtml = e.habits && Object.keys(e.habits).length > 0
    ? `<div style="margin-top:1rem"><div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;font-weight:500">HABITS</div><div style="display:flex;gap:6px;flex-wrap:wrap">${Object.entries(e.habits).map(([k,v]) => `<span class="chip">${k}: ${v}</span>`).join('')}</div></div>`
    : '';

  const metaDetailsHtml = e.deepDairyId
    ? `<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);font-size:11px;color:var(--text-muted)">Deep Dairy ID: ${e.deepDairyId} · Exported: ${e.exportedAt ? new Date(e.exportedAt).toLocaleDateString() : 'N/A'}</div>`
    : '';

  openModal(e.title || 'Diary Entry', `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:0.75rem;display:flex;flex-wrap:wrap;gap:8px">${meta.map(m => `<span>${m}</span>`).join('<span>·</span>')}</div>
    ${imageHtml}
    <div style="font-size:15px;line-height:1.8;color:var(--text);white-space:pre-wrap">${e.body}</div>
    ${e.tags?.length ? `<div style="margin-top:1rem;display:flex;gap:6px;flex-wrap:wrap">${e.tags.map(t => `<span class="chip">${t}</span>`).join('')}</div>` : ''}
    ${habitsHtml}
    ${metaDetailsHtml}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="closeModal();editDiaryEntry(${id})">Edit</button>
    </div>
  `);
}

function addDiaryEntry() {
  openModal('New Diary Entry', diaryForm());
}

async function editDiaryEntry(id) {
  const e = await get(STORES.diary, id);
  openModal('Edit Entry', diaryForm(e));
}

function diaryForm(e = {}) {
  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" id="dDate" type="date" value="${e.date || new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Mood</label>
        <select class="form-select" id="dMood">
          <option value="">None</option>
          ${MOODS.map(m => `<option value="${m}" ${e.mood === m ? 'selected' : ''}>${MOOD_EMOJI[m]} ${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Title</label>
      <input class="form-input" id="dTitle" placeholder="Give this entry a title" value="${e.title || ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Your thoughts</label>
      <textarea class="form-textarea" id="dBody" rows="8" placeholder="Yap away...">${e.body || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Tags (comma separated)</label>
      <input class="form-input" id="dTags" placeholder="e.g. birthday, call, college" value="${(e.tags || []).join(', ')}">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveDiary(${e.id || 'null'})">Save</button>
    </div>`;
}

async function saveDiary(id) {
  const data = {
    date: document.getElementById('dDate').value,
    title: document.getElementById('dTitle').value,
    body: document.getElementById('dBody').value,
    mood: document.getElementById('dMood').value,
    tags: document.getElementById('dTags').value.split(',').map(t => t.trim()).filter(Boolean)
  };
  if (id) { data.id = id; await put(STORES.diary, data); }
  else await add(STORES.diary, data);
  closeModal();
  navigate('diary');
}

async function renderGallery() {
  const items = await getAll(STORES.gallery);
  const folders = ['All', ...new Set(items.map(i => i.folder).filter(Boolean)), 'Photos', 'Videos', 'Screenshots', 'Snaps', 'Instagram'];

  const filtered = currentFolder === 'All' ? items : items.filter(i => i.folder === currentFolder);
  filtered.sort((a, b) => b.date?.localeCompare(a.date));

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Gallery</h1>
        <p class="page-subtitle">${items.length} memories</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" onclick="addFolder()">+ Folder</button>
        <button class="btn btn-primary" onclick="uploadMedia()">+ Add Media</button>
      </div>
    </div>
    <div class="gallery-wrap">
      <div class="folder-tabs">
        ${folders.map(f => `<button class="folder-tab ${f === currentFolder ? 'active' : ''}" onclick="setFolder('${f}')">${f}</button>`).join('')}
      </div>
      <label class="upload-zone" for="galleryUpload">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--pink-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>Drop photos or videos here, or click to upload</p>
        <input type="file" id="galleryUpload" accept="image/*,video/*" multiple style="display:none" onchange="handleMediaUpload(event)">
      </label>
      <div class="gallery-grid">
        ${filtered.length === 0 ? `<div class="gallery-empty">No media in ${currentFolder} yet</div>` : ''}
        ${filtered.map(item => renderGalleryItem(item)).join('')}
      </div>
    </div>`;
}

function renderGalleryItem(item) {
  const isVideo = item.type === 'video';
  return `
    <div class="gallery-item" data-id="${item.id}">
      ${isVideo
        ? `<video src="${item.url}" style="width:100%;height:100%;object-fit:cover"></video>`
        : `<img src="${item.url}" alt="${item.caption || ''}">` }
      <div class="gallery-item-overlay">
        <div class="gallery-item-label">
          <div>${item.caption || ''}</div>
          <div style="font-size:10px;opacity:0.8">${item.date || ''} · ${item.source || ''}</div>
        </div>
      </div>
      <button onclick="deleteGalleryItem(${item.id})" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.5);border:none;color:white;border-radius:50%;width:22px;height:22px;font-size:10px;cursor:pointer;display:none" class="del-btn">✕</button>
    </div>`;
}

function setFolder(f) {
  currentFolder = f;
  navigate('gallery');
}

async function handleMediaUpload(event) {
  const files = Array.from(event.target.files);
  for (const file of files) {
    const url = URL.createObjectURL(file);
    await add(STORES.gallery, {
      url,
      folder: currentFolder === 'All' ? 'Photos' : currentFolder,
      type: file.type.startsWith('video') ? 'video' : 'image',
      caption: '',
      source: 'uploaded',
      date: new Date().toISOString().split('T')[0],
      fileName: file.name
    });
  }
  navigate('gallery');
}

function uploadMedia() { document.getElementById('galleryUpload')?.click(); }
function addFolder() {
  openModal('New Folder', `
    <div class="form-group">
      <label class="form-label">Folder name</label>
      <input class="form-input" id="folderName" placeholder="e.g. College Days">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createFolder()">Create</button>
    </div>
  `);
}

async function createFolder() {
  const name = document.getElementById('folderName').value.trim();
  if (name) { currentFolder = name; }
  closeModal();
  navigate('gallery');
}

async function deleteGalleryItem(id) {
  if (confirm('Delete this memory?')) {
    await del(STORES.gallery, id);
    navigate('gallery');
  }
}

async function renderMood() {
  const moods = await getAll(STORES.mood);
  const moodMap = {};
  moods.forEach(m => moodMap[m.date] = m);

  const today = new Date();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const recent = moods.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const moodCounts = {};
  moods.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1; });

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Mood Tracker</h1>
        <p class="page-subtitle">Track her energy on different days</p>
      </div>
      <button class="btn btn-primary" onclick="addMoodEntry()">+ Log Mood</button>
    </div>
    <div class="mood-wrap">
      <div class="mood-legend">
        ${MOODS.map(m => `<div class="mood-legend-item"><div class="mood-dot" style="background:${MOOD_COLORS[m]}"></div>${MOOD_EMOJI[m]} ${m}</div>`).join('')}
      </div>

      <div class="card" style="margin-bottom:1.25rem">
        <div class="section-title" style="margin-bottom:0.75rem">Last 30 days</div>
        <div class="mood-calendar">
          ${days.map(d => {
            const entry = moodMap[d];
            return `<div class="mood-day ${entry ? 'has-mood' : ''}" ${entry ? `data-mood="${entry.mood}"` : ''} title="${d}${entry ? ': ' + entry.mood : ''}" onclick="addMoodEntry('${d}')">
              ${new Date(d).getDate()}
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card" style="margin-bottom:1.25rem">
        <div class="section-title" style="margin-bottom:0.75rem">Mood breakdown</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${Object.entries(moodCounts).map(([mood, count]) => `
            <div style="text-align:center">
              <div style="font-size:22px">${MOOD_EMOJI[mood]}</div>
              <div style="font-size:12px;color:var(--text-muted)">${mood}</div>
              <div style="font-size:16px;font-weight:500;color:var(--dark)">${count}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section-title" style="margin-bottom:0.75rem;padding:0">Recent mood entries</div>
      <div class="mood-entries">
        ${recent.map(m => `
          <div class="card-sm" style="display:flex;align-items:center;gap:12px">
            <span style="font-size:24px">${MOOD_EMOJI[m.mood]}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500;color:var(--dark)">${m.mood} ${m.source ? '· ' + m.source : ''}</div>
              <div style="font-size:12px;color:var(--text-muted)">${m.date} ${m.note ? '· ' + m.note : ''}</div>
            </div>
            <button class="action-btn" onclick="deleteMoodEntry('${m.date}')">🗑️</button>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function addMoodEntry(prefillDate) {
  openModal('Log Mood', `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" id="mDate" type="date" value="${prefillDate || new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Her mood</label>
        <select class="form-select" id="mMood">
          ${MOODS.map(m => `<option value="${m}">${MOOD_EMOJI[m]} ${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Source (optional)</label>
      <input class="form-input" id="mSource" placeholder="e.g. WhatsApp, Instagram, in person">
    </div>
    <div class="form-group">
      <label class="form-label">Note (optional)</label>
      <input class="form-input" id="mNote" placeholder="What happened?">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveMood()">Log</button>
    </div>
  `);
}

async function saveMood() {
  const data = {
    date: document.getElementById('mDate').value,
    mood: document.getElementById('mMood').value,
    source: document.getElementById('mSource').value,
    note: document.getElementById('mNote').value
  };
  await put(STORES.mood, data);
  closeModal();
  navigate('mood');
}

async function deleteMoodEntry(date) {
  await del(STORES.mood, date);
  navigate('mood');
}

function renderChat() {
  return `
    <div class="chat-wrap">
      <div class="page-header" style="padding-bottom:0.5rem">
        <div>
          <h1 class="page-title">Yap Corner</h1>
          <p class="page-subtitle">Talk to AI about Aashifa — it knows everything</p>
        </div>
        <button class="btn btn-ghost" onclick="clearChat()">Clear</button>
      </div>
      <div class="ollama-status">
        <div class="status-dot" id="statusDot"></div>
        <span class="status-label" id="statusLabel">Checking Ollama...</span>
      </div>
      <div class="chat-messages" id="chatMessages">
        <div class="chat-msg">
          <div class="chat-avatar">A</div>
          <div class="chat-bubble">Hey Afsal! I know everything about Aashifa — her bio, diary entries, timeline, moods, favorites, all of it. Ask me anything. What's on your mind? 👀💕</div>
        </div>
      </div>
      <div class="chat-input-area">
        <textarea class="chat-input" id="chatInput" placeholder="bro she replied after 3 hours what does that mean..." rows="1" onkeydown="chatKeydown(event)"></textarea>
        <button class="chat-send" id="chatSend" onclick="sendChat()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>`;
}

function initChat() {
  updateOllamaStatus();
}

function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

async function buildContext() {
  const profile = await getAll(STORES.profile);
  const diary = await getAll(STORES.diary);
  const timeline = await getAll(STORES.timeline);
  const moods = await getAll(STORES.mood);
  const favs = await getAll(STORES.favorites);

  const profileStr = profile.map(p => `${p.key}: ${p.value}`).join('\n');
  const diaryStr = diary.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(d => `[${d.date}] ${d.title}: ${d.body?.substring(0,200)}`).join('\n---\n');
  const timelineStr = timeline.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(t => `[${t.date}] ${t.title}: ${t.body?.substring(0,150)} (mood: ${t.mood})`).join('\n');
  const moodStr = moods.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(m => `${m.date}: ${m.mood} - ${m.note}`).join('\n');
  const favStr = favs.map(f => `${f.category}: ${f.value}`).join(', ');

  return `You are a close, witty, supportive AI friend of Afsal Ahmed Khan (18yo CS student at JCE Chennai). You know everything about his crush Aashifa. Be casual, fun, and supportive — like a best friend who's been following this whole story. Use simple English, can mix some Tamil English (Tanglish). Never be formal.

AASHIFA'S PROFILE:
${profileStr}

RECENT DIARY ENTRIES:
${diaryStr}

TIMELINE HIGHLIGHTS:
${timelineStr}

RECENT MOODS:
${moodStr}

HER FAVORITES:
${favStr}

Answer Afsal's questions about Aashifa with context from all the above data. Be real, be supportive, analyze patterns, give actual advice. Keep it fun and conversational.`;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendChatMsg(msg, 'user');

  const sendBtn = document.getElementById('chatSend');
  sendBtn.disabled = true;

  const typingId = appendTyping();

  chatHistory.push({ role: 'user', content: msg });

  try {
    if (!ollamaOnline) {
      await checkOllama();
      if (!ollamaOnline) throw new Error('Aether offline');
    }

    const response = await fetch('http://localhost:8091/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        conversationId: '835e5548-1f2e-4e89-a7e2-ed587ab91ef2'
      })
    });

    const data = await response.json();
    const reply = data.message?.content || 'No response';
    removeTyping(typingId);
    appendChatMsg(reply, 'ai');
    chatHistory.push({ role: 'assistant', content: reply });

  } catch (err) {
    removeTyping(typingId);
    appendChatMsg(`Aether local server is offline 😅 Start it with **aether_server.bat** to enable AI chat companion!`, 'ai');
  }

  sendBtn.disabled = false;
  input.focus();
}

function appendChatMsg(text, role) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role === 'user' ? 'user' : ''}`;
  div.innerHTML = `
    ${role !== 'user' ? '<div class="chat-avatar">A</div>' : ''}
    <div class="chat-bubble">${text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
    ${role === 'user' ? '<div class="chat-avatar" style="background:var(--pink);color:white;font-style:normal;font-size:13px;font-family:var(--font-body)">Me</div>' : ''}
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping() {
  const msgs = document.getElementById('chatMessages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.id = id;
  div.innerHTML = `<div class="chat-avatar">A</div><div class="chat-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function clearChat() {
  chatHistory = [];
  navigate('chat');
}

async function renderFavorites() {
  const favs = await getAll(STORES.favorites);
  const categories = [...new Set(favs.map(f => f.category))];

  const defaultCategories = ['Anime', 'Songs', 'Hobbies', 'Food', 'Actor', 'Movies', 'Colors', 'Subjects', 'Other'];
  const allCategories = [...new Set([...categories, ...defaultCategories])];

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Her Favorites</h1>
        <p class="page-subtitle">Everything she loves — always growing</p>
      </div>
      <button class="btn btn-primary" onclick="addFavorite()">+ Add Favorite</button>
    </div>
    <div class="fav-wrap">
      ${allCategories.map(cat => {
        const items = favs.filter(f => f.category === cat);
        return `
          <div class="fav-section">
            <div class="section-header">
              <div class="section-title">${cat}</div>
            </div>
            <div class="fav-items">
              ${items.map(item => `
                <div class="fav-item">
                  <span>${item.value}</span>
                  <button class="fav-delete" onclick="deleteFavorite(${item.id})" title="Remove">✕</button>
                </div>
              `).join('')}
              <button class="add-fav-btn" onclick="addFavorite('${cat}')">+ add</button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function addFavorite(presetCategory) {
  const categories = ['Anime', 'Songs', 'Hobbies', 'Food', 'Actor', 'Movies', 'Colors', 'Subjects', 'Other'];
  openModal('Add Favorite', `
    <div class="form-group">
      <label class="form-label">Category</label>
      <select class="form-select" id="favCat">
        ${categories.map(c => `<option value="${c}" ${c === presetCategory ? 'selected' : ''}>${c}</option>`).join('')}
        <option value="__custom">Custom category...</option>
      </select>
    </div>
    <div class="form-group" id="customCatGroup" style="display:none">
      <label class="form-label">Custom category name</label>
      <input class="form-input" id="customCat" placeholder="e.g. Places">
    </div>
    <div class="form-group">
      <label class="form-label">Value</label>
      <input class="form-input" id="favVal" placeholder="e.g. Weathering With You">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveFavorite()">Add</button>
    </div>
  `);
  document.getElementById('favCat').onchange = function() {
    document.getElementById('customCatGroup').style.display = this.value === '__custom' ? '' : 'none';
  };
}

async function saveFavorite() {
  let cat = document.getElementById('favCat').value;
  if (cat === '__custom') cat = document.getElementById('customCat').value.trim();
  const val = document.getElementById('favVal').value.trim();
  if (!val || !cat) return;
  await add(STORES.favorites, { category: cat, value: val, addedAt: new Date().toISOString() });
  closeModal();
  navigate('favorites');
}

async function deleteFavorite(id) {
  await del(STORES.favorites, id);
  navigate('favorites');
}

async function deleteEntry(store, id) {
  if (confirm('Delete this entry?')) {
    await del(STORES[store], id);
    navigate(currentPage);
  }
}

function openModal(title, body) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modal').classList.add('open');
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
}

async function exportData() {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aashifa-memories-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData_OLD(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await importAllData(data);
    alert('Data imported successfully!');
    navigate(currentPage);
  } catch (e) {
    alert('Invalid file. Please use an exported backup.');
  }
}

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    if (page) navigate(page);
  });
});

init();

async function importDeepDairy(data) {
  const folderMap = {};
  if (data.folders) {
    data.folders.forEach(f => {
      folderMap[f.id] = { name: f.name, color: f.color, isSecret: f.is_secret, createdAt: f.created_at };
    });
  }

  let imported = 0;
  let skipped = 0;
  const existing = await getAll(STORES.diary);

  for (const entry of data.entries) {
    const date = entry.created_at ? entry.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const time = entry.created_at ? entry.created_at.split('T')[1]?.split('.')[0] : '';
    const folderInfo = entry.folder_id ? folderMap[entry.folder_id] : null;
    const folderName = folderInfo?.name || entry.folders?.name || null;
    const folderColor = folderInfo?.color || entry.folders?.color || null;

    const tags = [];
    if (folderName) tags.push(folderName);
    if (entry.is_favorite) tags.push('⭐ favorite');
    if (entry.is_secret) tags.push('🔒 secret');

    const isDupe = existing.some(e => e.deepDairyId === entry.id);
    if (isDupe) { skipped++; continue; }

    const habits = entry.habits && Object.keys(entry.habits).length > 0 ? entry.habits : null;

    await add(STORES.diary, {
      date,
      time,
      title: entry.title || 'Untitled',
      body: entry.content || '',
      mood: entry.mood || '',
      tags,
      folder: folderName,
      folderColor,
      folderIsSecret: folderInfo?.isSecret || false,
      isFavorite: entry.is_favorite || false,
      isSecret: entry.is_secret || false,
      imageUrl: entry.image_url || null,
      habits,
      importedFrom: 'Deep Dairy',
      exportedAt: data.exportedAt || null,
      deepDairyId: entry.id,
      deepDairyUserId: entry.user_id,
      createdAt: entry.created_at,
    });
    imported++;
  }

  if (data.user) {
    await put(STORES.profile, { key: 'deepDairyUser', value: data.user.username });
    await put(STORES.profile, { key: 'deepDairyExportedAt', value: data.exportedAt });
  }

  const lines = [
    'Deep Dairy import complete!',
    imported + ' entries imported',
    skipped + ' already existed',
    '',
    'All fields preserved:',
    'date, time, title, content, mood,',
    'folder, color, favorite, secret,',
    'image URL, habits, original IDs'
  ];
  alert(lines.join('\n'));
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (data.app === 'Deep Dairy' && data.entries) {
      await importDeepDairy(data);
    } else if (data.app === 'AashifaMemories' && data.type === 'diary_bulk_import') {
      await importBulkDiary(data);
    } else {
      await importAllData(data);
      alert('Data imported successfully!');
    }
    navigate(currentPage);
  } catch (e) {
    alert('Invalid file format.');
    console.error(e);
  }
}

async function importBulkDiary(data) {
  const existing = await getAll(STORES.diary);
  let imported = 0, skipped = 0;
  for (const entry of data.entries) {
    const isDupe = existing.some(e => e.title === entry.title && e.date === entry.date);
    if (isDupe) { skipped++; continue; }
    await add(STORES.diary, {
      date: entry.date,
      title: entry.title,
      body: entry.body,
      mood: entry.mood || '',
      tags: entry.tags || [],
      folder: entry.folder || null,
      isFavorite: entry.isFavorite || false,
      importedFrom: entry.importedFrom || 'Bulk Import',
      source: entry.source || null
    });
    imported++;
  }
  alert("Diary import complete!\n✅ " + imported + " entries imported\n⏭️ " + skipped + " duplicates skipped");
}
