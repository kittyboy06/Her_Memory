import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInAsViewer } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // First try signing in as owner
      try {
        await signIn(password);
        return; // Success
      } catch (ownerErr) {
        // If owner login fails, check if it's a valid viewer code
        await signInAsViewer(password);
      }
    } catch (err) {
      setError('Invalid password or access code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-heart">🔒</div>
        <h1 className="login-title">Private Diary</h1>
        <p className="login-subtitle">
          Enter your password or access code
        </p>

        <input
          type="password"
          className="login-input"
          placeholder="Enter password..."
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
        />
        <button type="submit" className="login-btn" disabled={loading || !password}>
          {loading ? 'Signing in...' : 'Enter'}
        </button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  );
}
