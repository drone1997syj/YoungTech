import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import MockPGModal from '../components/MockPGModal';
import { CreditCard, Truck, User, Phone, MapPin, Home, MessageSquare, ShieldCheck } from 'lucide-react';
import './Checkout.css';

export default function Checkout() {
  const { cart, user, navigate } = useShop();

  const [recipient, setRecipient] = useState('');
  const [postcode, setPostcode] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [deliveryMemo, setDeliveryMemo] = useState('배송 전 연락 바랍니다.');
  const [phone, setPhone] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [isPGOpen, setIsPGOpen] = useState(false);
  const [hasStartedPayment, setHasStartedPayment] = useState(false);

  useEffect(() => {
    if (user) {
      setRecipient(user.name || '');
      setBaseAddress(user.address || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = subtotal >= 500000 || subtotal === 0 ? 0 : 3000;
  const total = subtotal + shippingFee;
  const normalizedPhone = phone.replace(/\D/g, '');
  const fullAddress = [
    postcode ? `(${postcode})` : '',
    baseAddress.trim(),
    detailAddress.trim()
  ].filter(Boolean).join(' ');
  const shippingAddressText = [
    fullAddress,
    deliveryMemo ? `요청사항: ${deliveryMemo}` : ''
  ].filter(Boolean).join(' / ');

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleOpenPG = (e) => {
    e.preventDefault();
    if (!recipient.trim() || !baseAddress.trim() || !detailAddress.trim() || !phone.trim()) {
      alert('수령인, 연락처, 기본주소, 상세주소를 모두 입력해 주세요.');
      return;
    }
    if (normalizedPhone.length < 10) {
      alert('연락처를 올바르게 입력해 주세요.');
      return;
    }
    setHasStartedPayment(true);
    setIsPGOpen(true);
  };

  if (cart.length === 0 && !hasStartedPayment) {
    return (
      <div className="container py-12 text-center animate-fade-in">
        <h3 className="font-bold text-dark text-lg mb-4">주문할 상품이 장바구니에 없습니다.</h3>
        <button onClick={() => navigate('productList')} className="btn btn-primary">
          제품 보러가기
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page container py-8 animate-fade-in">
      <h2 className="page-title font-extrabold text-dark text-2xl mb-8">주문서 작성</h2>

      <div className="checkout-layout">
        {/* Delivery Form */}
        <div className="checkout-form-section flex flex-col gap-6">
          <form onSubmit={handleOpenPG} className="card p-6 shipping-form-card">
            <div className="shipping-form-hero">
              <div>
                <span className="shipping-form-kicker">Delivery Information</span>
                <h3 className="section-title text-dark font-extrabold text-xl flex items-center gap-2">
                  <Truck size={22} className="text-primary" />
                  <span>배송정보 입력</span>
                </h3>
                <p className="text-xs text-light mt-1">정확한 출고 처리를 위해 실제 수령 정보를 기준으로 입력해 주세요.</p>
              </div>
              <div className="shipping-security-badge">
                <ShieldCheck size={16} />
                <span>안전 배송</span>
              </div>
            </div>

            <div className="shipping-form-grid">
              <div className="form-group">
                <label className="form-label text-xs font-bold text-dark mb-1 flex items-center gap-1">
                  <User size={12} /> 수령인 이름 *
                </label>
                <input 
                  type="text" 
                  className="form-input text-sm" 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="수령인 성명을 입력하세요"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-dark mb-1 flex items-center gap-1">
                  <Phone size={12} /> 연락처 전화번호 *
                </label>
                <input 
                  type="text" 
                  className="form-input text-sm" 
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="예: 010-1234-5678"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-dark mb-1 flex items-center gap-1">
                  <MapPin size={12} /> 우편번호
                </label>
                <div className="postcode-row">
                  <input
                    type="text"
                    className="form-input text-sm"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="우편번호 5자리"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary postcode-button"
                    onClick={() => alert('도메인 연결 후 카카오/도로명주소 API를 붙이면 주소검색 팝업까지 연동할 수 있습니다. 지금은 직접 입력 방식으로 사용합니다.')}
                  >
                    주소 검색
                  </button>
                </div>
              </div>

              <div className="form-group shipping-form-wide">
                <label className="form-label text-xs font-bold text-dark mb-1 flex items-center gap-1">
                  <Home size={12} /> 기본주소 *
                </label>
                <input 
                  type="text" 
                  className="form-input text-sm" 
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  placeholder="도로명 주소 또는 지번 주소를 입력하세요"
                  required
                />
              </div>

              <div className="form-group shipping-form-wide">
                <label className="form-label text-xs font-bold text-dark mb-1 flex items-center gap-1">
                  <MapPin size={12} /> 상세주소 *
                </label>
                <input
                  type="text"
                  className="form-input text-sm"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  placeholder="동/호수, 건물명, 출입구 정보 등을 입력하세요"
                  required
                />
              </div>

              <div className="form-group shipping-form-wide">
                <label className="form-label text-xs font-bold text-dark mb-1 flex items-center gap-1">
                  <MessageSquare size={12} /> 배송 요청사항
                </label>
                <select
                  className="form-input text-sm"
                  value={deliveryMemo}
                  onChange={(e) => setDeliveryMemo(e.target.value)}
                >
                  <option value="배송 전 연락 바랍니다.">배송 전 연락 바랍니다.</option>
                  <option value="부재 시 경비실에 맡겨주세요.">부재 시 경비실에 맡겨주세요.</option>
                  <option value="부재 시 문 앞에 놓아주세요.">부재 시 문 앞에 놓아주세요.</option>
                  <option value="파손 위험 상품입니다. 조심히 배송해주세요.">파손 위험 상품입니다. 조심히 배송해주세요.</option>
                  <option value="">요청사항 없음</option>
                </select>
              </div>
            </div>

            <label className="shipping-save-default">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
              />
              <span>이번 배송지를 기본 배송지로 저장</span>
            </label>

            {/* Payment Method Option */}
            <div className="payment-method-section mt-8 pt-6 border-t">
              <h3 className="section-title text-dark font-bold text-lg mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                <span>결제 수단 선택</span>
              </h3>
              <div className="payment-option-box p-4 rounded border border-primary bg-purple-50 flex items-center gap-3">
                <input type="radio" checked readOnly className="accent-primary" />
                <div>
                  <span className="text-sm font-bold text-dark">모의 신용카드 결제 (Mock Card PG)</span>
                  <p className="text-3xs text-light mt-1">
                    인터넷 주소 구매 전 테스트 환경을 위한 PG 모듈입니다. 실제 출금은 이루어지지 않습니다.
                  </p>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full py-3.5 text-base font-bold mt-8">
              가상 결제창 열기
            </button>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="checkout-summary-section">
          <div className="card p-6 summary-card">
            <h3 className="summary-title font-bold text-dark text-lg mb-6 border-b pb-3">주문 상품 정보</h3>
            
            {/* Products List inside checkout */}
            <div className="checkout-items-list flex flex-col gap-4 mb-6">
              {cart.map(item => (
                <div key={item.id} className="checkout-item-row flex gap-3 pb-3 border-b">
                  <img src={item.image ? item.image.split(',')[0] : ''} alt={item.name} className="checkout-item-thumb" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-dark text-xs truncate" title={item.name}>
                      {item.name}
                    </h4>
                    <span className="text-3xs text-light block mt-1">수량: {item.quantity}개</span>
                  </div>
                  <span className="font-semibold text-dark text-xs whitespace-nowrap">
                    {(item.price * item.quantity).toLocaleString()} 원
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-row flex justify-between text-sm mb-3">
              <span className="text-light">상품 총액</span>
              <span className="font-semibold text-dark">{subtotal.toLocaleString()} 원</span>
            </div>
            
            <div className="summary-row flex justify-between text-sm mb-3">
              <span className="text-light">가상 배송비</span>
              <span className="font-semibold text-dark">
                {shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()} 원`}
              </span>
            </div>

            <div className="total-row flex justify-between items-center border-t pt-4">
              <span className="font-bold text-dark">최종 결제 금액</span>
              <span className="total-price font-extrabold text-primary text-xl">
                {total.toLocaleString()} 원
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional PG Modal Overlay */}
      <MockPGModal 
        isOpen={isPGOpen}
        onClose={() => {
          setIsPGOpen(false);
          setHasStartedPayment(false);
        }}
        orderAmount={total}
        shippingAddress={shippingAddressText}
        contactPhone={phone}
        recipientName={recipient}
        saveShippingAsDefault={saveAsDefault}
      />
    </div>
  );
}
