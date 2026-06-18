import React, { useState } from 'react';
import { KeyRound, LockKeyhole, Link2, ShieldCheck, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import '../pages/Auth.css';

export default function SocialAccountLinkModal({ linkRequest, onClose, onLinked }) {
  const {
    linkSocialAccount,
    linkSocialAccountByEmail,
    confirmSocialAccountLink,
    backendUrl
  } = useShop();

  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetName, setResetName] = useState('');
  const [resetResult, setResetResult] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);

  if (!linkRequest) return null;

  const isEmailLink = linkRequest.linkMethod === 'email';
  const isConfirmLink = linkRequest.linkMethod === 'confirm';
  const providerLabel = linkRequest.providerLabel || '간편로그인';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEmailLink && verificationCode.length !== 6) {
      setError('이메일로 받은 6자리 인증번호를 입력해 주세요.');
      return;
    }

    if (!isEmailLink && !isConfirmLink && !password.trim()) {
      setError('기존 영테크 비밀번호를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    const res = isConfirmLink
      ? await confirmSocialAccountLink(linkRequest.linkToken)
      : isEmailLink
        ? await linkSocialAccountByEmail(linkRequest.linkId, verificationCode)
        : await linkSocialAccount(linkRequest.linkToken, password);

    setSubmitting(false);

    if (res.success) {
      onLinked?.(res);
      return;
    }

    setError(res.message || '계정 연결에 실패했습니다.');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetName.trim()) {
      setResetError('가입자 이름을 입력해 주세요.');
      return;
    }

    setResetting(true);
    setResetError('');
    setResetResult('');

    try {
      const res = await fetch(`${backendUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: linkRequest.email, name: resetName })
      });
      const data = await res.json();

      if (!res.ok) {
        setResetError(data.message || '비밀번호 찾기에 실패했습니다.');
        return;
      }

      setResetResult(data.tempPassword
        ? `테스트용 임시 비밀번호가 발급되었습니다: ${data.tempPassword}`
        : (data.message || '가입된 이메일로 임시 비밀번호 안내가 발송되었습니다.')
      );
      setPassword('');
    } catch (err) {
      console.error(err);
      setResetError('비밀번호 찾기 처리 중 오류가 발생했습니다.');
    } finally {
      setResetting(false);
    }
  };

  const getBodyCopy = () => {
    if (isConfirmLink) {
      return `확인된 이메일이 기존 영테크 계정과 같습니다. 연결하면 앞으로 ${providerLabel}로도 로그인할 수 있습니다.`;
    }
    if (isEmailLink) {
      return `이미 다른 ${providerLabel} 계정 연결 이력이 있어 계정 보호를 위해 이메일 인증이 필요합니다.`;
    }
    return `관리자 계정이거나 이메일 검증 상태를 확인할 수 없어 기존 영테크 비밀번호 확인이 필요합니다.`;
  };

  const getSubmitLabel = () => {
    if (submitting) return '연결 중...';
    if (isEmailLink) return '인증하고 로그인';
    return '연결하고 로그인';
  };

  return (
    <div className="social-link-modal-backdrop" onClick={onClose}>
      <div className="social-link-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="social-link-close" onClick={onClose} aria-label="닫기">
          <X size={18} />
        </button>

        <div className="social-link-icon">
          <Link2 size={22} />
        </div>

        <div className="social-link-copy">
          <span className="social-link-kicker">{providerLabel} 계정 연결</span>
          <h3>이미 영테크에 가입된 이메일입니다.</h3>
          <p>{getBodyCopy()}</p>
        </div>

        <div className="social-link-email-card">
          <span>확인된 이메일</span>
          <b>{linkRequest.maskedEmail}</b>
        </div>

        <form onSubmit={handleSubmit} className="social-link-form">
          {isConfirmLink && (
            <div className="social-link-code-guide social-link-confirm-guide">
              <ShieldCheck size={16} />
              <span>이메일 전체 주소가 일치할 때만 같은 고객으로 판단합니다. 연결 완료 후 기존 이메일로 알림이 발송됩니다.</span>
            </div>
          )}

          {isEmailLink && (
            <>
              <label>이메일 인증번호</label>
              <div className="social-link-password">
                <KeyRound size={15} />
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6자리 인증번호"
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              <div className="social-link-code-guide">
                <span>인증번호 유효시간은 10분이며, 5회 실패 시 재발급이 필요합니다.</span>
                {linkRequest.devVerificationCode && (
                  <b>개발 테스트용 인증번호: {linkRequest.devVerificationCode}</b>
                )}
              </div>
            </>
          )}

          {!isEmailLink && !isConfirmLink && (
            <>
              <label>영테크 비밀번호</label>
              <div className="social-link-password">
                <LockKeyhole size={15} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="기존 영테크 비밀번호 입력"
                  autoFocus
                />
              </div>
            </>
          )}

          {error && (
            <div className="social-link-error">
              <span>{error}</span>
              {!isEmailLink && !isConfirmLink && (
                <button
                  type="button"
                  className="social-link-find-password"
                  onClick={() => {
                    setShowPasswordReset(true);
                    setResetError('');
                    setResetResult('');
                  }}
                >
                  비번 찾기
                </button>
              )}
            </div>
          )}

          {!isEmailLink && !isConfirmLink && showPasswordReset && (
            <div className="social-link-reset-panel">
              <div className="social-link-reset-title">
                <KeyRound size={15} />
                <span>영테크 비밀번호 찾기</span>
              </div>
              <p>가입자 이름을 입력하면 확인된 이메일로 임시 비밀번호 안내가 진행됩니다.</p>
              <div className="social-link-reset-field">
                <input
                  type="text"
                  value={resetName}
                  onChange={(e) => setResetName(e.target.value)}
                  placeholder="가입자 이름"
                />
                <button type="button" onClick={handleResetPassword} disabled={resetting}>
                  {resetting ? '처리 중...' : '임시 비밀번호 발급'}
                </button>
              </div>
              {resetError && <div className="social-link-reset-error">{resetError}</div>}
              {resetResult && <div className="social-link-reset-success">{resetResult}</div>}
            </div>
          )}

          <div className="social-link-actions">
            <button type="button" className="social-link-cancel" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="social-link-submit" disabled={submitting}>
              {getSubmitLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
