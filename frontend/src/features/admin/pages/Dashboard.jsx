import React from 'react';

const Dashboard = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 className="text-display" style={{ fontSize: '32px' }}>Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {['Revenue', 'Occupancy', 'Active Shows', 'Today Bookings'].map(t => (
          <div key={t} style={{ padding: '24px', background: '#181818', border: '1px solid #292929', borderRadius: '8px' }}>
            <div className="text-technical text-muted">{t}</div>
            <div className="text-display" style={{ fontSize: '24px', marginTop: '8px' }}>--</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
