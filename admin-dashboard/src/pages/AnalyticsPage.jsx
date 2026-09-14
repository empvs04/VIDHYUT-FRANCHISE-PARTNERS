import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Users,
  Building2,
  MapPin,
  Calendar,
  RefreshCw,
  Zap,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  DollarSign,
  Activity,
  Layers,
  Package,
  Search,
  Download,
  Eye,
  ChevronRight,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { FranchiseTypeBadge, StatusBadge, CardStatusBadge } from '../components/common/Badge';

const DATE_RANGE_OPTIONS = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'THIS_QUARTER', label: 'This Quarter' },
  { value: 'THIS_YEAR', label: 'This Year' },
  { value: 'ALL_TIME', label: 'All Time' },
  { value: 'CUSTOM', label: 'Custom Range' },
];

const DONUT_COLORS = ['#0284c7', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AnalyticsPage = () => {
  const { isSuperAdmin, isPartner, partner } = useAuth();
  const { showToast } = useNotification();

  // Date Filter State
  const [dateRange, setDateRange] = useState('ALL_TIME');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW, PARTNERS, TERRITORIES, ELECTRICITY, LIFECYCLE, SUB_DISTRIBUTION

  // Loading States
  const [loading, setLoading] = useState(false);

  // Data States
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [partnerPerf, setPartnerPerf] = useState(null);
  const [partnerSort, setPartnerSort] = useState('installations');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [statesData, setStatesData] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [districtsData, setDistrictsData] = useState([]);
  const [gpsData, setGpsData] = useState(null);
  const [electricityData, setElectricityData] = useState(null);
  const [lifecycleData, setLifecycleData] = useState(null);

  // Sub-Franchise Distribution Watch State
  const [subDistData, setSubDistData] = useState(null);
  const [subDistLoading, setSubDistLoading] = useState(false);
  const [subDistSearch, setSubDistSearch] = useState('');
  const [subDistState, setSubDistState] = useState('');

  // Fetch Overview and Core Analytics
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        dateRange,
        startDate: dateRange === 'CUSTOM' ? startDate : undefined,
        endDate: dateRange === 'CUSTOM' ? endDate : undefined,
      };

      const [resOverview, resRevenue, resCards, resGps, resCustElec] = await Promise.all([
        api.get('/analytics/overview', { params }).catch(() => ({ data: { data: null } })),
        api.get('/analytics/revenue', { params }).catch(() => ({ data: { data: null } })),
        api.get('/analytics/cards', { params }).catch(() => ({ data: { data: null } })),
        api.get('/analytics/gps', { params }).catch(() => ({ data: { data: null } })),
        api.get('/analytics/customers').catch(() => ({ data: { data: null } })),
      ]);

      if (resOverview.data?.data) setOverview(resOverview.data.data);
      if (resRevenue.data?.data) setRevenueData(resRevenue.data.data);
      if (resCards.data?.data) setLifecycleData(resCards.data.data);
      if (resGps.data?.data) setGpsData(resGps.data.data);
      if (resCustElec.data?.data) setElectricityData(resCustElec.data.data);
    } catch {
      showToast('Failed to load business intelligence data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateRange, startDate, endDate, showToast]);

  // Fetch Partner Performance
  const fetchPartnerPerformance = useCallback(async () => {
    try {
      const res = await api
        .get('/analytics/partners', { params: { sortBy: partnerSort, limit: 100 } })
        .catch(() => ({ data: { data: null } }));
      if (res.data?.data) {
        setPartnerPerf(res.data.data);
      }
    } catch {}
  }, [partnerSort]);

  // Fetch State & District Analytics
  const fetchTerritoryAnalytics = useCallback(async () => {
    try {
      const resStates = await api.get('/analytics/territories/states');
      if (resStates.data?.data) {
        setStatesData(resStates.data.data);
        if (!selectedState && resStates.data.data.length > 0) {
          setSelectedState(resStates.data.data[0].state);
        }
      }
    } catch {}
  }, [selectedState]);

  // Fetch Sub-Franchise Distribution Watch (Admin View)
  const fetchSubFranchiseDistribution = useCallback(async () => {
    try {
      setSubDistLoading(true);
      const params = {
        search: subDistSearch || undefined,
        state: subDistState || undefined,
      };
      const res = await api.get('/analytics/sub-franchise-distribution', { params });
      if (res.data?.data) {
        setSubDistData(res.data.data);
      }
    } catch {
      showToast('Failed to load sub-franchise distribution watch data.', 'error');
    } finally {
      setSubDistLoading(false);
    }
  }, [subDistSearch, subDistState, showToast]);

  // Fetch District breakdown when state changes
  useEffect(() => {
    if (!selectedState) return;
    const fetchDistricts = async () => {
      try {
        const res = await api.get('/analytics/territories/districts', { params: { state: selectedState } });
        if (res.data?.data) {
          setDistrictsData(res.data.data);
        }
      } catch {}
    };
    fetchDistricts();
  }, [selectedState]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  useEffect(() => {
    if (activeTab === 'PARTNERS') fetchPartnerPerformance();
    if (activeTab === 'TERRITORIES') fetchTerritoryAnalytics();
    if (activeTab === 'SUB_DISTRIBUTION') fetchSubFranchiseDistribution();
  }, [activeTab, fetchPartnerPerformance, fetchTerritoryAnalytics, fetchSubFranchiseDistribution]);

  // Filter partners in leaderboard by search
  const filteredPartners = (partnerPerf?.partners || []).filter((p) => {
    if (!partnerSearch.trim()) return true;
    const q = partnerSearch.toLowerCase();
    return (
      p.fullName?.toLowerCase().includes(q) ||
      p.franchiseId?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q) ||
      p.state?.toLowerCase().includes(q)
    );
  });

  // Export CSV Summary
  const handleExportCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      if (activeTab === 'PARTNERS') {
        csvContent += 'Rank,Franchise ID,Partner Name,Franchise Level,State,District,Inventory In Hand,Installations,Revenue INR,Customers,Status\n';
        filteredPartners.forEach((p) => {
          csvContent += `"${p.rank}","${p.franchiseId}","${p.fullName}","${p.franchiseType}","${p.state}","${p.district}","${p.currentInventoryCount}","${p.installationsCount}","${p.installationRevenue}","${p.customersCount}","${p.accountStatus}"\n`;
        });
      } else if (activeTab === 'TERRITORIES') {
        csvContent += 'State,Total Partners,Active Partners,Customers,Installations,Installed Cards,Revenue INR\n';
        statesData.forEach((st) => {
          csvContent += `"${st.state}","${st.totalPartners}","${st.activePartners}","${st.customers}","${st.installations}","${st.installedCards}","${st.revenue}"\n`;
        });
      } else {
        csvContent += 'Metric,Value\n';
        csvContent += `"Total Franchise Partners","${overview?.metrics?.partners?.total || 0}"\n`;
        csvContent += `"Active Partners","${overview?.metrics?.partners?.active || 0}"\n`;
        csvContent += `"Total Cards","${overview?.metrics?.cards?.totalCards || 0}"\n`;
        csvContent += `"Available Stock","${overview?.metrics?.cards?.available || 0}"\n`;
        csvContent += `"Assigned Stock","${overview?.metrics?.cards?.assigned || 0}"\n`;
        csvContent += `"Transferred Stock","${overview?.metrics?.cards?.transferred || 0}"\n`;
        csvContent += `"Installed Cards","${overview?.metrics?.cards?.installed || 0}"\n`;
        csvContent += `"Customer Installation Revenue INR","${overview?.metrics?.revenue?.customerRevenue || 0}"\n`;
        csvContent += `"P2P Stock Sales INR","${overview?.metrics?.revenue?.p2pConfirmedSales || 0}"\n`;
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Vidhyut_Saathi_BI_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Analytics summary exported as CSV successfully.', 'success');
    } catch {
      showToast('Failed to export CSV report.', 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header-wrap" style={{ marginBottom: '20px' }}>
        <div className="page-header-left">
          <div className="page-header-icon-box" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <BarChart3 size={22} />
          </div>
          <div className="page-header-text">
            <h1 className="page-title">
              {isSuperAdmin
                ? 'Executive Business Intelligence & Performance Analytics'
                : 'My Franchise Analytics & Performance'}
            </h1>
            <p className="page-subtitle">
              {isSuperAdmin
                ? 'Real-time aggregated metrics across franchise hierarchy, stock distribution, revenue flow, electricity load, and territory compliance.'
                : `Live performance, card inventory, customer load, and earnings for ${partner?.fullName || 'your franchise'} (${partner?.franchiseId || ''} - ${partner?.district || ''}, ${partner?.state || ''}).`}
            </p>
          </div>
        </div>

        {/* Global Controls & Filter */}
        <div className="analytics-controls-wrap" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              flex: '1 1 auto',
            }}
          >
            <Calendar size={16} color="#0284c7" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {dateRange === 'CUSTOM' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', flex: 1 }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', flex: 1 }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flex: '1 1 auto' }}>
            <button
              type="button"
              onClick={fetchAnalyticsData}
              disabled={loading}
              className="btn btn-outline"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '7px 12px', fontSize: '12.5px' }}
              title="Refresh analytics data"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="btn btn-outline"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '7px 12px', fontSize: '12.5px' }}
              title="Export CSV summary"
            >
              <Download size={14} color="#0284c7" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="analytics-kpi-grid">
        {/* KPI 1: Franchise Network */}
        <div
          className="card"
          style={{
            padding: '16px',
            borderLeft: '4px solid #0284c7',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          onClick={() => setActiveTab('PARTNERS')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {isSuperAdmin ? 'Franchise Network' : 'My Network'}
            </span>
            <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '5px', borderRadius: '6px' }}>
              <Building2 size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px 0' }}>
            {isSuperAdmin ? overview?.metrics?.partners?.total || 0 : partner?.franchiseId || 'Active'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: 600 }}>
            {isSuperAdmin
              ? `${overview?.metrics?.partners?.active || 0} Active (${overview?.metrics?.partners?.stateFranchises || 0} State, ${overview?.metrics?.partners?.districtFranchises || 0} Dist, ${overview?.metrics?.partners?.subFranchises || 0} Sub)`
              : `${partner?.district || ''}, ${partner?.state || ''}`}
          </div>
        </div>

        {/* KPI 2: Card Stock Inventory */}
        <div
          className="card"
          style={{
            padding: '16px',
            borderLeft: '4px solid #059669',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          onClick={() => setActiveTab('LIFECYCLE')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Total Card Stock
            </span>
            <div style={{ background: '#ecfdf5', color: '#059669', padding: '5px', borderRadius: '6px' }}>
              <CreditCard size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px 0' }}>
            {overview?.metrics?.cards?.totalCards || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>{overview?.metrics?.cards?.available || 0}</span> Avail |{' '}
            <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{overview?.metrics?.cards?.transferred || 0}</span> Trans |{' '}
            <span style={{ color: '#059669', fontWeight: 700 }}>{overview?.metrics?.cards?.installed || 0}</span> Inst
          </div>
        </div>

        {/* KPI 3: Customer Installations & Revenue */}
        <div
          className="card"
          style={{
            padding: '16px',
            borderLeft: '4px solid #16a34a',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          onClick={() => setActiveTab('OVERVIEW')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Installation Revenue
            </span>
            <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '5px', borderRadius: '6px' }}>
              <DollarSign size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', margin: '6px 0 2px 0' }}>
            ₹{(overview?.metrics?.revenue?.customerRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            {overview?.metrics?.installations?.total || 0} Installs ({overview?.metrics?.installations?.installedCards || 0} Cards)
          </div>
        </div>

        {/* KPI 4: Inter-Franchise / P2P Stock Sales */}
        <div
          className="card"
          style={{
            padding: '16px',
            borderLeft: '4px solid #7e22ce',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          onClick={() => setActiveTab('SUB_DISTRIBUTION')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              P2P Stock Sales
            </span>
            <div style={{ background: '#faf5ff', color: '#7e22ce', padding: '5px', borderRadius: '6px' }}>
              <TrendingUp size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#7e22ce', margin: '6px 0 2px 0' }}>
            ₹{(overview?.metrics?.revenue?.p2pConfirmedSales || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            Confirmed P2P | Pending: ₹{(overview?.metrics?.revenue?.p2pPendingSales || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {/* KPI 5: GPS Location Audit */}
        <div
          className="card"
          style={{
            padding: '16px',
            borderLeft: `4px solid ${(overview?.metrics?.territoryAudit?.territoryMismatch || 0) > 0 ? '#dc2626' : '#16a34a'}`,
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          onClick={() => setActiveTab('TERRITORIES')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              GPS Audit
            </span>
            <div style={{ background: '#fef3c7', color: '#d97706', padding: '5px', borderRadius: '6px' }}>
              <MapPin size={15} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px 0' }}>
            {overview?.metrics?.territoryAudit?.territoryMatched || 0} Matched
          </div>
          <div
            style={{
              fontSize: '11.5px',
              color: (overview?.metrics?.territoryAudit?.territoryMismatch || 0) > 0 ? '#dc2626' : '#16a34a',
              fontWeight: 600,
            }}
          >
            {(overview?.metrics?.territoryAudit?.territoryMismatch || 0) > 0
              ? `${overview?.metrics?.territoryAudit?.territoryMismatch} Mismatches`
              : '100% Territory Compliant'}
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS (Touch Scrollable on Mobile) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'OVERVIEW', label: 'Executive & Revenue', icon: TrendingUp },
          { id: 'PARTNERS', label: 'Partner Leaderboard', icon: Award },
          { id: 'TERRITORIES', label: 'Territory Drilldown', icon: MapPin },
          { id: 'ELECTRICITY', label: 'Connected Load', icon: Zap },
          { id: 'LIFECYCLE', label: 'Card Lifecycle', icon: Activity },
          { id: 'SUB_DISTRIBUTION', label: 'Sub-Franchise Watch', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '11px 16px',
                fontSize: '13px',
                fontWeight: isActive ? 800 : 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: isActive ? '3.5px solid #0284c7' : '3.5px solid transparent',
                color: isActive ? '#0284c7' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW & REVENUE                       */}
      {/* ========================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Charts Row */}
          <div className="analytics-chart-grid">
            {/* Monthly Trend Area Chart */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                Customer Installations & Revenue Growth
              </div>
              <div className="analytics-chart-box" style={{ width: '100%', height: 280 }}>
                {overview?.charts?.monthlyTrends && overview.charts.monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.charts.monthlyTrends}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        formatter={(val, name) => [
                          name === 'Revenue (₹)' ? `₹${val.toLocaleString('en-IN')}` : val,
                          name,
                        ]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue (₹)"
                        stroke="#0284c7"
                        fillOpacity={1}
                        fill="url(#colorRev)"
                      />
                      <Area
                        type="monotone"
                        dataKey="installations"
                        name="Installations"
                        stroke="#10b981"
                        fill="#10b981"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No time-series installation data recorded for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Status Donut */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                Card Inventory Ownership Distribution
              </div>
              <div style={{ width: '100%', height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {overview?.charts?.inventoryDistribution ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <Pie
                        data={overview.charts.inventoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {overview.charts.inventoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [`${val} Cards`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>No card distribution data available.</div>
                )}
              </div>

              {/* Structured 2-Column Custom Legend with Perfect Alignment */}
              {overview?.charts?.inventoryDistribution && overview.charts.inventoryDistribution.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px 14px',
                    marginTop: '16px',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  {overview.charts.inventoryDistribution.map((entry, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        color: '#334155',
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: '11px',
                          height: '11px',
                          borderRadius: '3px',
                          backgroundColor: entry.color || DONUT_COLORS[index % DONUT_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Revenue Breakdown Separation */}
          <div className="analytics-chart-grid">
            {/* P2P Stock Sales Breakdown */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={17} color="#0284c7" />
                <span>Partner-to-Partner Stock Sales Breakdown</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12.5px', color: '#475569' }}>Total Gross Stock Sales</span>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                    ₹{(revenueData?.partnerToPartner?.totalSalesValue || overview?.metrics?.revenue?.p2pSalesTotal || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#ecfdf5', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>Verified & Confirmed Payments</span>
                  <strong style={{ fontSize: '13.5px', color: '#059669' }}>
                    ₹{(revenueData?.partnerToPartner?.verifiedPayments || overview?.metrics?.revenue?.p2pConfirmedSales || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fffbeb', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12.5px', color: '#b45309' }}>Pending Consignment Payments</span>
                  <strong style={{ fontSize: '13.5px', color: '#b45309' }}>
                    ₹{(revenueData?.partnerToPartner?.pendingPayments || overview?.metrics?.revenue?.p2pPendingSales || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Customer Installation Sales Breakdown */}
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={17} color="#16a34a" />
                <span>Customer Installation Sales Breakdown</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12.5px', color: '#475569' }}>Total Installation Sales</span>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                    ₹{(revenueData?.customerInstallations?.totalCustomerSales || overview?.metrics?.revenue?.customerRevenue || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#ecfdf5', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>Confirmed OTP & Signature Sales</span>
                  <strong style={{ fontSize: '13.5px', color: '#059669' }}>
                    ₹{(revenueData?.customerInstallations?.confirmedSales || overview?.metrics?.revenue?.customerRevenue || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fffbeb', borderRadius: '6px' }}>
                  <span style={{ fontSize: '12.5px', color: '#b45309' }}>Pending Verification Sales</span>
                  <strong style={{ fontSize: '13.5px', color: '#b45309' }}>
                    ₹{(revenueData?.customerInstallations?.pendingConfirmationSales || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PARTNER PERFORMANCE & LEADERBOARD                  */}
      {/* ========================================================= */}
      {activeTab === 'PARTNERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Sorting & Search Control Bar */}
          <div
            className="card"
            style={{
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  width: '100%',
                }}
              >
                <Search size={15} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search Partner, Franchise ID, District..."
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Rank By:</span>
              <select
                value={partnerSort}
                onChange={(e) => setPartnerSort(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '240px',
                }}
              >
                <option value="installations">Highest Card Installations</option>
                <option value="revenue">Highest Customer Revenue</option>
                <option value="sales">Highest P2P Stock Sales</option>
                <option value="customers">Most Customers Onboarded</option>
                <option value="cardsDistributed">Most Cards Distributed</option>
              </select>
            </div>
          </div>

          {/* Table Container with Desktop Table & Mobile Cards */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {/* Desktop Table View */}
            <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Rank</th>
                    <th style={{ padding: '12px 16px' }}>Franchise ID</th>
                    <th style={{ padding: '12px 16px' }}>Partner Name</th>
                    <th style={{ padding: '12px 16px' }}>Franchise Level</th>
                    <th style={{ padding: '12px 16px' }}>Territory</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stock In Hand</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Installations</th>
                    <th style={{ padding: '12px 16px' }}>Revenue (INR)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Customers</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((p) => {
                    const rankBg = p.rank === 1 ? '#FEF3C7' : p.rank === 2 ? '#F1F5F9' : p.rank === 3 ? '#FFEDD5' : 'transparent';
                    const rankColor = p.rank === 1 ? '#B45309' : p.rank === 2 ? '#475569' : p.rank === 3 ? '#C2410C' : '#64748B';

                    return (
                      <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: rankBg,
                              color: rankColor,
                              fontWeight: 800,
                              fontSize: '12px',
                            }}
                          >
                            #{p.rank}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                          {p.franchiseId}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{p.fullName}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <FranchiseTypeBadge type={p.franchiseType} />
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {p.district}, {p.state}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#0284c7' }}>
                          {p.currentInventoryCount}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                          {p.installationsCount}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                          ₹{(p.installationRevenue || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{p.customersCount}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge status={p.accountStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
              {filteredPartners.map((p) => {
                const rankBg = p.rank === 1 ? '#FEF3C7' : p.rank === 2 ? '#F1F5F9' : p.rank === 3 ? '#FFEDD5' : '#f8fafc';
                const rankColor = p.rank === 1 ? '#B45309' : p.rank === 2 ? '#475569' : p.rank === 3 ? '#C2410C' : '#64748B';
                const borderColor = p.rank === 1 ? '#fde68a' : p.rank === 2 ? '#e2e8f0' : p.rank === 3 ? '#fed7aa' : '#e2e8f0';

                return (
                  <div
                    key={p._id}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* Top Row: Rank, Name, Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: rankBg,
                            color: rankColor,
                            fontWeight: 800,
                            fontSize: '13px',
                            flexShrink: 0,
                          }}
                        >
                          #{p.rank}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{p.fullName}</div>
                          <div style={{ fontSize: '11px', color: '#0284c7', fontFamily: 'monospace', fontWeight: 600 }}>
                            {p.franchiseId}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={p.accountStatus} />
                    </div>

                    {/* Franchise Level & Territory */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11.5px' }}>
                      <FranchiseTypeBadge type={p.franchiseType} />
                      <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#94a3b8" />
                        <span>{p.district ? `${p.district}, ${p.state}` : p.state || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Metric Tiles 2x2 */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        background: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Installations</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#16a34a' }}>{p.installationsCount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Revenue</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#16a34a' }}>₹{(p.installationRevenue || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Stock In Hand</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0284c7' }}>{p.currentInventoryCount} Cards</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Customers</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#334155' }}>{p.customersCount}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredPartners.length === 0 && (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                No partner records match your search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: TERRITORY & GPS DRILLDOWN                          */}
      {/* ========================================================= */}
      {activeTab === 'TERRITORIES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* GPS Quality Distribution Cards */}
          <div className="analytics-kpi-grid">
            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Average GPS Accuracy</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', margin: '4px 0' }}>
                ±{gpsData?.accuracySummary?.averageMeters || 0}m
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Range: {gpsData?.accuracySummary?.minimumMeters || 0}m – {gpsData?.accuracySummary?.maximumMeters || 0}m
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Accuracy Tiers</div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                ≤50m (Excellent): {gpsData?.accuracySummary?.excellentCount || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#f59e0b' }}>
                50–100m (Acceptable): {gpsData?.accuracySummary?.acceptableCount || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#dc2626' }}>
                &gt;100m (Poor): {gpsData?.accuracySummary?.poorCount || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: `4px solid ${(gpsData?.territoryCompliance?.mismatch || 0) > 0 ? '#dc2626' : '#16a34a'}` }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Territory Match Rate</div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: (gpsData?.territoryCompliance?.mismatch || 0) > 0 ? '#dc2626' : '#16a34a',
                  margin: '4px 0',
                }}
              >
                {gpsData?.territoryCompliance?.matchRatePercent || 100}%
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Matched: {gpsData?.territoryCompliance?.matched || 0} | Mismatches: {gpsData?.territoryCompliance?.mismatch || 0}
              </div>
            </div>
          </div>

          {/* State Wise Aggregation Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
              State-Wise Performance Overview <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>(Tap state to drill down)</span>
            </div>
            
            {/* Desktop Table */}
            <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>State</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Partners</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Active Partners</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Customers</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Installations</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Installed Cards</th>
                    <th style={{ padding: '12px 16px' }}>Revenue (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {statesData.map((st) => (
                    <tr
                      key={st.state}
                      onClick={() => setSelectedState(st.state)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '13px',
                        cursor: 'pointer',
                        background: selectedState === st.state ? '#f0f9ff' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} />
                          <span>{st.state}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{st.totalPartners}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{st.activePartners}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{st.customers}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{st.installations}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{st.installedCards}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                        ₹{(st.revenue || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
              {statesData.map((st) => {
                const isSelected = selectedState === st.state;
                return (
                  <div
                    key={st.state}
                    onClick={() => setSelectedState(st.state)}
                    style={{
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0284c7', fontSize: '14px' }}>
                        <MapPin size={15} color="#0284c7" />
                        <span>{st.state}</span>
                      </div>
                      <span style={{ fontSize: '11.5px', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                        {st.activePartners}/{st.totalPartners} Active Partners
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '6px',
                        background: '#f8fafc',
                        padding: '8px',
                        borderRadius: '6px',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Customers</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155' }}>{st.customers}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Installations</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#16a34a' }}>{st.installations} ({st.installedCards} Cards)</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Revenue</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#16a34a' }}>₹{(st.revenue || 0).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* District Breakdown for Selected State */}
          {selectedState && (
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                District Drill-Down for: <span style={{ color: '#0284c7' }}>{selectedState}</span>
              </div>

              {/* Desktop District Table */}
              <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                      <th style={{ padding: '12px 16px' }}>District</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Partners</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Customers</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Installations</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Cards Installed</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Verified</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Mismatches</th>
                      <th style={{ padding: '12px 16px' }}>Revenue (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtsData.map((d) => (
                      <tr key={d.district} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>{d.district}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{d.totalPartners}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{d.customers}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{d.installations}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{d.installedCards}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{d.verifiedInstallations}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: d.mismatchInstallations > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                          {d.mismatchInstallations}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                          ₹{(d.revenue || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile District Cards */}
              <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
                {districtsData.map((d) => (
                  <div
                    key={d.district}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{d.district}</div>
                      <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                        {d.totalPartners} Partners | {d.customers} Customers
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        background: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Installations</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>{d.installations} ({d.installedCards} Cards)</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Revenue</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>₹{(d.revenue || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Verified</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>{d.verifiedInstallations}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Mismatches</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: d.mismatchInstallations > 0 ? '#dc2626' : '#64748b' }}>
                          {d.mismatchInstallations}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ELECTRICITY & LOAD INTELLIGENCE                    */}
      {/* ========================================================= */}
      {activeTab === 'ELECTRICITY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Metric Cards */}
          <div className="analytics-kpi-grid">
            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Connected Load</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', margin: '4px 0' }}>
                {electricityData?.connectedLoad?.totalConnectedLoadKw || 0} kW
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Avg per Installation: {electricityData?.connectedLoad?.avgLoadPerInstallationKw || 0} kW
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Recommended vs Installed</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                {electricityData?.connectedLoad?.totalInstalledCards || 0} Cards
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Recommended: {electricityData?.connectedLoad?.totalRecommendedCards || 0} | Variance: {electricityData?.connectedLoad?.varianceCards || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Customer Segments</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                Residential: {electricityData?.customerDistribution?.residential || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Commercial: {electricityData?.customerDistribution?.commercial || 0} | Industrial: {electricityData?.customerDistribution?.industrial || 0}
              </div>
            </div>
          </div>

          {/* Load Analysis Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
              Connected Load Analysis by Customer Segment
            </div>
            
            {/* Desktop Table */}
            <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                    <th style={{ padding: '12px 16px' }}>Customer Segment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Installations</th>
                    <th style={{ padding: '12px 16px' }}>Total Load (kW)</th>
                    <th style={{ padding: '12px 16px' }}>Avg Load/Premise</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Recommended Cards</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Installed Cards</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(electricityData?.connectedLoad?.breakdown || {}).map(([key, val]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>{key}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{val.count}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{val.totalLoadKw} kW</td>
                      <td style={{ padding: '12px 16px' }}>{val.avgLoadKw} kW</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{val.recommendedCards}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                        {val.installedCards}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
              {Object.entries(electricityData?.connectedLoad?.breakdown || {}).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0284c7' }}>{key} Segment</div>
                    <span style={{ fontSize: '11px', background: '#f0f9ff', color: '#0284c7', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      {val.count} Installations
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px',
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Load</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{val.totalLoadKw} kW</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Avg Load / Premise</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}>{val.avgLoadKw} kW</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Recommended Cards</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7' }}>{val.recommendedCards}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Installed Cards</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>{val.installedCards}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CARD LIFECYCLE ACTIVITY                           */}
      {/* ========================================================= */}
      {activeTab === 'LIFECYCLE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="analytics-kpi-grid">
            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cards Created in Period</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', margin: '4px 0' }}>
                {lifecycleData?.lifecycleInPeriod?.cardsAdded || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #0ea5e9' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assigned to Partners</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0ea5e9', margin: '4px 0' }}>
                {lifecycleData?.lifecycleInPeriod?.cardsAssigned || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>P2P Cards Transferred</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#8b5cf6', margin: '4px 0' }}>
                {lifecycleData?.lifecycleInPeriod?.cardsTransferred || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Customer Installed Cards</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                {lifecycleData?.lifecycleInPeriod?.cardsInstalled || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: SUB-FRANCHISE DISTRIBUTION WATCH                  */}
      {/* ========================================================= */}
      {activeTab === 'SUB_DISTRIBUTION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Policy Info Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <ShieldCheck size={22} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '13.5px' }}>
                Sub-Franchise Stock Hierarchy & Distribution Watch
              </div>
              <div style={{ color: '#15803d', fontSize: '12px', marginTop: '3px', lineHeight: '1.4' }}>
                Rule Enforced: Sub-Franchise partners can ONLY receive stock directly from their Parent Franchise Partner. Super Admin monitors all stock movements across all Franchise Partners in real-time.
              </div>
            </div>
          </div>

          {/* Sub-Dist KPI Summary */}
          <div className="analytics-kpi-grid">
            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Given to Sub-Franchises</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', margin: '4px 0' }}>
                {subDistData?.totalCardsDistributedToSubFranchises || 0} Cards
              </div>
              <div style={{ fontSize: '11.5px', color: '#16a34a' }}>Confirmed & Delivered</div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #0ea5e9' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Distributing Partners</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0ea5e9', margin: '4px 0' }}>
                {subDistData?.parentSummaries?.length || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Active Franchise Hubs</div>
            </div>

            <div className="card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sub-Franchise Transfers</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#8b5cf6', margin: '4px 0' }}>
                {subDistData?.records?.length || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Ledger Records</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="card" style={{ padding: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by Partner, Sub-Franchise, or TX ID..."
                value={subDistSearch}
                onChange={(e) => setSubDistSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12.5px' }}
              />
            </div>

            <button
              type="button"
              onClick={fetchSubFranchiseDistribution}
              disabled={subDistLoading}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12.5px' }}
            >
              <RefreshCw size={13} className={subDistLoading ? 'spin' : ''} />
              <span>Filter Watch</span>
            </button>
          </div>

          {/* Section 1: Partner Distribution Summary Breakdown */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
              Franchise Partner → Sub-Franchise Stock Volume Summary
            </div>
            {subDistLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading distribution watch data...</div>
            ) : subDistData?.parentSummaries?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No sub-franchise stock distributions recorded yet.</div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                        <th style={{ padding: '12px 16px' }}>Parent Franchise Partner</th>
                        <th style={{ padding: '12px 16px' }}>Franchise ID</th>
                        <th style={{ padding: '12px 16px' }}>Role / Type</th>
                        <th style={{ padding: '12px 16px' }}>Territory (State / District)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Cards Given to Sub-Franchises</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Sub-Franchise Recipients</th>
                        <th style={{ padding: '12px 16px' }}>Recipient Partners</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subDistData?.parentSummaries?.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{p.fullName}</td>
                          <td style={{ padding: '12px 16px', color: '#0284c7', fontWeight: 600, fontFamily: 'monospace' }}>{p.franchiseId}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <FranchiseTypeBadge type={p.franchiseType} />
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            {p.state ? `${p.district || ''}, ${p.state}` : 'Corporate HQ'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#0284c7', fontSize: '15px' }}>
                            {p.totalCardsGivenToSubFranchises}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                            {p.subFranchiseRecipients?.length || 0}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                            {p.subFranchiseRecipients?.join(', ') || 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
                  {subDistData?.parentSummaries?.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{p.fullName}</div>
                          <div style={{ fontSize: '11px', color: '#0284c7', fontFamily: 'monospace', fontWeight: 600 }}>
                            {p.franchiseId}
                          </div>
                        </div>
                        <FranchiseTypeBadge type={p.franchiseType} />
                      </div>

                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Territory: {p.state ? `${p.district || ''}, ${p.state}` : 'Corporate HQ'}
                      </div>

                      <div
                        style={{
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: 600 }}>Cards to Sub-Franchises:</span>
                        <strong style={{ fontSize: '15px', color: '#0284c7', fontWeight: 800 }}>
                          {p.totalCardsGivenToSubFranchises} Cards
                        </strong>
                      </div>

                      {p.subFranchiseRecipients && p.subFranchiseRecipients.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>Recipients ({p.subFranchiseRecipients.length}): </span>
                          {p.subFranchiseRecipients.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Section 2: Detailed Transaction Ledger */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
              Sub-Franchise Card Transfer Transaction Ledger
            </div>
            {subDistData?.records?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No transaction records found.</div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="desktop-table-only" style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>
                        <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                        <th style={{ padding: '12px 16px' }}>Date</th>
                        <th style={{ padding: '12px 16px' }}>Distributing Partner (From)</th>
                        <th style={{ padding: '12px 16px' }}>Sub-Franchise (To)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Cards Count</th>
                        <th style={{ padding: '12px 16px' }}>Unit Price / Total</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subDistData?.records?.map((tx) => (
                        <tr key={tx._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7', fontFamily: 'monospace' }}>
                            {tx.transactionId}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{tx.sellerPartnerId?.fullName || 'Super Admin'}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{tx.sellerPartnerId?.franchiseId}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{tx.buyerPartnerId?.fullName}</div>
                            <div style={{ fontSize: '11px', color: '#0284c7' }}>{tx.buyerPartnerId?.franchiseId} (Sub-Franchise)</div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#0284c7' }}>
                            {tx.quantity} Cards
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div>₹{(tx.pricePerCard || tx.sellingPricePerCard || 0).toLocaleString('en-IN')} / card</div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a' }}>
                              Total: ₹{(tx.totalAmount || 0).toLocaleString('en-IN')}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <StatusBadge status={tx.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="mobile-cards-only" style={{ flexDirection: 'column', gap: '10px', padding: '12px' }}>
                  {subDistData?.records?.map((tx) => (
                    <div
                      key={tx._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                          {tx.transactionId}
                        </span>
                        <StatusBadge status={tx.status} />
                      </div>

                      {/* Route From -> To */}
                      <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>From: </span>
                          <strong style={{ color: '#0f172a' }}>{tx.sellerPartnerId?.fullName || 'Super Admin'}</strong>{' '}
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>({tx.sellerPartnerId?.franchiseId || 'Admin HQ'})</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>To: </span>
                          <strong style={{ color: '#0f172a' }}>{tx.buyerPartnerId?.fullName}</strong>{' '}
                          <span style={{ color: '#0284c7', fontSize: '10.5px' }}>({tx.buyerPartnerId?.franchiseId})</span>
                        </div>
                      </div>

                      {/* Numbers */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
                          {tx.quantity} Cards
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>₹{(tx.pricePerCard || tx.sellingPricePerCard || 0).toLocaleString('en-IN')}/card • </span>
                          <strong style={{ color: '#16a34a', fontSize: '13px' }}>Total: ₹{(tx.totalAmount || 0).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Date: {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
