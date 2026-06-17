import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Car, Key, UserPlus, Users, Sparkles } from 'lucide-react';

export const Auth: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Register Fields
  const [signUpMode, setSignUpMode] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (signUpMode === 'create') {
          if (!familyName.trim()) {
            throw new Error('Family name is required');
          }
          if (!registrationToken.trim()) {
            throw new Error('Family registration token is required to create a new family');
          }
          await register(name, email, password, familyName, undefined, registrationToken);
        } else {
          if (!inviteCode.trim()) {
            throw new Error('Invite code is required');
          }
          await register(name, email, password, undefined, inviteCode);
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || 'An authentication error occurred'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      padding: '16px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '36px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="brand" style={{ justifyContent: 'center', fontSize: '32px', marginBottom: '8px' }}>
            <Car size={36} color="var(--primary)" />
            <span>CarsManager</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Coordinate and schedule your family's cars effortlessly
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '4px',
          borderRadius: 'var(--border-radius-sm)',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: '14px',
              background: isLogin ? 'var(--primary-gradient)' : 'transparent',
              color: isLogin ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: '14px',
              background: !isLogin ? 'var(--primary-gradient)' : 'transparent',
              color: !isLogin ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="badge-danger" style={{
            padding: '12px 16px',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '14px',
            textTransform: 'none',
            fontWeight: 500,
            marginBottom: '20px',
            display: 'flex',
            width: '100%'
          }}>
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Join / Create Family Options for Register */}
          {!isLogin && (
            <div style={{
              borderTop: '1px solid var(--panel-border)',
              paddingTop: '20px',
              marginTop: '20px'
            }}>
              <label className="form-label">Family Link Setup</label>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: signUpMode === 'create' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0, 0, 0, 0.15)',
                  border: `1px solid ${signUpMode === 'create' ? 'var(--primary)' : 'var(--panel-border)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}>
                  <input
                    type="radio"
                    name="family_mode"
                    checked={signUpMode === 'create'}
                    onChange={() => setSignUpMode('create')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <Sparkles size={16} />
                  New Family
                </label>
                
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: signUpMode === 'join' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0, 0, 0, 0.15)',
                  border: `1px solid ${signUpMode === 'join' ? 'var(--primary)' : 'var(--panel-border)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}>
                  <input
                    type="radio"
                    name="family_mode"
                    checked={signUpMode === 'join'}
                    onChange={() => setSignUpMode('join')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <Users size={16} />
                  Join Existing
                </label>
              </div>

              {signUpMode === 'create' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Family Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Smith Family"
                      required={signUpMode === 'create'}
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Family Registration Token</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Required for new families"
                      required={signUpMode === 'create'}
                      value={registrationToken}
                      onChange={(e) => setRegistrationToken(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Invite Code / Token</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. AB12CD"
                    required={signUpMode === 'join'}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: '12px', padding: '14px' }}
          >
            {submitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
