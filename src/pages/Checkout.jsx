import React, { useEffect, useState } from 'react';
import { CreditCard, Home, MapPin, MessageSquare, Phone, ShieldCheck, Truck, User } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import MockPGModal from '../components/MockPGModal';
import './Checkout.css';

const DEFAULT_MEMO = '배송 전 연락 바랍니다.';

export default function Checkout() {
  const { cart, user, navigate, backendUrl } = useShop();

  const [recipient, setRecipient] = useState('');
  const [postcode, setPostcode] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [deliveryMemo, setDeliveryMemo] = useState(DEFAULT_MEMO);
  const [phone, setPhone] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [addressBook, setAddressBook] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isPGOpen, setIsPGOpen] = useState(false);
  const [hasStartedPayment, setHasStartedPayment] = useState(false);

  const token = localStorage.getItem('yt_token');

  useEffect(() => {
    if (user) {
      setRecipient(user.name || '');
      setBaseAddress(user.address || '');
      setPhone(formatPhone(user.phone || ''));
      loadAddressBook();
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

  function formatPhone(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  const loadAddressBook = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${backendUrl}/api/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setAddressBook(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('배송지 목록을 불러오지 못했습니다.', error);
    }
  };

  const applyAddress = (addressId) => {
    setSelectedAddressId(addressId);
    if (!addressId) return;
    const selected = addressBook.find(address => String(address.id) === String(addressId));
    if (!selected) return;
    setRecipient(selected.recipient || '');
    setPhone(formatPhone(selected.phone || ''));
    setPostcode(selected.postcode || '');
    setBaseAddress(selected.base_address || '');
    setDetailAddress(selected.detail_address || '');
    setDeliveryMemo(selected.delivery_memo || DEFAULT_MEMO);
  };

  const openPostcodeSearch = () => {
    if (!window.daum?.Postcode) {
      const script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      script.onload = openPostcodeSearch;
      script.onerror = () => alert('주소검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      document.head.appendChild(script);
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        const roadAddress = data.roadAddress || data.jibunAddress || '';
        setPostcode(data.zonecode || '');
        setBaseAddress(roadAddress);
        setDetailAddress('');
      }
    }).open();
  };

  const saveCurrentAddress = async () => {
    if (!token || !saveAsDefault) return;
    try {
      await fetch(`${backendUrl}/api/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          label: '최근 배송지',
          recipient,
          phone: normalizedPhone,
          postcode,
          base_address: baseAddress,
          detail_address: detailAddress,
          delivery_memo: deliveryMemo,
          is_default: true
        })
      });
      loadAddressBook();
    } catch (error) {
      console.warn('배송지 저장에 실패했습니다.', error);
    }
  };

  const handleOpenPG = async (e) => {
    e.preventDefault();
    if (!recipient.trim() || !baseAddress.trim() || !detailAddress.trim() || !phone.trim()) {
      alert('수령인, 연락처, 기본주소, 상세주소를 모두 입력해 주세요.');
      return;
    }
    if (!/^01\d{8,9}$/.test(normalizedPhone)) {
      alert('연락처를 올바르게 입력해 주세요. 예: 010-1234-5678');
      return;
    }
    await saveCurrentAddress();
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
        <div className="checkout-form-section flex flex-col gap-6">
          <form onSubmit={handleOpenPG} className="card p-6 shipping-form-card">
            <div className="shipping-form-hero">
              <div>
                <span className="shipping-form-kicker">Delivery Information</span>
                <h3 className="section-title text-dark font-extrabold text-xl flex items-center gap-2">
                  <Truck size={22} className="text-primary" />
                  <span>배송정보 입력</span>
                </h3>
                <p className="text-xs text-light mt-1">
                  정확한 출고와 연락을 위해 실제 수령 정보를 입력해 주세요.
                </p>
              </div>
              <div className="shipping-security-badge">
                <ShieldCheck size={16} />
                <span>안전 배송</span>
              </div>
            </div>

            {addressBook.length > 0 && (
              <div className="address-book-panel">
                <label className="form-label text-xs font-bold text-dark mb-1">저장된 배송지</label>
                <select
                  className="form-input text-sm"
                  value={selectedAddressId}
                  onChange={(e) => applyAddress(e.target.value)}
                >
                  <option value="">새 배송지 입력</option>
                  {addressBook.map(address => (
                    <option key={address.id} value={address.id}>
                      {address.is_default ? '기본 배송지 - ' : ''}{address.recipient} / {address.base_address}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                  placeholder="수령인 성함을 입력하세요"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-dark mb-1 flex items-center gap-1">
                  <Phone size={12} /> 연락처 *
                </label>
                <input
                  type="tel"
                  className="form-input text-sm"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="010-1234-5678"
                  inputMode="numeric"
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
                  <button type="button" className="btn btn-secondary postcode-button" onClick={openPostcodeSearch}>
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
                  <option value="파손 위험 상품입니다. 조심히 배송해 주세요.">파손 위험 상품입니다. 조심히 배송해 주세요.</option>
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
                    실제 PG 연동 전 테스트용 결제입니다. 실제 출금은 이루어지지 않습니다.
                  </p>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full py-3.5 text-base font-bold mt-8">
              모의 결제창 열기
            </button>
          </form>
        </div>

        <div className="checkout-summary-section">
          <div className="card p-6 summary-card">
            <h3 className="summary-title font-bold text-dark text-lg mb-6 border-b pb-3">주문 상품 정보</h3>

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
              <span className="text-light">배송비</span>
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
