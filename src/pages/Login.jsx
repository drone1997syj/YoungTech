import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { loadGoogleIdentityScript, requestGoogleAccessToken } from '../utils/googleAuth';
import { LogIn, Key, UserPlus, ShieldAlert, X, Phone, MailCheck, ShieldCheck } from 'lucide-react';
import SocialAccountLinkModal from '../components/SocialAccountLinkModal';
import './Auth.css';

export default function Login() {
  const { login, loginWithGoogle, navigate, user, backendUrl } = useShop();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [securityWarning, setSecurityWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recovery Modal States
  const [showFindIdModal, setShowFindIdModal] = useState(false);
  const [showResetPwModal, setShowResetPwModal] = useState(false);
  const [findIdName, setFindIdName] = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');
  const [foundEmails, setFoundEmails] = useState(null);
  const [findIdMessage, setFindIdMessage] = useState('');
  const [resetPwEmail, setResetPwEmail] = useState('');
  const [tempPasswordResult, setTempPasswordResult] = useState('');
  const [linkRequest, setLinkRequest] = useState(null);
  const [unlockInfo, setUnlockInfo] = useState(null);
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockMessage, setUnlockMessage] = useState('');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'reset-password') {
      setShowResetPwModal(true);
    }
  }, []);

  React.useEffect(() => {
    loadGoogleIdentityScript().catch(() => {});
  }, []);

  const isTunnel = window.location.hostname.includes('trycloudflare.com') || window.location.hostname.includes('loca.lt');

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  // Guard: already logged-in users should never see the login page
  if (user) {
    navigate('home');
    return null;
  }

  const handleNaverLogin = () => {
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
    const origin = window.location.origin;
    const redirectUri = encodeURIComponent(`${origin}/oauth/callback/naver`);
    const state = Math.random().toString(36).substring(2, 12);

    if (isTunnel || !clientId || clientId === 'undefined' || clientId.trim() === '') {
      window.location.href = `/oauth/callback/naver?code=naver_mock_code_test&state=${state}`;
    } else {
      window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId.trim()}&redirect_uri=${redirectUri}&state=${state}`;
    }
  };

  const handleKakaoLogin = () => {
    const clientId = import.meta.env.VITE_KAKAO_CLIENT_ID;
    const origin = window.location.origin;
    const redirectUri = `${origin}/oauth/callback/kakao`;
    const state = Math.random().toString(36).substring(2, 12);

    if (isTunnel || !clientId || clientId === 'undefined' || clientId.trim() === '') {
      window.location.href = `/oauth/callback/kakao?code=kakao_mock_code_test&state=${state}`;
    } else {
      window.location.href = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    }
  };

  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      setError('구글 간편로그인을 사용하려면 VITE_GOOGLE_CLIENT_ID 설정이 필요합니다.');
      return;
    }

    setError('');
    setSubmitting(true);
    requestGoogleAccessToken(clientId.trim())
      .then(async (tokenResponse) => {
        const res = await loginWithGoogle({
          accessToken: tokenResponse.access_token,
          allowSignup: false
        });
        if (res.requiresAccountLink) {
          setLinkRequest(res);
          return;
        }
        if (res.success) {
          navigate('home');
        } else {
          setError(res.message || '구글 로그인에 실패했습니다.');
        }
      })
      .catch((err) => {
        setError(err.message || '구글 인증을 시작하지 못했습니다.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSecurityWarning('');
    
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      navigate('home');
    } else if (res.needsEmailUnlock) {
      setUnlockInfo({
        email,
        maskedEmail: res.maskedEmail,
        remainingMinutes: res.remainingMinutes,
        devUnlockCode: res.devUnlockCode,
        message: res.message
      });
      setUnlockCode('');
      setUnlockMessage('');
      setError(res.message || '계정 보호를 위해 로그인이 제한되었습니다.');
    } else if (res.showSecurityWarning) {
      setSecurityWarning(res.message || '로그인 실패가 누적되고 있습니다. 비밀번호를 다시 확인해 주세요.');
    } else {
      setError(res.message || '로그인에 실패했습니다.');
    }
  };

  const handleUnlockLogin = async (e) => {
    e.preventDefault();
    if (!unlockInfo?.email || !unlockCode.trim()) {
      setUnlockMessage('이메일 인증번호를 입력해 주세요.');
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/auth/unlock-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unlockInfo.email, code: unlockCode })
      });
      const data = await res.json();
      if (res.ok) {
        setUnlockMessage(data.message || '이메일 인증이 완료되었습니다. 다시 로그인해 주세요.');
        setPassword('');
        setError('');
        setSecurityWarning('');
        setTimeout(() => {
          setUnlockInfo(null);
          setUnlockCode('');
          setUnlockMessage('');
        }, 1200);
      } else {
        setUnlockMessage(data.message || '인증번호 확인에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setUnlockMessage('잠금 해제 중 오류가 발생했습니다.');
    }
  };

  const handleFindId = async (e) => {
    e.preventDefault();
    if (!findIdName.trim() || !findIdPhone.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/api/auth/find-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: findIdName, phone: findIdPhone })
      });
      const data = await res.json();
      if (res.ok) {
        setFoundEmails(data.emails);
        setFindIdMessage(data.message || '전체 이메일 주소는 가입된 이메일로 안내되었습니다.');
      } else {
        alert(data.message || '가입 정보를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwEmail.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetPwEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setTempPasswordResult(data.tempPassword);
      } else {
        alert(data.message || '일치하는 사용자 정보를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  const fillDemoAccount = () => {
    setEmail('test@youngtech.com');
    setPassword('password');
  };

  const fillAdminAccount = () => {
    setEmail('admin@youngtech.com');
    setPassword('admin123');
  };

  return (
    <div className="auth-page container py-12 flex justify-center items-center animate-fade-in">
      <div className="auth-card card p-8 max-w-md w-full">
        <div className="auth-header text-center mb-8">
          <h2 className="font-extrabold text-dark text-xl mb-1">영테크 로그인</h2>
          <p className="text-xs text-light">서비스 이용을 위해 로그인이 필요합니다.</p>
        </div>

        {error && <div className="alert-box alert-danger mb-4 text-xs font-semibold">{error}</div>}
        {securityWarning && (
          <div className="login-security-warning mb-4">
            <ShieldAlert size={16} />
            <span>{securityWarning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label text-xs font-bold text-dark mb-1">이메일 주소</label>
            <input 
              type="email" 
              className="form-input text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@youngtech.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-bold text-dark mb-1">비밀번호</label>
            <input 
              type="password" 
              className="form-input text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-2.5 font-bold text-sm mt-2"
            disabled={submitting}
          >
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="social-divider">
          <span>간편로그인</span>
        </div>

        <div className="social-auth-container mb-4">
          <button 
            onClick={handleNaverLogin}
            className="btn btn-naver"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: '6px' }}>
              <path d="M16.273 2.245H21v19.51h-4.727L7.727 8.327v13.428H3V2.245h4.727l8.546 13.428V2.245z"/>
            </svg>
            네이버로 시작하기
          </button>
          <button 
            onClick={handleKakaoLogin}
            className="btn btn-kakao"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#191919" style={{ marginRight: '6px' }}>
              <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.51 1.66 4.717 4.18 5.955-.173.65-.626 2.355-.716 2.7-.113.44.16.433.337.316.14-.092 2.204-1.498 3.093-2.106.666.096 1.36.15 2.106.15 4.97 0 9-3.186 9-7.115S16.97 3 12 3z"/>
            </svg>
            카카오로 시작하기
          </button>
          <button 
            onClick={handleGoogleLogin}
            className="btn btn-google"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '6px' }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Google로 시작하기
          </button>
        </div>

        {/* Demo Account Filler */}
        <div className="demo-fill-box mt-6 p-4 rounded bg-purple-50 border border-dashed border-purple-200 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-primary font-bold">테스트 계정 자동 입력:</span>
            <div className="flex gap-2">
              <button onClick={fillDemoAccount} className="btn btn-secondary py-1 px-2 text-2xs font-bold flex items-center gap-1">
                <Key size={10} /> 일반 유저
              </button>
              <button onClick={fillAdminAccount} className="btn btn-primary bg-purple-700 py-1 px-2 text-2xs font-bold flex items-center gap-1">
                <ShieldAlert size={10} /> 관리자
              </button>
            </div>
          </div>
          <p className="text-2xs text-light">
            **일반 유저**: test@youngtech.com (비밀번호: password)<br />
            **관리자**: admin@youngtech.com (비밀번호: admin123)
          </p>
        </div>

        <div className="flex justify-center gap-4 text-xs mt-6 pt-4 border-t text-slate-500">
          <button 
            onClick={() => { setShowFindIdModal(true); setFoundEmails(null); setFindIdMessage(''); setFindIdName(''); setFindIdPhone(''); }} 
            className="hover:text-primary transition-colors underline font-semibold"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            아이디 찾기
          </button>
          <span className="text-slate-300">|</span>
          <button 
            onClick={() => { setShowResetPwModal(true); setTempPasswordResult(''); setResetPwEmail(''); }} 
            className="hover:text-primary transition-colors underline font-semibold"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            비밀번호 찾기
          </button>
        </div>

        <div className="auth-footer text-center mt-4 text-xs">
          <span className="text-light">아직 회원이 아니신가요?</span>
          <button 
            onClick={() => navigate('register')}
            className="auth-link-btn font-bold text-primary ml-1 inline-flex items-center gap-1"
          >
            <UserPlus size={12} /> 회원가입 하기
          </button>
        </div>
      </div>

      {/* ID Recovery Modal */}
      {showFindIdModal && (
        <div className="recovery-modal" onClick={() => setShowFindIdModal(false)}>
          <div className="recovery-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="recovery-header">
              <h3>아이디(이메일) 찾기</h3>
              <button onClick={() => setShowFindIdModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleFindId}>
              <div className="recovery-body">
                <div className="recovery-input-group">
                  <label className="recovery-label">가입자 이름</label>
                  <input 
                    type="text" 
                    value={findIdName} 
                    onChange={(e) => setFindIdName(e.target.value)} 
                    className="recovery-input" 
                    placeholder="가입 시 입력했던 이름을 입력해 주세요" 
                    required 
                    autoFocus
                  />
                </div>
                <div className="recovery-input-group">
                  <label className="recovery-label">휴대폰 번호</label>
                  <div className="recovery-phone-field">
                    <Phone size={14} />
                    <input
                      type="tel"
                      value={findIdPhone}
                      onChange={(e) => setFindIdPhone(formatPhoneNumber(e.target.value))}
                      className="recovery-input"
                      placeholder="010-1234-5678"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>

                {foundEmails !== null && (
                  <div className="result-box result-box-id mt-2">
                    {foundEmails.length > 0 ? (
                      <>
                        <div className="result-id-title">
                          <MailCheck size={16} />
                          <span>확인된 이메일 계정</span>
                        </div>
                        <ul className="found-email-list">
                          {foundEmails.map((email, idx) => (
                            <li key={idx}>{email}</li>
                          ))}
                        </ul>
                        <p className="result-guide-text">{findIdMessage}</p>
                      </>
                    ) : (
                      <span className="text-red-500 font-bold">일치하는 가입 정보가 존재하지 않습니다.</span>
                    )}
                  </div>
                )}
              </div>
              <div className="recovery-footer">
                <button type="button" onClick={() => setShowFindIdModal(false)} className="btn-recovery-cancel">닫기</button>
                <button type="submit" className="btn-recovery-submit">찾기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SocialAccountLinkModal
        linkRequest={linkRequest}
        onClose={() => setLinkRequest(null)}
        onLinked={() => {
          alert('간편로그인이 기존 영테크 계정에 연결되었습니다.');
          navigate('home');
        }}
      />

      {unlockInfo && (
        <div className="recovery-modal" onClick={() => setUnlockInfo(null)}>
          <div className="recovery-container unlock-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="recovery-header">
              <h3>이메일 인증으로 로그인 제한 해제</h3>
              <button onClick={() => setUnlockInfo(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUnlockLogin}>
              <div className="recovery-body">
                <div className="unlock-security-card">
                  <ShieldCheck size={20} />
                  <div>
                    <b>계정 보호가 활성화되었습니다.</b>
                    <p>{unlockInfo.message}</p>
                  </div>
                </div>
                <div className="unlock-email-card">
                  <span>인증번호 발송 대상</span>
                  <b>{unlockInfo.maskedEmail}</b>
                </div>
                {unlockInfo.devUnlockCode && (
                  <div className="unlock-dev-code">
                    개발 테스트용 인증번호: <b>{unlockInfo.devUnlockCode}</b>
                  </div>
                )}
                <div className="recovery-input-group">
                  <label className="recovery-label">이메일 인증번호</label>
                  <input
                    type="text"
                    value={unlockCode}
                    onChange={(e) => setUnlockCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="recovery-input"
                    placeholder="6자리 인증번호"
                    inputMode="numeric"
                    autoFocus
                    required
                  />
                </div>
                {unlockMessage && <div className="unlock-message">{unlockMessage}</div>}
              </div>
              <div className="recovery-footer">
                <button type="button" onClick={() => setUnlockInfo(null)} className="btn-recovery-cancel">닫기</button>
                <button type="submit" className="btn-recovery-submit">인증하고 해제</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PW Recovery Modal */}
      {showResetPwModal && (
        <div className="recovery-modal" onClick={() => setShowResetPwModal(false)}>
          <div className="recovery-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="recovery-header">
              <h3>???? ??</h3>
              <button onClick={() => setShowResetPwModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="recovery-body">
                <div className="recovery-input-group">
                  <label className="recovery-label">??? ??</label>
                  <input
                    type="email"
                    value={resetPwEmail}
                    onChange={(e) => setResetPwEmail(e.target.value)}
                    className="recovery-input"
                    placeholder="example@youngtech.com"
                    required
                    autoFocus
                  />
                </div>

                {tempPasswordResult && (
                  <div className="result-box mt-2" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <span className="font-bold text-green-800">?? ????? ???????.</span>
                    <span className="text-3xs text-slate-500">?? ?? ??? ???? ?????.</span>
                    <div className="p-3 bg-white border border-green-200 rounded mt-2 text-center text-base font-black text-green-700 tracking-wider">
                      {tempPasswordResult}
                    </div>
                    <span className="text-3xs text-slate-500 text-center mt-1">??? ? ??????? ????? ??? ???.</span>
                  </div>
                )}
              </div>
              <div className="recovery-footer">
                <button type="button" onClick={() => setShowResetPwModal(false)} className="btn-recovery-cancel">??</button>
                <button type="submit" className="btn-recovery-submit">?? ???? ??</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
