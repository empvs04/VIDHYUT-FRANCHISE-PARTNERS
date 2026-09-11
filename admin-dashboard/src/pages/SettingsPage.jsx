import React, { useState, useEffect } from 'react';
import { Shield, Server, Database, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SettingsPage = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data?.data) {
          setHealth(res.data.data);
        }
      } catch (err) {
        console.error('Health check failed', err);
      }
    };
    fetchHealth();
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
          System & Admin Settings
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Vidhyut Saathi Portal specifications, database health, and active administrator credentials
        </p>
      </div>

      {/* Admin Profile Box */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <Shield size={18} color="#0284c7" />
          <h2 style={{ fontSize: '15px', fontWeight: '700' }}>Active Super Admin Profile</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Admin Name</div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px' }}>{user?.fullName || 'Super Administrator'}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px' }}>{user?.email}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role Access</div>
            <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px', color: 'var(--color-primary)' }}>
              SUPER_ADMIN (Full RBAC)
            </div>
          </div>
        </div>
      </div>

      {/* Backend & Database Health Box */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <Server size={18} color="#0284c7" />
          <h2 style={{ fontSize: '15px', fontWeight: '700' }}>System Architecture & Health</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>REST API Service</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} />
              {health?.service || 'Online'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>MongoDB Atlas Database</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={15} />
              vidhyut_saathi ({health?.database?.status || 'Connected'})
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Software Version</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Phase 1 Foundation v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
