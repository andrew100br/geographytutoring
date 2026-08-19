"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase v2 PKCE flow: the reset link arrives with ?code=... in the URL.
    // We must exchange that code for a session before updateUser() will work.
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setIsExpired(true);
        } else {
          setIsReady(true);
        }
      });
      return;
    }

    // Fallback: implicit flow uses hash fragment — Supabase fires PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setStatusMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);
    if (error) {
      setIsSuccess(false);
      setStatusMsg(error.message);
    } else {
      setIsSuccess(true);
      setStatusMsg('Password updated successfully! Taking you to login...');
      setTimeout(() => router.push('/booking'), 2500);
    }
  };

  return (
    <main className="booking-main bg-light" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="container" style={{ maxWidth: '480px', padding: '4rem 1rem' }}>
        <div className="auth-box">
          <div className="auth-header">
            <h2><i className="ph ph-lock-key"></i> Reset Your Password</h2>
          </div>

          {isExpired ? (
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: '#dc2626', marginBottom: '1.5rem' }}>This reset link has expired or is invalid. Please request a new one.</p>
              <button className="btn btn-primary" onClick={() => router.push('/booking')}>Back to Login</button>
            </div>
          ) : !isReady ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 1rem' }}>
              Verifying your reset link — please wait...
            </p>
          ) : (
            <form onSubmit={handleReset} className="booking-form" style={{ boxShadow: 'none', padding: 0 }}>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input type="password" id="newPassword" placeholder="At least 6 characters" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input type="password" id="confirmPassword" placeholder="Repeat your password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              {statusMsg && (
                <p style={{ marginBottom: '1rem', color: isSuccess ? '#16a34a' : '#dc2626', textAlign: 'center' }}>{statusMsg}</p>
              )}
              <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
