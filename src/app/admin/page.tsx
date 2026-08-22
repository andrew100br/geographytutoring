"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const THAI_TZ = 'Asia/Bangkok';

// Admin calendar always shows times in Thailand timezone (UTC+7) regardless of
// where the admin's browser is located.
const thaiFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: THAI_TZ, hour: '2-digit', minute: '2-digit' });

function getThaiDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: THAI_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const p: Record<string, string> = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  return p;
}

function getThaiDayOfWeek(date: Date) {
  // 0=Sun ... 6=Sat in Thailand timezone
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: THAI_TZ, weekday: 'short' }).format(date);
  const map: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return map[parts] ?? new Date(date).getDay();
}

function generateThaiTimeSlots(baseDateStr: Date) {
  const schedule: Record<number, string[]> = {
    1: ['17:00'], 2: ['17:00'], 3: ['17:00'],
    4: ['17:00', '18:00'], 5: ['17:00'], 6: [],
    0: ['16:00', '17:00', '18:00']
  };
  const dayOfWeek = getThaiDayOfWeek(baseDateStr);
  const slots: { raw: Date, display: string }[] = [];

  if (schedule[dayOfWeek]?.length > 0) {
    const { year, month, day } = getThaiDateParts(baseDateStr);
    schedule[dayOfWeek].forEach(timeStr => {
      const isoStr = `${year}-${month}-${day}T${timeStr}:00+07:00`;
      const raw = new Date(isoStr);
      slots.push({ raw, display: thaiFormatter.format(raw) });
    });
  }
  return slots;
}

const MOCK_ADMIN_USER = 'admin';
const LESSON_PRICE = 25;
const PACKAGE_NAME = 'Committed Package';
// Only count revenue from bookings on or after this date (go-live date, excludes test data)
const REVENUE_START_DATE = new Date('2026-04-06T00:00:00Z');

