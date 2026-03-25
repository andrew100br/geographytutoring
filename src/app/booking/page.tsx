"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ContactForm from '@/components/ContactForm';

function generateThaiTimeSlots(baseDateStr: Date) {
  const schedule: Record<number, string[]> = {
    1: ['17:00'], 2: ['17:00'], 3: ['17:00'], 
    4: ['17:00', '18:00'], 5: ['17:00'], 6: [], 
    0: ['16:00', '17:00', '18:00']
  };
  const targetDate = new Date(baseDateStr);
  const dayOfWeek = targetDate.getDay();
  const slots: { raw: Date, display: string }[] = [];

  if (schedule[dayOfWeek]?.length > 0) {
    schedule[dayOfWeek].forEach(timeStr => {
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      const isoStr = `${yyyy}-${mm}-${dd}T${timeStr}:00+07:00`;
      const localDateObj = new Date(isoStr);
      const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
      slots.push({ raw: localDateObj, display: timeFormatter.format(localDateObj) });
    });
  }
  return slots;
}

export default function BookingPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth State
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [country, setCountry] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dashboard State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [allBookedSlots, setAllBookedSlots] = useState<string[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [purchaseQty, setPurchaseQty] = useState(1);
  const PRICE_PER_LESSON = 25;
  const [showHistory, setShowHistory] = useState(false);

  // Booking Modal State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookMonthly, setBookMonthly] = useState(false);
  const [bookTenLessons, setBookTenLessons] = useState(false);
  const [currency, setCurrency] = useState('gbp');

  useEffect(() => {
    checkSession();
    fetchAllBookedSlots();
    
    // Poll every 5 seconds for complete real-time schedule synchronization
    const interval = setInterval(async () => {
      await fetchAllBookedSlots();
      
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
          // 1. Sync User Bookings (Reschedules, Cancellations)
          const { data: latestBookings } = await supabase.from('bookings').select('*').eq('user_id', currentSession.user.id).order('booking_date', { ascending: true });
          if (latestBookings) {
              const now = new Date();
              const newUpcoming: any[] = [];
              const newPast: any[] = [];
              latestBookings.forEach(b => {
                 const bDate = new Date(b.booking_date);
                 const bObj = { date: bDate, isMonthly: b.is_monthly, isTenLessons: b.is_ten_lessons, id: b.id, status: b.status || 'confirmed' };
                 if ((bObj.status === 'confirmed' || bObj.status === 'rescheduled') && bDate >= now) newUpcoming.push(bObj);
                 else newPast.push(bObj);
              });
              
              setUpcomingBookings(prev => {
                  const prevStr = JSON.stringify(prev.map(p => p.id + p.status));
                  const newStr = JSON.stringify(newUpcoming.map(p => p.id + p.status));
                  return prevStr !== newStr ? newUpcoming : prev;
              });
              
              setPastBookings(prev => {
                  const prevStr = JSON.stringify(prev.map(p => p.id + p.status));
                  const newStr = JSON.stringify(newPast.map(p => p.id + p.status));
                  return prevStr !== newStr ? newPast : prev;
              });
          }

          // 2. Sync Profile Credits (Refunds, Purchases)
          const { data: profile } = await supabase.from('profiles').select('credits').eq('id', currentSession.user.id).single();
          if (profile) {
              setUserProfile((prev: any) => {
                  if (!prev || prev.credits !== profile.credits) return { ...prev, credits: profile.credits };
                  return prev;
              });
          }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllBookedSlots = async () => {
    try {
      const res = await fetch('/.netlify/functions/public-action', {
        method: 'POST',
        body: JSON.stringify({ action: 'get_booked_slots' })
      });
      const data = await res.json();
      if (data.bookedSlots) {
        const normalized = data.bookedSlots.map((d: string) => new Date(d).toISOString());
        setAllBookedSlots(prev => {
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(normalized);
          return prevStr !== newStr ? normalized : prev;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setSession(session);
      await loadProfileData(session.user.id, session.user.email || '');
      // Stripe Verification
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        if (sessionId) {
          const consumedKey = `stripe_consumed_${sessionId}`;
          if (!localStorage.getItem(consumedKey)) {
            fetch('/.netlify/functions/public-action', {
              method: 'POST',
              body: JSON.stringify({ action: 'verify_checkout', payload: { sessionId } })
            }).then(res => res.json()).then(async data => {
              if (data.status === 'paid' || data.status === 'complete') {
                const creditsAdded = parseInt(data.creditsToAdd || '0', 10);
                if (creditsAdded > 0) {
                  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', session.user.id).single();
                  const newCredits = (profile?.credits || 0) + creditsAdded;
                  await supabase.from('profiles').update({ credits: newCredits }).eq('id', session.user.id);
                  localStorage.setItem(consumedKey, 'true');
                  alert(`Success! ${creditsAdded} credits have been added.`);
                  loadProfileData(session.user.id, session.user.email || '');
                }
              }
            });
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
    setLoading(false);
  };

  const loadProfileData = async (userId: string, userEmail: string) => {
    let { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile) {
      const pDataStr = typeof window !== 'undefined' ? localStorage.getItem('pending_signup_profile') : null;
      let pData = { parent_name: 'Parent', child_name: '', country: '' };
      if (pDataStr) { try { pData = JSON.parse(pDataStr); } catch (e) {} }
      const { data: newProfile, error } = await supabase.from('profiles').insert([{
        id: userId, email: userEmail, ...pData, credits: 0
      }]).select().single();
      if (!error) {
        if (typeof window !== 'undefined') localStorage.removeItem('pending_signup_profile');
        profile = newProfile;
      }
    }
    setUserProfile(profile);

    const { data: bookings } = await supabase.from('bookings').select('*').eq('user_id', userId).order('booking_date', { ascending: true });
    if (bookings) {
      const now = new Date();
      const upcoming: any[] = [];
      const past: any[] = [];
      bookings.forEach(b => {
        const bDate = new Date(b.booking_date);
        const bObj = { date: bDate, isMonthly: b.is_monthly, isTenLessons: b.is_ten_lessons, id: b.id, status: b.status || 'confirmed' };
        if ((bObj.status === 'confirmed' || bObj.status === 'rescheduled') && bDate >= now) upcoming.push(bObj);
        else past.push(bObj);
      });
      setUpcomingBookings(upcoming);
      setPastBookings(past);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setAuthStatus('');

    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthStatus(error.message);
      else await checkSession();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/booking' } });
      if (error) setAuthStatus(error.message);
      else if (data.session) {
        await supabase.from('profiles').insert([{ id: data.user!.id, email, parent_name: parentName, child_name: childName, country, credits: 0 }]);
        await checkSession();
      } else {
        if (typeof window !== 'undefined') localStorage.setItem('pending_signup_profile', JSON.stringify({ parent_name: parentName, child_name: childName, country }));
        setAuthStatus("Success! Please check your email to confirm.");
      }
    }
    setIsProcessing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
  };

  const handleTopUp = async (qty: number) => {
    if (!session) return;
    try {
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qty, userId: session.user.id, userEmail: session.user.email,
          currency: currency,
          successUrl: window.location.origin + '/booking?payment=success',
          cancelUrl: window.location.origin + '/booking?payment=cancel'
        })
      });
      const rawText = await response.text();
      try {
        const data = JSON.parse(rawText);
        if (data.url) window.location.href = data.url;
        else throw new Error(data.error || 'Unknown Stripe Error');
      } catch (err: any) {
        throw new Error(`Payment API failed to respond properly. Netlify Trace: ` + rawText);
      }
    } catch (e: any) { 
        alert('Checkout Error: ' + e.message); 
    }
  };

  const confirmBooking = async () => {
    if (!session || !userProfile || !selectedDate) return;
    let requiredCredits = 1;
    let numLessons = 1;
    if (bookMonthly) { requiredCredits = 4; numLessons = 4; }
    else if (bookTenLessons) { requiredCredits = 10; numLessons = 10; }

    if (userProfile.credits < requiredCredits) {
      alert(`You need ${requiredCredits} credits. You have ${userProfile.credits}.`);
      return;
    }

    const bookingInserts = Array.from({ length: numLessons }).map((_, i) => {
      const nextDate = new Date(selectedDate);
      nextDate.setDate(selectedDate.getDate() + (i * 7));
      return { user_id: session.user.id, booking_date: nextDate.toISOString(), is_monthly: bookMonthly, is_ten_lessons: bookTenLessons, status: 'confirmed' };
    });

    const datesToCheck = bookingInserts.map(b => b.booking_date);
    const { data: existingSlots } = await supabase.from('bookings').select('id').in('booking_date', datesToCheck).eq('status', 'confirmed');
    if (existingSlots && existingSlots.length > 0) {
      alert('Sorry, one or more of these time slots have just been booked by another student! Please refresh and select a different time.');
      return;
    }

    const { error } = await supabase.from('bookings').insert(bookingInserts);
    if (!error) {
      const newCredits = userProfile.credits - requiredCredits;
      await supabase.from('profiles').update({ credits: newCredits }).eq('id', session.user.id);
      setUserProfile({ ...userProfile, credits: newCredits });

      try {
          const datesStr = bookingInserts.map(b => new Date(b.booking_date).toLocaleString()).join('\\n');
          fetch('https://formsubmit.co/ajax/andrew100br@gmail.com', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({
                  name: "System Notification",
                  email: session.user.email,
                  _subject: `New Booking Alert: ${userProfile.child_name || 'Unknown'} (${userProfile.parent_name || 'Unknown'})`,
                  message: `A new lesson has been booked.\\n\\nStudent: ${userProfile.child_name || 'Unknown'}\\nParent: ${userProfile.parent_name || 'Unknown'}\\nDates:\\n${datesStr}\\n\\nCheck the admin portal for full details.`
              })
          });
      } catch (err) { console.error("Could not send email", err); }

      const newBookings = bookingInserts.map(b => ({ date: new Date(b.booking_date), isMonthly: b.is_monthly, isTenLessons: b.is_ten_lessons, status: 'confirmed' }));
      setUpcomingBookings([...upcomingBookings, ...newBookings]);
      setAllBookedSlots([...allBookedSlots, ...bookingInserts.map(b => b.booking_date)]);
      setSelectedDate(null);
      alert('Booking successful!');
    } else { alert('Failed to save booking.'); }
  };

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign:'center' }}>Loading...</div>;

  if (!session) {
    return (
      <main className="booking-main bg-light">
        <div className="container booking-container">
          <div className="auth-box">
            <div className="auth-header">
              <h2><i className="ph ph-user-circle-plus"></i> Access Booking</h2>
              <p>Log in or create a new account to see availability and book.</p>
            </div>
            <div className="auth-tabs">
              <button type="button" className={`auth-tab ${!isLoginMode ? 'active' : ''}`} onClick={() => setIsLoginMode(false)}>Sign Up</button>
              <button type="button" className={`auth-tab ${isLoginMode ? 'active' : ''}`} onClick={() => setIsLoginMode(true)}>Log In</button>
            </div>
            <form onSubmit={handleAuth} className="booking-form">
              {!isLoginMode && (
                <>
                  <div className="form-group"><label>Parent's Name</label><input type="text" required value={parentName} onChange={e=>setParentName(e.target.value)} /></div>
                  <div className="form-group"><label>Child's Name</label><input type="text" required value={childName} onChange={e=>setChildName(e.target.value)} /></div>
                  <div className="form-group"><label>Country</label><input type="text" required value={country} onChange={e=>setCountry(e.target.value)} /></div>
                </>
              )}
              <div className="form-group"><label>Email Address</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
              <div className="form-group"><label>Password</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></div>
              {authStatus && <p style={{ color: '#dc2626', textAlign: 'center', marginBottom:'1rem' }}>{authStatus}</p>}
              <button type="submit" className="btn btn-primary btn-full" disabled={isProcessing}>{isProcessing ? 'Processing...' : (isLoginMode ? 'Log In' : 'Create Account')}</button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="booking-main bg-light">
      <div className="container booking-container">
        <div className="calendar-box">
          <div className="calendar-header">
            <h2><i className="ph ph-calendar-check"></i> Dashboard & Booking</h2>
            <p>Welcome back, {userProfile?.parent_name || 'Parent'}! Select a time below to book a new lesson.</p>
          </div>

          <div className="user-dashboard">
            <div className="dashboard-stats">
              <div className="stat-card">
                <h3><i className="ph ph-coins"></i> Credit Balance</h3>
                <p className="stat-large">{userProfile?.credits || 0}</p>
                <p className="stat-label">Lessons Remaining</p>
              </div>
              <div className="stat-card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
                <h3><i className="ph ph-calendar-blank"></i> Active Bookings</h3>
                <p className="stat-large">{upcomingBookings.length}</p>
                <p className="stat-label">Lessons Secured</p>
              </div>
            </div>

            <div className="bookings-list-container">
              <h3>Upcoming Lessons</h3>
              <ul className="bookings-list">
                {upcomingBookings.length === 0 ? <li className="empty-bookings">No upcoming bookings. Select a time below to schedule!</li> :
                  upcomingBookings.sort((a,b)=>a.date.getTime()-b.date.getTime()).map((b, i) => (
                    <li key={i}>
                      <span className="booking-item-date">{new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(b.date)}</span>
                      <span className="booking-item-type" style={{background: b.status === 'rescheduled' ? '#ffedd5' : '#dcfce7', color: b.status === 'rescheduled' ? '#ea580c' : '#16a34a'}}><i className={`ph ph-${b.status === 'rescheduled' ? 'arrows-clockwise' : 'check-circle'}`}></i> {b.status === 'rescheduled' ? 'Rescheduled' : 'Confirmed'} {b.isMonthly ? '(Monthly)' : ''}</span>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="bookings-list-container" style={{marginTop:'1.5rem', borderTop:'1px solid var(--border-color)', paddingTop:'1rem'}}>
              <h3 style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',color:'#64748b',fontSize:'1rem'}} onClick={() => setShowHistory(!showHistory)}>
                <span><i className="ph ph-clock-counter-clockwise"></i> Booking History</span>
                <i className={`ph ph-caret-${showHistory ? 'up' : 'down'}`}></i>
              </h3>
              {showHistory && (
                <ul className="bookings-list" style={{marginTop:'1rem', opacity:0.8}}>
                  {pastBookings.length === 0 ? <li className="empty-bookings">No past history found.</li> :
                    pastBookings.sort((a,b)=>b.date.getTime()-a.date.getTime()).map((b,i) => {
                      let badgeStyle: React.CSSProperties = { backgroundColor: '#f1f5f9', color: '#475569' };
                      let label = "Completed";
                      if (b.status==='cancelled') { badgeStyle={ backgroundColor: '#fee2e2', color: '#dc2626' }; label="Cancelled"; }
                      else if (b.status==='amended') { badgeStyle={ backgroundColor: '#ffedd5', color: '#ea580c' }; label="Rescheduled"; }
                      return (
                        <li key={i}>
                          <span className="booking-item-date" style={{color:'#64748b'}}>{new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(b.date)}</span>
                          <span className="booking-item-type" style={badgeStyle}>{label}</span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>

          <div className="user-dashboard" style={{marginTop:'-1rem', marginBottom:'2rem'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}><i className="ph ph-shopping-bag"></i> Buy Lesson Credits</h3>
              <select className="input-field" value={currency} onChange={e => setCurrency(e.target.value)} style={{ padding: '0.4rem', borderRadius: 4, border: '1px solid #cbd5e1', maxWidth: '200px', background: '#fff', fontSize: '0.9rem' }}>
                <option value="gbp">GBP (£) - Brit. Pound</option>
                <option value="usd">USD ($) - US Dollar</option>
                <option value="eur">EUR (€) - Euro</option>
                <option value="aud">AUD ($) - Aust. Dollar</option>
                <option value="cad">CAD ($) - Can. Dollar</option>
                <option value="thb">THB (฿) - Thai Baht</option>
              </select>
            </div>
            <div className="dashboard-stats" style={{marginBottom:0}}>
              <div className="stat-card" style={{display:'flex', flexDirection:'column', textAlign:'left'}}>
                <h4 style={{fontSize:'1.1rem', marginBottom:'0.5rem'}}>Pay As You Go</h4>
                <p className="price" style={{fontSize:'1.5rem', fontWeight:700, color:'var(--primary-color)', marginBottom:'0.5rem'}}>
                  £25 <span style={{fontSize:'0.85rem', fontWeight:400, color:'#64748b'}}>/ lesson</span>
                </p>
                <p className="small-desc" style={{marginBottom:'1.5rem'}}>Need just a few lessons? Buy exact quantities.</p>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', gap:'1rem'}}>
                  <div style={{display:'flex', alignItems:'center', border:'1px solid var(--border-color)', borderRadius:'5px'}}>
                    <button className="btn btn-icon" onClick={() => setPurchaseQty(Math.max(1, purchaseQty-1))} style={{border:'none', borderRadius:0, background:'#f8fafc', padding:'0.5rem 0.8rem', color:'#475569'}}><i className="ph ph-minus"></i></button>
                    <span style={{padding:'0 1rem', fontWeight:600}}>{purchaseQty}</span>
                    <button className="btn btn-icon" onClick={() => setPurchaseQty(purchaseQty+1)} style={{border:'none', borderRadius:0, background:'#f8fafc', padding:'0.5rem 0.8rem', color:'#475569'}}><i className="ph ph-plus"></i></button>
                  </div>
                  <button className="btn btn-outline" onClick={() => handleTopUp(purchaseQty)} style={{flex:1}}>Buy via Stripe in {currency.toUpperCase()}</button>
                </div>
              </div>

              <div className="stat-card highlight" style={{display:'flex', flexDirection:'column', textAlign:'left', position:'relative', borderColor:'var(--accent)'}}>
                <div className="badge" style={{top:'-10px', right:'-10px', background:'#e0f2fe', color:'#0284c7', position:'absolute', padding:'0.2rem 0.8rem', borderRadius:'15px', fontWeight:700, fontSize:'0.85rem'}}>10% Off</div>
                <h4 style={{fontSize:'1.1rem', marginBottom:'0.5rem'}}>10-Lesson Bundle</h4>
                <p className="price" style={{fontSize:'1.5rem', fontWeight:700, color:'var(--primary-color)', marginBottom:'0.5rem'}}>
                  £225 <span style={{fontSize:'0.85rem', fontWeight:400, color:'#64748b'}}>/ package</span>
                </p>
                <p className="small-desc" style={{marginBottom:'1.5rem'}}>Unlock priority scheduling when you maintain a 10-lesson balance.</p>
                <button className="btn btn-primary btn-full" onClick={() => handleTopUp(10)} style={{marginTop:'auto'}}>Secure Bundle</button>
              </div>
            </div>
          </div>

          <div className="calendar-wrapper">
            <div className="calendar-meta">
              <p>Timezone: <strong className="highlight-text">{Intl.DateTimeFormat().resolvedOptions().timeZone.replace('_', ' ')}</strong></p>
            </div>
            <div className="calendar-nav">
              <button className="btn btn-secondary btn-icon" onClick={() => { const d=new Date(currentWeekStart); d.setDate(d.getDate()-7); setCurrentWeekStart(d); }}><i className="ph ph-caret-left"></i></button>
              <h3>Week of {new Intl.DateTimeFormat('en-US', {month:'short',year:'numeric'}).format(currentWeekStart)}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => { const d=new Date(currentWeekStart); d.setDate(d.getDate()+7); setCurrentWeekStart(d); }}><i className="ph ph-caret-right"></i></button>
            </div>

            <div className="days-grid">
              {Array.from({length:7}).map((_, i) => {
                const day = new Date(currentWeekStart);
                day.setDate(day.getDate() + i);
                const slots = generateThaiTimeSlots(day);
                const isToday = new Date().toDateString() === day.toDateString();
                
                const allMyBookings = [...upcomingBookings, ...pastBookings];
                const dayBookings = allMyBookings.filter(b => b.date.toDateString() === day.toDateString());
                dayBookings.forEach(b => {
                   const isoStr = b.date.toISOString();
                   if (!slots.some(s => s.raw.toISOString() === isoStr)) {
                       const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
                       slots.push({ raw: b.date, display: timeFormatter.format(b.date) });
                   }
                });
                slots.sort((a,b) => a.raw.getTime() - b.raw.getTime());
                
                return (
                  <div key={i} className="day-column">
                    <div className={`day-header ${isToday ? 'today' : ''}`}>
                      <span className="day-name">{new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(day)}</span>
                      <span className="day-number">{day.getDate()}</span>
                    </div>
                    <div className="slots-container">
                      {slots.length === 0 ? <p className="empty-slots">-</p> : slots.map((s, idx) => {
                        const isoStr = s.raw.toISOString();
                        const myBooking = upcomingBookings.find(b => b.date.toISOString() === isoStr);
                        const myHistoryBookings = pastBookings.filter(b => b.date.toISOString() === isoStr && (b.status === 'cancelled' || b.status === 'amended'));
                        const isBookedGlobally = allBookedSlots.includes(isoStr);
                        
                        let btnStyle: React.CSSProperties = {};
                        let btnContent: React.ReactNode = s.display;
                        let btnClass = 'slot-btn';
                        let isDisabled = false;

                        if (myBooking) {
                          if (myBooking.status === 'rescheduled') {
                            btnStyle = { backgroundColor: '#f59e0b', color: '#ffffff', cursor: 'not-allowed', border: '1px solid #d97706' };
                            btnContent = <><div style={{fontWeight:600, lineHeight: 1.2}}>Rescheduled</div><div style={{fontSize:'0.85em', opacity:0.9}}>{s.display}</div></>;
                          } else {
                            btnStyle = { backgroundColor: '#22c55e', color: '#ffffff', cursor: 'not-allowed', border: '1px solid #16a34a' };
                            btnContent = <><div style={{fontWeight:600, lineHeight: 1.2}}>Booked</div><div style={{fontSize:'0.85em', opacity:0.9}}>{s.display}</div></>;
                          }
                          btnClass += ' disabled booked-mine';
                          isDisabled = true;
                        } else if (isBookedGlobally) {
                          btnStyle = { backgroundColor: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed', border: '1px solid #cbd5e1' };
                          btnContent = 'Unavailable';
                          btnClass += ' disabled';
                          isDisabled = true;
                        }

                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {myHistoryBookings.map((hb, hbIdx) => (
                              <div key={`h-${hbIdx}`} style={{ fontSize: '0.65rem', padding: '0.2rem', background: hb.status === 'amended' ? '#ffedd5' : '#fee2e2', color: hb.status === 'amended' ? '#ea580c' : '#dc2626', borderRadius: 4, textAlign: 'center', textTransform: 'uppercase', fontWeight: 600 }}>
                                {hb.status}
                              </div>
                            ))}
                            <button className={btnClass} disabled={isDisabled} style={btnStyle} onClick={() => setSelectedDate(s.raw)}>
                              {btnContent}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="booking-modal">
              <div className="modal-content">
                <h3>Confirm Booking</h3>
                <p>Are you sure you want to book a lesson on:<br/><strong>{new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(selectedDate)}</strong></p>
                
                {userProfile?.credits >= 4 && (
                  <div className="monthly-booking-option">
                    <label className="checkbox-container">
                      <input type="checkbox" checked={bookMonthly} onChange={e => {setBookMonthly(e.target.checked); if(e.target.checked) setBookTenLessons(false);}} />
                      <span className="checkmark"></span>
                      <div className="checkbox-text">
                        <strong>Secure slot for 4 weeks</strong>
                        <span className="cost-badge">4 Credits</span>
                      </div>
                    </label>
                  </div>
                )}
                
                {userProfile?.credits >= 10 && (
                  <div className="monthly-booking-option" style={{marginTop:10}}>
                    <label className="checkbox-container">
                      <input type="checkbox" checked={bookTenLessons} onChange={e => {setBookTenLessons(e.target.checked); if(e.target.checked) setBookMonthly(false);}} />
                      <span className="checkmark" style={{borderColor:'var(--accent)'}}></span>
                      <div className="checkbox-text">
                        <strong>Secure slot for 10 weeks</strong>
                        <span className="cost-badge">10 Credits</span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setSelectedDate(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={confirmBooking}>Confirm Booking ({bookMonthly ? '4' : bookTenLessons ? '10' : '1'} Credit{bookMonthly||bookTenLessons?'s':''})</button>
                </div>
              </div>
            </div>
          )}

          <div className="contact-section" style={{marginTop:'3rem', borderTop:'1px solid var(--border-color)', paddingTop:'2rem', maxWidth: '600px', margin: '3rem auto 0'}}>
            <h4 style={{marginBottom:'0.5rem', fontSize:'1.1rem'}}><i className="ph ph-envelope-simple"></i> Message Teacher Andrew</h4>
            <p style={{marginBottom:'1.5rem', fontSize:'0.85rem', color:'#64748b'}}>
              This form is for initial contact only. All remaining contact can be done via email to my private Gmail account.
            </p>
            <ContactForm />
          </div>

          <div className="auth-header" style={{textAlign:'center', marginTop:'2rem'}}>
            <button onClick={handleLogout} className="btn btn-outline">Log Out</button>
          </div>
        </div>
      </div>
    </main>
  );
}
