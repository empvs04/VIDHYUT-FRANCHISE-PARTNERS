import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
      showToast('Welcome back, Super Admin!', 'success');
      navigate('/');
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Invalid admin credentials. Please verify.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {/* Header Branding */}
        <div
          style={{
            padding: '36px 32px 24px',
            textAlign: 'center',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: '#0284c7',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            <Zap size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Vidhyut Saathi
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Energy Savers Pvt. Ltd. — Super Admin Portal
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Admin Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="email"
                className="input"
                style={{ paddingLeft: '38px' }}
                placeholder="admin@vidhyutsaathi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                className="input"
                style={{ paddingLeft: '38px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Admin Portal</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div
            style={{
              marginTop: '24px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            <ShieldCheck size={18} color="#0284c7" />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Restricted Area. Authorized Super Admin access only.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
