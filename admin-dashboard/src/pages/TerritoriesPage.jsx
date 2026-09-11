import React, { useState, useEffect } from 'react';
import { MapPin, Building, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';

const TerritoriesPage = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerritories = async () => {
      try {
        setLoading(true);
        const res = await api.get('/partners', { params: { limit: 100 } });
        if (res.data?.data) {
          setPartners(res.data.data.partners);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTerritories();
  }, []);

  // Group partners by State
  const stateGroups = partners.reduce((acc, p) => {
    const st = p.state || 'Unassigned';
    if (!acc[st]) acc[st] = [];
    acc[st].push(p);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
          Authorized Territory Map & Hierarchy
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Overview of state and district coverage allocations for Vidhyut Saathi partners
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading territory mappings...
        </div>
      ) : Object.keys(stateGroups).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <MapPin size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>No territories assigned yet</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            When you register Franchise Partners with state & district allocations, they will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(stateGroups).map(([stateName, list]) => (
            <div key={stateName} className="card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '12px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building size={18} />
                  </div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700' }}>{stateName}</h2>
                </div>

                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {list.length} {list.length === 1 ? 'Partner' : 'Partners'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {list.map((p) => (
                  <div
                    key={p._id}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.fullName}</div>
                      <StatusBadge status={p.accountStatus} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: '700', marginBottom: '6px' }}>
                      {p.franchiseId}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} />
                      <span>District: <strong>{p.district}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TerritoriesPage;
