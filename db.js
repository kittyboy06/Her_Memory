const DB_NAME = 'AashifaMemories';
const DB_VERSION = 1;
let db;

const STORES = {
  profile: 'profile',
  timeline: 'timeline',
  diary: 'diary',
  gallery: 'gallery',
  mood: 'mood',
  favorites: 'favorites',
  chat: 'chat'
};

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORES.profile)) {
        d.createObjectStore(STORES.profile, { keyPath: 'key' });
      }
      if (!d.objectStoreNames.contains(STORES.timeline)) {
        const s = d.createObjectStore(STORES.timeline, { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
      }
      if (!d.objectStoreNames.contains(STORES.diary)) {
        const s = d.createObjectStore(STORES.diary, { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
      }
      if (!d.objectStoreNames.contains(STORES.gallery)) {
        const s = d.createObjectStore(STORES.gallery, { keyPath: 'id', autoIncrement: true });
        s.createIndex('folder', 'folder');
        s.createIndex('date', 'date');
      }
      if (!d.objectStoreNames.contains(STORES.mood)) {
        d.createObjectStore(STORES.mood, { keyPath: 'date' });
      }
      if (!d.objectStoreNames.contains(STORES.favorites)) {
        d.createObjectStore(STORES.favorites, { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains(STORES.chat)) {
        d.createObjectStore(STORES.chat, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e);
  });
}

function dbOp(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const s = tx.objectStore(store);
    const req = fn(s);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

function getAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const s = tx.objectStore(store);
    const req = s.getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

function put(store, data) {
  return dbOp(store, 'readwrite', s => s.put(data));
}

function add(store, data) {
  return dbOp(store, 'readwrite', s => s.add(data));
}

function del(store, key) {
  return dbOp(store, 'readwrite', s => s.delete(key));
}

function get(store, key) {
  return dbOp(store, 'readonly', s => s.get(key));
}

async function exportAllData() {
  const data = {};
  for (const store of Object.values(STORES)) {
    const items = await getAll(store);
    const processed = [];
    for (const item of items) {
      const clean = { ...item };
      if (clean.data && clean.data instanceof Blob) {
        clean.data = await blobToBase64(clean.data);
        clean._blobType = item.data.type;
      }
      processed.push(clean);
    }
    data[store] = processed;
  }
  return data;
}

async function importAllData(data) {
  for (const store of Object.values(STORES)) {
    if (!data[store]) continue;
    const tx = db.transaction(store, 'readwrite');
    const s = tx.objectStore(store);
    s.clear();
    for (const item of data[store]) {
      if (item._blobType) {
        item.data = base64ToBlob(item.data, item._blobType);
        delete item._blobType;
      }
      s.put(item);
    }
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  }
}

function blobToBase64(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, type) {
  const arr = base64.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type });
}

async function seedInitialData() {
  const profile = await getAll(STORES.profile);
  if (profile.length > 0) return;

  const profileData = [
    { key: 'name', value: 'Aashifa' },
    { key: 'nickname', value: 'Aasipa 🦥' },
    { key: 'born', value: '23/09/2006' },
    { key: 'native', value: 'Thirunelveli' },
    { key: 'area', value: 'Tharamani, Chennai' },
    { key: 'college', value: 'Jerusalem College of Engineering' },
    { key: 'department', value: 'AIDS' },
    { key: 'school', value: "Kg's Salma Matric & Evaanś Matric" },
    { key: 'address', value: 'No:17, Dr.Ambedkar Street, Mahatma Gandhi Nagar, Tharamani - 600113' },
    { key: 'sister', value: 'Sahana (born 23/06)' },
    { key: 'club', value: 'Rotaractor in JCE' },
    { key: 'personality', value: 'Caring, tough exterior, supports everyone. Introvert at first but won\'t leave once close. Poet. Topper.' },
    { key: 'friends', value: 'Janani (close), Zayan, Divine, Prethika, Alin' },
    { key: 'started', value: '31/01/2025' },
    { key: 'status', value: 'Friends 🫶' }
  ];

  for (const item of profileData) await put(STORES.profile, item);

  const favs = [
    { category: 'Anime', items: ['Weathering With You', 'Your Name', 'Naruto', 'I Want to Eat Your Pancreas'] },
    { category: 'Songs', items: ['Visiri', 'Dhinam Oru Kavithai', 'Mudhal Nee Mudivum Nee', 'Oru Devathai', 'Macha Kanni', 'Bombay Ponnu', 'Ayyarettu', 'Akuma No Ko', 'Cupid - Twin Ver.'] },
    { category: 'Hobbies', items: ['Poetry', 'MC (Hosting)', 'Helping Others', 'Spending time with friends'] },
    { category: 'Food', items: ['Loves to eat 🍱'] },
    { category: 'Actor', items: ['STR (Simbu) fan'] }
  ];

  for (const fav of favs) {
    for (const item of fav.items) {
      await add(STORES.favorites, { category: fav.category, value: item, addedAt: new Date().toISOString() });
    }
  }

  const milestones = [
    { date: '2025-01-31', title: 'First conversation 🌟', body: 'She posted a story wishing happy new year (STR Fan). Asked her to tag me — that\'s how it all started.', mood: 'nervous', type: 'milestone' },
    { date: '2025-02-01', title: 'Added to Close Friends ❤️', body: 'She added me to her close friends on Instagram. Didn\'t know she watches romantic anime. She replied "Favvv🫶😭🌹" to Your Name.', mood: 'excited', type: 'milestone' },
    { date: '2025-02-13', title: 'First real-life talk 💬', body: 'Forgot my physics xerox. She went to another department and got it for me. That\'s just who she is — caring for everyone.', mood: 'happy', type: 'milestone' },
    { date: '2025-02-17', title: 'Friends pressed video call 😂', body: 'Showed my chats to friends. They pressed the video call button. Told her it was a water spray accident lol.', mood: 'nervous', type: 'memory' },
    { date: '2025-09-23', title: 'Her Birthday 🎂', body: 'Created aashi-bday.vercel.app for her. Waited for her in the morning with a gift. Couldn\'t say the words. She didn\'t accept the gift at first but said romba thanks.', mood: 'hopeful', type: 'milestone' },
    { date: '2025-09-24', title: 'She said No 💀', body: 'She said NO. Said we can be friends. Gave many reasons. She has trust issues and insecurity. She\'s brave for being honest. I became argumentative. She said wait panni varuven.', mood: 'sad', type: 'milestone' },
    { date: '2025-09-28', title: 'She wished my birthday first 😭', body: 'After everything, she was the FIRST to wish me happy birthday. Her friends also wished. Still a surprise after all that.', mood: 'happy', type: 'memory' }
  ];

  for (const m of milestones) await add(STORES.timeline, m);

  const diaryEntries = [
    {
      date: '2025-01-31',
      title: 'The Beginning',
      body: `I saw her on a random day at our College. I got lil bit curious about her and started to collect information about her and I finally got her class and name from my classmate. I always saw her from a long distance without her noticing me.

She posted a story on her instagram wishing happy new year (STR Fan). The 1st step is very difficult. I simply asked her to tag me in her story. Thus how we started our Conversation.`,
      mood: 'nervous',
      tags: ['first chat', 'instagram']
    },
    {
      date: '2025-09-23',
      title: 'Her Birthday 🎂',
      body: `Ava Birthday. Morning seekaram vandhu avalukaaga wait panni last ta vandhadum avaluku vachi irundha gift kudutu love sollalam nu paathan. Aana mudila literally avala paatha pechu varala.

Then I created a webpage for her aashi-bday.vercel.app. Crt ta 12 ku wish panna. Aprm ma v2ku ponona ava gift lam na except pannala romba thanks nu potu irundha na apave hint kuduten andha loosu ku purila.`,
      mood: 'hopeful',
      tags: ['birthday', 'gift', 'website']
    },
    {
      date: '2025-09-24',
      title: 'The Hardest Day 💀',
      body: `Sudden msg unta pesanum nu na clg mudinji pona ava apa sollala na txt panna aduku edavadhu sollanum na enta sollalam na yen enta sollala nu keta enaku therinjiduchi apave aprm konjam ragebite panni porumaiya sonna pudichi irukunu.

I thought she will accept but the things is she said NO and namba friends sa irukalam nu sonna. She told that many reasons v2la vida maatanga. But ik she isn't ready for relationship she had a whole trust issue and insecurity.

Paithiyakaaar!! Mooditu Poi velaiya paaru nu sonna then i become argument. Aprm na wait pannuven nu solitude vandhuten.`,
      mood: 'sad',
      tags: ['confession', 'rejection', 'friends']
    }
  ];

  for (const e of diaryEntries) await add(STORES.diary, e);

  const moods = [
    { date: '2025-01-31', mood: 'nervous', note: 'First conversation day' },
    { date: '2025-02-01', mood: 'excited', note: 'Close friends!' },
    { date: '2025-02-13', mood: 'happy', note: 'First real talk' },
    { date: '2025-09-23', mood: 'hopeful', note: 'Her birthday' },
    { date: '2025-09-24', mood: 'sad', note: 'She said no' },
    { date: '2025-09-28', mood: 'happy', note: 'She wished me first' }
  ];

  for (const m of moods) await put(STORES.mood, m);
}
