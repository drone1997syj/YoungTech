import React, { useEffect, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Loader2 } from 'lucide-react';
import SocialAccountLinkModal from '../components/SocialAccountLinkModal';

export default function GoogleCallback() {
  const { loginWithGoogle, navigate } = useShop();
  const [status, setStatus] = useState('구글 로그인 요청을 확인하고 있습니다...');
  const [linkRequest, setLinkRequest] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (!code) {
        setStatus('올바르지 않은 접근입니다. 인가 코드가 없습니다.');
        setTimeout(() => navigate('login'), 2000);
        return;
      }

      try {
        setStatus('구글 인증 정보를 바탕으로 계정을 연동하고 있습니다...');
        const res = await loginWithGoogle(code, state);

        if (res.requiresAccountLink) {
          setLinkRequest(res);
          setStatus('기존 영테크 계정 확인이 필요합니다.');
          window.history.replaceState({}, document.title, '/login');
          return;
        }

        if (res.success) {
          if (res.created) {
            alert('구글 간편가입이 완료되었습니다. 바로 로그인됩니다.');
          }
          if (res.linked) {
            alert('💡 계정 연동 안내\n\n기존 가입하신 이메일 계정이 확인되어, 해당 구글 소셜 계정과 안전하게 자동 연동되었습니다.');
          }

          setStatus('로그인에 성공했습니다! 홈으로 이동합니다.');
          window.history.replaceState({}, document.title, '/');
          setTimeout(() => navigate('home'), 1000);
        } else {
          setStatus(`로그인 실패: ${res.message || '알 수 없는 오류'}`);
          window.history.replaceState({}, document.title, '/');
          setTimeout(() => navigate('login'), 3000);
        }
      } catch (err) {
        setStatus('인증 처리 도중 오류가 발생했습니다.');
        console.error(err);
        window.history.replaceState({}, document.title, '/');
        setTimeout(() => navigate('login'), 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="container py-24 flex flex-col items-center justify-center text-center animate-fade-in">
      <div className="card p-12 max-w-sm w-full flex flex-col items-center gap-6">
        <Loader2 size={40} className="text-primary animate-spin" />
        <h3 className="font-bold text-dark text-base">구글 로그인 처리 중</h3>
        <p className="text-xs text-light leading-relaxed">{status}</p>
      </div>
      <SocialAccountLinkModal
        linkRequest={linkRequest}
        onClose={() => {
          setLinkRequest(null);
          navigate('login');
        }}
        onLinked={() => {
          alert('구글 간편로그인이 기존 영테크 계정에 연결되었습니다.');
          navigate('home');
        }}
      />
    </div>
  );
}
