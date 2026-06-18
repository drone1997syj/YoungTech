import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, FileText, Loader2, ShieldCheck, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import './MockPGModal.css';

export default function MockPGModal({
  isOpen,
  onClose,
  orderAmount,
  shippingAddress,
  contactPhone,
  recipientName,
  saveShippingAsDefault = true
}) {
  const { createOrder, cart, navigate, updateSocialProfile } = useShop();

  const [cardNum1, setCardNum1] = useState('');
  const [cardNum2, setCardNum2] = useState('');
  const [cardNum3, setCardNum3] = useState('');
  const [cardNum4, setCardNum4] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [scenario, setScenario] = useState('success');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const normalizeDigits = (value, maxLength) => value.replace(/\D/g, '').slice(0, maxLength);

  const handlePaymentSubmit = (e) => {
    e.preventDefault();

    if (cardNum1.length < 4 || cardNum2.length < 4 || cardNum3.length < 4 || cardNum4.length < 4) {
      alert('카드번호 16자리를 올바르게 입력해 주세요.');
      return;
    }
    if (expiry.length < 4) {
      alert('유효기간(MMYY)을 입력해 주세요.');
      return;
    }
    if (cvc.length < 3) {
      alert('CVC 3자리를 입력해 주세요.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    setTimeout(async () => {
      if (scenario !== 'success') {
        setIsProcessing(false);
        setPaymentResult('error');
        setErrorMessage(
          scenario === 'limit_exceeded'
            ? '모의 결제 승인 실패: 한도 초과 오류 [Error Code: 4001]'
            : '모의 결제 승인 실패: 카드 정보 또는 CVC가 올바르지 않습니다. [Error Code: 4002]'
        );
        return;
      }

      const orderData = {
        total_amount: orderAmount,
        order_items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        address: `[${recipientName}] ${shippingAddress} (연락처: ${contactPhone})`,
        payment_method: 'mock_card',
        payment_card_type: 'card',
        tax_document_type: 'card_receipt',
        tax_document_status: 'issued_by_pg',
        tax_note: '카드 결제 건은 카드 매출전표가 증빙으로 발급됩니다. 같은 거래에 세금계산서는 중복 발급하지 않습니다.'
      };

      const res = await createOrder(orderData);
      setIsProcessing(false);
      if (res.success) {
        setPaymentResult('success');
        if (saveShippingAsDefault) {
          try {
            await updateSocialProfile(contactPhone, shippingAddress);
          } catch (profileErr) {
            console.warn('Failed to sync profile shipping info:', profileErr);
          }
        }
      } else {
        setPaymentResult('error');
        setErrorMessage(res.message || '주문 등록 중 백엔드 서버 오류가 발생했습니다.');
      }
    }, 1200);
  };

  const handleFinish = () => {
    onClose();
    navigate('myPage');
  };

  return (
    <div className="pg-modal-backdrop flex items-center justify-center">
      <div className="pg-modal-panel card max-w-sm w-full overflow-hidden flex flex-col">
        <div className="pg-modal-header flex justify-between items-center p-4 bg-indigo-950 text-white">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CreditCard size={16} />
            <span>영테크 안전 모의 카드결제 (Mock PG)</span>
          </div>
          {!isProcessing && !paymentResult && (
            <button onClick={onClose} className="text-white hover:text-gray-300" aria-label="닫기">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="pg-modal-body p-6 flex-1">
          {isProcessing ? (
            <div className="pg-state-processing text-center py-12 flex flex-col items-center">
              <Loader2 size={48} className="animate-spin text-primary mb-4" />
              <h4 className="font-bold text-dark text-base mb-1">모의 결제 승인 요청 중</h4>
              <p className="text-xs text-light">실제 출금은 이루어지지 않습니다. 잠시만 기다려 주세요.</p>
            </div>
          ) : paymentResult === 'success' ? (
            <div className="pg-state-success text-center py-8 flex flex-col items-center animate-scale-up">
              <CheckCircle2 size={56} className="text-success mb-4" />
              <h4 className="font-extrabold text-dark text-lg mb-1">모의 결제 승인 성공</h4>
              <p className="text-xs text-light mb-6">주문이 등록되었습니다. 주문 확인은 마이페이지에서 가능합니다.</p>

              <div className="payment-receipt-summary bg-gray-50 border p-4 rounded text-left text-xs w-full mb-6">
                <div className="receipt-row flex justify-between mb-2">
                  <span className="text-light">결제금액:</span>
                  <span className="font-bold text-dark">{orderAmount.toLocaleString()} 원</span>
                </div>
                <div className="receipt-row flex justify-between mb-2">
                  <span className="text-light">결제수단:</span>
                  <span className="font-semibold text-dark">카드 결제 (모의)</span>
                </div>
                <div className="receipt-row flex justify-between mb-2">
                  <span className="text-light">증빙:</span>
                  <span className="font-semibold text-dark">카드 매출전표</span>
                </div>
                <div className="receipt-row flex justify-between">
                  <span className="text-light">승인일시:</span>
                  <span className="font-semibold text-dark">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <button onClick={handleFinish} className="btn btn-primary w-full py-2.5 text-sm font-bold">
                주문 완료 및 확인
              </button>
            </div>
          ) : paymentResult === 'error' ? (
            <div className="pg-state-error text-center py-8 flex flex-col items-center animate-scale-up">
              <AlertCircle size={56} className="text-danger mb-4" />
              <h4 className="font-bold text-dark text-base mb-2">모의 승인 실패</h4>
              <p className="text-xs text-danger font-semibold mb-6">{errorMessage}</p>

              <button onClick={() => setPaymentResult(null)} className="btn btn-primary w-full py-2.5 text-sm font-bold">
                결제 다시 시도하기
              </button>
            </div>
          ) : (
            <form onSubmit={handlePaymentSubmit} className="pg-payment-form flex flex-col gap-4">
              <div className="amount-display-box bg-purple-50 border border-purple-200 p-4 rounded flex justify-between items-center">
                <span className="text-xs font-bold text-dark">결제 금액</span>
                <span className="text-base font-extrabold text-primary">{orderAmount.toLocaleString()} 원</span>
              </div>

              <div className="tax-proof-card">
                <div className="tax-proof-title">
                  <FileText size={15} />
                  <span>증빙 처리 안내</span>
                </div>
                <p>
                  카드 결제 건은 카드 매출전표가 증빙으로 발급됩니다.
                  같은 거래에 세금계산서는 중복 발급하지 않습니다.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label text-2xs font-bold text-dark mb-1">카드 번호</label>
                <div className="card-inputs-row flex gap-2">
                  <input type="password" maxLength={4} className="pg-input text-center text-sm flex-1" value={cardNum1} onChange={(e) => setCardNum1(normalizeDigits(e.target.value, 4))} placeholder="****" required />
                  <input type="password" maxLength={4} className="pg-input text-center text-sm flex-1" value={cardNum2} onChange={(e) => setCardNum2(normalizeDigits(e.target.value, 4))} placeholder="****" required />
                  <input type="password" maxLength={4} className="pg-input text-center text-sm flex-1" value={cardNum3} onChange={(e) => setCardNum3(normalizeDigits(e.target.value, 4))} placeholder="****" required />
                  <input type="text" maxLength={4} className="pg-input text-center text-sm flex-1" value={cardNum4} onChange={(e) => setCardNum4(normalizeDigits(e.target.value, 4))} placeholder="1234" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-2xs font-bold text-dark mb-1">유효기간 (MMYY)</label>
                  <input type="text" maxLength={4} className="pg-input text-center text-sm" value={expiry} onChange={(e) => setExpiry(normalizeDigits(e.target.value, 4))} placeholder="1229" required />
                </div>
                <div className="form-group">
                  <label className="form-label text-2xs font-bold text-dark mb-1">CVC 번호</label>
                  <input type="password" maxLength={3} className="pg-input text-center text-sm" value={cvc} onChange={(e) => setCvc(normalizeDigits(e.target.value, 3))} placeholder="***" required />
                </div>
              </div>

              <div className="form-group pg-scenario-selector border-t pt-4">
                <label className="form-label text-2xs font-bold text-primary mb-1">모의 승인 결과 시나리오 선택 (테스트용)</label>
                <select className="pg-input text-xs" value={scenario} onChange={(e) => setScenario(e.target.value)}>
                  <option value="success">결제 성공 시나리오</option>
                  <option value="limit_exceeded">한도 초과 승인오류 시나리오</option>
                  <option value="invalid_card">카드 인증 실패 시나리오</option>
                </select>
              </div>

              <div className="mock-payment-notice">
                <ShieldCheck size={14} />
                <span>현재는 실제 PG 연동 전 테스트 모드입니다. 실제 결제와 출금은 발생하지 않습니다.</span>
              </div>

              <button type="submit" className="btn btn-primary w-full py-3 text-sm font-bold mt-2">
                결제 승인 요청 (모의)
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
