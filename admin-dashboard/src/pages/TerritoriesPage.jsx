import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Building, ShieldCheck, Building2, Eye, CheckCircle2 } from 'lucide-react';
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

  const totalStates = Object.keys(stateGroups).length;
  const totalDistricts = new Set(partners.map((p) => `${p.state}-${p.district}`)).size;
  const activeDistrictPartners = partners.filter(
    (p) => p.franchiseType === 'DISTRICT_FRANCHISE' && p.accountStatus === 'ACTIVE'
  ).length;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
          Authorized Territory Coverage
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Real-time state and district allocation overview across India
        </p>
      </div>

      {/* Overview Metrics Cards */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>STATES COVERED</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>{totalStates}</div>
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>DISTRICTS ALLOCATED</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>{totalDistricts}</div>
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#FAF5FF',
              color: '#9333EA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>ACTIVE DISTRICT HEADS</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeDistrictPartners}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading territory mappings from Atlas...
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
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{p.fullName}</div>
                        <StatusBadge status={p.accountStatus} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: '800' }}>
                          {p.franchiseId}
                        </span>
                        <FranchiseTypeBadge type={p.franchiseType} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <MapPin size={13} />
                        <span>District: <strong>{p.district}</strong> ({p.city})</span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '6px', textAlign: 'right' }}>
                      <Link to={`/partners/${p._id}`} className="btn btn-outline btn-sm" style={{ fontSize: '11.5px', padding: '4px 8px' }}>
                        <Eye size={12} />
                        <span>View Profile</span>
                      </Link>
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
