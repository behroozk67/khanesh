import React, { useState, useEffect } from 'react';
import { LabMateLogo } from "./LabMateLogo.jsx";
import { Link, useNavigate } from 'react-router-dom';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          navigate('/app');
          return;
        }

        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'خطا در دریافت اطلاعات');
        setUser(data);
      } catch (err) {
        setError(err.message);
        if (err.message.includes('منقضی') || err.message.includes('نامعتبر')) {
          localStorage.removeItem('auth_token');
          navigate('/app');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/app');
  };

  if (loading) return <div className="page" dir="rtl"><div className="page-loading">در حال بارگذاری پروفایل…</div></div>;

  return (
    <div className="page" dir="rtl">
      <div className="shell">
        <header className="site-header" style={{ justifyContent: 'space-between' }}>
          <div className="logo"><Link to="/"><LabMateLogo height={32} /></Link></div>
          <div style={{ display: 'flex', gap: 'var(--s4)' }}>
            <Link to="/app" className="btn btn--outline" style={{ fontSize: 'var(--t-sm)' }}>داشبورد</Link>
            <button onClick={handleLogout} className="btn" style={{ fontSize: 'var(--t-sm)', color: 'var(--st-emergency-ink)' }}>خروج</button>
          </div>
        </header>

        <main className="site-panel" style={{ maxWidth: 600, margin: '0 auto', marginTop: 'var(--s8)' }}>
          <h1 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s2)' }}>پروفایل کاربری</h1>
          {error && <p style={{ color: 'var(--st-emergency-ink)' }}>{error}</p>}
          
          {user && (
            <>
              <p style={{ color: 'var(--ink-2)', marginBottom: 'var(--s6)' }}>
                شماره موبایل: <span dir="ltr" style={{ color: 'var(--ink)' }}>{user.phone}</span>
              </p>

              <h2 style={{ fontSize: 'var(--t-lg)', marginBottom: 'var(--s4)' }}>سوابق آزمایش‌های شما</h2>
              
              {user.jobs && user.jobs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                  {user.jobs.map(job => (
                    <div key={job.id} style={{ padding: 'var(--s4)', border: '1px solid var(--track)', borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>تاریخ: {new Date(job.created_at).toLocaleDateString('fa-IR')}</div>
                        <div style={{ marginTop: 'var(--s1)' }}>
                          وضعیت: 
                          <span style={{ color: job.status === 'completed' ? 'var(--st-ok-ink)' : job.status === 'failed' ? 'var(--st-emergency-ink)' : 'var(--ink-2)', marginRight: 'var(--s2)' }}>
                            {job.status === 'completed' ? 'تکمیل شده' : job.status === 'failed' ? 'خطا' : 'در حال پردازش'}
                          </span>
                        </div>
                      </div>
                      {job.status === 'completed' && (
                        <button 
                          className="btn btn--primary" 
                          style={{ fontSize: 'var(--t-sm)', padding: 'var(--s2) var(--s4)' }}
                          onClick={() => {
                            // در حالت واقعی، اینجا باید اطلاعات نتیجه لود شود
                            // برای سادگی کاربر به صفحه داشبورد برمی‌گردد
                            navigate('/app');
                          }}
                        >
                          مشاهده
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--ink-2)' }}>هنوز آزمایشی تحلیل نکرده‌اید.</p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
