import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <aside style={{ width: '250px', background: '#121212', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', borderRight: '1px solid #292929' }}>
        <h2 className="text-display" style={{ fontSize: '20px', color: '#fff' }}>CINEMA ADMIN</h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
          <Link to="/admin" style={{ color: '#d6d6d6' }}>DASHBOARD</Link>
          <Link to="/admin/movies" style={{ color: '#d6d6d6' }}>MOVIES</Link>
          <Link to="/admin/shows" style={{ color: '#d6d6d6' }}>SHOWS</Link>
          <Link to="/admin/theatres" style={{ color: '#d6d6d6' }}>THEATRES</Link>
          <Link to="/admin/bookings" style={{ color: '#d6d6d6' }}>BOOKINGS</Link>
          <Link to="/admin/staff" style={{ color: '#d6d6d6' }}>STAFF</Link>
          <Link to="/admin/scan-logs" style={{ color: '#d6d6d6' }}>SCAN LOGS</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '32px' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
