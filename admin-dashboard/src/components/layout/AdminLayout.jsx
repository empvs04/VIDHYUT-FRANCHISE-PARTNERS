import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="main-content">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
