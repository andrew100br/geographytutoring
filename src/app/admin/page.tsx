"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const MOCK_ADMIN_USER = 'admin';
const LESSON_PRICE = 25;

export default function AdminPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard Data
  const [profiles, setProfiles] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [globalSchedule, setGlobalSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const totalStudents = profiles.length;
  const totalCredits = profiles.reduce((sum, p) => sum + (p.credits || 0), 0);

  // Modals
  const [activeModal, setActiveModal] = useState<'details' | 'reschedule' | 'add' | 'edit' | null>(null);

  // Details Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Add Client Modal State
  const [addForm, setAddForm] = useState({ parentName: '', childName: '', email: '', country: '', password: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Client Modal State
  const [editForm, setEditForm] = useState({ userId: '', parentName: '', childName: '', country: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Reschedule Modal State
  const [rescheduleData, setRescheduleData] = useState<any>({ bookingId: '', datetime: '', refund: false });
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_logged_in') === 'true' && sessionStorage.getItem('admin_pass')) {
      const pass = sessionStorage.getItem('admin_pass') || '';
      setAdminPass(pass);
      setIsAdminLoggedIn(true);
      loadDashboardData(pass);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser.trim().toLowerCase() === MOCK_ADMIN_USER && adminPass) {
      sessionStorage.setItem('admin_logged_in', 'true');
      sessionStorage.setItem('admin_pass', adminPass);
      setIsAdminLoggedIn(true);
      loadDashboardData(adminPass);
    } else {
      setLoginError('Incorrect admin credentials.');
      setAdminPass('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_logged_in');
    sessionStorage.removeItem('admin_pass');
    setIsAdminLoggedIn(false);
    setAdminPass('');
  };

  const loadDashboardData = async (password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_dashboard_data', password })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProfiles(data.profiles || []);

      // Revenue & Upcoming calc
      let actualRevenue = 0;
      const now = new Date();
      const { data: allBookings } = await supabase.from('bookings').select('booking_date, status, user_id, is_monthly');
      if (allBookings) {
        let scheduleList = [...allBookings];
        scheduleList.forEach(b => {
          const bDate = new Date(b.booking_date);
          if (bDate < now && b.status !== 'cancelled' && b.status !== 'amended') {
            actualRevenue += LESSON_PRICE;
          }
        });
        scheduleList.sort((a,b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
        setGlobalSchedule(scheduleList);
      }
      setRevenue(actualRevenue);
    } catch (err: any) {
      console.error(err);
      alert('Failed to load data: ' + err.message);
    }
    setLoading(false);
  };

  const openDetails = async (user: any) => {
    setSelectedUser(user);
    setActiveModal('details');
    setDetailsLoading(true);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false });
    setUserBookings(bookings || []);
    setDetailsLoading(false);
  };

  const deleteClient = async (userId: string, name: string) => {
    if (!confirm(`Are you EXTREMELY sure you want to completely delete ${name}'s account? This action cannot be undone.`)) return;
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'delete_user', password: adminPass, payload: { userId } })
      });
      if (!res.ok) throw new Error();
      alert(`Deleted ${name}'s account.`);
      loadDashboardData(adminPass);
    } catch { alert('Failed to delete client account.'); }
  };

  const cancelBooking = async (bookingId: string, userId: string, name: string, refund: boolean) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'cancel_booking', password: adminPass, payload: { bookingId, userId, refund } })
      });
      if (!res.ok) throw new Error();
      alert(refund ? 'Booking cancelled and 1 credit refunded.' : 'Booking cancelled (no credit refunded).');
      setActiveModal(null);
      loadDashboardData(adminPass);
    } catch { alert('Failed to cancel booking.'); }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRescheduling(true);
    try {
      const newIsoString = new Date(rescheduleData.datetime).toISOString();
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({
          action: 'reschedule_booking', password: adminPass,
          payload: { bookingId: rescheduleData.bookingId, newIsoString, refund: rescheduleData.refund, userId: selectedUser.id }
        })
      });
      if (!res.ok) throw new Error();
      alert('Booking successfully amended!');
      setActiveModal(null);
      loadDashboardData(adminPass);
    } catch { alert('Failed to reschedule booking.'); }
    setIsRescheduling(false);
  };

  const openReschedule = (b: any) => {
    const d = new Date(b.booking_date);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const formattedLocal = !isNaN(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
    setRescheduleData({ bookingId: b.id, datetime: formattedLocal, refund: false });
    setActiveModal('reschedule');
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError('');
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'add_user', password: adminPass, payload: addForm })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create account.');
      }
      alert('Account created successfully!');
      setAddForm({ parentName: '', childName: '', email: '', country: '', password: '' });
      setActiveModal(null);
      loadDashboardData(adminPass);
    } catch (err: any) { setAddError(err.message); }
    setIsAdding(false);
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    setEditError('');
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'edit_user', password: adminPass, payload: editForm })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update account.');
      }
      alert('Account updated successfully!');
      setActiveModal(null);
      loadDashboardData(adminPass);
    } catch (err: any) { setEditError(err.message); }
    setIsEditing(false);
  };

  if (!isAdminLoggedIn) {
    return (
      <main className="booking-main bg-light" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="auth-box" style={{ maxWidth: '400px', margin: '4rem auto', position: 'relative', zIndex: 100 }}>
          <div className="auth-header">
            <h2><i className="ph ph-shield-check"></i> Admin Portal</h2>
            <p>Please log in to manage students and bookings.</p>
          </div>
          <form onSubmit={handleLogin} className="booking-form" style={{ padding: 0, boxShadow: 'none' }}>
            <div className="form-group">
              <label>Username</label><input type="text" value={adminUser} onChange={e => setAdminUser(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label><input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} required />
            </div>
            {loginError && <p style={{ color: '#dc2626', marginBottom: '1rem', textAlign: 'center' }}>{loginError}</p>}
            <button type="submit" className="btn btn-primary btn-full">Secure Log In</button>
          </form>
        </div>
      </main>
    );
  }

  const now = new Date();
  const futureBookings = userBookings.filter(b => b.status === 'confirmed' && new Date(b.booking_date) >= now);
  const hasMonthly = futureBookings.some(b => b.is_monthly);
  const membershipStatus = hasMonthly ? <span style={{ color: '#16a34a' }}><i className="ph ph-star"></i> Monthly Subscriber</span> : (futureBookings.length > 0 || (selectedUser?.credits || 0) > 0) ? <span>Pay As You Go</span> : <span style={{ color: '#ea580c' }}>Trial / Lead</span>;

  return (
    <main className="booking-main bg-light" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <i className="ph ph-shield-check" style={{ color: 'var(--primary-color)' }}></i> Admin Dashboard
            </h1>
            <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>Manage students, schedules, and view revenue metrics.</p>
          </div>
          <button className="btn btn-outline" onClick={handleLogout}>Log Out</button>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <h3 style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}><i className="ph ph-users"></i> Total Students</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--text-color)' }}>{loading ? '...' : totalStudents}</p>
          </div>
          <div className="stat-card" style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <h3 style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}><i className="ph ph-coins"></i> Total Credits Owed</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--primary-color)' }}>{loading ? '...' : totalCredits}</p>
          </div>
          <div className="stat-card" style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <h3 style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}><i className="ph ph-currency-gbp"></i> Current Revenue</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0', color: '#16a34a' }}>{loading ? '...' : `£${revenue}`}</p>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>(Calculated from completed lessons)</p>
          </div>
        </div>

        {/* GLOBAL UPCOMING SCHEDULE */}
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Global Schedule</h2>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#e0e7ff', borderRadius: '50%' }}></span> Confirmed</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#dcfce7', borderRadius: '50%' }}></span> Completed</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#fee2e2', borderRadius: '50%' }}></span> Cancelled</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#ffedd5', borderRadius: '50%' }}></span> Rescheduled</span>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 400, overflowY: 'auto' }}>
            {loading ? <li style={{ color: '#64748b' }}>Loading schedule...</li> :
              globalSchedule.length === 0 ? <li style={{ color: '#64748b' }}>No lessons scheduled.</li> :
              globalSchedule.map((b, i) => {
                const user = profiles.find(p => p.id === b.user_id) || { child_name: 'Unknown', parent_name: 'Unknown' };
                const isFutureConfirmed = new Date(b.booking_date) >= now && b.status === 'confirmed';
                let badge = '';
                if (isFutureConfirmed) {
                  badge = b.is_monthly ? `<span style="background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Active Monthly</span>` : `<span style="background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Confirmed</span>`;
                } else if (b.status === 'cancelled') {
                  badge = `<span style="background: #fee2e2; color: #dc2626; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Cancelled</span>`;
                } else if (b.status === 'amended') {
                  badge = `<span style="background: #ffedd5; color: #ea580c; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Rescheduled</span>`;
                } else {
                  badge = `<span style="background: #dcfce7; color: #16a34a; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Completed</span>`;
                }

                return (
                  <li key={i} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', opacity: isFutureConfirmed ? 1 : 0.7 }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>{new Intl.DateTimeFormat('en-US', {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}).format(new Date(b.booking_date))}</strong><br/>
                      <span style={{ fontSize: '0.85rem', color: '#475569' }}>Student: {user.child_name} (Parent: {user.parent_name})</span>
                    </div>
                    <div><span dangerouslySetInnerHTML={{__html: badge}}></span></div>
                  </li>
                );
              })
            }
          </ul>
        </div>

        {/* CLIENTS DB */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, border: '1px solid var(--border-color)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Client Database</h2>
            <button className="btn btn-primary" onClick={() => setActiveModal('add')}><i className="ph ph-user-plus"></i> Add New Client</button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Child Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Parent Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Email</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Country</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Credits Balance</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center' }}>Loading clients...</td></tr> :
                profiles.length === 0 ? <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No student accounts.</td></tr> :
                profiles.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}><strong>{p.child_name || 'N/A'}</strong></td>
                    <td style={{ padding: '1rem' }}>{p.parent_name || 'N/A'}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{p.email}</td>
                    <td style={{ padding: '1rem' }}>{p.country || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.3rem 0.6rem', background: p.credits > 0 ? '#dcfce7' : '#fee2e2', color: p.credits > 0 ? '#16a34a' : '#991b1b', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600 }}>{p.credits || 0} Lessons</span>
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openDetails(p)}><i className="ph ph-list-dashes"></i> Details</button>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: '#0284c7', borderColor: '#bae6fd' }} onClick={() => {
                          setEditForm({ userId: p.id, parentName: p.parent_name || '', childName: p.child_name || '', country: p.country || '' });
                          setActiveModal('edit');
                          setEditError('');
                      }}><i className="ph ph-pencil-simple"></i> Edit</button>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteClient(p.id, p.child_name || p.parent_name)}><i className="ph ph-trash"></i> Delete</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* MODALS */}
        {activeModal === 'details' && selectedUser && (
          <div className="booking-modal" style={{ display: 'flex' }}>
            <div className="modal-content" style={{ maxWidth: 600 }}>
              <h3 style={{ marginBottom: '1rem' }}><i className="ph ph-user-circle"></i> Details for {selectedUser.child_name || selectedUser.parent_name}</h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Membership Status</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{detailsLoading ? 'Calculating...' : membershipStatus}</p>
                </div>
                <div style={{ flex: 1, padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Credit Balance</p>
                  <p style={{ margin: 0, fontWeight: 600 }}>{selectedUser.credits || 0} Lesson(s)</p>
                </div>
              </div>

              <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Full Booking History</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                {detailsLoading ? <li style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Loading bookings...</li> :
                  userBookings.length === 0 ? <li style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>No bookings found.</li> :
                  userBookings.map((b, i) => {
                    const isFutureConfirmed = b.status === 'confirmed' && new Date(b.booking_date) >= now;
                    let badge = '';
                    if (isFutureConfirmed) {
                      badge = b.is_monthly ? `<span style="background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Active Monthly</span>` : `<span style="background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Confirmed</span>`;
                    } else if (b.status === 'cancelled') {
                      badge = `<span style="background: #fee2e2; color: #dc2626; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Cancelled</span>`;
                    } else if (b.status === 'amended') {
                      badge = `<span style="background: #ffedd5; color: #ea580c; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Rescheduled</span>`;
                    } else {
                      badge = `<span style="background: #dcfce7; color: #16a34a; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Completed</span>`;
                    }

                    return (
                      <li key={i} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><span style={{ color: !isFutureConfirmed ? '#94a3b8' : 'inherit' }}>{new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(b.booking_date))}</span> &nbsp; <span dangerouslySetInnerHTML={{__html: badge}}></span></div>
                        {isFutureConfirmed && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openReschedule(b)}><i className="ph ph-calendar-blank"></i> Amend</button>
                            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => {
                              const refund = confirm("Would you like to refund 1 credit back to the student for this cancellation?");
                              cancelBooking(b.id, selectedUser.id, selectedUser.child_name || selectedUser.parent_name, refund);
                            }}><i className="ph ph-trash"></i> Cancel</button>
                          </div>
                        )}
                      </li>
                    );
                  })
                }
              </ul>
              <button className="btn btn-secondary btn-full" onClick={() => setActiveModal(null)}>Close Data Panel</button>
            </div>
          </div>
        )}

        {activeModal === 'reschedule' && (
          <div className="booking-modal" style={{ display: 'flex', zIndex: 10000 }}>
            <div className="modal-content" style={{ maxWidth: 400 }}>
              <h3>Reschedule Booking</h3>
              <p>Amending lesson for: {selectedUser?.child_name || selectedUser?.parent_name}<br/>Credits: {selectedUser?.credits}</p>
              <form onSubmit={handleReschedule}>
                <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                  <label>New Date & Time (Thai Time)</label>
                  <input type="datetime-local" value={rescheduleData.datetime} onChange={e => setRescheduleData({...rescheduleData, datetime: e.target.value})} required style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                  <label className="checkbox-container" style={{ fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={rescheduleData.refund} onChange={e => setRescheduleData({...rescheduleData, refund: e.target.checked})} />
                    <span className="checkmark"></span>
                    <strong>Refund 1 credit?</strong> (Optional)
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('details')} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isRescheduling} style={{ flex: 1 }}>{isRescheduling ? '...' : 'Save Re-booking'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeModal === 'add' && (
          <div className="booking-modal" style={{ display: 'flex' }}>
            <div className="modal-content" style={{ maxWidth: 500 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}><i className="ph ph-user-plus"></i> Manual Client Addition</h3>
                <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setActiveModal(null)}>&times;</button>
              </div>
              <p style={{ marginBottom: '1.5rem', color: '#64748b' }}>Create an invoice account and initial credentials for a new client.</p>
              <form onSubmit={handleAddClient} style={{ textAlign: 'left' }}>
                <div className="form-group"><label>Parent's Name</label><input type="text" required value={addForm.parentName} onChange={e=>setAddForm({...addForm, parentName: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} /></div>
                <div className="form-group"><label>Child's Name</label><input type="text" required value={addForm.childName} onChange={e=>setAddForm({...addForm, childName: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} /></div>
                <div className="form-group"><label>Email Address</label><input type="email" required value={addForm.email} onChange={e=>setAddForm({...addForm, email: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} /></div>
                <div className="form-group"><label>Temporary Password</label><input type="password" required value={addForm.password} onChange={e=>setAddForm({...addForm, password: e.target.value})} placeholder="Must be 6+ characters" style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} /></div>
                <div className="form-group"><label>Country</label><input type="text" value={addForm.country} onChange={e=>setAddForm({...addForm, country: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} /></div>
                {addError && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{addError}</p>}
                <button type="submit" className="btn btn-primary btn-full" disabled={isAdding}>{isAdding ? 'Creating...' : 'Create Account'}</button>
              </form>
            </div>
          </div>
        )}

        {activeModal === 'edit' && (
          <div className="booking-modal" style={{ display: 'flex' }}>
            <div className="modal-content" style={{ maxWidth: 400 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 1rem 0' }}>
                <h3 style={{ margin: 0 }}><i className="ph ph-pencil-simple"></i> Edit Student Info</h3>
                <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setActiveModal(null)}>&times;</button>
              </div>
              <form onSubmit={handleEditClient} style={{ textAlign: 'left' }}>
                <div className="form-group"><label>Parent's Name</label><input type="text" required value={editForm.parentName} onChange={e=>setEditForm({...editForm, parentName: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} /></div>
                <div className="form-group"><label>Child's Name</label><input type="text" required value={editForm.childName} onChange={e=>setEditForm({...editForm, childName: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} /></div>
                <div className="form-group"><label>Country</label><input type="text" value={editForm.country} onChange={e=>setEditForm({...editForm, country: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} /></div>
                {editError && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{editError}</p>}
                <button type="submit" className="btn btn-primary btn-full" disabled={isEditing}>{isEditing ? 'Saving...' : 'Save Changes'}</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
