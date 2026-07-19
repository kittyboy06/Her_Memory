export const MOODS = ['happy', 'sad', 'nervous', 'excited', 'hopeful', 'angry', 'neutral', 'curious'];

export const MOOD_EMOJI = {
  happy: '😊',
  sad: '😢',
  nervous: '😰',
  excited: '🤩',
  hopeful: '🌸',
  angry: '😤',
  neutral: '😐',
  curious: '🤔'
};

export const MOOD_COLORS = {
  happy: '#2d8a58',
  sad: '#2d5a8a',
  nervous: '#8a6a2d',
  excited: '#8a2d7a',
  hopeful: '#5a2d8a',
  angry: '#8a2d3a',
  neutral: '#666',
  curious: '#2d8a7a'
};

export const ALL_NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠', path: '/' },
  { id: 'profile', label: 'Her Profile', icon: '👤', path: '/profile' },
  { id: 'timeline', label: 'Timeline', icon: '🗓️', path: '/timeline' },
  { id: 'diary', label: 'Diary', icon: '📓', path: '/diary' },
  { id: 'gallery', label: 'Gallery', icon: '🖼️', path: '/gallery' },
  { id: 'mood', label: 'Mood Tracker', icon: '💭', path: '/mood' },
  { id: 'chat', label: 'Yap Corner', icon: '💬', path: '/chat', ownerOnly: true },
  { id: 'favorites', label: 'Her Favorites', icon: '⭐', path: '/favorites' },
  { id: 'poems', label: 'Book of Poems', icon: '📖', path: '/poems' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings', ownerOnly: true },
];

// Backwards compat — filtered versions
export const NAV_ITEMS = ALL_NAV_ITEMS;

export const AUTH_EMAIL = import.meta.env.VITE_AUTH_EMAIL || 'aashifa@diary.app';
export const VIEWER_EMAIL = 'viewer@diary.app';
export const VIEWER_INTERNAL_PWD = 'viewer-internal-9x7k2m';

// Owner user ID (for queries when logged in as viewer)
export const OWNER_USER_ID = '835e5548-1f2e-4e89-a7e2-ed587ab91ef2';
