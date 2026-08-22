"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ContactForm from '@/components/ContactForm';

const THAI_TZ = 'Asia/Bangkok';

// ---------------------------------------------------------------------------
// Design tokens for the redesigned dashboard (auth screen below keeps the
// site's existing CSS-class look-and-feel unchanged).
// ---------------------------------------------------------------------------
const ACCENT = '#555D50';
const TEXT_DARK = '#2C3539';
const TEXT_LIGHT = '#5A6469';
const SECONDARY_BG = '#F4F7FA';
const GREEN = '#16a34a';
const GREEN_TEXT = '#15803d';
const AMBER = '#b45309';
const RED = '#ef4444';
const BLUE = '#2563eb';
const PACKAGE_NAME = 'Committed Package';
const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function getThaiDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: THAI_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const p: Record<string, string> = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  return p;
}

function generateThaiTimeSlots(calendarDay: Date) {
  const schedule: Record<number, string[]> = {
    1: ['17:00'], 2: ['17:00'], 3: ['17:00'],
    4: ['17:00', '18:00'], 5: ['17:00'], 6: [],
    0: ['16:00', '17:00', '18:00']
  };
  // Use the LOCAL calendar column's day-of-week so the schedule matches what the
  // client sees in their column header, not the Thai interpretation of their midnight.
  const dayOfWeek = calendarDay.getDay();
  const slots: { raw: Date, display: string }[] = [];

  if (schedule[dayOfWeek]?.length > 0) {
    // Use the LOCAL calendar date's year/month/day so that UTC+8 clients (e.g. HK)
    // whose midnight lands on the previous Thai date still get the correct slot date.
    const localYear = calendarDay.getFullYear();
    const localMonth = String(calendarDay.getMonth() + 1).padStart(2, '0');
    const localDay = String(calendarDay.getDate()).padStart(2, '0');
    schedule[dayOfWeek].forEach(timeStr => {
      const isoStr = `${localYear}-${localMonth}-${localDay}T${timeStr}:00+07:00`;
      const raw = new Date(isoStr);
      const display = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(raw);
      slots.push({ raw, display });
    });
  }
  return slots;
}

function to12h(d: Date) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d);
}

// ---------------------------------------------------------------------------
// Small shared UI helpers (SideCard / hover-info / toggle switch)
// ---------------------------------------------------------------------------
function SideCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 22, marginBottom: 20, ...style }}>{children}</div>;
}

function HoverCard({ trigger, children, width = 210 }: { trigger: React.ReactNode; children: React.ReactNode; width?: number }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help', flexShrink: 0 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      tabIndex={0}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {trigger}
      {show && (
        <div style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8, width, background: TEXT_DARK, color: '#fff', fontSize: 12, lineHeight: 1.5, padding: '10px 12px', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 50 }}>
          {children}
        </div>
      )}
    </span>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span style={{ marginLeft: 5, display: 'inline-flex' }}>
      <HoverCard trigger={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LIGHT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 17v-5M12 8h.01"></path></svg>}>
        {text}
      </HoverCard>
    </span>
  );
}

