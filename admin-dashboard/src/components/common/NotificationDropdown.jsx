import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  Send,
  Zap,
  CreditCard,
  Building2,
  X,
} from 'lucide-react';
import api from '../../services/api';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications', { params: { limit: 15 } });
      if (res.data?.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Polling every 15s for instant alerts
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single as read
  const handleMarkAsRead = async (notif, e) => {
    e?.stopPropagation();
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif.notificationId}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.notificationId === notif.notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }

    // Optional Quick Navigation based on entityType & type
    if (notif.type === 'TERRITORY_MISMATCH' || notif.entityType === 'LOCATION_VERIFICATION') {
      navigate('/location-verifications');
      setIsOpen(false);
    } else if (notif.entityType === 'TRANSACTION') {
      navigate('/transactions');
      setIsOpen(false);
    } else if (notif.entityType === 'INSTALLATION') {
      navigate('/installations');
      setIsOpen(false);
    } else if (notif.entityType === 'PARTNER') {
      navigate('/partners');
      setIsOpen(false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const getNotificationIcon = (type) => {
    if (type?.includes('CARD')) return <CreditCard size={16} color="#0284c7" />;
    if (type?.includes('INSTALLATION')) return <Zap size={16} color="#16a34a" />;
    if (type?.includes('MISMATCH') || type?.includes('DISPUTED')) return <AlertTriangle size={17} color="#dc2626" />;
    if (type?.includes('PARTNER')) return <Building2 size={16} color="#7e22ce" />;
    return <Info size={16} color="#0284c7" />;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: 'relative',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
              animation: 'pulseGlow 2s infinite',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            width: '370px',
            maxWidth: '92vw',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#0284c7',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const isMismatch = notif.type === 'TERRITORY_MISMATCH';

                return (
                  <div
                    key={notif._id}
                    onClick={(e) => handleMarkAsRead(notif, e)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      borderLeft: isMismatch ? '4px solid #dc2626' : 'none',
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                      background: notif.isRead
                        ? '#ffffff'
                        : isMismatch
                        ? '#fff5f5'
                        : '#f0f9ff',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>{getNotificationIcon(notif.type)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '13px', fontWeight: notif.isRead ? 600 : 700, color: isMismatch ? '#991b1b' : '#0f172a' }}>
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isMismatch ? '#dc2626' : '#0284c7',
                              marginTop: '4px',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: isMismatch ? '#7f1d1d' : '#475569', marginTop: '2px', lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No notifications right now.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
