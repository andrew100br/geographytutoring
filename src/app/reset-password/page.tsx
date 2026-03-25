"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setStatusMsg("Password must be at least 6 characters.");
      setIsSuccess(false);
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
      setStatusMsg("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        router.push('/booking');
      }, 2000);
    }
  };

  return (
    <main className="booking-main" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="booking-container" style={{ maxWidth: '500px' }}>
        <div className="auth-box">
          <div className="auth-header">
            <h2><i className="ph ph-lock-key"></i> Reset Your Password</h2>
            <p>Enter your new password below to regain access to your account.</p>
          </div>

          <form onSubmit={handleReset} className="booking-form" style={{ boxShadow: 'none', padding: 0 }}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input type="password" id="newPassword" placeholder="••••••••" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>

            {statusMsg && (
              <p className="form-status" style={{ marginBottom: '1rem', color: isSuccess ? '#16a34a' : '#dc2626', textAlign: 'center' }}>
                {statusMsg}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
