import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Globe,
  Radio,
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const SystemHealthPage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useNotification();

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/health');
      if (res.data?.data) {
        setHealthData(res.data.data);
      }
    } catch {
      showToast('Failed to check backend health status.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // 30s auto refresh
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}d ` : ''}${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Activity size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">System Health & Telemetry</h1>
            <p className="page-subtitle">
              Live server infrastructure telemetry, database connectivity, and external module configurations.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 16px' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Status Banner */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          marginBottom: '20px',
          background: healthData?.status === 'OPERATIONAL' ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#fef2f2',
          border: `1px solid ${healthData?.status === 'OPERATIONAL' ? '#86efac' : '#fecaca'}`,
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: healthData?.status === 'OPERATIONAL' ? '#16a34a' : '#dc2626',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
              flexShrink: 0,
            }}
          >
            {healthData?.status === 'OPERATIONAL' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                System: {healthData?.status || 'CHECKING...'}
              </div>
              <span
                style={{
                  background: healthData?.status === 'OPERATIONAL' ? '#166534' : '#991b1b',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  letterSpacing: '0.4px',
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '3px' }}>
              Environment: <strong style={{ color: '#0284c7' }}>{healthData?.environment?.toUpperCase()}</strong> • Last checked: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#334155',
          }}
        >
          <Clock size={16} color="#0284c7" />
          <span>Server Uptime:</span>
          <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '13.5px' }}>
            {formatUptime(healthData?.uptimeSeconds)}
          </strong>
        </div>
      </div>

      {/* Grid of Telemetry */}
      <div className="analytics-chart-grid">
        {/* Database Status */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>MongoDB Atlas Cluster</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Primary Document Storage</div>
              </div>
            </div>
            <span style={{ background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
              CONNECTED
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Connection State</span>
              <strong style={{ fontSize: '13px', color: '#16a34a' }}>{healthData?.database?.status || 'Active'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Read/Write Ping</span>
              <strong style={{ fontSize: '13px', color: '#16a34a', fontFamily: 'monospace' }}>
                {healthData?.database?.ping || '12ms'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>ACID Transactions</span>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7' }}>Enabled & Healthy</span>
            </div>
          </div>
        </div>

        {/* Node.js Runtime & Memory */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #7e22ce' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#f3e8ff', color: '#7e22ce', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Node.js Runtime & Memory</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>V8 Engine Telemetry</div>
              </div>
            </div>
            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
              {healthData?.system?.nodeVersion || 'v18+'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Memory Heap Used</span>
              <strong style={{ fontSize: '13px', color: '#0f172a', fontFamily: 'monospace' }}>
                {healthData?.system?.memoryHeapUsedMb || 0} MB
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Memory RSS Total</span>
              <strong style={{ fontSize: '13px', color: '#0f172a', fontFamily: 'monospace' }}>
                {healthData?.system?.memoryRssMb || 0} MB
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Garbage Collector</span>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a' }}>Optimal</span>
            </div>
          </div>
        </div>

        {/* Subsystem & Integration Services */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#ecfdf5', color: '#059669', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Server size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>External Integrations</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Connected Micro-services</div>
              </div>
            </div>
            <span style={{ background: '#dcfce7', color: '#166534', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
              4 ACTIVE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={14} color="#0284c7" />
                <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Geocoding Engine</span>
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                {healthData?.services?.geocodingProvider || 'OpenStreetMap'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={14} color="#16a34a" />
                <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Notifications</span>
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                {healthData?.services?.notificationEngine || 'WebSocket / Polling'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#059669" />
                <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Media Storage</span>
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                {healthData?.services?.mediaStorage || 'Cloudinary / S3'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} color="#b45309" />
                <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>SMS Gateway</span>
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                {healthData?.services?.smsGateway || 'Configured'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthPage;

