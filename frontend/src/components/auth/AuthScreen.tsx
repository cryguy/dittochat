import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isRegisterMode) {
        await register(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <h1>Chat</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Loading...' : isRegisterMode ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <div className="auth-switch">
          <span>
            {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)}>
            {isRegisterMode ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  );
}