export default function AdminPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard Data
  const [profiles, setProfiles] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [globalSchedule, setGlobalSchedule] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<number[]>([]); // stored as ms timestamps
  const [loading, setLoading] = useState(false);
  const [currentMonthStart, setCurrentMonthStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const totalStudents = profiles.length;
  const totalCredits = profiles.reduce((sum, p) => sum + (p.credits || 0), 0);

  // Modals
  const [activeModal, setActiveModal] = useState<'details' | 'reschedule' | 'add' | 'edit' | 'newBooking' | null>(null);
  const [blockingSlot, setBlockingSlot] = useState<string | null>(null);

  // Newsletter State
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<any | null>(null);

  // Client search/sort state
  const [clientSearch, setClientSearch] = useState('');
  const [sortKey, setSortKey] = useState<'child_name' | 'credits' | 'email'>('child_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [quickCreditLoading, setQuickCreditLoading] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | '1y' | 'all'>('30d');

  // Reviews state
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Subscribers state
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [newsletterHistory, setNewsletterHistory] = useState<any[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);

  const COUNTRY_NAMES: Record<string, string> = {
    'GB':'United Kingdom','US':'United States','AU':'Australia','CA':'Canada','IE':'Ireland',
    'TH':'Thailand','SG':'Singapore','HK':'Hong Kong','MY':'Malaysia','IN':'India',
    'AE':'UAE','SA':'Saudi Arabia','QA':'Qatar','KW':'Kuwait','BH':'Bahrain','OM':'Oman',
    'DE':'Germany','FR':'France','NL':'Netherlands','IT':'Italy','ES':'Spain','CH':'Switzerland',
    'SE':'Sweden','NO':'Norway','DK':'Denmark','BE':'Belgium','AT':'Austria','PL':'Poland',
    'NZ':'New Zealand','ZA':'South Africa','NG':'Nigeria','KE':'Kenya','GH':'Ghana',
    'PK':'Pakistan','BD':'Bangladesh','LK':'Sri Lanka','PH':'Philippines','CN':'China',
    'JP':'Japan','KR':'South Korea','BR':'Brazil','MX':'Mexico','AR':'Argentina',
  };

  const loadAnalytics = async (range?: '7d' | '30d' | '1y' | 'all') => {
    const r = range || analyticsRange;
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_analytics', password: adminPass, payload: { range: r } }),
      });
      if (res.ok) setAnalytics(await res.json());
    } catch { /* silent */ }
    setAnalyticsLoading(false);
  };

  const loadReviews = async (password: string) => {
    setReviewsLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_reviews', password }),
      });
      if (res.ok) {
        const data = await res.json();
        const all = data.reviews || [];
        setPendingReviews(all.filter((r: any) => !r.approved));
        setApprovedReviews(all.filter((r: any) => r.approved));
      }
    } catch { /* silent */ }
    setReviewsLoading(false);
  };

  const loadSubscribers = async (password: string) => {
    setSubscribersLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_subscribers', password }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
        setNewsletterHistory(data.newsletterHistory || []);
      }
    } catch { /* silent */ }
    setSubscribersLoading(false);
  };

  const approveReview = async (reviewId: string) => {
    await fetch('/.netlify/functions/admin-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_review', password: adminPass, payload: { reviewId } }),
    });
    loadReviews(adminPass);
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Delete this review permanently?')) return;
    await fetch('/.netlify/functions/admin-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_review', password: adminPass, payload: { reviewId } }),
    });
    loadReviews(adminPass);
  };

  const handleDeploy = async () => {
    if (!confirm('This will rebuild and redeploy the website. New blog posts scheduled for this month will go live. Continue?')) return;
    setDeploying(true); setDeployResult(null);
    try {
      const res = await fetch('/.netlify/functions/trigger-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass }),
      });
      const data = await res.json();
      setDeployResult(data);
    } catch (err: any) {
      setDeployResult({ error: err.message });
    } finally {
      setDeploying(false);
    }
  };

  // Details Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Dashboard redesign — per-student extras (Zoom, exams, notes, quizzes, mocks, homework)
  const [studentExams, setStudentExams] = useState<any[]>([]);
  const [lessonNotes, setLessonNotes] = useState<any[]>([]);
  const [quizScores, setQuizScores] = useState<any[]>([]);
  const [mockExams, setMockExams] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [zoomLink, setZoomLink] = useState('');
  const [zoomPassword, setZoomPassword] = useState('');
  const [zoomSaved, setZoomSaved] = useState(false);
  const [examDraft, setExamDraft] = useState({ name: '', examDate: '' });
  const [noteFormBookingId, setNoteFormBookingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState({ topic: '', file: null as File | null });
  const [quizFormBookingId, setQuizFormBookingId] = useState<string | null>(null);
  const [quizDraft, setQuizDraft] = useState({ score: '', outOf: '10' });
  const [mockFormOpen, setMockFormOpen] = useState(false);
  const [mockDraft, setMockDraft] = useState({ title: '', info: '', result: '', examDate: '', file: null as File | null });
  const [hwFormOpen, setHwFormOpen] = useState(false);
  const [hwDraft, setHwDraft] = useState({ dueDate: '', instructions: '' });

  // Add Client Modal State
  const [addForm, setAddForm] = useState({ parentName: '', childName: '', email: '', country: '', password: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Client Modal State
  const [editForm, setEditForm] = useState({ userId: '', parentName: '', childName: '', country: '', credits: 0, isCommittedPackage: false });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Reschedule Modal State
  const [rescheduleData, setRescheduleData] = useState<any>({ bookingId: '', datetime: '', refund: false });
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Manual "Book New Lesson" Modal State
  const [newBookingData, setNewBookingData] = useState<any>({ datetime: '', deductCredit: true });
  const [isBookingNew, setIsBookingNew] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_logged_in') === 'true' && sessionStorage.getItem('admin_pass')) {
      const pass = sessionStorage.getItem('admin_pass') || '';
      setAdminPass(pass);
      setIsAdminLoggedIn(true);
      loadDashboardData(pass);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser.trim().toLowerCase() !== MOCK_ADMIN_USER || !adminPass) {
      setLoginError('Incorrect admin credentials.');
      return;
    }
    setLoginError('Verifying...');
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_dashboard_data', password: adminPass }),
      });
      if (!res.ok) {
        setLoginError('Incorrect password.');
        setAdminPass('');
        return;
      }
      sessionStorage.setItem('admin_logged_in', 'true');
      sessionStorage.setItem('admin_pass', adminPass);
      setIsAdminLoggedIn(true);
      loadDashboardData(adminPass);
    } catch {
      setLoginError('Could not connect. Try again.');
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
          if (bDate < now && bDate >= REVENUE_START_DATE && b.status !== 'cancelled' && b.status !== 'amended') {
            actualRevenue += LESSON_PRICE;
          }
        });
        scheduleList.sort((a,b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
        setGlobalSchedule(scheduleList);
      }
      setRevenue(actualRevenue);

      loadReviews(password);
      loadSubscribers(password);

      // Fetch blocked slots from dedicated table
      const blockedRes = await fetch('/.netlify/functions/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_blocked_slots', password })
      });
      if (blockedRes.ok) {
        const blockedData = await blockedRes.json();
        setBlockedSlots((blockedData.blockedSlots || []).map((d: string) => new Date(d).getTime()));
      }
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
    setZoomLink(user.zoom_link || '');
    setZoomPassword(user.zoom_password || '');
    setZoomSaved(false);
    setNoteFormBookingId(null);
    setQuizFormBookingId(null);
    setMockFormOpen(false);
    setHwFormOpen(false);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false });
    setUserBookings(bookings || []);

    // Dashboard-redesign extras — defensive: if the migration hasn't run yet,
    // this just comes back empty and the rest of the panel still works.
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST',
        body: JSON.stringify({ action: 'get_student_data', password: adminPass, payload: { userId: user.id } }),
      });
      if (res.ok) {
        const data = await res.json();
        setStudentExams(data.exams || []);
        setLessonNotes(data.lessonNotes || []);
        setQuizScores(data.quizScores || []);
        setMockExams(data.mockExams || []);
        setHomeworkList(data.homework || []);
      } else {
        setStudentExams([]); setLessonNotes([]); setQuizScores([]); setMockExams([]); setHomeworkList([]);
      }
    } catch {
      setStudentExams([]); setLessonNotes([]); setQuizScores([]); setMockExams([]); setHomeworkList([]);
    }
    setDetailsLoading(false);
  };

  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const saveZoomCredentials = async () => {
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'set_zoom_credentials', password: adminPass, payload: { userId: selectedUser.id, zoomLink, zoomPassword } }),
      });
      if (!res.ok) throw new Error();
      setZoomSaved(true);
    } catch { alert('Failed to save Zoom details.'); }
  };

  const addStudentExam = async () => {
    if (!examDraft.name || !examDraft.examDate) return;
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'add_student_exam', password: adminPass, payload: { userId: selectedUser.id, name: examDraft.name, examDate: examDraft.examDate } }),
      });
      if (!res.ok) throw new Error();
      setExamDraft({ name: '', examDate: '' });
      openDetails(selectedUser);
    } catch { alert('Failed to add exam.'); }
  };

  const deleteStudentExam = async (examId: string) => {
    try {
      await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'delete_student_exam', password: adminPass, payload: { examId } }),
      });
      setStudentExams(prev => prev.filter(e => e.id !== examId));
    } catch { alert('Failed to remove exam.'); }
  };

  const saveLessonNote = async (bookingId: string, lessonNumber: number | null) => {
    try {
      let fileBase64, fileName;
      if (noteDraft.file) { fileBase64 = await fileToBase64(noteDraft.file); fileName = noteDraft.file.name; }
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'add_lesson_note', password: adminPass, payload: { userId: selectedUser.id, bookingId, lessonNumber, topic: noteDraft.topic || 'Untitled Lesson', fileBase64, fileName } }),
      });
      if (!res.ok) throw new Error();
      setNoteFormBookingId(null);
      setNoteDraft({ topic: '', file: null });
      openDetails(selectedUser);
    } catch { alert('Failed to save lesson note.'); }
  };

  const saveQuizScore = async (bookingId: string, lessonNumber: number | null, topic: string) => {
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'add_quiz_score', password: adminPass, payload: { userId: selectedUser.id, bookingId, lessonNumber, topic, score: quizDraft.score, outOf: quizDraft.outOf } }),
      });
      if (!res.ok) throw new Error();
      setQuizFormBookingId(null);
      setQuizDraft({ score: '', outOf: '10' });
      openDetails(selectedUser);
    } catch { alert('Failed to save quiz score.'); }
  };

  const saveMockExam = async () => {
    if (!mockDraft.title) return;
    try {
      let fileBase64, fileName;
      if (mockDraft.file) { fileBase64 = await fileToBase64(mockDraft.file); fileName = mockDraft.file.name; }
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'add_mock_exam', password: adminPass, payload: { userId: selectedUser.id, title: mockDraft.title, info: mockDraft.info, result: mockDraft.result, examDate: mockDraft.examDate, fileBase64, fileName } }),
      });
      if (!res.ok) throw new Error();
      setMockFormOpen(false);
      setMockDraft({ title: '', info: '', result: '', examDate: '', file: null });
      openDetails(selectedUser);
    } catch { alert('Failed to save mock exam.'); }
  };

  const deleteMockExam = async (mockExamId: string) => {
    try {
      await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'delete_mock_exam', password: adminPass, payload: { mockExamId } }),
      });
      setMockExams(prev => prev.filter(m => m.id !== mockExamId));
    } catch { alert('Failed to remove mock exam.'); }
  };

  const saveHomework = async (bookingId: string, lessonNumber: number | null) => {
    try {
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'add_homework', password: adminPass, payload: { userId: selectedUser.id, bookingId, lessonNumber, dueDate: hwDraft.dueDate, instructions: hwDraft.instructions } }),
      });
      if (!res.ok) throw new Error();
      setHwFormOpen(false);
      setHwDraft({ dueDate: '', instructions: '' });
      openDetails(selectedUser);
    } catch { alert('Failed to save homework.'); }
  };

  const toggleBookingMissed = async (bookingId: string, missed: boolean) => {
    try {
      await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({ action: 'mark_booking_missed', password: adminPass, payload: { bookingId, missed } }),
      });
      setUserBookings(prev => prev.map(b => b.id === bookingId ? { ...b, missed } : b));
    } catch { alert('Failed to update lesson status.'); }
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reschedule booking.');
      }
      alert('Booking successfully amended!');
      setActiveModal(null);
      loadDashboardData(adminPass);
    } catch (err: any) { alert(err.message || 'Failed to reschedule booking.'); }
    setIsRescheduling(false);
  };

  const openReschedule = (b: any) => {
    const d = new Date(b.booking_date);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const formattedLocal = !isNaN(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
    setRescheduleData({ bookingId: b.id, datetime: formattedLocal, refund: false });
    setActiveModal('reschedule');
  };

  const openNewBooking = () => {
    setNewBookingData({ datetime: '', deductCredit: true });
    setActiveModal('newBooking');
  };

  const handleNewBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBookingNew(true);
    try {
      const newIsoString = new Date(newBookingData.datetime).toISOString();
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST', body: JSON.stringify({
          action: 'admin_book_slot', password: adminPass,
          payload: { userId: selectedUser.id, newIsoString, deductCredit: newBookingData.deductCredit }
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to book lesson.');
      }
      alert('Lesson booked and added to the calendar!');
      setActiveModal(null);
      loadDashboardData(adminPass);
    } catch (err: any) { alert(err.message || 'Failed to book lesson.'); }
    setIsBookingNew(false);
  };

  const handleBlockSlot = async (slotIso: string, isBlocked: boolean) => {
    setBlockingSlot(slotIso);
    try {
      const action = isBlocked ? 'unblock_slot' : 'block_slot';
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, password: adminPass, payload: { slotIso } })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed.'); }
      const ms = new Date(slotIso).getTime();
      setBlockedSlots(prev => isBlocked ? prev.filter(t => t !== ms) : [...prev, ms]);
    } catch (err: any) { alert(err.message); }
    setBlockingSlot(null);
  };

  const quickAdjustCredits = async (userId: string, currentCredits: number, delta: number) => {
    const newCredits = Math.max(0, currentCredits + delta);
    setQuickCreditLoading(userId);
    try {
      const profile = profiles.find(p => p.id === userId);
      const res = await fetch('/.netlify/functions/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_user', password: adminPass, payload: {
          userId, credits: newCredits,
          parentName: profile?.parent_name || '', childName: profile?.child_name || '', country: profile?.country || ''
        }}),
      });
      if (!res.ok) throw new Error();
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, credits: newCredits } : p));
    } catch { alert('Failed to update credits.'); }
    setQuickCreditLoading(null);
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
  const futureBookings = userBookings.filter(b => (b.status === 'confirmed' || b.status === 'rescheduled') && new Date(b.booking_date) >= now);
  const hasMonthly = futureBookings.some(b => b.is_monthly);
  const membershipStatus = selectedUser?.is_committed_package
    ? <span style={{ color: 'var(--accent)' }}><i className="ph ph-star"></i> {PACKAGE_NAME} — Active</span>
    : hasMonthly ? <span style={{ color: '#16a34a' }}><i className="ph ph-star"></i> Monthly Subscriber</span> : (futureBookings.length > 0 || (selectedUser?.credits || 0) > 0) ? <span>Pay As You Go</span> : <span style={{ color: '#ea580c' }}>Trial / Lead</span>;

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

        {/* SITE ANALYTICS */}
        <div style={{ background: '#fff', padding: '1.5rem 2rem', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}><i className="ph ph-chart-line" style={{ color: 'var(--primary-color)', marginRight: '0.4rem' }}></i>Site Analytics</h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Homepage + booking page visits. Admin page visits are not counted.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {(['7d', '30d', '1y', 'all'] as const).map(r => (
                <button key={r} onClick={() => { setAnalyticsRange(r); loadAnalytics(r); }}
                  style={{ padding: '0.35rem 0.8rem', borderRadius: 6, border: '1px solid', fontSize: '0.82rem', cursor: 'pointer', fontWeight: analyticsRange === r ? 700 : 400,
                    background: analyticsRange === r ? '#1e3a5f' : '#f8fafc',
                    color: analyticsRange === r ? '#fff' : '#64748b',
                    borderColor: analyticsRange === r ? '#1e3a5f' : '#e2e8f0' }}>
                  {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '1y' ? '1 Year' : 'All Time'}
                </button>
              ))}
              <button className="btn btn-outline" style={{ fontSize: '0.82rem' }} onClick={() => loadAnalytics()} disabled={analyticsLoading}>
                <i className="ph ph-arrows-clockwise"></i> {analyticsLoading ? '...' : 'Refresh'}
              </button>
            </div>
          </div>

          {!analytics && !analyticsLoading && (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>Click "Load Analytics" to view your site traffic data.</p>
          )}

          {analyticsLoading && (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>Loading analytics...</p>
          )}

          {analytics && (
            <>
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Today', value: analytics.today, color: '#3b82f6', sub: 'visits' },
                  { label: 'Last 7 Days', value: analytics.thisWeek, color: '#8b5cf6', sub: 'visits' },
                  { label: 'Last 30 Days', value: analytics.thisMonth, color: '#f59e0b', sub: 'visits' },
                  { label: 'All Time', value: analytics.allTime, color: '#16a34a', sub: 'visits' },
                  { label: 'Accounts Created', value: analytics.accountsCreated ?? '—', color: '#0ea5e9', sub: 'total' },
                  { label: 'Bought Credits', value: analytics.accountsPurchased ?? '—', color: '#ec4899', sub: 'accounts' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 0.3rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</p>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* 14-day sparkline */}
              {analytics.trend && analytics.trend.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                    {analyticsRange === '7d' ? 'Daily Visits — Last 7 Days' : analyticsRange === '30d' ? 'Daily Visits — Last 30 Days' : 'Monthly Visits — Last 12 Months'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 60 }}>
                    {(() => {
                      const max = Math.max(...analytics.trend.map((d: any) => d.count), 1);
                      return analytics.trend.map((d: any, i: number) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${d.date}: ${d.count} visits`}>
                          <div style={{ width: '100%', background: '#1e3a5f', borderRadius: '2px 2px 0 0', height: `${Math.max((d.count / max) * 52, d.count > 0 ? 4 : 1)}px`, opacity: d.count === 0 ? 0.15 : 1 }} />
                          <span style={{ fontSize: '0.6rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Countries */}
                <div>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Visits by Country <span style={{ fontWeight: 400, color: '#94a3b8' }}>({analyticsRange === '7d' ? 'last 7 days' : analyticsRange === '30d' ? 'last 30 days' : analyticsRange === '1y' ? 'last year' : 'all time'})</span></p>
                  {analytics.countries.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No data yet.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <tbody>
                        {analytics.countries.map((c: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.4rem 0.5rem', color: '#334155' }}>{COUNTRY_NAMES[c.code] || c.code}</td>
                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, width: 60 }}>
                                  <div style={{ background: '#1e3a5f', borderRadius: 4, height: 6, width: `${(c.count / analytics.countries[0].count) * 60}px` }} />
                                </div>
                                <span style={{ fontWeight: 600, color: '#1e3a5f', minWidth: 24 }}>{c.count}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Top pages */}
                <div>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Top Pages <span style={{ fontWeight: 400, color: '#94a3b8' }}>({analyticsRange === '7d' ? 'last 7 days' : analyticsRange === '30d' ? 'last 30 days' : analyticsRange === '1y' ? 'last year' : 'all time'})</span></p>
                  {analytics.pages.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No data yet.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <tbody>
                        {analytics.pages.map((p: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.4rem 0.5rem', color: '#334155', fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.page}</td>
                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>{p.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* GLOBAL UPCOMING SCHEDULE */}
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Teaching Schedule</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Times shown in Thailand time (UTC+7)</p>
              </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#3b82f6', borderRadius: '50%' }}></span> Confirmed</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#22c55e', borderRadius: '50%' }}></span> Completed</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#ef4444', borderRadius: '50%' }}></span> Cancelled</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#f59e0b', borderRadius: '50%' }}></span> Old Slot (Rescheduled)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#b91c1c', borderRadius: '50%' }}></span> Missed</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ display: 'inline-block', width: 12, height: 12, background: '#fecaca', borderRadius: '50%', border: '1px solid #dc2626' }}></span> Blocked</span>
            </div>
          </div>
          <div className="calendar-wrapper" style={{ marginTop: '2rem' }}>
            <div className="calendar-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary btn-icon" onClick={() => { const d = new Date(currentMonthStart); d.setMonth(d.getMonth() - 1); setCurrentMonthStart(d); }} style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}><i className="ph ph-caret-left"></i></button>
              <h3 style={{ margin: 0 }}>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonthStart)}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => { const d = new Date(currentMonthStart); d.setMonth(d.getMonth() + 1); setCurrentMonthStart(d); }} style={{ padding: '0.5rem', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}><i className="ph ph-caret-right"></i></button>
            </div>

            {(() => {
              const year = currentMonthStart.getFullYear();
              const month = currentMonthStart.getMonth();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const firstDow = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
              const leadingBlanks = (firstDow + 6) % 7; // Monday-start
              const todayThai = new Intl.DateTimeFormat('en-CA', { timeZone: THAI_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

              const cells: (Date | null)[] = [];
              for (let i = 0; i < leadingBlanks; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6, marginBottom: 6, minWidth: 900 }}>
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(wd => (
                      <div key={wd} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', paddingBottom: 4 }}>{wd}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6, minWidth: 900, overflowX: 'auto' }}>
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} style={{ minHeight: 70 }} />;
                      const slots = generateThaiTimeSlots(day);
                      const dayThai = new Intl.DateTimeFormat('en-CA', { timeZone: THAI_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(day);
                      const isToday = todayThai === dayThai;

                      // Dynamically inject custom out-of-schedule slots present in the database for this day
                      const dayBookings = globalSchedule.filter(b => new Date(b.booking_date).toDateString() === day.toDateString() && b.status !== 'cancelled' && b.status !== 'amended');
                      dayBookings.forEach(b => {
                        const localDateObj = new Date(b.booking_date);
                        const isoStr = localDateObj.toISOString();
                        if (!slots.some(s => s.raw.toISOString() === isoStr)) {
                          slots.push({ raw: localDateObj, display: thaiFormatter.format(localDateObj) });
                        }
                      });
                      slots.sort((a, b) => a.raw.getTime() - b.raw.getTime());

                      return (
                        <div key={i} style={{ minHeight: 70, borderRadius: 8, border: isToday ? '2px solid #1e293b' : '1.5px solid #e2e8f0', background: '#fff', padding: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isToday ? '#1e293b' : '#64748b', padding: '0 2px' }}>{day.getDate()}</span>
                          {slots.length === 0 && <span style={{ fontSize: '0.65rem', color: '#cbd5e1', padding: '0 2px' }}>—</span>}
                          {slots.map((s, idx) => {
                            const matchingBookings = globalSchedule.filter(b => new Date(b.booking_date).getTime() === s.raw.getTime() && b.status !== 'cancelled' && b.status !== 'amended');

                            if (matchingBookings.length > 0) {
                              return (
                                <React.Fragment key={idx}>
                                  {matchingBookings.map((matchBooking, bIdx) => {
                                    const user = profiles.find(p => p.id === matchBooking.user_id) || { child_name: 'Unknown', parent_name: 'Unknown' };
                                    const isFutureActive = new Date(matchBooking.booking_date) >= now && (matchBooking.status === 'confirmed' || matchBooking.status === 'rescheduled');
                                    let badgeBg, badgeColor, statusText;

                                    if (isFutureActive) {
                                      badgeBg = '#3b82f6'; badgeColor = '#ffffff'; statusText = 'Confirmed';
                                    } else if (matchBooking.status === 'cancelled') {
                                      badgeBg = '#ef4444'; badgeColor = '#ffffff'; statusText = 'Cancelled';
                                    } else if (matchBooking.status === 'amended') {
                                      badgeBg = '#f59e0b'; badgeColor = '#ffffff'; statusText = 'Rescheduled';
                                    } else if (matchBooking.missed) {
                                      badgeBg = '#b91c1c'; badgeColor = '#ffffff'; statusText = 'Missed';
                                    } else {
                                      badgeBg = '#22c55e'; badgeColor = '#ffffff'; statusText = 'Completed';
                                    }

                                    return (
                                      <div key={bIdx} style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeBg}`, padding: '3px 4px', borderRadius: 5, fontSize: '0.65rem', lineHeight: 1.25, cursor: 'pointer' }} onClick={() => openDetails(user)}>
                                        <div>{s.display}</div>
                                        <div style={{ fontWeight: 700 }}>{user.child_name || user.parent_name}</div>
                                      </div>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            } else {
                              const isBlocked = blockedSlots.includes(s.raw.getTime());
                              const isProcessing = blockingSlot === s.raw.toISOString();
                              return (
                                <div key={idx} style={{ background: isBlocked ? '#fef2f2' : '#f8fafc', color: isBlocked ? '#b91c1c' : '#94a3b8', border: isBlocked ? '1px solid #fecaca' : '1px dashed #cbd5e1', padding: '3px 4px', borderRadius: 5, fontSize: '0.65rem', lineHeight: 1.25 }}>
                                  <div>{s.display} {isBlocked ? 'Blocked' : 'Available'}</div>
                                  <button
                                    onClick={() => handleBlockSlot(s.raw.toISOString(), isBlocked)}
                                    disabled={isProcessing}
                                    style={{ marginTop: 2, width: '100%', border: 'none', borderRadius: 3, padding: '1px 0', fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer', background: isBlocked ? '#dc2626' : '#64748b', color: '#fff' }}
                                  >
                                    {isProcessing ? '...' : isBlocked ? 'Unblock' : 'Block'}
                                  </button>
                                </div>
                              );
                            }
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* CLIENTS DB */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Client Database</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>{profiles.length} total client{profiles.length !== 1 ? 's' : ''}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                style={{ padding: '0.5rem 0.9rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem', width: 220 }}
              />
              <button className="btn btn-primary" onClick={() => setActiveModal('add')}><i className="ph ph-user-plus"></i> Add New Client</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)' }}>
                {([['child_name','Student'], ['email','Email'], ['country','Country'], ['credits','Credits']] as [typeof sortKey, string][]).map(([key, label]) => (
                  <th key={key} style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } }}>
                    {label} {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Booked / Done</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Quick Credits</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center' }}>Loading clients...</td></tr> :
                (() => {
                  const query = clientSearch.toLowerCase();
                  const filtered = profiles.filter(p =>
                    !query ||
                    (p.child_name || '').toLowerCase().includes(query) ||
                    (p.parent_name || '').toLowerCase().includes(query) ||
                    (p.email || '').toLowerCase().includes(query)
                  );
                  const sorted = [...filtered].sort((a, b) => {
                    const av = (a[sortKey] ?? '').toString().toLowerCase();
                    const bv = (b[sortKey] ?? '').toString().toLowerCase();
                    const n = sortKey === 'credits' ? (Number(a.credits) - Number(b.credits)) : av.localeCompare(bv);
                    return sortDir === 'asc' ? n : -n;
                  });
                  if (sorted.length === 0) return <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No clients match your search.</td></tr>;
                  return sorted.map(p => {
                    const userBkgs = globalSchedule.filter(b => b.user_id === p.id);
                    let booked = 0, completed = 0;
                    userBkgs.forEach(b => {
                      const bDate = new Date(b.booking_date);
                      if ((b.status === 'confirmed' || b.status === 'rescheduled') && bDate >= now) booked++;
                      else if (b.status === 'confirmed' && bDate < now) completed++;
                    });
                    const hasFuture = booked > 0;
                    const hasCredits = (p.credits || 0) > 0;
                    const hasHistory = completed > 0;
                    let statusLabel = 'Trial / Lead';
                    let statusStyle: React.CSSProperties = { background: '#fef3c7', color: '#92400e' };
                    if (hasFuture || hasCredits) { statusLabel = 'Active'; statusStyle = { background: '#dcfce7', color: '#15803d' }; }
                    else if (hasHistory) { statusLabel = 'Inactive'; statusStyle = { background: '#f1f5f9', color: '#475569' }; }
                    const isQLoading = quickCreditLoading === p.id;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent)' }} onClick={() => openDetails(p)} title="View details">{p.child_name || 'N/A'}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.parent_name || ''}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{p.email}</span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(p.email); setCopiedEmail(p.id); setTimeout(() => setCopiedEmail(null), 2000); }}
                              title="Copy email"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedEmail === p.id ? '#16a34a' : '#94a3b8', padding: '0.1rem', lineHeight: 1, fontSize: '0.85rem' }}
                            >{copiedEmail === p.id ? <i className="ph ph-check"></i> : <i className="ph ph-copy"></i>}</button>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{p.country || '—'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ padding: '0.25rem 0.6rem', background: hasCredits ? '#dcfce7' : '#fee2e2', color: hasCredits ? '#16a34a' : '#991b1b', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700 }}>{p.credits || 0}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, ...statusStyle }}>{statusLabel}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>{booked}</span>
                          <span style={{ color: '#cbd5e1', margin: '0 0.3rem' }}>/</span>
                          <span style={{ color: '#64748b' }}>{completed}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <button onClick={() => quickAdjustCredits(p.id, p.credits || 0, -1)} disabled={isQLoading || (p.credits || 0) === 0}
                              style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: (p.credits || 0) === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '1rem', opacity: (p.credits || 0) === 0 ? 0.4 : 1 }}>−</button>
                            <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{isQLoading ? '…' : (p.credits || 0)}</span>
                            <button onClick={() => quickAdjustCredits(p.id, p.credits || 0, 1)} disabled={isQLoading}
                              style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>+</button>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => openDetails(p)} title="View full booking history"><i className="ph ph-list-dashes"></i> Details</button>
                            <button className="btn btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', color: '#0284c7', borderColor: '#bae6fd' }} onClick={() => {
                                setEditForm({ userId: p.id, parentName: p.parent_name || '', childName: p.child_name || '', country: p.country || '', credits: p.credits || 0, isCommittedPackage: !!p.is_committed_package });
                                setActiveModal('edit'); setEditError('');
                            }} title="Edit client info"><i className="ph ph-pencil-simple"></i> Edit</button>
                            <button className="btn btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteClient(p.id, p.child_name || p.parent_name)} title="Delete account permanently"><i className="ph ph-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              }
            </tbody>
          </table>
          </div>
        </div>

        {/* REVIEWS MODERATION */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, border: '1px solid var(--border-color)', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <i className="ph ph-star" style={{ fontSize: '1.5rem', color: '#f59e0b' }}></i>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Student Reviews</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Approve reviews to publish them on the homepage.</p>
            </div>
          </div>

          {reviewsLoading ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading reviews...</p>
          ) : (
            <>
              {/* Pending */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="ph ph-clock"></i> Awaiting Approval
                {pendingReviews.length > 0 && (
                  <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 20 }}>{pendingReviews.length}</span>
                )}
              </h3>
              {pendingReviews.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>No reviews waiting for approval.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {pendingReviews.map((r: any) => (
                    <div key={r.id} style={{ border: '1px solid #fde68a', borderRadius: 8, padding: '1rem 1.25rem', background: '#fffbeb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{r.reviewer_name}</span>
                            <span style={{ color: '#f59e0b', fontSize: '1rem', letterSpacing: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                          </div>
                          <p style={{ margin: '0 0 0.5rem', color: '#334155', fontSize: '0.9rem', lineHeight: 1.6 }}>"{r.review_text}"</p>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(r.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => approveReview(r.id)}>
                            <i className="ph ph-check"></i> Approve
                          </button>
                          <button className="btn btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => deleteReview(r.id)}>
                            <i className="ph ph-trash"></i> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Approved */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="ph ph-check-circle"></i> Published on Website
                {approvedReviews.length > 0 && (
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 20 }}>{approvedReviews.length}</span>
                )}
              </h3>
              {approvedReviews.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No reviews published yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {approvedReviews.map((r: any) => (
                    <div key={r.id} style={{ border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.85rem 1.25rem', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{r.reviewer_name}</span>
                          <span style={{ color: '#f59e0b', fontSize: '0.9rem' }}>{'★'.repeat(r.rating)}</span>
                        </div>
                        <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}>"{r.review_text.length > 120 ? r.review_text.slice(0, 120) + '…' : r.review_text}"</p>
                      </div>
                      <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5', flexShrink: 0 }} onClick={() => deleteReview(r.id)}>
                        <i className="ph ph-trash"></i> Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* SUBSCRIBERS */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, border: '1px solid var(--border-color)', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <i className="ph ph-envelope-simple" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Email Subscribers</h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Parents who subscribed for monthly study guides. Emails are only accessible here — never exposed publicly.
                </p>
              </div>
            </div>
            <button className="btn btn-outline" style={{ fontSize: '0.82rem' }} onClick={() => loadSubscribers(adminPass)} disabled={subscribersLoading}>
              <i className="ph ph-arrows-clockwise"></i> {subscribersLoading ? '...' : 'Refresh'}
            </button>
          </div>

          {subscribersLoading ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>Loading subscribers...</p>
          ) : subscribers.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No subscribers yet.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Subscribed</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Newsletters Received</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub: any, i: number) => {
                      const subDate = new Date(sub.subscribed_at);
                      const received = newsletterHistory.filter(nl => new Date(nl.sent_at) >= subDate);
                      return (
                        <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '0.75rem 1rem', color: '#1e293b', fontWeight: 500 }}>{sub.name || '—'}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#334155', fontFamily: 'monospace', fontSize: '0.85rem' }}>{sub.email}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                            {subDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                            {received.length > 0
                              ? `${received.length} email${received.length !== 1 ? 's' : ''} — last ${new Date(received[0].sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                              : <span style={{ color: '#cbd5e1' }}>None yet</span>
                            }
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: sub.active ? '#dcfce7' : '#fee2e2', color: sub.active ? '#16a34a' : '#dc2626' }}>
                              {sub.active ? 'Active' : 'Unsubscribed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {newsletterHistory.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                    Newsletter Send History
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {newsletterHistory.map((nl: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                        <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          <i className="ph ph-check-circle"></i> {new Date(nl.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span style={{ color: '#334155', fontSize: '0.9rem', flex: 1 }}>{nl.title || 'Newsletter'}</span>
                        <span style={{ color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {nl.sent} sent{nl.failed > 0 ? `, ${nl.failed} failed` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* DEPLOY + AUTO NEWSLETTER */}
        <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, border: '1px solid var(--border-color)', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <i className="ph ph-rocket-launch" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Publish Monthly Blog Post</h2>
          </div>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem', maxWidth: 560 }}>
            On the 1st of each month, click this button. It will publish the new blog post to the website <strong>and automatically email all subscribers</strong> with a link to read it. One click — done.
          </p>
          <button className="btn btn-primary" onClick={handleDeploy} disabled={deploying} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="ph ph-rocket-launch"></i> {deploying ? 'Publishing & Emailing Subscribers...' : 'Publish Post & Email Subscribers'}
          </button>
          {deployResult && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 6, background: deployResult.error ? '#fef2f2' : '#f0fdf4', border: `1px solid ${deployResult.error ? '#fecaca' : '#bbf7d0'}`, color: deployResult.error ? '#dc2626' : '#15803d', fontSize: '0.9rem' }}>
              {deployResult.error
                ? `Error: ${deployResult.error}`
                : (deployResult as any).newsletter
                  ? `✓ Published! Emailed ${(deployResult as any).sent} subscriber${(deployResult as any).sent !== 1 ? 's' : ''}. The new post will be live on the site in about 60 seconds.`
                  : `✓ ${(deployResult as any).message || 'Site is rebuilding — new post will be live in about 60 seconds.'}`
              }
            </div>
          )}
        </div>

        {/* MODALS */}
        {activeModal === 'details' && selectedUser && (
          <div className="booking-modal" style={{ display: 'flex' }}>
            <div className="modal-content" style={{ maxWidth: 700, maxHeight: '85vh', overflowY: 'auto', textAlign: 'left' }}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Full Booking History</h4>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={openNewBooking}><i className="ph ph-calendar-plus"></i> Book New Lesson</button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                {detailsLoading ? <li style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Loading bookings...</li> :
                  userBookings.length === 0 ? <li style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>No bookings found.</li> :
                  userBookings.map((b, i) => {
                    const isFutureConfirmed = (b.status === 'confirmed' || b.status === 'rescheduled') && new Date(b.booking_date) >= now;
                    let badge = '';
                    if (isFutureConfirmed) {
                      badge = b.is_monthly ? `<span style="background: #3b82f6; color: #ffffff; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Active Monthly</span>` : `<span style="background: #3b82f6; color: #ffffff; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Confirmed</span>`;
                    } else if (b.status === 'cancelled') {
                      badge = `<span style="background: #ef4444; color: #ffffff; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Cancelled</span>`;
                    } else if (b.status === 'amended') {
                      badge = `<span style="background: #f59e0b; color: #ffffff; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Rescheduled</span>`;
                    } else {
                      badge = `<span style="background: #22c55e; color: #ffffff; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">Completed</span>`;
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

              {(() => {
                const now2 = new Date();
                const pastConfirmedAsc = [...userBookings]
                  .filter(b => (b.status === 'confirmed' || b.status === 'rescheduled') && new Date(b.booking_date) < now2)
                  .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime());
                const lessonNumberFor = (bookingId: string) => {
                  const idx = pastConfirmedAsc.findIndex(b => b.id === bookingId);
                  return idx >= 0 ? idx + 1 : null;
                };
                const upcomingConfirmed = [...userBookings]
                  .filter(b => (b.status === 'confirmed' || b.status === 'rescheduled') && new Date(b.booking_date) >= now2)
                  .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime());
                const recentPast = [...pastConfirmedAsc].reverse().slice(0, 8);

                const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', fontFamily: 'inherit' };
                const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 0.35rem' };

                return (
                  <>
                    {/* Zoom Classroom Link */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}><i className="ph ph-video-camera" style={{ color: 'var(--accent)' }}></i> Zoom Classroom Link</h4>
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Private link for {selectedUser.child_name}</label>
                        <input style={inputStyle} value={zoomLink} onChange={e => { setZoomLink(e.target.value); setZoomSaved(false); }} placeholder="https://zoom.us/j/..." />
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: '0 0 220px' }}>
                          <label style={labelStyle}>Zoom Password</label>
                          <input style={inputStyle} value={zoomPassword} onChange={e => { setZoomPassword(e.target.value); setZoomSaved(false); }} placeholder="e.g. Geo2026!" />
                        </div>
                        <button className="btn btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }} onClick={saveZoomCredentials}>Save</button>
                      </div>
                      {zoomSaved && <p style={{ fontSize: 12, color: '#15803d', fontWeight: 600, margin: '0.5rem 0 0' }}>Saved.</p>}
                    </div>

                    {/* Upcoming Tests / Exams */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.75rem' }}>Upcoming Tests / Exams</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                        {studentExams.length === 0 && <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No exams added yet.</p>}
                        {studentExams.map(ex => (
                          <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                            <span style={{ fontSize: '0.85rem' }}><strong>{ex.name}</strong> — {new Date(ex.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <button onClick={() => deleteStudentExam(ex.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><i className="ph ph-trash"></i></button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <label style={labelStyle}>Exam Name</label>
                          <input style={inputStyle} value={examDraft.name} onChange={e => setExamDraft({ ...examDraft, name: e.target.value })} placeholder="e.g. GCSE Geography — Paper 1" />
                        </div>
                        <div style={{ flex: '0 0 160px' }}>
                          <label style={labelStyle}>Date</label>
                          <input type="date" style={inputStyle} value={examDraft.examDate} onChange={e => setExamDraft({ ...examDraft, examDate: e.target.value })} />
                        </div>
                        <button className="btn btn-outline" style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }} onClick={addStudentExam}><i className="ph ph-plus"></i> Add</button>
                      </div>
                    </div>

                    {/* Upcoming Lessons — What to Cover */}
                    {upcomingConfirmed.length > 0 && (
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem' }}>Upcoming Lessons</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {upcomingConfirmed.map(b => (
                            <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.6rem 0.85rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(b.booking_date))}</span>
                                {b.cover_note ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 10px', borderRadius: 20 }}>What to Cover set</span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No prep notes from student</span>
                                )}
                              </div>
                              {b.cover_note && <p style={{ marginTop: 8, marginBottom: 0, fontSize: '0.85rem', color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.6rem 0.75rem', lineHeight: 1.5 }}>&ldquo;{b.cover_note}&rdquo;</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Lessons — Complete/Missed + Lesson Notes + Quiz Scores */}
                    {recentPast.length > 0 && (
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem' }}>Recent Lessons</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {recentPast.map(b => {
                            const lessonNum = lessonNumberFor(b.id);
                            const existingNote = lessonNotes.find(n => n.booking_id === b.id);
                            const existingQuiz = quizScores.find(q => q.booking_id === b.id);
                            const isMissed = !!b.missed;
                            return (
                              <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                    {lessonNum && <span style={{ color: 'var(--accent)' }}>Lesson {lessonNum} — </span>}
                                    {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(b.booking_date))}
                                  </span>
                                  <div style={{ display: 'inline-flex', border: '1px solid #e2e8f0', borderRadius: 50, overflow: 'hidden' }}>
                                    <button onClick={() => toggleBookingMissed(b.id, false)} style={{ border: 'none', fontSize: '0.7rem', fontWeight: 600, padding: '0.35rem 0.7rem', cursor: 'pointer', background: isMissed ? '#fff' : '#dcfce7', color: isMissed ? '#94a3b8' : '#15803d' }}>Completed</button>
                                    <button onClick={() => toggleBookingMissed(b.id, true)} style={{ border: 'none', fontSize: '0.7rem', fontWeight: 600, padding: '0.35rem 0.7rem', cursor: 'pointer', background: isMissed ? '#fee2e2' : '#fff', color: isMissed ? '#b91c1c' : '#94a3b8' }}>Missed</button>
                                  </div>
                                </div>

                                {isMissed ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '0.5rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>
                                    Marked missed — shows in red on the parent&apos;s calendar
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                      {existingNote ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.7rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>
                                          {existingNote.topic} — {existingNote.pdf_url ? 'PDF attached' : 'saved'}
                                        </div>
                                      ) : (
                                        <button className="btn btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => { setNoteFormBookingId(noteFormBookingId === b.id ? null : b.id); setNoteDraft({ topic: '', file: null }); }}>
                                          <i className="ph ph-file-text"></i> {noteFormBookingId === b.id ? 'Close' : 'Add Lesson Note'}
                                        </button>
                                      )}
                                      {existingQuiz ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.7rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                                          Quiz: {existingQuiz.score}/{existingQuiz.out_of}
                                        </div>
                                      ) : (
                                        <button className="btn btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => { setQuizFormBookingId(quizFormBookingId === b.id ? null : b.id); setQuizDraft({ score: '', outOf: '10' }); }}>
                                          <i className="ph ph-target"></i> {quizFormBookingId === b.id ? 'Close' : 'Add Quiz Score'}
                                        </button>
                                      )}
                                    </div>

                                    {noteFormBookingId === b.id && (
                                      <div style={{ marginTop: 10, padding: '0.75rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
                                        <label style={labelStyle}>Topic / Unit Covered</label>
                                        <input style={{ ...inputStyle, marginBottom: 10 }} value={noteDraft.topic} onChange={e => setNoteDraft({ ...noteDraft, topic: e.target.value })} placeholder="e.g. Rivers & Coasts — Landforms" />
                                        <label style={labelStyle}>Lesson Notes PDF</label>
                                        <input type="file" accept="application/pdf" style={{ marginBottom: 10, fontSize: '0.85rem' }} onChange={e => setNoteDraft({ ...noteDraft, file: e.target.files?.[0] || null })} />
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                          <button className="btn btn-outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={() => setNoteFormBookingId(null)}>Cancel</button>
                                          <button className="btn btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={() => saveLessonNote(b.id, lessonNum)}>Save Note</button>
                                        </div>
                                      </div>
                                    )}
                                    {quizFormBookingId === b.id && (
                                      <div style={{ marginTop: 10, padding: '0.75rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 6 }}>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                          <div style={{ flex: '0 0 90px' }}>
                                            <label style={labelStyle}>Score</label>
                                            <input style={inputStyle} type="number" min={0} value={quizDraft.score} onChange={e => setQuizDraft({ ...quizDraft, score: e.target.value })} placeholder="8" />
                                          </div>
                                          <div style={{ flex: '0 0 90px' }}>
                                            <label style={labelStyle}>Out of</label>
                                            <input style={inputStyle} type="number" min={1} value={quizDraft.outOf} onChange={e => setQuizDraft({ ...quizDraft, outOf: e.target.value })} placeholder="10" />
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                                          <button className="btn btn-outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={() => setQuizFormBookingId(null)}>Cancel</button>
                                          <button className="btn btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={() => saveQuizScore(b.id, lessonNum, noteDraft.topic)}>Save Score</button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 0' }}>Quiz scores feed into the student&apos;s Quiz/Exam Scores tab and their overall Progress Analysis badges.</p>
                      </div>
                    )}

                    {/* Exam Questions & Mocks */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0 }}>Exam Questions &amp; Mocks</h4>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setMockFormOpen(!mockFormOpen)}><i className="ph ph-plus"></i> {mockFormOpen ? 'Close' : 'Add Mock / Exam'}</button>
                      </div>
                      {mockFormOpen && (
                        <div style={{ padding: '0.9rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, marginBottom: 12 }}>
                          <label style={labelStyle}>Title</label>
                          <input style={{ ...inputStyle, marginBottom: 10 }} value={mockDraft.title} onChange={e => setMockDraft({ ...mockDraft, title: e.target.value })} placeholder="e.g. Paper 2 Mock — Challenges in the Human Environment" />
                          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: '0 0 160px' }}>
                              <label style={labelStyle}>Grade / Score</label>
                              <input style={inputStyle} value={mockDraft.result} onChange={e => setMockDraft({ ...mockDraft, result: e.target.value })} placeholder="e.g. Grade 7 or 62/80" />
                            </div>
                            <div style={{ flex: '0 0 160px' }}>
                              <label style={labelStyle}>Date</label>
                              <input type="date" style={inputStyle} value={mockDraft.examDate} onChange={e => setMockDraft({ ...mockDraft, examDate: e.target.value })} />
                            </div>
                          </div>
                          <label style={labelStyle}>Info / Notes for Student</label>
                          <textarea style={{ ...inputStyle, minHeight: 70, marginBottom: 10, resize: 'vertical' }} value={mockDraft.info} onChange={e => setMockDraft({ ...mockDraft, info: e.target.value })} placeholder="e.g. Full past-paper conditions, 1hr 30min, marked against the AQA grade boundaries." />
                          <label style={labelStyle}>Marked Paper PDF</label>
                          <input type="file" accept="application/pdf" style={{ marginBottom: 10, fontSize: '0.85rem' }} onChange={e => setMockDraft({ ...mockDraft, file: e.target.files?.[0] || null })} />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={() => setMockFormOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={saveMockExam}>Save</button>
                          </div>
                        </div>
                      )}
                      {mockExams.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No exam questions or mock papers recorded yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {mockExams.map(m => (
                            <div key={m.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.title}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {m.result && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 20 }}>{m.result}</span>}
                                  <button onClick={() => deleteMockExam(m.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}><i className="ph ph-trash"></i></button>
                                </div>
                              </div>
                              {m.info && <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 8px' }}>{m.info}</p>}
                              {m.file_url && <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>Marked paper attached</a>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Homework */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0 }}>Homework — {PACKAGE_NAME} Students</h4>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setHwFormOpen(!hwFormOpen)}><i className="ph ph-plus"></i> {hwFormOpen ? 'Close' : 'Add Homework'}</button>
                      </div>
                      {hwFormOpen && (
                        <div style={{ padding: '0.9rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, marginBottom: 12 }}>
                          <label style={labelStyle}>Due Date</label>
                          <input type="date" style={{ ...inputStyle, marginBottom: 10 }} value={hwDraft.dueDate} onChange={e => setHwDraft({ ...hwDraft, dueDate: e.target.value })} />
                          <label style={labelStyle}>Instructions</label>
                          <textarea style={{ ...inputStyle, minHeight: 70, marginBottom: 10, resize: 'vertical' }} value={hwDraft.instructions} onChange={e => setHwDraft({ ...hwDraft, instructions: e.target.value })} placeholder="What should the student do?" />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={() => setHwFormOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }} onClick={() => saveHomework(recentPast[0]?.id, recentPast[0] ? lessonNumberFor(recentPast[0].id) : null)}>Save Homework</button>
                          </div>
                        </div>
                      )}
                      {homeworkList.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No homework set yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {homeworkList.map(hw => (
                            <div key={hw.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{hw.lesson_number ? `Lesson ${hw.lesson_number} Homework` : 'Homework'}</span>
                                {hw.due_date && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 20 }}>Due {new Date(hw.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                              </div>
                              {hw.instructions && <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 8px' }}>{hw.instructions}</p>}
                              {hw.uploaded_file_url ? (
                                <a href={hw.uploaded_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>Student uploaded — view file</a>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>No work uploaded yet</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              <button className="btn btn-secondary btn-full" style={{ marginTop: '1.5rem' }} onClick={() => setActiveModal(null)}>Close Data Panel</button>
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

        {activeModal === 'newBooking' && (
          <div className="booking-modal" style={{ display: 'flex', zIndex: 10000 }}>
            <div className="modal-content" style={{ maxWidth: 400 }}>
              <h3><i className="ph ph-calendar-plus"></i> Book New Lesson</h3>
              <p>Booking for: {selectedUser?.child_name || selectedUser?.parent_name}<br/>Credits: {selectedUser?.credits || 0}</p>
              <form onSubmit={handleNewBooking}>
                <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                  <label>Date & Time (Thai Time)</label>
                  <input type="datetime-local" value={newBookingData.datetime} onChange={e => setNewBookingData({...newBookingData, datetime: e.target.value})} required style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                  <label className="checkbox-container" style={{ fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={newBookingData.deductCredit} onChange={e => setNewBookingData({...newBookingData, deductCredit: e.target.checked})} />
                    <span className="checkmark"></span>
                    <strong>Deduct 1 credit?</strong> (Uncheck to comp this lesson)
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveModal('details')} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isBookingNew} style={{ flex: 1 }}>{isBookingNew ? '...' : 'Confirm Booking'}</button>
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
                <div className="form-group">
                  <label>Credit Balance <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.85rem' }}>(1 credit = 1 lesson slot)</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setEditForm({...editForm, credits: Math.max(0, editForm.credits - 1)})} style={{ padding: '0.5rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 4, background: '#f8fafc', cursor: 'pointer', fontSize: '1rem' }}>−</button>
                    <input type="number" min="0" value={editForm.credits} onChange={e=>setEditForm({...editForm, credits: Math.max(0, parseInt(e.target.value) || 0)})} style={{ width: '80px', padding: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, fontSize: '1.1rem' }} />
                    <button type="button" onClick={() => setEditForm({...editForm, credits: editForm.credits + 1})} style={{ padding: '0.5rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 4, background: '#f8fafc', cursor: 'pointer', fontSize: '1rem' }}>+</button>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="checkbox-container" style={{ fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={editForm.isCommittedPackage} onChange={e => setEditForm({ ...editForm, isCommittedPackage: e.target.checked })} />
                    <span className="checkmark"></span>
                    <strong>On the {PACKAGE_NAME}</strong> <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.85rem' }}>(unlocks Lesson Notes, Homework, Quiz/Exam Scores, Progress Analysis for this student)</span>
                  </label>
                </div>
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
