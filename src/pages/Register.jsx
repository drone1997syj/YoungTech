import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { loadGoogleIdentityScript, requestGoogleAccessToken } from '../utils/googleAuth';
import { UserPlus, ArrowLeft, LogIn, Eye, EyeOff, Phone } from 'lucide-react';
import SocialAccountLinkModal from '../components/SocialAccountLinkModal';
import './Auth.css';

export default function Register() {
  const { register, loginWithGoogle, navigate, user } = useShop();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkRequest, setLinkRequest] = useState(null);

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

  // Guard: already logged-in users should never see the register page
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
      setError('구글 간편가입을 사용하려면 VITE_GOOGLE_CLIENT_ID 설정이 필요합니다.');
      return;
    }

    setError('');
    setSubmitting(true);
    requestGoogleAccessToken(clientId.trim())
      .then(async (tokenResponse) => {
        const res = await loginWithGoogle({
          accessToken: tokenResponse.access_token,
          allowSignup: true
        });
        if (res.requiresAccountLink) {
          setLinkRequest(res);
          return;
        }
        if (res.success) {
          setSuccess(true);
          alert('구글 간편가입이 완료되었습니다. 홈으로 이동합니다.');
          navigate('home');
        } else {
          setError(res.message || '구글 간편가입에 실패했습니다.');
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
    
    if (!email || !password || !confirmPassword || !name || !phone) {
      setError('모든 필수 입력 항목(*)을 입력해 주세요.');
      return;
    }

    if (!/^01\d{8,9}$/.test(phone.replace(/\D/g, ''))) {
      setError('휴대폰 번호를 올바르게 입력해 주세요. 예: 010-1234-5678');
      return;
    }

    if (password !== confirmPassword) {
      setError('입력하신 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    const res = await register(email, password, name, phone);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
      alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        navigate('login');
      }, 1500);
    } else {
      setError(res.message || '회원가입에 실패했습니다.');
    }
  };

  return (
    <div className="auth-page container py-12 flex justify-center items-center animate-fade-in">
      <div className="auth-card card p-8 max-w-md w-full">
        {/* Back Link */}
        <button 
          onClick={() => navigate('login')}
          className="back-btn flex items-center gap-1 text-xs font-semibold text-light mb-6"
        >
          <ArrowLeft size={12} /> 로그인으로 돌아가기
        </button>

        <div className="auth-header text-center mb-8">
          <h2 className="font-extrabold text-dark text-xl mb-1">영테크 회원가입</h2>
          <p className="text-xs text-light">새로운 계정을 생성합니다.</p>
        </div>

        {error && <div className="alert-box alert-danger mb-4 text-xs font-semibold">{error}</div>}
        {success && <div className="alert-box alert-success mb-4 text-xs font-semibold">회원가입 성공! 로그인 페이지로 이동 중...</div>}

        <form onSubmit={handleSubmit} className="auth-form flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label text-xs font-bold text-dark mb-1">이메일 주소 *</label>
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
            <label className="form-label text-xs font-bold text-dark mb-1">비밀번호 *</label>
            <div className="password-input-wrapper" style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="form-input text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                style={{ width: '100%', paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-bold text-dark mb-1">비밀번호 확인 *</label>
            <div className="password-input-wrapper" style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                className="form-input text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                style={{ width: '100%', paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle-btn"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-bold text-dark mb-1">고객명 / 회사명 *</label>
            <input 
              type="text" 
              className="form-input text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 또는 회사명 입력"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-bold text-dark mb-1">휴대폰 번호 *</label>
            <div className="phone-input-wrapper">
              <Phone size={15} />
              <input
                type="tel"
                className="form-input text-sm"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-1234-5678"
                inputMode="numeric"
                required
              />
            </div>
            <p className="form-help-text">아이디 찾기와 주문 연락에 사용됩니다.</p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-2.5 font-bold text-sm mt-4"
            disabled={submitting}
          >
            {submitting ? '가입 중...' : '가입하기'}
          </button>
        </form>

        <div className="social-divider">
          <span>간편가입</span>
        </div>

        <div className="social-auth-container mb-4">
          <button 
            onClick={handleNaverLogin}
            className="btn btn-naver"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: '6px' }}>
              <path d="M16.273 2.245H21v19.51h-4.727L7.727 8.327v13.428H3V2.245h4.727l8.546 13.428V2.245z"/>
            </svg>
            네이버로 가입하기
          </button>
          <button 
            onClick={handleKakaoLogin}
            className="btn btn-kakao"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#191919" style={{ marginRight: '6px' }}>
              <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.51 1.66 4.717 4.18 5.955-.173.65-.626 2.355-.716 2.7-.113.44.16.433.337.316.14-.092 2.204-1.498 3.093-2.106.666.096 1.36.15 2.106.15 4.97 0 9-3.186 9-7.115S16.97 3 12 3z"/>
            </svg>
            카카오로 가입하기
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
            Google로 가입하기
          </button>
        </div>

        <div className="auth-footer text-center mt-6 pt-6 border-t text-xs">
          <span className="text-light">이미 가입된 계정이 있으신가요?</span>
          <button 
            onClick={() => navigate('login')}
            className="auth-link-btn font-bold text-primary ml-1 inline-flex items-center gap-1"
          >
            <LogIn size={12} /> 로그인 하기
          </button>
        </div>
      </div>
      <SocialAccountLinkModal
        linkRequest={linkRequest}
        onClose={() => setLinkRequest(null)}
        onLinked={() => {
          alert('간편로그인이 기존 영테크 계정에 연결되었습니다.');
          navigate('home');
        }}
      />
    </div>
  );
}
