import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Link2,
  MailCheck,
  ShieldCheck,
  X
} from 'lucide-react';
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
  const [resetStep, setResetStep] = useState('email');
  const [resetEmail, setResetEmail] = useState(linkRequest?.email || '');
  const [resetVerificationId, setResetVerificationId] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');
  const [resetMaskedEmail, setResetMaskedEmail] = useState('');
  const [resetDevCode, setResetDevCode] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);

  if (!linkRequest) return null;

  const isEmailLink = linkRequest.linkMethod === 'email';
  const isConfirmLink = linkRequest.linkMethod === 'confirm';
  const providerLabel = linkRequest.providerLabel || '간편로그인';

  const resetResetPanelState = () => {
    setResetStep('email');
    setResetVerificationId('');
    setResetCode('');
    setResetNewPassword('');
    setResetNewPasswordConfirm('');
    setResetMaskedEmail('');
    setResetDevCode('');
    setResetMessage('');
    setResetError('');
    setResetSubmitting(false);
    setShowResetPassword(false);
    setShowResetPasswordConfirm(false);
  };

  const openPasswordReset = () => {
    setShowPasswordReset(true);
    setResetEmail(linkRequest.email || '');
    resetResetPanelState();
  };

  const closePasswordReset = () => {
    setShowPasswordReset(false);
    resetResetPanelState();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEmailLink && verificationCode.length !== 6) {
      setError('이메일로 받은 6자리 인증번호를 입력해 주세요.');
      return;
    }

    if (!isEmailLink && !isConfirmLink && !password.trim()) {
      setError('기존 계정 비밀번호를 입력해 주세요.');
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

  const requestResetCode = async () => {
    const emailValue = resetEmail.trim();
    if (!emailValue) {
      setResetError('이메일을 입력해 주세요.');
      return;
    }

    setResetSubmitting(true);
    setResetError('');
    setResetMessage('');

    try {
      const res = await fetch(`${backendUrl}/api/auth/request-password-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue })
      });
      const data = await res.json();

      if (!res.ok) {
        setResetError(data.message || '인증번호 발급에 실패했습니다.');
        return;
      }

      setResetStep('verify');
      setResetVerificationId(data.verificationId || '');
      setResetMaskedEmail(data.maskedEmail || emailValue);
      setResetDevCode(data.devVerificationCode || '');
      setResetMessage(data.message || '입력하신 이메일로 인증번호를 보냈습니다.');
      setResetCode('');
      setResetNewPassword('');
      setResetNewPasswordConfirm('');
      setShowResetPassword(true);
    } catch (err) {
      console.error(err);
      setResetError('서버 오류가 발생했습니다.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleRequestResetCode = async (e) => {
    e.preventDefault();
    await requestResetCode();
  };

  const handleVerifyResetCode = async (e) => {
    e.preventDefault();

    const normalizedCode = resetCode.replace(/\D/g, '');
    if (normalizedCode.length !== 6) {
      setResetError('인증번호 6자리를 입력해 주세요.');
      return;
    }

    if (!resetNewPassword || !resetNewPasswordConfirm) {
      setResetError('새 비밀번호를 입력해 주세요.');
      return;
    }

    if (resetNewPassword !== resetNewPasswordConfirm) {
      setResetError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setResetSubmitting(true);
    setResetError('');
    setResetMessage('');

    try {
      const res = await fetch(`${backendUrl}/api/auth/verify-password-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: resetVerificationId,
          code: normalizedCode,
          newPassword: resetNewPassword
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setResetError(data.message || '비밀번호 변경에 실패했습니다.');
        return;
      }

      setResetMessage(data.message || '비밀번호가 변경되었습니다.');
      setResetStep('done');
      setResetCode('');
      setResetNewPassword('');
      setResetNewPasswordConfirm('');
      setPassword('');
    } catch (err) {
      console.error(err);
      setResetError('서버 오류가 발생했습니다.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const getBodyCopy = () => {
    if (showPasswordReset) {
      return '가입한 이메일로 인증번호를 발급받은 뒤 새 비밀번호를 설정합니다.';
    }
    if (isConfirmLink) {
      return `이메일이 기존 계정과 같습니다. 연결하면 앞으로 ${providerLabel}로도 로그인할 수 있습니다.`;
    }
    if (isEmailLink) {
      return `이미 연결된 ${providerLabel} 계정이 있습니다. 계정 보호를 위해 이메일 인증이 필요합니다.`;
    }
    return '기존 계정 비밀번호를 입력해 계정을 연결하세요.';
  };

  const getSubmitLabel = () => {
    if (submitting) return '처리 중...';
    if (isEmailLink) return '인증하고 로그인';
    return '연결하고 로그인';
  };

  const renderPasswordResetPanel = () => (
    <div className="recovery-body reset-password-body" style={{ padding: 0, gap: '14px' }}>
      <div className="reset-password-hero">
        <div className="reset-password-icon">
          <MailCheck size={20} />
        </div>
        <div>
          <b>{resetStep === 'verify' ? '인증번호를 확인해 주세요.' : '인증번호를 발급합니다.'}</b>
          <p>{resetStep === 'verify' ? '인증번호와 새 비밀번호를 입력하면 변경됩니다.' : '가입한 이메일 주소로 인증번호가 전송됩니다.'}</p>
        </div>
      </div>

      <div className="recovery-input-group">
        <label className="recovery-label">이메일 주소</label>
        <input
          type="email"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          className="recovery-input"
          placeholder="example@youngtech.com"
          required
          autoFocus={resetStep === 'email'}
        />
      </div>

      <div className="reset-password-email-card">
        <span>인증번호 발송 대상</span>
        <b>{resetMaskedEmail || resetEmail || '이메일을 입력해 주세요.'}</b>
      </div>

      <div className="reset-password-code-row">
        <div className="recovery-input-group reset-password-code-input">
          <label className="recovery-label">인증번호</label>
          <input
            type="text"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="recovery-input"
            placeholder="6자리 인증번호"
            inputMode="numeric"
            required
          />
        </div>
        <button
          type="button"
          className="reset-password-code-btn"
          onClick={requestResetCode}
          disabled={resetSubmitting}
        >
          인증번호 발급받기
        </button>
      </div>

      <div className="recovery-input-grid">
        <div className="recovery-input-group">
          <label className="recovery-label">새 비밀번호</label>
          <div className="password-field-wrapper">
            <input
              type={showResetPassword ? 'text' : 'password'}
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              className="recovery-input password-recovery-input"
              placeholder="새 비밀번호 입력"
              required
            />
            <button
              type="button"
              className="password-toggle-btn recovery-password-toggle"
              onClick={() => setShowResetPassword((prev) => !prev)}
              aria-label={showResetPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="recovery-input-group">
          <label className="recovery-label">새 비밀번호 확인</label>
          <div className="password-field-wrapper">
            <input
              type={showResetPasswordConfirm ? 'text' : 'password'}
              value={resetNewPasswordConfirm}
              onChange={(e) => setResetNewPasswordConfirm(e.target.value)}
              className="recovery-input password-recovery-input"
              placeholder="한 번 더 입력"
              required
            />
            <button
              type="button"
              className="password-toggle-btn recovery-password-toggle"
              onClick={() => setShowResetPasswordConfirm((prev) => !prev)}
              aria-label={showResetPasswordConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showResetPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="reset-password-note">
        <span>인증번호는 10분 동안 유효하며, 5회 실패 시 다시 발급해야 합니다.</span>
        {resetDevCode && <b>개발 테스트용 인증번호: {resetDevCode}</b>}
      </div>

      {resetError && <div className="result-box mt-2 result-box-error">{resetError}</div>}
      {!resetError && resetMessage && <div className="result-box mt-2 result-box-info">{resetMessage}</div>}

      <div className="recovery-footer" style={{ padding: 0, borderTop: 'none' }}>
        <button type="button" onClick={closePasswordReset} className="btn-recovery-cancel">
          닫기
        </button>
        {resetStep === 'done' ? (
          <button
            type="button"
            className="btn-recovery-submit"
            onClick={() => {
              closePasswordReset();
              onClose?.();
            }}
          >
            닫기
          </button>
        ) : (
          <button
            type="button"
            className="btn-recovery-submit"
            onClick={resetStep === 'verify' ? handleVerifyResetCode : handleRequestResetCode}
            disabled={resetSubmitting}
          >
            {resetSubmitting ? '처리 중...' : (resetStep === 'verify' ? '비밀번호 변경' : '인증번호 발급')}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="social-link-modal-backdrop" onClick={onClose}>
      <div className="social-link-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="social-link-close" onClick={onClose} aria-label="닫기">
          <X size={18} />
        </button>

        <div className="social-link-icon">
          {showPasswordReset ? <MailCheck size={22} /> : <Link2 size={22} />}
        </div>

        <div className="social-link-copy">
          <span className="social-link-kicker">
            {showPasswordReset ? '비밀번호 재설정' : `${providerLabel} 계정 연결`}
          </span>
          <h3>
            {showPasswordReset
              ? '인증번호를 발급받아 새 비밀번호를 설정하세요.'
              : '이미 가입된 계정입니다.'}
          </h3>
          <p>{getBodyCopy()}</p>
        </div>

        {!showPasswordReset && (
          <>
            <div className="social-link-email-card">
              <span>확인된 이메일</span>
              <b>{linkRequest.maskedEmail}</b>
            </div>

            <form onSubmit={handleSubmit} className="social-link-form">
              {isConfirmLink && (
                <div className="social-link-code-guide social-link-confirm-guide">
                  <ShieldCheck size={16} />
                  <span>
                    이메일이 기존 계정과 일치합니다. 연결을 완료하면 앞으로 {providerLabel} 로그인도 사용할 수 있습니다.
                  </span>
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
                  <label>기존 계정 비밀번호</label>
                  <div className="social-link-password">
                    <LockKeyhole size={15} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="기존 계정 비밀번호 입력"
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
                      onClick={openPasswordReset}
                    >
                      비밀번호 찾기
                    </button>
                  )}
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
          </>
        )}

        {showPasswordReset && (
          <form
            onSubmit={resetStep === 'verify' ? handleVerifyResetCode : handleRequestResetCode}
            className="social-link-form"
          >
            {renderPasswordResetPanel()}
          </form>
        )}
      </div>
    </div>
  );
}
