import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AUTH_EMAIL, VIEWER_EMAIL, VIEWER_INTERNAL_PWD, OWNER_USER_ID } from '../lib/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'owner' | 'viewer'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // If there's an error getting the session (like invalid refresh token),
          // we should sign out to clear the stale local storage.
          console.warn('Auth session error, clearing storage:', error.message);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setRole(session.user.email === VIEWER_EMAIL ? 'viewer' : 'owner');
        }
      } catch (err) {
        console.error('Session init failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESH_FAILED') {
        console.warn('Token refresh failed, signing out...');
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
      } else if (session?.user) {
        setUser(session.user);
        setRole(session.user.email === VIEWER_EMAIL ? 'viewer' : 'owner');
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Inactivity timeout for viewers (30 minutes)
  useEffect(() => {
    if (role !== 'viewer') return;

    const timeoutDuration = 30 * 60 * 1000; // 30 minutes
    let timeoutId;

    const handleTimeout = async () => {
      console.warn('Viewer session timed out due to inactivity');
      await supabase.auth.signOut();
      // State will be updated by onAuthStateChange listener
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleTimeout, timeoutDuration);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(name => 
      document.addEventListener(name, resetTimer, { passive: true })
    );

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(name => 
        document.removeEventListener(name, resetTimer)
      );
    };
  }, [role]);

  // Owner sign in (direct password)
  const signIn = async (password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password,
    });
    if (error) throw error;
  };

  // Viewer sign in (validate code via RPC, then sign in as viewer user)
  const signInAsViewer = async (code) => {
    // Call the RPC function to validate the viewer code
    const { data: isValid, error: rpcError } = await supabase.rpc('validate_viewer_code', {
      input_code: code,
    });

    if (rpcError) throw new Error('Could not verify code');
    if (!isValid) throw new Error('Invalid or expired code');

    // Code was valid — sign in as the viewer user
    const { error } = await supabase.auth.signInWithPassword({
      email: VIEWER_EMAIL,
      password: VIEWER_INTERNAL_PWD,
    });
    if (error) throw new Error('Sign-in failed');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isOwner = role === 'owner';
  const isViewer = role === 'viewer';

  // Helper: get the effective user_id to query data
  // Viewer needs to query by OWNER's user_id (since data belongs to owner)
  const dataUserId = isViewer ? OWNER_USER_ID : user?.id;

  return (
    <AuthContext.Provider value={{ 
      user, role, isOwner, isViewer, dataUserId,
      loading, signIn, signInAsViewer, signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
