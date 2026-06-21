'use client';

import { useState } from 'react';
import { internshipApi } from '../services/api';

interface ApplyButtonProps {
  internshipId: string;
  internshipTitle: string;
  isDeadlinePassed?: boolean;
  onSuccess?: (applicationId: string) => void;
}

export default function ApplyButton({
  internshipId, internshipTitle, isDeadlinePassed = false, onSuccess
}: ApplyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (isDeadlinePassed) {
    return (
      <button disabled style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, fontSize: '15px', cursor: 'not-allowed' }}>
        ⚠️ Deadline Passed
      </button>
    );
  }

  if (success) {
    return (
      <div style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontWeight: 700, fontSize: '15px', textAlign: 'center' }}>
        ✅ Applied Successfully!
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const { applicationApi } = await import('../services/api');
      const result = await applicationApi.apply({
        internship_id: internshipId,
        cover_letter: coverLetter || undefined,
        resume_url: resumeUrl || undefined,
      });
      setSuccess(true);
      setShowModal(false);
      if (onSuccess) onSuccess(result.id);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to submit application.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(167,139,250,0.35)', transition: 'all 0.2s ease' }}
        onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.transform = 'translateY(-2px)')}
        onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.transform = 'translateY(0)')}
      >
        Apply Now →
      </button>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1535 0%, #231d4f 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '560px', fontFamily: 'Inter, system-ui, sans-serif', color: '#fff' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 900 }}>Apply for Internship</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#a78bfa', fontWeight: 600 }}>{internshipTitle}</p>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>COVER LETTER (Optional)</label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell us why you're the perfect fit for this internship..."
                  rows={5}
                  maxLength={5000}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const, lineHeight: 1.6 }}
                />
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>{coverLetter.length}/5000</p>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>RESUME URL (Optional)</label>
                <input
                  type="url"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="https://drive.google.com/your-resume"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(null); }}
                  style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ flex: 2, padding: '13px', borderRadius: '10px', border: 'none', background: isSubmitting ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff', fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '14px', boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(167,139,250,0.35)' }}
                >
                  {isSubmitting ? 'Submitting...' : '🚀 Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
