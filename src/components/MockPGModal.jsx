import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { X, CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import './MockPGModal.css';

export default function MockPGModal({ isOpen, onClose, orderAmount, shippingAddress, contactPhone, recipientName, saveShippingAsDefault = true }) {
  const { createOrder, cart, navigate, updateSocialProfile } = useShop();
  
  // Card input states
  const [cardNum1, setCardNum1] = useState('');
  const [cardNum2, setCardNum2] = useState('');
  const [cardNum3, setCardNum3] = useState('');
  const [cardNum4, setCardNum4] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  
  // Payment Scenario state
  const [scenario, setScenario] = useState('success'); // 'success', 'limit_exceeded', 'invalid_card'
  
  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // null, 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (cardNum1.length < 4 || cardNum2.length < 4 || cardNum3.length < 4 || cardNum4.length < 4) {
      alert('카드번호 16자리를 올바르게 입력하세요.');
      return;
    }
    if (expiry.length < 4) {
      alert('유효기간(MMYY)을 입력하세요.');
      return;
    }
    if (cvc.length < 3) {
      alert('CVC 3자리를 입력하세요.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    // Simulate PG request lag (2.5 seconds)
    setTimeout(async () => {
      if (scenario === 'success') {
        const orderData = {
          total_amount: orderAmount,
          order_items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          address: `[${recipientName}] ${shippingAddress} (연락처: ${contactPhone})`
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
          setErrorMessage(res.message || '주문 등록 중 백엔드 서버 에러가 발생했습니다.');
        }
      } else {
        setIsProcessing(false);
        if (scenario === 'limit_exceeded') {
          setPaymentResult('error');
          setErrorMessage('모의 결제 승인 실패: 한도 초과 오류 [Error Code: 4001]');
        } else if (scenario === 'invalid_card') {
          setPaymentResult('error');
          setErrorMessage('모의 결제 승인 실패: 카드 유효성 에러 또는 잘못된 CVC [Error Code: 4002]');
        }
      }
    }, 2500);
  };

  const handleFinish = () => {
    onClose();
    navigate('myPage');
  };

  return (
    <div className="pg-modal-backdrop flex items-center justify-center">
      <div className="pg-modal-panel card max-w-sm w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="pg-modal-header flex justify-between items-center p-4 bg-indigo-950 text-white">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CreditCard size={16} />
            <span>영테크 안전 가상결제 서비스 (Mock PG)</span>
          </div>
          {!isProcessing && !paymentResult && (
            <button onClick={onClose} className="text-white hover:text-gray-300">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body Content depending on state */}
        <div className="pg-modal-body p-6 flex-1">
          {isProcessing ? (
            /* Loading State */
            <div className="pg-state-processing text-center py-12 flex flex-col items-center">
              <Loader2 size={48} className="animate-spin text-primary mb-4" />
              <h4 className="font-bold text-dark text-base mb-1">모의 결제 승인 요청 중</h4>
              <p className="text-xs text-light">가상 금융 네트워크 통신을 진행 중입니다. 잠시만 기다려 주십시오.</p>
            </div>
          ) : paymentResult === 'success' ? (
            /* Success State */
            <div className="pg-state-success text-center py-8 flex flex-col items-center animate-scale-up">
              <CheckCircle2 size={56} className="text-success mb-4" />
              <h4 className="font-extrabold text-dark text-lg mb-1">가상 결제 승인 성공</h4>
              <p className="text-xs text-light mb-6">주문이 성공적으로 등록되었습니다. 주문 확인은 마이페이지에서 가능합니다.</p>
              
              <div className="payment-receipt-summary bg-gray-50 border p-4 rounded text-left text-xs w-full mb-6">
                <div className="receipt-row flex justify-between mb-2">
                  <span className="text-light">결제금액:</span>
                  <span className="font-bold text-dark">{orderAmount.toLocaleString()} 원</span>
                </div>
                <div className="receipt-row flex justify-between mb-2">
                  <span className="text-light">가상카드:</span>
                  <span className="font-semibold text-dark">가상 비씨카드 (****)</span>
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
            /* Error State */
            <div className="pg-state-error text-center py-8 flex flex-col items-center animate-scale-up">
              <AlertCircle size={56} className="text-danger mb-4" />
              <h4 className="font-bold text-dark text-base mb-2">가상 승인 실패</h4>
              <p className="text-xs text-danger font-semibold mb-6">{errorMessage}</p>
              
              <button 
                onClick={() => setPaymentResult(null)} 
                className="btn btn-primary w-full py-2.5 text-sm font-bold"
              >
                결제 다시 시도하기
              </button>
            </div>
          ) : (
            /* Main Form Input State */
            <form onSubmit={handlePaymentSubmit} className="pg-payment-form flex flex-col gap-4">
              <div className="amount-display-box bg-purple-50 border border-purple-200 p-4 rounded flex justify-between items-center">
                <span className="text-xs font-bold text-dark">결제 금액</span>
                <span className="text-base font-extrabold text-primary">{orderAmount.toLocaleString()} 원</span>
              </div>

              {/* Card Numbers */}
              <div className="form-group">
                <label className="form-label text-2xs font-bold text-dark mb-1">카드 번호</label>
                <div className="card-inputs-row flex gap-2">
                  <input 
                    type="password" maxLength={4} className="pg-input text-center text-sm flex-1" 
                    value={cardNum1} onChange={(e) => setCardNum1(e.target.value.replace(/\D/g, ''))} placeholder="****" required
                  />
                  <input 
                    type="password" maxLength={4} className="pg-input text-center text-sm flex-1" 
                    value={cardNum2} onChange={(e) => setCardNum2(e.target.value.replace(/\D/g, ''))} placeholder="****" required
                  />
                  <input 
                    type="password" maxLength={4} className="pg-input text-center text-sm flex-1" 
                    value={cardNum3} onChange={(e) => setCardNum3(e.target.value.replace(/\D/g, ''))} placeholder="****" required
                  />
                  <input 
                    type="text" maxLength={4} className="pg-input text-center text-sm flex-1" 
                    value={cardNum4} onChange={(e) => setCardNum4(e.target.value.replace(/\D/g, ''))} placeholder="1234" required
                  />
                </div>
              </div>

              {/* Expiry & CVC */}
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-2xs font-bold text-dark mb-1">유효기간 (MMYY)</label>
                  <input 
                    type="text" maxLength={4} className="pg-input text-center text-sm" 
                    value={expiry} onChange={(e) => setExpiry(e.target.value.replace(/\D/g, ''))} placeholder="1229" required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-2xs font-bold text-dark mb-1">CVC 번호</label>
                  <input 
                    type="password" maxLength={3} className="pg-input text-center text-sm" 
                    value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} placeholder="***" required
                  />
                </div>
              </div>

              {/* Scenario Option Selector for Testing */}
              <div className="form-group pg-scenario-selector border-t pt-4">
                <label className="form-label text-2xs font-bold text-primary mb-1">⚙️ 모의 승인 결과 시나리오 선택 (테스트용)</label>
                <select 
                  className="pg-input text-xs"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="success">결제 성공 시나리오</option>
                  <option value="limit_exceeded">한도 초과 승인오류 시나리오</option>
                  <option value="invalid_card">카드 인증 실패 시나리오</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary w-full py-3 text-sm font-bold mt-2">
                결제 승인 요청 (가상결제)
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
