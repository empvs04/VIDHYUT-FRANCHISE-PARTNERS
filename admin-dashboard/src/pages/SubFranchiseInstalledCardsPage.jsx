import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Wrench,
  Zap,
  Building2,
  Home,
  Building,
  Factory,
  Search,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Filter,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const SubFranchiseInstalledCardsPage = () => {
  const navigate = useNavigate();
  const { user, partner, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [installations, setInstallations] = useState([]);
  const [subPartners, setSubPartners] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalRecords: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('ALL');
  const [copiedSerial, setCopiedSerial] = useState(null);

  const [stats, setStats] = useState({
    totalCards: 0,
    residentialCards: 0,
    commercialCards: 0,
    industrialCards: 0,
    totalInstalls: 0,
  });

  const fetchSubPartnersList = async () => {
    try {
      const res = await api.get('/partners', {
        params: {
          franchiseType: 'SUB_FRANCHISE',
          parentPartnerId: !isSuperAdmin ? partner?._id : undefined,
          limit: 100,
        },
      });
      setSubPartners(Array.isArray(res.data?.data?.partners) ? res.data.data.partners : []);
    } catch {
      // ignore
    }
  };

  const fetchInstallations = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        customerType: customerType !== 'ALL' ? customerType : undefined,
        source: 'SUB_FRANCHISE_INSTALLATIONS',
        partnerId: selectedSubId !== 'ALL' ? selectedSubId : (isSuperAdmin ? (partner?._id || undefined) : undefined),
      };

      const res = await api.get('/installations', { params });
      if (res.data?.data) {
        const data = res.data.data;
        const list = Array.isArray(data?.installations) ? data.installations : (Array.isArray(data) ? data : []);
        setInstallations(list);
        setPagination(data.pagination || { page: 1, limit: 15, totalRecords: 0, totalPages: 1 });

        let resSum = 0;
        let commSum = 0;
        let indSum = 0;
        let totalC = 0;

        list.forEach((inst) => {
          const count = inst.cardSerialNumbers?.length || inst.cardIds?.length || 1;
          totalC += count;
          if (inst.customerType === 'RESIDENTIAL') resSum += count;
          else if (inst.customerType === 'COMMERCIAL') commSum += count;
          else if (inst.customerType === 'INDUSTRIAL') indSum += count;
        });

        setStats({
          totalCards: totalC,
          residentialCards: resSum,
          commercialCards: commSum,
          industrialCards: indSum,
          totalInstalls: data.pagination?.totalRecords || list.length,
        });
      }
    } catch (err) {
      showToast('Failed to load Sub-Franchise installations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubPartnersList();
  }, []);

  useEffect(() => {
    fetchInstallations(1);
  }, [customerType, selectedSubId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInstallations(1);
  };

  const handleCopy = (serial) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    showToast(`Serial "${serial}" copied!`, 'success');
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const getCategoryMeta = (type) => {
    switch (type) {
      case 'RESIDENTIAL':
        return { label: 'Residential', bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46', icon: <Home size={12} /> };
      case 'COMMERCIAL':
        return { label: 'Commercial', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: <Building size={12} /> };
      case 'INDUSTRIAL':
        return { label: 'Industrial', bg: '#fef3c7', border: '#fde68a', color: '#92400e', icon: <Factory size={12} /> };
      default:
        return { label: type || 'General', bg: '#f1f5f9', border: '#cbd5e1', color: '#475569', icon: <Zap size={12} /> };
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#faf5ff', color: '#7e22ce' }}>
            <Wrench size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">My Sub Franchise Installed Cards</h1>
            <p className="page-subtitle" style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
              Real-time audit of cards deployed in the field by downline Sub-Franchise partners across <strong>Residential</strong>, <strong>Commercial</strong>, and <strong>Industrial</strong> sectors.
            </p>
          </div>
        </div>

        <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => fetchInstallations(pagination.page)} className="btn btn-outline" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/sub-franchise-customers" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} />
            <span>Sub-Franchise Customers</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: '22px' }}>
        <StatCard
          title="Total Sub-Franchise Cards"
          value={stats.totalCards || stats.totalInstalls}
          subtitle={`${stats.totalInstalls} Installations registered →`}
          icon={Wrench}
          bgLight="#faf5ff"
          iconColor="#7e22ce"
          borderLeftColor="#7e22ce"
          onClick={() => setCustomerType('ALL')}
        />
        <StatCard
          title="Residential Installed"
          value={stats.residentialCards}
          subtitle="Household connections →"
          icon={Home}
          bgLight="#dcfce7"
          iconColor="#16a34a"
          borderLeftColor="#16a34a"
          onClick={() => setCustomerType('RESIDENTIAL')}
        />
        <StatCard
          title="Commercial Installed"
          value={stats.commercialCards}
          subtitle="Businesses & retail →"
          icon={Building}
          bgLight="#eff6ff"
          iconColor="#2563eb"
          borderLeftColor="#2563eb"
          onClick={() => setCustomerType('COMMERCIAL')}
        />
        <StatCard
          title="Industrial Installed"
          value={stats.industrialCards}
          subtitle="Factories & plant units →"
          icon={Factory}
          bgLight="#fef3c7"
          iconColor="#d97706"
          borderLeftColor="#d97706"
          onClick={() => setCustomerType('INDUSTRIAL')}
        />
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: '18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Sub Cards', icon: Wrench },
              { id: 'RESIDENTIAL', label: 'Residential', icon: Home },
              { id: 'COMMERCIAL', label: 'Commercial', icon: Building },
              { id: 'INDUSTRIAL', label: 'Industrial', icon: Factory },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = customerType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCustomerType(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    border: isActive ? '1.5px solid #7e22ce' : '1px solid #e2e8f0',
                    backgroundColor: isActive ? '#faf5ff' : '#ffffff',
                    color: isActive ? '#6b21a8' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <TabIcon size={14} color={isActive ? '#7e22ce' : '#94a3b8'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-Franchise Partner Dropdown Filter & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {subPartners.length > 0 && (
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: '#334155',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="ALL">All Sub-Franchises ({subPartners.length})</option>
                {subPartners.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.fullName} ({sub.franchiseId})
                  </option>
                ))}
              </select>
            )}

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                placeholder="Search serial, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                  width: '180px',
                }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: '12.5px' }}>
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CARD SERIAL(S)</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>SUB-FRANCHISE PARTNER</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CUSTOMER NAME</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>CATEGORY</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>LOCATION</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'left' }}>DATE</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '800', color: '#475569', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Loading Sub-Franchise card installations...
                  </td>
                </tr>
              ) : installations.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '44px 20px', textAlign: 'center' }}>
                    <Wrench size={36} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>No Sub-Franchise Installations Recorded</div>
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 14px' }}>
                      Installed card units will automatically reflect here when your Sub-Franchise partners complete customer installations.
                    </p>
                  </td>
                </tr>
              ) : (
                installations.map((inst) => {
                  const catMeta = getCategoryMeta(inst.customerType);
                  const serials = inst.cardSerialNumbers || [];
                  const isVerified = inst.verificationStatus === 'VERIFIED';
                  const partnerInfo = inst.partnerId || {};

                  return (
                    <tr key={inst._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {serials.slice(0, 2).map((serial) => (
                            <div
                              key={serial}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#faf5ff',
                                border: '1px solid #e9d5ff',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                width: 'fit-content',
                              }}
                            >
                              <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', color: '#7e22ce' }}>
                                {serial}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(serial)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                              >
                                {copiedSerial === serial ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                          {partnerInfo.fullName || 'Sub-Franchise'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7e22ce', fontFamily: 'monospace', fontWeight: '700' }}>
                          {partnerInfo.franchiseId}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                          {inst.customerId?.fullName || inst.customerName || 'Customer'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          📞 {inst.customerId?.mobileNumber || 'N/A'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: catMeta.bg,
                            border: `1px solid ${catMeta.border}`,
                            color: catMeta.color,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                          }}
                        >
                          {catMeta.icon}
                          <span>{catMeta.label}</span>
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#475569' }}>
                          <MapPin size={12} color="#0284c7" />
                          <span>{inst.installationAddress?.district || inst.installationAddress?.city || 'N/A'}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '12px', color: '#0f172a' }}>
                          {inst.installationDateTime
                            ? new Date(inst.installationDateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                            : 'N/A'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <span
                          style={{
                            backgroundColor: isVerified ? '#dcfce7' : '#fffbeb',
                            color: isVerified ? '#15803d' : '#b45309',
                            border: isVerified ? '1px solid #86efac' : '1px solid #fde68a',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: '800',
                          }}
                        >
                          {isVerified ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <Link
                          to={inst.customerId?._id ? `/customers/${inst.customerId._id}` : `/customers`}
                          className="btn btn-outline"
                          style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubFranchiseInstalledCardsPage;
