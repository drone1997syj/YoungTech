import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { UserCheck, ShieldCheck } from 'lucide-react';

export default function AdditionalInfo() {
  const { updateSocialProfile, navigate } = useShop();
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || !address) {
      setError('연락처와 주소를 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    const res = await updateSocialProfile(phone, address);
    setSubmitting(false);

    if (res.success) {
      alert('회원가입 절차가 모두 완료되었습니다! 영테크 솔루션 몰에 오신 것을 진심으로 환영합니다.');
      navigate('home');
    } else {
      setError(res.message || '정보 등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="additional-info-page container py-12 flex justify-center items-center animate-fade-in">
      <div className="auth-card card p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="auth-icon-bg bg-purple-50 flex items-center justify-center mx-auto mb-4" style={{ width: '64px', height: '64px' }}>
            <UserCheck size={32} className="text-primary" />
          </div>
          <h2 className="font-extrabold text-dark text-xl mb-2">추가 정보 등록</h2>
          <p className="text-xs text-light">네이버 간편 로그인 연동을 환영합니다!</p>
        </div>

        {/* Humble Guidance Message */}
        <div className="humble-notice-box p-4 rounded bg-purple-50 border border-purple-100 text-xs text-primary leading-relaxed mb-6 flex gap-3">
          <ShieldCheck size={28} className="text-primary flex-shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <b>고객님께 깊이 양해를 구합니다.</b>
            <p className="mt-1 text-light">
              성공적인 영테크 산업용 자동화 솔루션 주문 및 부품 안전 배송 환경을 설계하기 위해 필수적인 최소 정보를 겸손히 수집하고 있습니다. 
              고객님의 귀중한 개인정보는 소중히 다루어 정확한 가상 배송 처리를 위해서만 사용됨을 약속드립니다.
            </p>
          </div>
        </div>

        {error && <div className="alert-box alert-danger mb-4 text-xs font-semibold">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label text-xs font-bold text-dark mb-1">연락처 (가상 전화번호)</label>
            <input 
              type="text" 
              className="form-input text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예시: 010-1234-5678"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs font-bold text-dark mb-1">가상 배송 주소</label>
            <textarea 
              className="form-input text-sm h-20 resize-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="예시: 경기도 시흥시 공단1대로 123 영테크 센터 302호"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full py-2.5 font-bold text-sm mt-4"
            disabled={submitting}
          >
            {submitting ? '정보 등록 중...' : '가입 완료하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
