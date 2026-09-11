import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Building,
  MapPin,
  UserPlus,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import { StatusBadge, FranchiseTypeBadge } from '../components/common/Badge';
import { useNotification } from '../context/NotificationContext';

const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentPartners, setRecentPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useNotification();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/admin-metrics');
      if (res.data?.data) {
        setMetrics(res.data.data.overview);
        setRecentPartners(res.data.data.recentPartners || []);
      }
    } catch {
      showToast('Failed to load dashboard metrics from MongoDB Atlas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      {/* Page Title & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Franchise Overview
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Real-time statistics of Vidhyut Saathi Franchise Network
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchDashboardData}
            className="btn btn-outline"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/partners/new" className="btn btn-primary">
            <UserPlus size={16} />
            <span>Add Franchise Partner</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="stat-grid">
        <StatCard
          title="Total Franchise Partners"
          value={metrics?.totalPartners}
          icon={Users}
          bgLight="#e0f2fe"
          iconColor="#0284c7"
        />
        <StatCard
          title="Active Partners"
          value={metrics?.activePartners}
          icon={UserCheck}
          bgLight="#dcfce7"
          iconColor="#16a34a"
        />
        <StatCard
          title="Inactive Partners"
          value={metrics?.inactivePartners}
          icon={UserX}
          bgLight="#fee2e2"
          iconColor="#dc2626"
        />
        <StatCard
          title="State Franchises"
          value={metrics?.stateFranchises}
          icon={Building}
          bgLight="#fef3c7"
          iconColor="#d97706"
        />
        <StatCard
          title="District Franchises"
          value={metrics?.districtFranchises}
          icon={MapPin}
          bgLight="#e0e7ff"
          iconColor="#4f46e5"
        />
      </div>

      {/* Recent Registrations Card */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Recently Registered Franchise Partners
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Latest partners onboarded onto the network
            </p>
          </div>
          <Link
            to="/partners"
            className="btn btn-outline btn-sm"
            style={{ fontSize: '12px' }}
          >
            <span>View All Partners</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Franchise ID</th>
                <th>Full Name</th>
                <th>Franchise Type</th>
                <th>State & District</th>
                <th>Mobile Number</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentPartners.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Fetching partner records from Atlas...' : 'No franchise partners registered yet. Click "+ Add Franchise Partner" to create your first partner.'}
                  </td>
                </tr>
              ) : (
                recentPartners.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                      {p.franchiseId}
                    </td>
                    <td style={{ fontWeight: '600' }}>{p.fullName}</td>
                    <td>
                      <FranchiseTypeBadge type={p.franchiseType} />
                    </td>
                    <td>
                      {p.district}, {p.state}
                    </td>
                    <td>{p.mobileNumber}</td>
                    <td>
                      <StatusBadge status={p.accountStatus} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/partners/${p._id}`}
                        className="btn btn-outline btn-sm"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