function ToggleRow({ label, checked, onChange, marginBottom, info }: { label: string; checked: boolean; onChange: (v: boolean) => void; marginBottom?: number; info?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom }}>
      <span style={{ fontSize: 13, color: TEXT_LIGHT, paddingRight: 12, display: 'flex', alignItems: 'center' }}>{label}{info && <InfoTip text={info} />}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{ width: 40, height: 22, borderRadius: 20, border: 'none', background: checked ? ACCENT : '#e2e8f0', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
        aria-label={label}
      >
        <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

const BLOG_LINKS = [
  { title: 'GCSE Fieldwork: What to Expect', href: '/blog/gcse-fieldwork-guide' },
  { title: 'How to Write a 9-Mark Answer', href: '/blog/how-to-write-9-mark-answer' },
  { title: 'AQA Paper 2 Complete Guide', href: '/blog/aqa-paper-2-guide' },
];

type BookingRow = { date: Date; isMonthly: boolean; isTenLessons: boolean; id: string; status: string; missed?: boolean; coverNote?: string | null };

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');

  // Dashboard State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingRow[]>([]);
  const [pastBookings, setPastBookings] = useState<BookingRow[]>([]);
  const [allBookedSlots, setAllBookedSlots] = useState<number[]>([]);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [showHistory, setShowHistory] = useState(false);

  // New dashboard: month view + tabs
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [activeTab, setActiveTab] = useState<'calendar' | 'cover' | 'notes' | 'homework' | 'quiz' | 'progress'>('calendar');
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);
  const [notesSeen, setNotesSeen] = useState(false);
  const [homeworkSeen, setHomeworkSeen] = useState(false);
  const [quizSeen, setQuizSeen] = useState(false);

  const [studentExams, setStudentExams] = useState<any[]>([]);
  const [lessonNotes, setLessonNotes] = useState<any[]>([]);
  const [quizScores, setQuizScores] = useState<any[]>([]);
  const [mockExams, setMockExams] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);

  const [coverDrafts, setCoverDrafts] = useState<Record<string, string>>({});
  const [coverSaving, setCoverSaving] = useState<string | null>(null);
  const [notifyLessonEnabled, setNotifyLessonEnabled] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyHomeworkEnabled, setNotifyHomeworkEnabled] = useState(false);
  const [uploadingHwId, setUploadingHwId] = useState<string | null>(null);

  // Booking Modal State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingType, setBookingType] = useState<'single' | 'monthly' | 'ten'>('single');

  useEffect(() => { setBookingType('single'); }, [selectedDate]);

  useEffect(() => {
    if (!sessionStorage.getItem('visit_tracked')) {
      fetch('/.netlify/functions/track-visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: '/booking' }) }).catch(() => {});
      sessionStorage.setItem('visit_tracked', '1');
    }
  }, []);

  // Review State
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<{ rating: number; review_text: string; reviewer_name: string } | null>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewFlash, setReviewFlash] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    checkSession();
    fetchAllBookedSlots();

    // Poll every 5 seconds for complete real-time schedule synchronization
    const interval = setInterval(async () => {
      await fetchAllBookedSlots();

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        const { data: latestBookings } = await supabase.from('bookings').select('*').eq('user_id', currentSession.user.id).order('booking_date', { ascending: true });
        if (latestBookings) {
          const now = new Date();
          const newUpcoming: BookingRow[] = [];
          const newPast: BookingRow[] = [];
          latestBookings.forEach(b => {
            const bDate = new Date(b.booking_date);
            const bObj: BookingRow = { date: bDate, isMonthly: b.is_monthly, isTenLessons: b.is_ten_lessons, id: b.id, status: b.status || 'confirmed', missed: !!b.missed, coverNote: b.cover_note };
            if ((bObj.status === 'confirmed' || bObj.status === 'rescheduled') && bDate >= now) newUpcoming.push(bObj);
            else newPast.push(bObj);
          });

          setUpcomingBookings(prev => {
            const prevStr = JSON.stringify(prev.map(p => p.id + p.status + p.coverNote));
            const newStr = JSON.stringify(newUpcoming.map(p => p.id + p.status + p.coverNote));
            return prevStr !== newStr ? newUpcoming : prev;
          });

          setPastBookings(prev => {
            const prevStr = JSON.stringify(prev.map(p => p.id + p.status + p.missed));
            const newStr = JSON.stringify(newPast.map(p => p.id + p.status + p.missed));
            return prevStr !== newStr ? newPast : prev;
          });
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).single();
        if (profile) {
          setUserProfile((prev: any) => {
            if (!prev || prev.credits !== profile.credits || prev.is_committed_package !== profile.is_committed_package) return { ...prev, ...profile };
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
        const normalized = data.bookedSlots.map((d: string) => new Date(d).getTime());
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
                  localStorage.setItem(consumedKey, 'true');
                  await loadProfileData(session.user.id, session.user.email || '');
                  alert(`Payment successful! ${creditsAdded} credit(s) have been added to your account.`);
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
    setNotifyLessonEnabled(!!profile?.notify_lesson_enabled);
    setNotifyEmail(profile?.notify_email || userEmail);
    setNotifyHomeworkEnabled(!!profile?.notify_homework_enabled);

    const { data: bookings } = await supabase.from('bookings').select('*').eq('user_id', userId).order('booking_date', { ascending: true });
    if (bookings) {
      const now = new Date();
      const upcoming: BookingRow[] = [];
      const past: BookingRow[] = [];
      bookings.forEach(b => {
        const bDate = new Date(b.booking_date);
        const bObj: BookingRow = { date: bDate, isMonthly: b.is_monthly, isTenLessons: b.is_ten_lessons, id: b.id, status: b.status || 'confirmed', missed: !!b.missed, coverNote: b.cover_note };
        if ((bObj.status === 'confirmed' || bObj.status === 'rescheduled') && bDate >= now) upcoming.push(bObj);
        else past.push(bObj);
      });
      setUpcomingBookings(upcoming);
      setPastBookings(past);
      const drafts: Record<string, string> = {};
      upcoming.forEach(b => { drafts[b.id] = b.coverNote || ''; });
      setCoverDrafts(drafts);
    }

    // Dashboard-redesign data — wrapped defensively: if the migration hasn't
    // run yet, these tables don't exist, and the rest of the page still works.
    try {
      const [examsRes, notesRes, quizRes, mocksRes, hwRes] = await Promise.all([
        supabase.from('student_exams').select('*').eq('user_id', userId).order('exam_date', { ascending: true }),
        supabase.from('lesson_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('quiz_scores').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('mock_exams').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('homework').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      setStudentExams(examsRes.data || []);
      setLessonNotes(notesRes.data || []);
      setQuizScores(quizRes.data || []);
      setMockExams(mocksRes.data || []);
      setHomeworkList(hwRes.data || []);
    } catch (err) {
      console.error('Dashboard extras not available yet (migration pending?):', err);
    }

    // Fetch existing review if any
    const { data: review } = await supabase.from('reviews').select('rating, review_text, reviewer_name').eq('user_id', userId).maybeSingle();
    if (review) {
      setExistingReview(review);
      setReviewRating(review.rating);
      setReviewText(review.review_text);
      setReviewDone(true);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setForgotStatus('');
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: 'https://teacherandrewgeo.com/reset-password',
    });
    if (error) setForgotStatus(error.message);
    else setForgotStatus('Success! Check your email for a password reset link.');
    setIsProcessing(false);
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

  const handleSubmitReview = async () => {
    if (!reviewRating || !reviewText.trim()) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: currentSession?.access_token, rating: reviewRating, reviewText }),
      });
      const data = await res.json();
      if (data.success) {
        setExistingReview({ rating: reviewRating, review_text: reviewText, reviewer_name: data.reviewerName });
        setReviewDone(true);
        setReviewFlash(true);
        setTimeout(() => setReviewFlash(false), 3000);
      } else {
        setReviewError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setReviewError('Could not submit review. Please check your connection and try again.');
      console.error(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleTopUp = async (qty: number) => {
    if (!session) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qty, userId: session.user.id, userEmail: session.user.email,
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
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmBooking = async () => {
    if (!session || !userProfile || !selectedDate) return;

    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    if (selectedDate <= now) {
      alert('This time slot is in the past and cannot be booked.');
      setSelectedDate(null);
      return;
    }
    if (selectedDate < twelveHoursFromNow) {
      alert('Lessons must be booked at least 12 hours in advance. Please choose a later time slot.');
      setSelectedDate(null);
      return;
    }

    const bookMonthly = bookingType === 'monthly';
    const bookTenLessons = bookingType === 'ten';
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
      return { booking_date: nextDate.toISOString(), is_monthly: bookMonthly, is_ten_lessons: bookTenLessons };
    });

    const token = session.access_token;
    const bookRes = await fetch('/.netlify/functions/student-action', {
      method: 'POST',
      body: JSON.stringify({ action: 'book_slot', token, data: { bookingInserts } })
    });
    const bookData = await bookRes.json();

    if (!bookRes.ok) {
      alert(bookData.error || 'Failed to save booking.');
      if (bookRes.status === 409) {
        await fetchAllBookedSlots();
        setSelectedDate(null);
      }
      return;
    }

    setUserProfile({ ...userProfile, credits: bookData.newCredits });

    try {
      const datesStr = bookingInserts.map(b => new Date(b.booking_date).toLocaleString()).join('\n');
      fetch('https://formsubmit.co/ajax/andrew100br@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: "System Notification",
          email: session.user.email,
          _subject: `New Booking Alert: ${userProfile.child_name || 'Unknown'} (${userProfile.parent_name || 'Unknown'})`,
          _template: 'table',
          _captcha: "false",
          message: `A new lesson has been booked.\n\nStudent: ${userProfile.child_name || 'Unknown'}\nParent: ${userProfile.parent_name || 'Unknown'}\nDates:\n${datesStr}\n\nCheck the admin portal for full details.`
        })
      });
    } catch (err) { console.error("Could not send email", err); }

    const newBookings: BookingRow[] = bookingInserts.map((b, i) => ({ date: new Date(b.booking_date), isMonthly: b.is_monthly, isTenLessons: b.is_ten_lessons, status: 'confirmed', id: `pending-${Date.now()}-${i}` }));
    setUpcomingBookings([...upcomingBookings, ...newBookings]);
    await fetchAllBookedSlots();
    setSelectedDate(null);
    alert('Booking successful!');
  };

  const saveCoverNote = async (bookingId: string) => {
    if (!session) return;
    setCoverSaving(bookingId);
    try {
      const res = await fetch('/.netlify/functions/student-action', {
        method: 'POST',
        body: JSON.stringify({ action: 'set_cover_note', token: session.access_token, data: { bookingId, note: coverDrafts[bookingId] || '' } })
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Could not save.'); }
      else setUpcomingBookings(prev => prev.map(b => b.id === bookingId ? { ...b, coverNote: coverDrafts[bookingId] } : b));
    } finally {
      setCoverSaving(null);
    }
  };

  const saveNotifyPrefs = async (next: { notifyLessonEnabled?: boolean; notifyEmail?: string; notifyHomeworkEnabled?: boolean }) => {
    if (!session) return;
    const merged = {
      notifyLessonEnabled: next.notifyLessonEnabled ?? notifyLessonEnabled,
      notifyEmail: next.notifyEmail ?? notifyEmail,
      notifyHomeworkEnabled: next.notifyHomeworkEnabled ?? notifyHomeworkEnabled,
    };
    await fetch('/.netlify/functions/student-action', {
      method: 'POST',
      body: JSON.stringify({ action: 'set_notify_prefs', token: session.access_token, data: merged })
    });
  };

  const uploadHomeworkFile = async (homeworkId: string, file: File) => {
    if (!session) return;
    setUploadingHwId(homeworkId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/.netlify/functions/student-action', {
        method: 'POST',
        body: JSON.stringify({ action: 'upload_homework', token: session.access_token, data: { homeworkId, fileBase64: base64, fileName: file.name } })
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || 'Upload failed.'); return; }
      setHomeworkList(prev => prev.map(hw => hw.id === homeworkId ? { ...hw, uploaded_file_url: d.url, uploaded_at: new Date().toISOString() } : hw));
    } catch (err) {
      alert('Upload failed. Please try a smaller file.');
    } finally {
      setUploadingHwId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Month grid — same fixed weekly schedule + real booking data, just laid out
  // as a month at a time instead of one week at a time.
  // ---------------------------------------------------------------------------
  type Cell = { blank: true } | {
    blank: false; day: number; date: Date; isToday: boolean; isPast: boolean;
    slots: { raw: Date; display: string; kind: 'available' | 'booked' | 'unavailable' | 'completed' | 'missed' | 'past-empty'; myBookingId?: string; myNote?: any }[];
  };

  const buildMonthCells = (): Cell[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
    const leadingBlanks = (firstDow + 6) % 7; // convert to Monday-start
    const now = new Date();
    const todayStr = now.toDateString();

    const cells: Cell[] = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push({ blank: true });

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const rawSlots = generateThaiTimeSlots(dayDate);

      // Merge in any of my own bookings on this date that fall outside the
      // standard weekly schedule (e.g. a one-off slot added by admin).
      const allMine = [...upcomingBookings, ...pastBookings];
      allMine.forEach(b => {
        if (b.date.toDateString() === dayDate.toDateString() && !rawSlots.some(s => s.raw.getTime() === b.date.getTime())) {
          rawSlots.push({ raw: b.date, display: to12h(b.date) });
        }
      });
      rawSlots.sort((a, b) => a.raw.getTime() - b.raw.getTime());

      const slots = rawSlots.map(s => {
        const isoTime = s.raw.getTime();
        const myBooking = upcomingBookings.find(b => b.date.getTime() === isoTime);
        const myCompleted = pastBookings.find(b => b.date.getTime() === isoTime && (b.status === 'confirmed' || b.status === 'rescheduled') && !b.missed);
        const myMissed = pastBookings.find(b => b.date.getTime() === isoTime && (b.status === 'confirmed' || b.status === 'rescheduled') && b.missed);
        const isBookedGlobally = allBookedSlots.includes(isoTime);
        const isPastSlot = s.raw <= now;

        let kind: 'available' | 'booked' | 'unavailable' | 'completed' | 'missed' | 'past-empty' = 'available';
        let myBookingId: string | undefined;
        let myNote: any;
        if (myMissed) { kind = 'missed'; }
        else if (myCompleted) {
          kind = 'completed';
          myBookingId = myCompleted.id;
          myNote = lessonNotes.find(n => n.booking_id === myCompleted.id);
        } else if (myBooking) { kind = 'booked'; myBookingId = myBooking.id; }
        else if (isBookedGlobally) { kind = 'unavailable'; }
        else if (isPastSlot) { kind = 'past-empty'; }

        return { raw: s.raw, display: s.display, kind, myBookingId, myNote };
      });

      cells.push({ blank: false, day, date: dayDate, isToday: dayDate.toDateString() === todayStr, isPast: dayDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()), slots });
    }
    return cells;
  };

  const cells = buildMonthCells();
  const selectedCell = cells.find(c => !c.blank && (c as any).date.toDateString() === selectedDay.toDateString()) as Extract<Cell, { blank: false }> | undefined;

  const openDay = (date: Date) => setSelectedDay(date);
  const openCompletedDay = (date: Date, note: any) => {
    setSelectedDay(date);
    if (userProfile?.is_committed_package) {
      setActiveTab('notes'); setNotesSeen(true);
      setHighlightNoteId(note?.id || null);
    }
  };

  const hasPackage = !!userProfile?.is_committed_package;
  const toppedUp = (userProfile?.credits || 0) > 0;
  const credits = userProfile?.credits || 0;

  let showMonthlyOption = false;
  let showTenOption = false;
  if (selectedDate) {
    const monthlyConflict = [1, 2, 3].some(i => {
      const d = new Date(selectedDate); d.setDate(d.getDate() + i * 7); return allBookedSlots.includes(d.getTime());
    });
    const tenConflict = [1, 2, 3, 4, 5, 6, 7, 8, 9].some(i => {
      const d = new Date(selectedDate); d.setDate(d.getDate() + i * 7); return allBookedSlots.includes(d.getTime());
    });
    showMonthlyOption = credits >= 4 && !monthlyConflict;
    showTenOption = credits >= 10 && !tenConflict;
  }

  // ---------------------------------------------------------------------------
  // Progress Analysis — computed from real data (not illustrative numbers).
  // ---------------------------------------------------------------------------
  const quizAverage = quizScores.length > 0
    ? Math.round((quizScores.reduce((sum, q) => sum + q.score / (q.out_of || 10), 0) / quizScores.length) * 100)
    : 0;

  const attendanceOrdered = [...pastBookings]
    .filter(b => b.status === 'confirmed' || b.status === 'rescheduled')
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  let currentStreak = 0;
  for (const b of attendanceOrdered) {
    if (b.missed) break;
    currentStreak++;
  }

  const dueHomework = homeworkList.filter(h => h.due_date);
  const pastDueHomework = dueHomework.filter(h => new Date(h.due_date) <= new Date());
  const homeworkOnTimeRate = pastDueHomework.length > 0
    ? Math.round((pastDueHomework.filter(h => h.uploaded_at && new Date(h.uploaded_at) <= new Date(new Date(h.due_date).getTime() + 24 * 60 * 60 * 1000)).length / pastDueHomework.length) * 100)
    : 100;

  const recentPast = attendanceOrdered.slice(0, 5);
  const coverPreppedRate = recentPast.length > 0
    ? Math.round((recentPast.filter(b => b.coverNote && b.coverNote.trim().length > 0).length / recentPast.length) * 100)
    : 100;

  const badges = [
    { key: 'streak-bronze', icon: 'ph-fire', name: 'Bronze Streak', desc: '3 lessons in a row, no misses', color: '#ea580c', earned: currentStreak >= 3 },
    { key: 'streak-silver', icon: 'ph-fire', name: 'Silver Streak', desc: '5 lessons in a row, no misses', color: '#64748b', earned: currentStreak >= 5 },
    { key: 'streak-gold', icon: 'ph-fire', name: 'Gold Streak', desc: '10 lessons in a row, no misses', color: '#ca8a04', earned: currentStreak >= 10 },
    { key: 'homework-hero', icon: 'ph-book-open', name: 'Homework Hero', desc: 'Every homework task submitted on time', color: '#2563eb', earned: homeworkOnTimeRate === 100 },
    { key: 'always-prepared', icon: 'ph-chat-circle-text', name: 'Always Prepared', desc: '"What to Cover" filled in before every lesson, all month', color: '#7c3aed', earned: coverPreppedRate === 100 },
    { key: 'quiz-ace', icon: 'ph-target', name: 'Quiz Ace', desc: 'Average quiz score of 75% or higher', color: '#059669', earned: quizAverage >= 75 },
    { key: 'perfect-month', icon: 'ph-trophy', name: 'Perfect Month', desc: 'No missed lessons + all homework done + prepped every time, in one month', color: '#b45309', earned: currentStreak >= 5 && homeworkOnTimeRate === 100 && coverPreppedRate === 100 },
  ];

  const monthScore = Math.round(((Math.min(currentStreak, 5) / 5) + (homeworkOnTimeRate / 100) + (coverPreppedRate / 100)) / 3 * 100);
  const monthTier = monthScore >= 100
    ? { label: 'Perfect Month', color: '#b45309', bg: '#fffbeb', icon: 'ph-trophy' }
    : monthScore >= 90 ? { label: 'Gold Month', color: '#ca8a04', bg: '#fefce8', icon: 'ph-medal' }
    : monthScore >= 75 ? { label: 'Silver Month', color: '#64748b', bg: '#f8fafc', icon: 'ph-medal' }
    : { label: 'Bronze Month', color: '#ea580c', bg: '#fff7ed', icon: 'ph-medal' };

  const soonestExam = studentExams[0];
  const otherExams = studentExams.slice(1);

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    background: 'none', border: 'none', padding: '4px 2px 14px', fontSize: 15, fontWeight: 600,
    color: active ? TEXT_DARK : TEXT_LIGHT, borderBottom: active ? `3px solid ${ACCENT}` : '3px solid transparent',
    marginBottom: -1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
  });

  if (loading) return <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading...</div>;

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
              <button type="button" className={`auth-tab ${!isLoginMode ? 'active' : ''}`} onClick={() => { setIsLoginMode(false); setShowForgotPassword(false); setForgotStatus(''); }}>Sign Up</button>
              <button type="button" className={`auth-tab ${isLoginMode ? 'active' : ''}`} onClick={() => { setIsLoginMode(true); setShowForgotPassword(false); setForgotStatus(''); }}>Log In</button>
            </div>

            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="booking-form">
                <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}>Enter your email address and we'll send you a link to reset your password.</p>
                <div className="form-group"><label>Email Address</label><input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} /></div>
                {forgotStatus && <p style={{ color: forgotStatus.startsWith('Success') ? '#16a34a' : '#dc2626', textAlign: 'center', marginBottom: '1rem' }}>{forgotStatus}</p>}
                <button type="submit" className="btn btn-primary btn-full" disabled={isProcessing}>{isProcessing ? 'Sending...' : 'Send Reset Link'}</button>
                <button type="button" className="btn btn-outline btn-full" style={{ marginTop: '0.75rem' }} onClick={() => { setShowForgotPassword(false); setForgotStatus(''); }}>Back to Log In</button>
              </form>
            ) : (
              <form onSubmit={handleAuth} className="booking-form">
                {!isLoginMode && (
                  <>
                    <div className="form-group"><label>Parent's Name</label><input type="text" required value={parentName} onChange={e => setParentName(e.target.value)} /></div>
                    <div className="form-group"><label>Child's Name</label><input type="text" required value={childName} onChange={e => setChildName(e.target.value)} /></div>
                    <div className="form-group"><label>Country</label><input type="text" required value={country} onChange={e => setCountry(e.target.value)} /></div>
                  </>
                )}
                <div className="form-group"><label>Email Address</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div className="form-group"><label>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                {authStatus && <p style={{ color: authStatus.startsWith('Success') ? '#16a34a' : '#dc2626', textAlign: 'center', marginBottom: '1rem' }}>{authStatus}</p>}
                <button type="submit" className="btn btn-primary btn-full" disabled={isProcessing}>{isProcessing ? 'Processing...' : (isLoginMode ? 'Log In' : 'Create Account')}</button>
                {isLoginMode && (
                  <p style={{ textAlign: 'center', marginTop: '0.75rem', marginBottom: 0 }}>
                    <button type="button" onClick={() => { setShowForgotPassword(true); setForgotEmail(email); setForgotStatus(''); }} style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Forgot your password?</button>
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  const reviewWordCount = reviewText.trim() === '' ? 0 : reviewText.trim().split(/\s+/).length;
  const reviewCanSubmit = reviewRating > 0 && reviewWordCount >= 10;
  const starsDisplay = reviewHover > 0 ? reviewHover : reviewRating;

  const nextLesson = upcomingBookings.length > 0 ? [...upcomingBookings].sort((a, b) => a.date.getTime() - b.date.getTime())[0] : null;

  return (
    <main className="booking-main bg-light">
      <div style={{ background: SECONDARY_BG, padding: '32px 0 80px' }}>
        <div className="container" style={{ maxWidth: 1160 }}>

          <div className="top-row" style={{ display: 'flex', gap: 24, alignItems: 'stretch', marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 420px', display: 'flex', gap: 20, alignItems: 'center', background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 22, borderLeft: `5px solid ${ACCENT}` }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: SECONDARY_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path><path d="M9 16l2 2 4-4"></path></svg>
              </div>
              <div>
                <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: ACCENT, fontWeight: 700, margin: '0 0 6px' }}>Your Next Lesson</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, margin: '0 0 10px' }}>
                  {nextLesson ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(nextLesson.date) + ' · ' + to12h(nextLesson.date) : 'No lesson booked yet'}
                </p>
                {userProfile?.zoom_link && (
                  <div style={{ textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <a href={userProfile.zoom_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 50, fontSize: 12.5, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 15px rgba(85,93,80,0.3)' }}>
                      <i className="ph ph-video-camera"></i> Enter the Classroom
                    </a>
                    <InfoTip text={`Click this at the time of your lesson to join on Zoom.${userProfile.zoom_password ? ` Your private password is: ${userProfile.zoom_password}` : ''}`} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: '1 1 260px', background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 22, borderTop: `4px solid ${GREEN}` }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 700, margin: '0 0 10px' }}>Your Credits</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: GREEN_TEXT, lineHeight: 1 }}>{credits}</span>
                <span style={{ fontSize: 13, color: TEXT_LIGHT, fontWeight: 600 }}>credit{credits === 1 ? '' : 's'} to book</span>
              </div>
              <p style={{ fontSize: 12.5, color: TEXT_LIGHT, margin: 0, lineHeight: 1.5 }}>
                {upcomingBookings.length} lesson{upcomingBookings.length === 1 ? '' : 's'} already booked{hasPackage ? ` · ${PACKAGE_NAME}` : ''}
              </p>
            </div>
          </div>

          <style>{`
            @media (max-width: 900px) { .booking-dashboard-layout { grid-template-columns: 1fr !important; } }
          `}</style>

          <div className="booking-dashboard-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 24, borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
                <button onClick={() => setActiveTab('calendar')} style={tabBtnStyle(activeTab === 'calendar')}>Calendar</button>
                <button onClick={() => setActiveTab('cover')} style={tabBtnStyle(activeTab === 'cover')}>What to Cover</button>
                <button onClick={() => { setActiveTab('notes'); setNotesSeen(true); }} style={tabBtnStyle(activeTab === 'notes')}>
                  Lesson Notes
                  {hasPackage && !notesSeen && <span style={{ width: 7, height: 7, borderRadius: '50%', background: RED }}></span>}
                  {!hasPackage && <i className="ph ph-lock-simple" style={{ fontSize: 12, color: TEXT_LIGHT }}></i>}
                </button>
                <button onClick={() => { setActiveTab('homework'); setHomeworkSeen(true); }} style={tabBtnStyle(activeTab === 'homework')}>
                  Homework
                  {hasPackage && !homeworkSeen && <span style={{ width: 7, height: 7, borderRadius: '50%', background: RED }}></span>}
                  {!hasPackage && <i className="ph ph-lock-simple" style={{ fontSize: 12, color: TEXT_LIGHT }}></i>}
                </button>
                <button onClick={() => { setActiveTab('quiz'); setQuizSeen(true); }} style={tabBtnStyle(activeTab === 'quiz')}>
                  Quiz/Exam Scores
                  {hasPackage && !quizSeen && <span style={{ width: 7, height: 7, borderRadius: '50%', background: RED }}></span>}
                  {!hasPackage && <i className="ph ph-lock-simple" style={{ fontSize: 12, color: TEXT_LIGHT }}></i>}
                </button>
                <button onClick={() => setActiveTab('progress')} style={tabBtnStyle(activeTab === 'progress')}>
                  Progress Analysis
                  {!hasPackage && <i className="ph ph-lock-simple" style={{ fontSize: 12, color: TEXT_LIGHT }}></i>}
                </button>
              </div>

              {activeTab === 'calendar' && (
                <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
                      {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth)}
                    </h2>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); }} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} aria-label="Previous month">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_DARK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>
                      </button>
                      <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); }} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} aria-label="Next month">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_DARK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6, marginBottom: 6 }}>
                    {WEEKDAY_LABELS.map((wd) => (
                      <div key={wd} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: TEXT_LIGHT, paddingBottom: 4 }}>{wd}</div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6 }}>
                    {cells.map((c, i) => {
                      if (c.blank) return <div key={i} style={{ background: 'transparent', minHeight: 96 }} />;
                      const isSignificant = c.slots.length > 0;
                      return (
                        <div key={i} style={{
                          position: 'relative', minHeight: 96, borderRadius: 10,
                          border: c.isToday ? `2px solid ${TEXT_DARK}` : '1.5px solid #e2e8f0',
                          background: isSignificant ? '#fff' : SECONDARY_BG,
                          opacity: isSignificant ? 1 : 0.55,
                          display: 'flex', flexDirection: 'column', gap: 4, padding: 6,
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: c.isToday ? TEXT_DARK : TEXT_LIGHT, padding: '0 2px' }}>{c.day}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {c.slots.length === 0 && <span style={{ fontSize: 10.5, color: '#cbd5e1', padding: '4px 2px' }}>—</span>}
                            {c.slots.map((s, si) => {
                              let style: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '3px 5px', borderRadius: 5, textAlign: 'center', lineHeight: 1.3, border: 'none', width: '100%', fontFamily: "'Inter', sans-serif", cursor: 'pointer' };
                              let onClick = () => openDay(c.date);
                              let label: React.ReactNode = s.display;

                              if (s.kind === 'booked') {
                                style = { ...style, background: 'rgba(34,197,94,0.16)', color: GREEN_TEXT };
                              } else if (s.kind === 'missed') {
                                style = { ...style, background: 'rgba(239,68,68,0.14)', color: '#b91c1c' };
                              } else if (s.kind === 'completed') {
                                style = { ...style, background: '#dbeafe', color: '#1d4ed8' };
                                onClick = () => openCompletedDay(c.date, s.myNote);
                                label = (
                                  <>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                      {s.display}
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                                    </span>
                                    <br />
                                    {hasPackage ? (
                                      <span style={{ textDecoration: 'underline' }}>Notes</span>
                                    ) : (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                        <i className="ph ph-lock-simple" style={{ fontSize: 10 }}></i> Notes
                                      </span>
                                    )}
                                  </>
                                );
                              } else if (s.kind === 'unavailable') {
                                style = { ...style, background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' };
                                onClick = () => {};
                                label = 'Unavailable';
                              } else if (s.kind === 'past-empty') {
                                style = { ...style, background: 'transparent', color: '#cbd5e1', border: '1px dashed #e2e8f0', cursor: 'default' };
                                onClick = () => {};
                              } else {
                                style = { ...style, background: SECONDARY_BG, color: ACCENT, border: '1px solid #e2e8f0' };
                                onClick = () => { setSelectedDay(c.date); setSelectedDate(s.raw); };
                              }
                              return <button key={si} type="button" style={style} onClick={onClick}>{label}</button>;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 18, marginTop: 20, paddingTop: 20, borderTop: '1px solid #edf2f7', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: TEXT_LIGHT }}><span style={{ width: 14, height: 14, borderRadius: 4, background: `${ACCENT}1a`, border: `1px solid ${ACCENT}`, display: 'inline-block' }}></span> Available</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: TEXT_LIGHT }}><span style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(34,197,94,0.16)', display: 'inline-block' }}></span> Your booked lesson</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: TEXT_LIGHT }}><span style={{ width: 14, height: 14, borderRadius: 4, background: '#dbeafe', display: 'inline-block' }}></span> Completed{hasPackage ? ' — click for notes' : ' (notes with Committed Package)'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: TEXT_LIGHT }}><span style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(239,68,68,0.14)', display: 'inline-block' }}></span> Missed</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: TEXT_LIGHT }}><span style={{ width: 14, height: 14, borderRadius: 4, background: '#e2e8f0', display: 'inline-block' }}></span> Unavailable</div>
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #edf2f7' }}>
                    {(() => {
                      if (!selectedCell) return null;
                      const bookedSlot = selectedCell.slots.find(s => s.kind === 'booked');
                      const missedSlot = selectedCell.slots.find(s => s.kind === 'missed');
                      const completedSlotForPayg = !hasPackage ? selectedCell.slots.find(s => s.kind === 'completed') : undefined;
                      const availableSlotExists = selectedCell.slots.some(s => s.kind === 'available');
                      const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedCell.date);

                      if (bookedSlot) {
                        return (
                          <>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{dateLabel}</p>
                            <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: '0 0 16px' }}>You have a lesson booked this day.</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.16)', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px 18px', fontSize: 14, color: GREEN_TEXT, fontWeight: 600 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN_TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg>
                              Confirmed — {bookedSlot.display}
                            </div>
                          </>
                        );
                      }
                      if (missedSlot) {
                        return (
                          <>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{dateLabel}</p>
                            <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: '0 0 16px' }}>This lesson was scheduled but did not go ahead.</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.14)', border: '1px solid #fecaca', borderRadius: 8, padding: '14px 18px', fontSize: 14, color: '#b91c1c', fontWeight: 600 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>
                              Missed — {missedSlot.display}
                            </div>
                          </>
                        );
                      }
                      if (completedSlotForPayg) {
                        return (
                          <>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{dateLabel}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 18px', fontSize: 13.5, color: '#92400e', fontWeight: 500 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 018 0v3"></path></svg>
                              This lesson's notes are available with the {PACKAGE_NAME}.
                            </div>
                          </>
                        );
                      }
                      if (availableSlotExists) {
                        return (
                          <>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{dateLabel}</p>
                            <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: '0 0 6px' }}>Click a time above to book this lesson — you'll be asked to confirm.</p>
                            <p style={{ fontSize: 12, color: TEXT_LIGHT, margin: 0 }}>
                              Need to reschedule or cancel a booked lesson? Please read the{' '}
                              <a href="/policies#cancellation-rescheduling" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'underline' }}>notice period required</a>{' '}
                              before you book.
                            </p>
                          </>
                        );
                      }
                      return (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{dateLabel}</p>
                          <p style={{ fontSize: 14, color: TEXT_LIGHT, fontStyle: 'italic' }}>
                            {selectedCell.slots.length === 0 ? 'No lessons are scheduled this day.' : 'This date has passed with no lesson booked.'}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeTab === 'cover' && (
                <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 32 }}>
                  <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 600, margin: '0 0 4px' }}>What to Cover</p>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: '0 0 24px', display: 'flex', alignItems: 'center' }}>
                    Help Teacher Andrew prepare
                    <InfoTip text="Let me know what you'd like to focus on before each lesson — a topic you're stuck on, a paper you're revising for, anything. Our 50 minutes goes by fast, so this means we can get straight into it together the moment we start." />
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {upcomingBookings.length === 0 && <p style={{ fontSize: 14, color: TEXT_LIGHT }}>No upcoming lessons booked yet.</p>}
                    {[...upcomingBookings].sort((a, b) => a.date.getTime() - b.date.getTime()).map((b) => (
                      <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
                        <p style={{ fontWeight: 700, fontSize: 14.5, margin: '0 0 10px' }}>
                          {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(b.date)} · {to12h(b.date)}
                        </p>
                        <textarea
                          value={coverDrafts[b.id] ?? ''}
                          onChange={(e) => setCoverDrafts({ ...coverDrafts, [b.id]: e.target.value })}
                          placeholder="e.g. Really want to go over river landforms again before the mock..."
                          style={{ width: '100%', minHeight: 80, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13.5, resize: 'vertical', marginBottom: 10 }}
                        />
                        <button onClick={() => saveCoverNote(b.id)} disabled={coverSaving === b.id} style={{ background: ACCENT, color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: coverSaving === b.id ? 0.7 : 1 }}>
                          {coverSaving === b.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 32 }}>
                  {hasPackage ? (
                    <>
                      <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 600, margin: '0 0 4px' }}>Lesson Notes</p>
                      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>Your revision library</h2>
                      {lessonNotes.length === 0 ? (
                        <p style={{ fontSize: 14, color: TEXT_LIGHT }}>No lesson notes yet — they'll appear here after your first few lessons.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {lessonNotes.map((note) => {
                            const highlighted = note.id === highlightNoteId;
                            return (
                              <div key={note.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: `1.5px solid ${highlighted ? ACCENT : '#e2e8f0'}`, borderRadius: 8, padding: '16px 18px', boxShadow: highlighted ? '0 0 0 3px rgba(85,93,80,0.12)' : 'none' }}>
                                <div style={{ width: 42, height: 42, borderRadius: 10, background: SECONDARY_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><path d="M14 2v6h6"></path><path d="M9 15h6M9 11h2"></path></svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>
                                    {note.lesson_number && <span style={{ color: ACCENT, fontWeight: 700 }}>Lesson {note.lesson_number} — </span>}{note.topic}
                                  </p>
                                  <p style={{ fontSize: 12.5, color: TEXT_LIGHT, margin: 0 }}>{new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                {note.pdf_url ? (
                                  <a href={note.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, background: SECONDARY_BG, border: '1px solid #e2e8f0', padding: '9px 14px', borderRadius: 50, fontSize: 12.5, fontWeight: 600, color: TEXT_DARK, whiteSpace: 'nowrap', textDecoration: 'none' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5"></path><path d="M4 21h16"></path></svg>
                                    PDF
                                  </a>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 600, margin: '0 0 4px' }}>Lesson Notes</p>
                      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>Available with the {PACKAGE_NAME}</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, background: `linear-gradient(180deg, ${SECONDARY_BG}, #fff)`, border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: 32, textAlign: 'left' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 018 0v3"></path></svg>
                        </div>
                        <p style={{ fontSize: 14, color: TEXT_LIGHT, lineHeight: 1.6, maxWidth: 460, margin: 0 }}>
                          On the {PACKAGE_NAME}, every lesson gets a PDF snapshot — including the work done — so it's neatly recorded and easy to look back on for revision.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'homework' && (
                <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 32 }}>
                  {hasPackage ? (
                    <>
                      <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 600, margin: '0 0 4px' }}>Homework</p>
                      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: '0 0 24px', display: 'flex', alignItems: 'center' }}>
                        Optional Homework
                        <InfoTip text="Set only when it's useful, not every lesson. Reinforces what we just covered and helps us move through the syllabus faster." />
                      </h2>
                      {homeworkList.length === 0 ? (
                        <p style={{ fontSize: 14, color: TEXT_LIGHT }}>No homework set right now.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {homeworkList.map((hw) => (
                            <div key={hw.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{hw.lesson_number ? `Lesson ${hw.lesson_number} Homework` : 'Homework'}</p>
                                {hw.due_date && <span style={{ fontSize: 12, fontWeight: 600, color: AMBER, background: '#fffbeb', border: '1px solid #fde68a', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>Due {new Date(hw.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                              </div>
                              {hw.instructions && <p style={{ fontSize: 13.5, color: TEXT_LIGHT, lineHeight: 1.6, margin: '0 0 14px' }}>{hw.instructions}</p>}
                              {hw.uploaded_file_url ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: GREEN_TEXT, fontWeight: 600 }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN_TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle></svg>
                                  Uploaded — <a href={hw.uploaded_file_url} target="_blank" rel="noopener noreferrer" style={{ color: GREEN_TEXT }}>view file</a>
                                </div>
                              ) : (
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: SECONDARY_BG, border: '1px dashed #cbd5e1', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: TEXT_DARK, cursor: 'pointer' }}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5"></path><path d="M4 21h16"></path></svg>
                                  {uploadingHwId === hw.id ? 'Uploading...' : 'Upload your work in advance'}
                                  <input type="file" style={{ display: 'none' }} disabled={uploadingHwId === hw.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHomeworkFile(hw.id, f); }} />
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, background: `linear-gradient(180deg, ${SECONDARY_BG}, #fff)`, border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: 32, textAlign: 'left' }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5"></path><path d="M4 21h16"></path></svg>
                      </div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, margin: 0 }}>Homework — {PACKAGE_NAME} Only</h3>
                      <p style={{ fontSize: 14, color: TEXT_LIGHT, lineHeight: 1.6, maxWidth: 460, margin: 0 }}>
                        Optional, and set only when it's useful — {PACKAGE_NAME} students can get homework after a lesson, aligned to exactly what we just covered, with a due date and clear instructions.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 32 }}>
                  {hasPackage ? (
                    <>
                      <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 600, margin: '0 0 4px' }}>Quiz/Exam Scores</p>
                      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center' }}>
                        Quiz Scores
                        <InfoTip text="A quick, low-pressure check at the end of each lesson — helps us both spot what needs more revision before your next quiz or exam." />
                      </h2>
                      {quizScores.length === 0 ? (
                        <p style={{ fontSize: 14, color: TEXT_LIGHT }}>No quiz scores recorded yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {quizScores.map((q) => {
                            const pct = Math.round((q.score / q.out_of) * 100);
                            const color = pct >= 80 ? GREEN_TEXT : pct >= 60 ? AMBER : RED;
                            const bg = pct >= 80 ? '#dcfce7' : pct >= 60 ? '#fffbeb' : '#fef2f2';
                            return (
                              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '16px 18px' }}>
                                <div style={{ width: 42, height: 42, borderRadius: 10, background: SECONDARY_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9.5 12l1.8 1.8L15 10"></path></svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>
                                    {q.lesson_number && <span style={{ color: ACCENT, fontWeight: 700 }}>Lesson {q.lesson_number} — </span>}{q.topic}
                                  </p>
                                  <p style={{ fontSize: 12.5, color: TEXT_LIGHT, margin: 0 }}>{new Date(q.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div style={{ textAlign: 'center', background: bg, color, padding: '9px 16px', borderRadius: 50, fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>
                                  {q.score}/{q.out_of} <span style={{ fontWeight: 600, opacity: 0.8 }}>({pct}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ marginTop: 32, paddingTop: 28, borderTop: '1px solid #e2e8f0' }}>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center' }}>
                          Exam Questions &amp; Mocks
                          <InfoTip text="Real exam questions or a full mock paper, marked by Teacher Andrew — a heavier, more exam-realistic check than a quick quiz. Not every lesson has one; it's used when it's the right time to test you properly." />
                        </h2>
                        {mockExams.length === 0 ? (
                          <p style={{ fontSize: 13.5, color: TEXT_LIGHT, margin: 0 }}>No exam questions or mock papers set yet — not every student does these, but if we go through one together, your marked result will show up here.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {mockExams.map((m) => (
                              <div key={m.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '16px 18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                                  <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{m.title}</p>
                                  {m.result && <span style={{ background: '#eff6ff', color: BLUE, border: '1px solid #bfdbfe', padding: '5px 14px', borderRadius: 50, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{m.result}</span>}
                                </div>
                                {m.exam_date && <p style={{ fontSize: 12.5, color: TEXT_LIGHT, margin: '0 0 8px' }}>{new Date(m.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                                {m.info && <p style={{ fontSize: 13.5, color: TEXT_LIGHT, lineHeight: 1.6, margin: '0 0 10px' }}>{m.info}</p>}
                                {m.file_url && (
                                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, background: SECONDARY_BG, border: '1px solid #e2e8f0', padding: '9px 14px', borderRadius: 50, fontSize: 12.5, fontWeight: 600, color: TEXT_DARK, width: 'fit-content', textDecoration: 'none' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5"></path><path d="M4 21h16"></path></svg>
                                    Marked Paper (PDF)
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 600, margin: '0 0 4px' }}>Quiz/Exam Scores</p>
                      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: '0 0 20px' }}>Available with the {PACKAGE_NAME}</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, background: `linear-gradient(180deg, ${SECONDARY_BG}, #fff)`, border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: 32, textAlign: 'left' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9.5 12l1.8 1.8L15 10"></path></svg>
                        </div>
                        <p style={{ fontSize: 14, color: TEXT_LIGHT, lineHeight: 1.6, maxWidth: 460, margin: 0 }}>
                          {PACKAGE_NAME} students get a short quiz at the end of every lesson, plus real exam questions or a full mock paper when it's the right time — all marked and recorded.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'progress' && (
                <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: 32 }}>
                  {hasPackage ? (
                    <>
                      <div style={{ marginBottom: 24 }}>
                        <p style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 600, margin: '0 0 4px' }}>Progress Analysis</p>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>How you're doing overall</h2>
                      </div>

                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', background: SECONDARY_BG, borderRadius: 14, padding: 24, marginBottom: 24 }}>
                        <div style={{ width: 120, height: 120, borderRadius: '50%', background: `conic-gradient(${ACCENT} ${quizAverage * 3.6}deg, #e2e8f0 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: ACCENT, lineHeight: 1 }}>{quizAverage}%</span>
                            <span style={{ fontSize: 10.5, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Quiz average</span>
                          </div>
                        </div>
                        <div style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="ph-fill ph-fire" style={{ fontSize: 26, color: '#ea580c' }}></i>
                          </div>
                          <div>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>{currentStreak}-lesson streak</p>
                            <p style={{ fontSize: 12.5, color: TEXT_LIGHT, margin: '2px 0 0' }}>Keep it going!</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
                        {[
                          { label: 'Homework on time', value: homeworkOnTimeRate, color: '#2563eb' },
                          { label: 'What to Cover prepped', value: coverPreppedRate, color: '#7c3aed' },
                          { label: 'Quiz average', value: quizAverage, color: '#059669' },
                        ].map((s) => (
                          <div key={s.label} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                            <p style={{ fontSize: 11.5, color: TEXT_LIGHT, fontWeight: 600, margin: '0 0 8px' }}>{s.label}</p>
                            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: s.color }}>{s.value}%</p>
                            <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 3 }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {mockExams.length > 0 && (
                        <div style={{ marginBottom: 28 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>Mock &amp; Exam Results</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {mockExams.map((m) => (
                              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                                <div>
                                  <p style={{ fontWeight: 700, fontSize: 13.5, margin: '0 0 2px' }}>{m.title}</p>
                                </div>
                                {m.result && <span style={{ background: '#eff6ff', color: BLUE, border: '1px solid #bfdbfe', padding: '5px 14px', borderRadius: 50, fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}>{m.result}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ border: `1.5px solid ${monthTier.color}`, background: monthTier.bg, borderRadius: 14, padding: 20, marginBottom: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className={`ph-fill ${monthTier.icon}`} style={{ color: monthTier.color, fontSize: 20 }}></i>
                            {monthTier.label}
                          </p>
                          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: monthTier.color }}>{monthScore}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }} />
                      </div>

                      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>Badges</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                        {badges.map((b) => (
                          <div key={b.key} title={b.desc} style={{ border: `1.5px solid ${b.earned ? b.color : '#e2e8f0'}`, borderRadius: 12, padding: '16px 12px', textAlign: 'center', background: b.earned ? `${b.color}0d` : '#fafafa', opacity: b.earned ? 1 : 0.65 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 10px', background: b.earned ? b.color : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                              <i className={`ph-fill ${b.icon}`} style={{ fontSize: 21, color: '#fff' }}></i>
                              {!b.earned && (
                                <div style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <i className="ph ph-lock-simple" style={{ fontSize: 10, color: TEXT_LIGHT }}></i>
                                </div>
                              )}
                            </div>
                            <p style={{ fontSize: 12.5, fontWeight: 700, margin: '0 0 3px', color: b.earned ? TEXT_DARK : TEXT_LIGHT }}>{b.name}</p>
                            <p style={{ fontSize: 10.5, color: TEXT_LIGHT, margin: 0, lineHeight: 1.4 }}>{b.desc}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, background: `linear-gradient(180deg, ${SECONDARY_BG}, #fff)`, border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: 32, textAlign: 'left' }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ph ph-trophy" style={{ fontSize: 24, color: ACCENT }}></i>
                      </div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, margin: 0 }}>Progress Analysis — {PACKAGE_NAME} Only</h3>
                      <p style={{ fontSize: 14, color: TEXT_LIGHT, lineHeight: 1.6, maxWidth: 460, margin: 0 }}>
                        {PACKAGE_NAME} students get a full progress dashboard — attendance streaks, homework and prep rates, quiz score trends, and badges to earn along the way.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <SideCard style={{ borderTop: `4px solid ${BLUE}` }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l4 2"></path></svg>
                  Countdown
                  {otherExams.length > 0 && (
                    <HoverCard
                      width={230}
                      trigger={<span style={{ fontSize: 10.5, fontWeight: 700, color: BLUE, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 20, textTransform: 'none', letterSpacing: 0 }}>+{otherExams.length} more</span>}
                    >
                      <p style={{ fontWeight: 700, margin: '0 0 8px' }}>Also coming up</p>
                      {otherExams.map((ex) => (
                        <div key={ex.id} style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600 }}>{ex.name}</div>
                          <div style={{ opacity: 0.75 }}>{new Date(ex.exam_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                      ))}
                    </HoverCard>
                  )}
                </p>
                {soonestExam ? (
                  <>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 700, color: BLUE, lineHeight: 1 }}>
                        {Math.max(0, Math.ceil((new Date(soonestExam.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: TEXT_DARK, fontWeight: 600, margin: '0 0 6px' }}>days to go until {soonestExam.name}</p>
                    <p style={{ fontSize: 12.5, color: TEXT_LIGHT, margin: 0 }}>{new Date(soonestExam.exam_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: TEXT_LIGHT, margin: 0 }}>No exam dates set yet.</p>
                )}
              </SideCard>

              <SideCard>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LIGHT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 01-3.46 0"></path></svg>
                  Lesson Reminders
                  {!hasPackage && (
                    <>
                      <i className="ph ph-lock-simple" style={{ fontSize: 13, color: TEXT_LIGHT }}></i>
                      <HoverCard trigger={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LIGHT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 17v-5M12 8h.01"></path></svg>}>
                        An email reminder 1 day before each lesson, sent to any email you choose. Included with the {PACKAGE_NAME}.
                      </HoverCard>
                    </>
                  )}
                </p>
                {hasPackage ? (
                  <>
                    <ToggleRow label="Email me 1 day before each lesson" checked={notifyLessonEnabled} onChange={(v) => { setNotifyLessonEnabled(v); saveNotifyPrefs({ notifyLessonEnabled: v }); }} marginBottom={notifyLessonEnabled ? 14 : 0} />
                    {notifyLessonEnabled && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>Send reminders to</label>
                        <input type="text" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)} onBlur={() => saveNotifyPrefs({ notifyEmail })} placeholder="any@email.com" style={{ width: '100%', padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontFamily: "'Inter', sans-serif" }} />
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 12.5, color: TEXT_LIGHT, margin: 0, lineHeight: 1.5 }}>
                    Available with the {PACKAGE_NAME} — never miss a lesson.
                  </p>
                )}
              </SideCard>

              <SideCard>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LIGHT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5"></path><path d="M4 21h16"></path></svg>
                  Homework Reminders
                  {!hasPackage && (
                    <>
                      <i className="ph ph-lock-simple" style={{ fontSize: 13, color: TEXT_LIGHT }}></i>
                      <HoverCard trigger={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_LIGHT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 17v-5M12 8h.01"></path></svg>}>
                        An email reminder the day before any lesson with homework set — combined into one email with your Lesson Reminder if both are on. Included with the {PACKAGE_NAME}.
                      </HoverCard>
                    </>
                  )}
                </p>
                {hasPackage ? (
                  <ToggleRow
                    label="Homework reminders (email sent day before lesson)"
                    checked={notifyHomeworkEnabled}
                    onChange={(v) => { setNotifyHomeworkEnabled(v); saveNotifyPrefs({ notifyHomeworkEnabled: v }); }}
                    info="Sent to the same email as your Lesson Reminders above — if both are on, you'll get one combined email. Only sent when homework has actually been set for that lesson."
                  />
                ) : (
                  <p style={{ fontSize: 12.5, color: TEXT_LIGHT, margin: 0, lineHeight: 1.5 }}>
                    Available with the {PACKAGE_NAME} — never miss a homework deadline.
                  </p>
                )}
              </SideCard>

              <SideCard style={{ marginBottom: 0 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: TEXT_LIGHT, fontWeight: 700, margin: '0 0 12px' }}>Quick Revision Tips</p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {BLOG_LINKS.map((post, i) => (
                    <a key={post.href} href={post.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < BLOG_LINKS.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 13.5, fontWeight: 600, color: TEXT_DARK, textDecoration: 'none' }}>
                      <span style={{ flexShrink: 0, color: TEXT_LIGHT }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"></path></svg>
                      </span>
                      {post.title}
                      <span style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.5 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
                      </span>
                    </a>
                  ))}
                </div>
              </SideCard>
            </div>
          </div>

          {/* Direct contact — unlocks once the account has credit on it */}
          <div style={{ marginTop: 28, background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '26px 28px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: SECONDARY_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ph ${toppedUp ? 'ph-envelope-simple-open' : 'ph-lock-simple'}`} style={{ fontSize: 22, color: ACCENT }}></i>
            </div>
            {toppedUp ? (
              <div style={{ flex: '1 1 320px' }}>
                <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Need to reschedule, ask about homework, or a specific exam question?</p>
                <p style={{ fontSize: 13.5, color: TEXT_LIGHT, margin: 0, lineHeight: 1.6 }}>
                  Email Teacher Andrew directly at <a href="mailto:andrew100br@gmail.com" style={{ color: ACCENT, fontWeight: 700, textDecoration: 'underline' }}>andrew100br@gmail.com</a>{' '}and he&apos;ll get back to you.
                </p>
              </div>
            ) : (
              <div style={{ flex: '1 1 320px' }}>
                <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Direct email access — unlocked once your account is topped up</p>
                <p style={{ fontSize: 13.5, color: TEXT_LIGHT, margin: 0, lineHeight: 1.6 }}>
                  Top up your credits and you&apos;ll be able to email Teacher Andrew directly for rescheduling, homework questions, or anything exam-related.
                </p>
              </div>
            )}
          </div>

          {/* Booking History — kept from the original dashboard so cancelled/rescheduled records aren't lost */}
          <div style={{ marginTop: 28, background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '26px 28px' }}>
            <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: TEXT_LIGHT, fontSize: '1rem', margin: 0 }} onClick={() => setShowHistory(!showHistory)}>
              <span><i className="ph ph-clock-counter-clockwise"></i> Booking History</span>
              <i className={`ph ph-caret-${showHistory ? 'up' : 'down'}`}></i>
            </h3>
            {showHistory && (
              <ul className="bookings-list" style={{ marginTop: '1rem', opacity: 0.85 }}>
                {pastBookings.length === 0 ? <li className="empty-bookings">No past history found.</li> :
                  [...pastBookings].sort((a, b) => b.date.getTime() - a.date.getTime()).map((b) => {
                    let badgeStyle: React.CSSProperties = { backgroundColor: '#f1f5f9', color: '#475569' };
                    let label = "Completed";
                    if (b.status === 'cancelled') { badgeStyle = { backgroundColor: '#fee2e2', color: '#dc2626' }; label = "Cancelled"; }
                    else if (b.status === 'amended') { badgeStyle = { backgroundColor: '#ffedd5', color: '#ea580c' }; label = "Rescheduled"; }
                    else if (b.missed) { badgeStyle = { backgroundColor: '#fee2e2', color: '#b91c1c' }; label = "Missed"; }
                    return (
                      <li key={b.id}>
                        <span className="booking-item-date" style={{ color: '#64748b' }}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(b.date)}</span>
                        <span className="booking-item-type" style={badgeStyle}>{label}</span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>

          {/* Buy Lesson Credits */}
          <div className="user-dashboard" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}><i className="ph ph-shopping-bag"></i> Buy Lesson Credits</h3>
            </div>
            <div className="dashboard-stats" style={{ marginBottom: 0 }}>
              <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Pay As You Go</h4>
                <p className="price" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
                  £30 <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>/ lesson</span>
                </p>
                <p className="small-desc" style={{ marginBottom: '1.5rem' }}>Need just a few lessons? Buy exact quantities.</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '5px' }}>
                    <button className="btn btn-icon" onClick={() => setPurchaseQty(Math.max(1, purchaseQty - 1))} style={{ border: 'none', borderRadius: 0, background: '#f8fafc', padding: '0.5rem 0.8rem', color: '#475569' }}><i className="ph ph-minus"></i></button>
                    <span style={{ padding: '0 1rem', fontWeight: 600 }}>{purchaseQty}</span>
                    <button className="btn btn-icon" onClick={() => setPurchaseQty(purchaseQty + 1)} style={{ border: 'none', borderRadius: 0, background: '#f8fafc', padding: '0.5rem 0.8rem', color: '#475569' }}><i className="ph ph-plus"></i></button>
                  </div>
                  <button className="btn btn-outline" onClick={() => handleTopUp(purchaseQty)} style={{ flex: 1 }}>Buy Now</button>
                </div>
              </div>

              <div className="stat-card highlight" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', position: 'relative', borderColor: 'var(--accent)' }}>
                <div className="badge" style={{ top: '-10px', right: '-10px', background: '#e0f2fe', color: '#0284c7', position: 'absolute', padding: '0.2rem 0.8rem', borderRadius: '15px', fontWeight: 700, fontSize: '0.85rem' }}>10% Off</div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{PACKAGE_NAME}</h4>
                <p className="price" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
                  £270 <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748b' }}>/ package</span>
                </p>
                <p className="small-desc" style={{ marginBottom: '1.5rem' }}>Unlock priority scheduling, lesson notes, homework, and progress tracking.</p>
                <button className="btn btn-primary btn-full" onClick={() => handleTopUp(10)} style={{ marginTop: 'auto' }}>Secure Bundle</button>
              </div>
            </div>
          </div>

          {/* Review Section */}
          {reviewFlash && (
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, color: '#16a34a', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="ph ph-check-circle"></i> Review successfully submitted — thank you!
              </p>
            </div>
          )}
          {!reviewDone && (
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', marginBottom: '0.75rem' }}>
                <i className="ph ph-star" style={{ color: '#f59e0b', fontSize: '1.2rem' }}></i>
                Leave a Review
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                  Enjoyed your lessons? I would love to hear from you — your feedback helps other families find the right tutor.
                </p>
                <div style={{ display: 'flex', gap: '2px' }} onMouseLeave={() => setReviewHover(0)}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <span
                      key={s}
                      onMouseEnter={() => setReviewHover(s)}
                      onMouseDown={() => setReviewRating(s)}
                      style={{
                        fontSize: '2rem', lineHeight: 1, cursor: 'pointer',
                        color: s <= starsDisplay ? '#f59e0b' : '#94a3b8',
                        userSelect: 'none', display: 'inline-block', padding: '2px 4px',
                      }}
                    >★</span>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Tell us about your experience with Teacher Andrew..."
                  rows={4}
                  style={{ width: '100%', maxWidth: 500, padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
                />
                {reviewText.length > 0 && reviewWordCount < 10 && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    {10 - reviewWordCount} more word{10 - reviewWordCount !== 1 ? 's' : ''} needed
                  </p>
                )}
                <button
                  onClick={() => { if (reviewCanSubmit && !reviewSubmitting) handleSubmitReview(); }}
                  style={{
                    width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1.6rem', borderRadius: '50px', border: 'none', fontWeight: 600,
                    fontSize: '0.95rem', fontFamily: 'inherit', cursor: reviewCanSubmit ? 'pointer' : 'not-allowed',
                    background: reviewCanSubmit ? '#1e3a5f' : '#cbd5e1', color: '#fff', transition: 'background 0.2s',
                  }}
                >
                  <i className="ph ph-paper-plane-tilt"></i>
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
                {reviewError && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <i className="ph ph-warning-circle"></i> {reviewError}
                  </p>
                )}
              </div>
            </div>
          )}

          {selectedDate && (
            <div className="booking-modal">
              <div className="modal-content">
                <h3>Confirm Booking</h3>
                <p>You are booking a lesson on:<br /><strong>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(selectedDate)}</strong></p>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.75rem' }}>Select a booking option:</p>

                <div className="monthly-booking-option">
                  <label className="checkbox-container">
                    <input type="radio" name="bookingType" checked={bookingType === 'single'} onChange={() => setBookingType('single')} />
                    <span className="checkmark"></span>
                    <div className="checkbox-text">
                      <strong>Secure slot for one lesson</strong>
                      <span className="cost-badge">1 Credit</span>
                    </div>
                  </label>
                </div>

                {showMonthlyOption && (
                  <div className="monthly-booking-option" style={{ marginTop: 10 }}>
                    <label className="checkbox-container">
                      <input type="radio" name="bookingType" checked={bookingType === 'monthly'} onChange={() => setBookingType('monthly')} />
                      <span className="checkmark"></span>
                      <div className="checkbox-text">
                        <strong>Secure slots for 4 weeks</strong>
                        <span className="cost-badge">4 Credits</span>
                      </div>
                    </label>
                  </div>
                )}

                {showTenOption && (
                  <div className="monthly-booking-option" style={{ marginTop: 10 }}>
                    <label className="checkbox-container">
                      <input type="radio" name="bookingType" checked={bookingType === 'ten'} onChange={() => setBookingType('ten')} />
                      <span className="checkmark" style={{ borderColor: 'var(--accent)' }}></span>
                      <div className="checkbox-text">
                        <strong>Secure slots for 10 weeks</strong>
                        <span className="cost-badge">10 Credits</span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setSelectedDate(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={confirmBooking}>
                    Confirm Booking ({bookingType === 'monthly' ? '4' : bookingType === 'ten' ? '10' : '1'} Credit{bookingType !== 'single' ? 's' : ''})
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="contact-section" style={{ marginTop: '3rem', maxWidth: '600px', margin: '3rem auto 0' }}>
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', padding: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}><i className="ph ph-envelope-simple"></i> Message Teacher Andrew</h4>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                This form is for initial contact only. All remaining contact can be done via email to my private Gmail account.
              </p>
              <ContactForm />
            </div>
          </div>

          <div className="auth-header" style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button onClick={handleLogout} className="btn btn-outline">Log Out</button>
          </div>
        </div>
      </div>
    </main>
  );
}
