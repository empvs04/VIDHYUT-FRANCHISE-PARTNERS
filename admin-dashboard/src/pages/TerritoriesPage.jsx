import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Building,
  ShieldCheck,
  Building2,
  Eye,
  CheckCircle2,
  Search,
  RefreshCw,
  Users,
  ChevronRight,
  Phone,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';

const TerritoriesPage = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('');

  const fetchTerritories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/partners', { params: { limit: 200 } });
      if (res.data?.data) {
        setPartners(res.data.data.partners || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerritories();
  }, []);

  // Filter partners
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchSearch =
        !search.trim() ||
        p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        p.franchiseId?.toLowerCase().includes(search.toLowerCase()) ||
        p.district?.toLowerCase().includes(search.toLowerCase()) ||
        p.state?.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase());

      const matchState = !selectedStateFilter || p.state === selectedStateFilter;

      return matchSearch && matchState;
    });
  }, [partners, search, selectedStateFilter]);

  // Group filtered partners by State
  const stateGroups = useMemo(() => {
    return filteredPartners.reduce((acc, p) => {
      const st = p.state || 'Unassigned';
      if (!acc[st]) acc[st] = [];
      acc[st].push(p);
      return acc;
    }, {});
  }, [filteredPartners]);

  // All unique states for state dropdown
  const allStates = useMemo(() => {
    return Array.from(new Set(partners.map((p) => p.state).filter(Boolean))).sort();
  }, [partners]);

  const totalStates = new Set(partners.map((p) => p.state).filter(Boolean)).size;
  const totalDistricts = new Set(partners.map((p) => `${p.state}-${p.district}`).filter((d) => !d.startsWith('-'))).size;
  const activeDistrictPartners = partners.filter(
    (p) => p.franchiseType === 'DISTRICT_FRANCHISE' && p.accountStatus === 'ACTIVE'
  ).length;
  const subFranchisePartners = partners.filter(
    (p) => p.franchiseType === 'SUB_FRANCHISE'
  ).length;

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div className="page-header-icon-box" style={{ flexShrink: 0 }}>
            <MapPin size={20} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title" style={{ fontSize: '18px' }}>Authorized Territory Coverage</h1>
            <p className="page-subtitle" style={{ fontSize: '12.5px' }}>
              Real-time state and district allocation overview across India
            </p>
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={fetchTerritories}
            disabled={loading}
            className="btn btn-outline"
            style={{
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              padding: '0 12px',
              borderRadius: '8px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4-Card Balanced Stat Grid (Perfect 2x2 on Mobile, 4x1 on Desktop) */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <StatCard
          title="States Covered"
          value={totalStates}
          subtitle="Operating States"
          icon={Building}
          bgLight="#E0F2FE"
          iconColor="#0284C7"
          loading={loading}
        />

        <StatCard
          title="Districts Allocated"
          value={totalDistricts}
          subtitle="Assigned Territories"
          icon={MapPin}
          bgLight="#DCFCE7"
          iconColor="#16A34A"
          loading={loading}
        />

        <StatCard
          title="Active District Heads"
          value={activeDistrictPartners}
          subtitle="District Franchises"
          icon={ShieldCheck}
          bgLight="#FAF5FF"
          iconColor="#9333EA"
          loading={loading}
        />

        <StatCard
          title="Sub-Franchises"
          value={subFranchisePartners}
          subtitle="Area / Town Units"
          icon={Users}
          bgLight="#FFF7ED"
          iconColor="#EA580C"
          loading={loading}
        />
      </div>

      {/* Filter Control Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search State, District, Partner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px', paddingRight: search ? '60px' : '12px', fontSize: '13.5px' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ flex: '1 1 180px' }}>
            <select
              className="select"
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              style={{ fontSize: '13.5px', padding: '10px 14px' }}
            >
              <option value="">All States ({allStates.length})</option>
              {allStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedStateFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedStateFilter('');
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '12.5px', color: '#64748b' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#0284c7' }} />
          <div>Loading territory mappings...</div>
        </div>
      ) : Object.keys(stateGroups).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <MapPin size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>No territories found</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {search || selectedStateFilter
              ? 'No territories match your filter. Try resetting search filters.'
              : 'When you register Franchise Partners with state & district allocations, they will appear here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(stateGroups).map(([stateName, list]) => (
            <div key={stateName} className="card" style={{ padding: '16px 18px' }}>
              {/* State Header Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '12px',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Building size={16} />
                  </div>
                  <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: 'var(--text-primary)' }}>{stateName}</h2>
                </div>

                <span
                  style={{
                    fontSize: '12px',
                    color: '#0284c7',
                    fontWeight: '700',
                    backgroundColor: '#F0F9FF',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  {list.length} {list.length === 1 ? 'Partner' : 'Partners'}
                </span>
              </div>

              {/* Partners Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px',
                }}
              >
                {list.map((p) => (
                  <div
                    key={p._id}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      {/* Name & Account Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{p.fullName}</div>
                        <StatusBadge status={p.accountStatus} />
                      </div>

                      {/* Franchise ID & Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: '800', fontFamily: 'monospace' }}>
                          {p.franchiseId}
                        </span>
                        <FranchiseTypeBadge type={p.franchiseType} />
                      </div>

                      {/* District / Territory */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <MapPin size={13} color="#059669" />
                        <span>
                          District: <strong style={{ color: '#0f172a' }}>{p.district}</strong> {p.city ? `(${p.city})` : ''}
                        </span>
                      </div>

                      {p.mobileNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748b' }}>
                          <Phone size={12} />
                          <span>{p.mobileNumber}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px', textAlign: 'right' }}>
                      <Link
                        to={`/partners/${p._id}`}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '12px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} />
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
