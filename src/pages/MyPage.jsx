import React, { useEffect, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Package, Calendar, CreditCard, User, ShoppingBag, X } from 'lucide-react';
import DeliverySimulatorModal from '../components/DeliverySimulatorModal';
import './MyPage.css';

export default function MyPage() {
  const { user, navigate, fetchOrders, setUser, backendUrl } = useShop();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Simulator modal state
  const [showSimulator, setShowSimulator] = useState(false);
  const [selectedOrderForSimulator, setSelectedOrderForSimulator] = useState(null);

  // Profile Edit Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showVerifyPasswordModal, setShowVerifyPasswordModal] = useState(false);
  const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Claim Modal State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimOrder, setClaimOrder] = useState(null);
  const [claimType, setClaimType] = useState('return'); // 'return', 'exchange', or 'refund'
  const [claimReason, setClaimReason] = useState('단순변심/고객과실');
  const [customReason, setCustomReason] = useState('');
  const [claimReasonType, setClaimReasonType] = useState('buyer'); // 'buyer' or 'seller'
  const [claimPickupType, setClaimPickupType] = useState('pickup'); // 'pickup' or 'self'
  const [claimProductId, setClaimProductId] = useState(null);

  const loadUserOrders = async () => {
    setLoading(true);
    const data = await fetchOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요한 페이지입니다. 로그인 화면으로 이동합니다.');
      navigate('login');
      return;
    }
    loadUserOrders();
  }, [user]);

  if (!user) return null;

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || '고객';

  // 내정보 수정 클릭 시 비밀번호 검증 모달을 띄우지 않고 바로 프로필 수정 폼 로드 (테스트 목적 스킵)
  const handleOpenEditProfile = () => {
    setEditName(user.name || '');
    setEditPassword('');
    setEditConfirmPassword('');
    setEditPhone(user.phone || '');
    setEditAddress(user.address || '');
    setShowEditProfileModal(true);
  };

  // 비밀번호 확인 요청
  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/users/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: verifyPasswordInput })
      });

      if (res.ok) {
        setShowVerifyPasswordModal(false);
        // 비밀번호 확인 통과 시 실제 프로필 수정 폼 로드
        setEditName(user.name || '');
        setEditPassword('');
        setEditConfirmPassword('');
        setEditPhone(user.phone || '');
        setEditAddress(user.address || '');
        setShowEditProfileModal(true);
      } else {
        const err = await res.json();
        alert(err.message || '비밀번호가 일치하지 않습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  // 회원 탈퇴 처리
  const handleWithdrawAccount = async () => {
    const confirm1 = window.confirm(
      '정말로 영테크 회원 탈퇴를 진행하시겠습니까?\n탈퇴 시 구매 내역을 포함한 모든 계정 및 개인정보가 즉시 삭제되며 복구할 수 없습니다.'
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      '최종 확인: 정말로 탈퇴 처리를 진행하시겠습니까?\n동의하시면 확인을 눌러주세요.'
    );
    if (!confirm2) return;

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/users/withdraw`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert('회원 탈퇴 처리가 완료되었습니다. 그동안 영테크를 이용해 주셔서 감사합니다.');
        setShowEditProfileModal(false);
        // 로그아웃 처리
        localStorage.removeItem('yt_token');
        setUser(null);
        navigate('home');
      } else {
        const err = await res.json();
        alert(err.message || '회원 탈퇴 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('이름을 입력해 주세요.');
      return;
    }
    const normalizedEditPhone = editPhone.replace(/\D/g, '');
    if (!/^01\d{8,9}$/.test(normalizedEditPhone)) {
      alert('휴대폰 번호를 올바르게 입력해 주세요. 예: 010-1234-5678');
      return;
    }

    if (editPassword) {
      if (editPassword !== editConfirmPassword) {
        alert('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return;
      }
      if (
        editPassword.length < 8 ||
        /\s/.test(editPassword) ||
        !/[A-Za-z]/.test(editPassword) ||
        !/\d/.test(editPassword) ||
        !/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(editPassword)
      ) {
        alert('비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.');
        return;
      }
    }

    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          password: editPassword || undefined,
          phone: normalizedEditPhone,
          address: editAddress
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert('회원 정보가 성공적으로 수정되었습니다.');
        setUser(data.user); // Context user state 갱신
        setShowEditProfileModal(false);
      } else {
        const err = await res.json();
        alert(err.message || '정보 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  const handleOpenSimulator = (order) => {
    if (!order?.tracking_number || !order?.carrier) {
      alert('배송 조회에 필요한 택배사 또는 송장번호가 없습니다.');
      return;
    }
    setSelectedOrderForSimulator(order);
    setShowSimulator(true);
  };

  const handleConfirmPurchase = async (orderId, productId) => {
    if (!window.confirm('구매확정 처리를 하시겠습니까? 완료 후에는 반품/교환 신청이 불가합니다.')) return;
    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/confirm`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ product_id: productId })
      });
      if (res.ok) {
        alert('구매확정이 완료되었습니다. 이용해 주셔서 감사합니다.');
        loadUserOrders();
      } else {
        const err = await res.json();
        alert(err.message || '구매확정에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  const handleCancelOrder = async (orderId, productId) => {
    if (!window.confirm('주문을 취소하시겠습니까?\n취소 후 환불은 영테크 고객센터를 통해 접수 가능합니다.')) return;
    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ product_id: productId })
      });
      if (res.ok) {
        alert('주문이 취소되었습니다.');
        loadUserOrders();
      } else {
        const err = await res.json();
        alert(err.message || '취소에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  const handleOpenClaim = (order, type, productId) => {
    setClaimOrder(order);
    setClaimType(type);
    setClaimProductId(productId);
    setClaimReason('단순변심/고객과실');
    setCustomReason('');
    setClaimReasonType('buyer');
    setClaimPickupType('pickup');
    setShowClaimModal(true);
  };

  const handleSubmittingClaim = async () => {
    const finalReason = claimReason === '기타' ? customReason : claimReason;
    if (!finalReason.trim()) {
      alert('사유를 입력해 주세요.');
      return;
    }
    try {
      const token = localStorage.getItem('yt_token');
      const res = await fetch(`${backendUrl}/api/orders/${claimOrder.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          claim_type: claimType, 
          reason: finalReason,
          reason_type: claimReasonType,
          pickup_type: claimPickupType,
          product_id: claimProductId
        })
      });
      if (res.ok) {
        const data = await res.json();
        let successMsg = '신청이 정상적으로 접수되었습니다.';
        if (data.shipping_fee > 0) {
          successMsg += `\n(단순 변심 배송비 ${data.shipping_fee.toLocaleString()}원이 환불금에서 차감됩니다.)`;
        }
        if (data.sweettracker_receipt_no) {
          successMsg += `\n[스마트택배 자동 수거 접수 완료] 접수번호: ${data.sweettracker_receipt_no}`;
        }
        alert(successMsg);
        setShowClaimModal(false);
        loadUserOrders();
      } else {
        const err = await res.json();
        alert(err.message || '신청에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    }
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'pending': return '결제완료 (배송대기)';
      case 'preparing': return '배송 준비중';
      case 'cancel_requested': return '주문취소 요청중';
      case 'shipping': return '배송 중';
      case 'delivered': return '배송 완료';
      case 'confirmed': return '구매 확정';
      case 'returning': return '환불 신청중';
      case 'exchanging': return '교환 신청중';
      case 'refunding': return '환불 신청중';
      case 'returned': return '환불 완료';
      case 'exchanged': return '교환 완료';
      case 'refunded': return '환불 완료';
      case 'part_cancelled': return '부분 취소';
      case 'part_returning': return '일부 상품 환불 신청중';
      case 'part_exchanging': return '일부 상품 교환 신청중';
      case 'part_refunding': return '일부 상품 환불 신청중';
      case 'part_returned': return '일부 상품 환불 완료';
      case 'part_exchanged': return '일부 상품 교환 완료';
      case 'part_refunded': return '일부 상품 환불 완료';
      case 'part_confirmed': return '일부 상품 구매 확정';
      case 'cancelled': return '주문 취소';
      default: return '주문 접수';
    }
  };

  const getItemStatus = (item, order) => item?.status || order?.status || 'pending';
  const canCancelBeforeShipping = (status) => ['pending', 'preparing'].includes(status);
  const canRequestClaim = (status) => ['shipping', 'delivered'].includes(status);
  const canRequestRefundAfterConfirm = (status) => status === 'confirmed';
  const getLockedStatusMessage = (status) => {
    switch (status) {
      case 'cancel_requested': return '취소 승인 대기';
      case 'returning': return '환불 신청 접수';
      case 'exchanging': return '교환 신청 접수';
      case 'refunding': return '환불 신청 접수';
      case 'cancelled': return '취소 완료';
      case 'returned': return '환불 완료';
      case 'exchanged': return '교환 완료';
      case 'refunded': return '환불 완료';
      default: return '';
    }
  };

  const getTaxDocumentLabel = (order) => {
    if (order.tax_document_type === 'cash_receipt') return '현금영수증';
    return '카드 매출전표';
  };

  const getTaxDocumentDescription = (order) => {
    if (order.tax_document_type === 'cash_receipt') {
      return '현금 결제 증빙으로 현금영수증 발급 대상입니다.';
    }
    if (order.payment_card_type === 'corporate') {
      return '법인카드 결제 건은 카드 매출전표가 증빙으로 발급되며, 세금계산서는 중복 발급되지 않습니다.';
    }
    return '카드 결제 건은 카드 매출전표가 증빙으로 발급되며, 세금계산서는 중복 발급되지 않습니다.';
  };

  return (
    <>
      <div className="mypage-container container py-8 animate-fade-in">
      <h2 className="page-title font-extrabold text-dark text-2xl mb-8">마이페이지</h2>

      <div className="mypage-layout">
        {/* User Profile Card */}
        <aside className="profile-section card p-6 flex flex-col gap-4">
          <div className="profile-header pb-4 border-b">
            <div className="profile-avatar">
              <User size={22} />
            </div>
            <div>
              <h4 className="font-extrabold text-dark text-base">{displayName} 님</h4>
              <span className="text-3xs text-light">영테크 공식 회원</span>
            </div>
          </div>

          <div className="profile-details text-xs flex flex-col gap-2.5">
            <div className="flex justify-between">
              <span className="text-light">이메일:</span>
              <span className="font-semibold text-dark">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-light">회원등급:</span>
              <span className="font-semibold text-primary">{user.role === 'admin' ? '최고 관리자' : '일반 회원'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-light">가입일시:</span>
              <span className="font-semibold text-dark">{new Date(user.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button 
              onClick={handleOpenEditProfile} 
              className="btn text-xs font-bold py-2" 
              style={{ backgroundColor: '#03cf5d', color: '#ffffff', border: 'none' }}
            >
              내정보 수정
            </button>
            <button onClick={() => navigate('productList')} className="btn btn-primary text-xs font-bold py-2">
              제품 둘러보기
            </button>
          </div>
        </aside>

        {/* Orders History List Section */}
        <main className="orders-section flex flex-col gap-6">
          <h3 className="section-title text-dark font-bold text-lg mb-2 flex items-center gap-2">
            <Package size={20} className="text-primary" />
            <span>실시간 주문/결제 내역 ({orders.length}건)</span>
          </h3>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <span className="loading-spinner"></span>
              <span className="text-sm text-light ml-2">주문 이력을 조회 중입니다...</span>
            </div>
          ) : orders.length > 0 ? (
            <div className="orders-list flex flex-col gap-6">
              {orders.map(order => (
                <div key={order.id} className="card p-6 order-receipt-card">
                  {/* Receipt Header */}
                  <div className="receipt-header flex justify-between items-center pb-4 border-b mb-4 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary flex items-center gap-1">
                        <Calendar size={12} /> {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-light">|</span>
                      <span className="text-light font-mono">주문번호: {order.id}</span>
                    </div>
                    <div className={`order-status-badge text-2xs font-extrabold px-2.5 py-1 rounded ${
                      order.status === 'pending' ? 'bg-purple-50 text-primary' : 
                      order.status === 'preparing' ? 'bg-amber-50 text-amber-600' : 
                      order.status === 'shipping' ? 'bg-blue-50 text-blue-600' : 
                      order.status === 'delivered' ? 'bg-green-50 text-green-600' : 
                      order.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 
                      order.status === 'cancelled' ? 'bg-rose-50 text-rose-600' : 
                      (order.status === 'returned' || order.status === 'refunded') ? 'bg-purple-600 text-white' :
                      order.status.endsWith('ing') ? 'bg-yellow-50 text-yellow-700' :
                      'bg-slate-50 text-slate-600'
                    }`}
                    style={
                      (order.status === 'returned' || order.status === 'refunded') ? { backgroundColor: '#7c3aed', color: '#ffffff' } : {}
                    }>
                      {translateStatus(order.status)}
                    </div>
                  </div>

                  {/* Receipt Items List */}
                  <div className="receipt-items flex flex-col gap-4 mb-4">
                    {order.order_items.map((item, idx) => {
                      const itemStatus = getItemStatus(item, order);
                      const lockedStatusMessage = getLockedStatusMessage(itemStatus);
                      return (
                        <div key={idx} className="receipt-item-row flex justify-between items-start border-b pb-3 mb-2 last:border-0 last:pb-0 last:mb-0 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-100 text-primary p-2.5 rounded text-2xs font-bold w-12 h-12 flex items-center justify-center">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                              ) : (
                                'PROD'
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-dark block text-sm">{item.name}</span>
                              <span className="text-3xs text-light block mt-1">
                                단가: {(item.price || 0).toLocaleString()}원 / {item.quantity}개
                              </span>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded ${
                                  itemStatus === 'pending' ? 'bg-purple-50 text-primary border border-purple-200' : 
                                  itemStatus === 'preparing' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
                                  itemStatus === 'shipping' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 
                                  itemStatus === 'delivered' ? 'bg-green-50 text-green-600 border border-green-200' : 
                                  itemStatus === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                  itemStatus === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 
                                  itemStatus === 'cancel_requested' ? 'bg-red-50 text-red-700 border border-red-200' :
                                  (itemStatus === 'returned' || itemStatus === 'refunded') ? 'bg-purple-600 text-white' :
                                  itemStatus.endsWith('ing') ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                  'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}
                                style={
                                  (itemStatus === 'returned' || itemStatus === 'refunded') ? { backgroundColor: '#7c3aed', color: '#ffffff' } : {}
                                }>
                                  {translateStatus(itemStatus)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 items-end self-center">
                            <span className="font-bold text-dark text-sm block mb-1">{((item.price || 0) * item.quantity).toLocaleString()} 원</span>
                            
                            <div className="flex gap-1.5">
                              {/* 배송 중 / 배송 완료 상태: 교환/환불 신청 가능 */}
                              {canRequestClaim(itemStatus) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmPurchase(order.id, item.id)}
                                    className="btn btn-primary text-3xs py-1 px-2.5 font-bold"
                                    style={{ fontSize: '10px' }}
                                  >
                                    구매확정
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenClaim(order, 'return', item.id)}
                                    className="btn text-3xs py-1 px-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                                    style={{ fontSize: '10px' }}
                                  >
                                    환불
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenClaim(order, 'exchange', item.id)}
                                    className="btn text-3xs py-1 px-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                                    style={{ fontSize: '10px' }}
                                  >
                                    교환
                                  </button>
                                </>
                              )}

                              {/* 구매확정 상태 */}
                              {canRequestRefundAfterConfirm(itemStatus) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenClaim(order, 'refund', item.id)}
                                  className="btn text-3xs py-1 px-2.5 font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300"
                                  style={{ fontSize: '10px' }}
                                >
                                  환불
                                </button>
                              )}

                              {/* 배송 전 상태: 구매취소 가능 */}
                              {canCancelBeforeShipping(itemStatus) && (
                                <button
                                  onClick={() => handleCancelOrder(order.id, item.id)}
                                  className="btn text-3xs py-1 px-2.5 font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                                  style={{ fontSize: '10px' }}
                                >
                                  구매취소
                                </button>
                              )}

                              {lockedStatusMessage && (
                                <span
                                  className="text-3xs py-1 px-2.5 font-bold rounded bg-slate-100 text-slate-500 border border-slate-200"
                                  style={{ fontSize: '10px' }}
                                >
                                  {lockedStatusMessage}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery Detail Timeline */}
                  <div className="delivery-timeline-box bg-gray-50 border p-4 rounded mb-4 text-xs">
                    <div className="timeline-steps flex justify-between items-center relative mb-4">
                      <div className="step-point completed">
                        <div className="point-dot"></div>
                        <span>결제 완료</span>
                      </div>
                      <div className={`step-line ${order.status !== 'pending' ? 'completed' : ''}`}></div>
                      <div className={`step-point ${order.status === 'preparing' ? 'active' : order.status !== 'pending' ? 'completed' : ''}`}>
                        <div className="point-dot"></div>
                        <span>배송준비</span>
                      </div>
                      <div className={`step-line ${order.status === 'shipping' || order.status === 'delivered' ? 'completed' : ''}`}></div>
                      <div className={`step-point ${order.status === 'shipping' ? 'active' : order.status === 'delivered' ? 'completed' : ''}`}>
                        <div className="point-dot"></div>
                        <span>배송중</span>
                      </div>
                      <div className={`step-line ${order.status === 'delivered' ? 'completed' : ''}`}></div>
                      <div className={`step-point ${order.status === 'delivered' ? 'active completed' : ''}`}>
                        <div className="point-dot"></div>
                        <span>배송완료</span>
                      </div>
                    </div>

                    <div className="delivery-address-info text-2xs text-light flex flex-col gap-1.5 border-t pt-3">
                      <div><b>배송지 정보:</b> {order.address}</div>
                      {(order.status === 'shipping' || order.status === 'delivered') && order.tracking_number && (
                        <div className="flex justify-between items-center bg-white p-2 rounded border mt-2">
                          <div>
                            <span className="font-bold text-dark block">배송 정보 ({order.carrier === 'logen' ? '로젠택배' : order.carrier === 'cj' ? 'CJ대한통운' : '우체국택배'})</span>
                            <span className="font-mono text-xs text-primary">{order.tracking_number}</span>
                          </div>
                          <button
                            onClick={() => handleOpenSimulator(order)}
                            className="btn btn-primary text-3xs py-1.5 px-3 font-bold"
                            style={{ fontSize: '10px' }}
                          >
                            배송 조회
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 관리자 안내 메시지 (답변) 노출 */}
                  {order.claim_answer && (
                    <div className="admin-message-box bg-purple-50 border border-purple-200 rounded-xl p-4 mt-3 text-sm text-dark flex flex-col gap-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-sm font-extrabold text-primary mb-1">
                        <span className="inline-block w-1.5 h-3.5 bg-primary rounded-full"></span>
                        관리자 안내 메시지
                      </div>
                      <div className="pl-3 text-slate-800 leading-relaxed font-bold text-sm">
                        {order.claim_answer}
                      </div>
                    </div>
                  )}

                  {/* 배송 중/완료 환불건 반송 요청 상시 노출 */}
                  {(order.status === 'returned' || order.status === 'refunded') && order.claim_pickup_type && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3 text-sm text-dark flex flex-col gap-2 shadow-sm" style={{ lineHeight: '1.5' }}>
                      <div className="flex items-center gap-1.5 text-sm font-black text-amber-900 border-b border-amber-200 pb-1.5">
                        ⚠️ 필독: 반품 물품 회수 안내 (환불 승인 완료건)
                      </div>
                      <div className="text-xs text-slate-800 font-semibold">
                        본 상품은 배송이 시작된 후 환불 승인이 진행되었습니다. 고객님께 물품이 배송 완료되면 즉시 아래 절차에 따라 반송을 진행해 주시기 바랍니다.
                      </div>
                      {order.claim_pickup_type === 'pickup' ? (
                        <div className="bg-white p-3 rounded-lg border border-amber-100 text-2xs text-amber-950 font-bold mt-1">
                          <b className="text-xs text-amber-900">[지정택배 회수 절차]</b><br/>
                          박스 겉면에 <span className="text-red-600 font-black text-sm">"영테크 반품"</span> 또는 <span className="text-red-600 font-black text-sm">"영테크 교환"</span>이라고 눈에 띄게 크게 적어 문 앞에 놓아주세요. 영업일 기준 1~2일 내 기사님이 자동 방문하여 수거해 갑니다.
                        </div>
                      ) : (
                        <div className="bg-white p-3 rounded-lg border border-amber-100 text-2xs text-slate-800 font-bold mt-1">
                          <b className="text-xs text-slate-800">[직접 발송 절차]</b><br/>
                          타 택배사(편의점 등)를 이용하여 반드시 선불로 아래 주소지에 발송해 주세요.<br/>
                          <b>주소지:</b> 경기도 시흥시 수출대로 9-36 헤이븐타워 지식산업센터 601호 영테크 물류담당자 앞
                        </div>
                      )}
                    </div>
                  )}

                  <div className="tax-proof-summary">
                    <div>
                      <span className="tax-proof-summary-label">증빙</span>
                      <strong>{getTaxDocumentLabel(order)}</strong>
                    </div>
                    <p>{getTaxDocumentDescription(order)}</p>
                  </div>

                  {/* Receipt Footer Pricing */}
                  <div className="receipt-footer flex justify-between items-center pt-4 border-t text-sm mt-3">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                      <CreditCard size={13} />
                      <span>결제수단: 모의 신용카드 승인 완료</span>
                    </div>
                    <div className="total-amount-box text-right">
                      <span className="text-slate-500 font-bold mr-2 text-xs">최종 결제액:</span>
                      <span className="font-extrabold text-primary text-base">{order.total_amount.toLocaleString()} 원</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-orders card p-12 text-center">
              <ShoppingBag size={48} className="text-light mx-auto mb-4" style={{ display: 'block', margin: '0 auto 1rem' }} />
              <h4 className="font-bold text-dark text-lg mb-2">주문 내역이 없습니다.</h4>
              <p className="text-sm text-light mb-6">아직 결제 완료된 영테크 주문 내역이 없습니다.</p>
              <button onClick={() => navigate('productList')} className="btn btn-primary text-sm py-2 px-6">
                첫 주문하러 가기
              </button>
            </div>
          )}
        </main>
      </div>
    </div>

    {/* Real Delivery Simulator Modal */}
    <DeliverySimulatorModal 
      isOpen={showSimulator} 
      onClose={() => setShowSimulator(false)} 
      order={selectedOrderForSimulator} 
    />

    {/* 환불/교환 신청 모달 */}
    {showClaimModal && claimOrder && (
      <div className="claim-modal-backdrop">
        <div className="claim-modal-container">
          <div className="flex justify-between items-center pb-3 border-b mb-4">
            <h3 className="font-extrabold text-lg text-dark">
              {claimType === 'return' || claimType === 'refund' ? '환불' : '교환'}
            </h3>
            <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-dark">
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-light mb-2">주문 정보</label>
            <div className="bg-slate-50 p-3 rounded border text-xs text-dark">
              <div><b>주문번호:</b> {claimOrder.id}</div>
              <div className="mt-1">
                <b>신청 품목:</b> {claimOrder.order_items.find(i => i.id === claimProductId)?.name || '선택된 상품 없음'}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-light mb-2">구분 및 사유</label>
            <div className="flex flex-col gap-2 mb-3 bg-slate-50 p-3 rounded border">
              <select 
                value={claimReason} 
                onChange={(e) => {
                  const val = e.target.value;
                  setClaimReason(val);
                  if (val === '단순변심/고객과실' || val === '기타') {
                    setClaimReasonType('buyer');
                  } else {
                    setClaimReasonType('seller');
                  }
                }}
                className="w-full border rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary mb-2"
              >
                <option value="단순변심/고객과실">단순변심/고객과실</option>
                <option value="제품불량">제품불량</option>
                <option value="오발송">오발송</option>
                <option value="기타">기타 (직접 입력)</option>
              </select>

              {claimReason === '기타' && (
                <textarea
                  placeholder="상세 사유를 직접 입력해 주세요..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none mb-2"
                  rows={2}
                  style={{ resize: 'none' }}
                />
              )}
              
              {claimReasonType === 'buyer' && (claimType === 'return' || claimType === 'refund') && (
                <div className="text-3xs text-red-600 font-bold bg-red-50 p-1.5 rounded border border-red-100 mt-1">
                  ※ 환불 편도/왕복 배송비 3,500원이 환불 예정 금액에서 자동으로 차감됩니다.
                </div>
              )}
              {claimReasonType === 'buyer' && claimType === 'exchange' && (
                <div className="text-3xs text-red-600 font-bold bg-red-50 p-1.5 rounded border border-red-100 mt-1">
                  ※ 교환 왕복 배송비 7,000원이 최종 부과됩니다.
                </div>
              )}
              {claimReasonType === 'seller' && (
                <div className="text-3xs text-green-700 font-bold bg-green-50 p-1.5 rounded border border-green-100 mt-1">
                  ※ 판매자 귀책(제품불량/오발송)으로 인해 배송비가 면제됩니다.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mb-3 bg-slate-50 p-3 rounded border">
              <div className="block text-3xs font-bold text-light mb-1">수거 방식 선택</div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-dark font-medium cursor-pointer">
                  <input 
                    type="radio" 
                    name="pickup_type" 
                    value="pickup" 
                    checked={claimPickupType === 'pickup'}
                    onChange={() => setClaimPickupType('pickup')}
                    className="accent-primary"
                  />
                  지정택배 수거 요청
                </label>
                <label className="flex items-center gap-1.5 text-xs text-dark font-medium cursor-pointer">
                  <input 
                    type="radio" 
                    name="pickup_type" 
                    value="self" 
                    checked={claimPickupType === 'self'}
                    onChange={() => setClaimPickupType('self')}
                    className="accent-primary"
                  />
                  직접 발송 (선불)
                </label>
              </div>

              {claimPickupType === 'pickup' && (
                <div className="text-3xs text-green-700 font-bold bg-green-50 p-2 rounded border border-green-100 mt-1 flex flex-col gap-1" style={{ lineHeight: '1.4' }}>
                  <span>※ 스마트택배 API를 통해 로젠택배 반품기사님이 자동 방문 수거 접수됩니다.</span>
                  <span className="text-amber-800">★ [회수 안내] 박스 겉면에 <b className="text-red-600 font-black">"영테크 반품"</b> 또는 <b className="text-red-600 font-black">"영테크 교환"</b>이라고 눈에 띄게 크게 적어 문 앞에 놓아주세요. 영업일 기준 1~2일 내 기사님이 방문하여 수집해 갑니다.</span>
                </div>
              )}

              {claimPickupType === 'self' && (
                <div className="text-3xs text-slate-600 font-bold bg-slate-100 p-2 rounded border border-slate-200 mt-1 flex flex-col gap-1" style={{ lineHeight: '1.4' }}>
                  <span>※ 타 택배사(편의점 등)를 이용하여 직접 선불로 발송하셔야 합니다. (착불 발송 시 금액 차감 추가 발생)</span>
                  <span>★ [반송 주소지] <b>경기도 시흥시 수출대로 9-36 헤이븐타워 지식산업센터 601호 영테크 물류담당자 앞</b></span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowClaimModal(false)}
              className="btn btn-secondary text-xs py-2 px-4 font-bold text-slate-500"
              style={{ backgroundColor: '#f1f5f9' }}
            >
              취소
            </button>
            <button
              onClick={handleSubmittingClaim}
              className="btn btn-primary text-xs py-2 px-5 font-bold"
            >
              신청 완료
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Naver-style Profile Edit Modal */}
    {showEditProfileModal && (
      <div className="naver-edit-modal" onClick={() => setShowEditProfileModal(false)}>
        <div className="naver-edit-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="naver-edit-header">
            <h3>내 정보 수정</h3>
            <button 
              onClick={() => setShowEditProfileModal(false)} 
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="naver-edit-body">
              <div className="naver-input-group">
                <label className="naver-label">이메일 계정</label>
                <input 
                  type="email" 
                  value={user.email} 
                  disabled 
                  className="naver-input" 
                />
                <span className="text-3xs text-light">이메일 계정은 변경이 불가능합니다.</span>
              </div>

              <div className="naver-input-group">
                <label className="naver-label">이름(회사명)</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="naver-input" 
                  placeholder="수정할 이름을 입력해 주세요"
                  required
                />
              </div>

              <div className="naver-input-group">
                <label className="naver-label">새 비밀번호 (선택)</label>
                <input 
                  type="password" 
                  value={editPassword} 
                  onChange={(e) => setEditPassword(e.target.value)} 
                  className="naver-input" 
                  placeholder="변경할 때만 입력하세요 (영문+숫자+특수문자, 8자 이상)"
                />
              </div>

              <div className="naver-input-group">
                <label className="naver-label">새 비밀번호 확인</label>
                <input 
                  type="password" 
                  value={editConfirmPassword} 
                  onChange={(e) => setEditConfirmPassword(e.target.value)} 
                  className="naver-input" 
                  placeholder="새 비밀번호를 한번 더 입력해 주세요"
                />
              </div>

              <div className="naver-input-group">
                <label className="naver-label">휴대폰 번호</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const formatted = digits.length <= 3
                      ? digits
                      : digits.length <= 7
                        ? `${digits.slice(0, 3)}-${digits.slice(3)}`
                        : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
                    setEditPhone(formatted);
                  }}
                  className="naver-input"
                  placeholder="010-1234-5678"
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="naver-input-group">
                <label className="naver-label">기본 배송지 주소</label>
                <input 
                  type="text" 
                  value={editAddress} 
                  onChange={(e) => setEditAddress(e.target.value)} 
                  className="naver-input" 
                  placeholder="예) 경기도 시흥시 수출대로..."
                />
              </div>
            </div>

            <div className="naver-edit-footer flex items-center justify-between">
              <button 
                type="button" 
                onClick={handleWithdrawAccount} 
                className="btn-withdraw mr-auto"
              >
                회원탈퇴
              </button>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowEditProfileModal(false)} 
                  className="btn-naver-cancel"
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="btn-naver-submit"
                >
                  적용하기
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Password Verification Modal before Profile Edit */}
    {showVerifyPasswordModal && (
      <div className="naver-edit-modal" onClick={() => setShowVerifyPasswordModal(false)}>
        <div className="naver-verify-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="naver-edit-header">
            <h3>비밀번호 확인</h3>
            <button 
              onClick={() => setShowVerifyPasswordModal(false)} 
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleVerifyPassword}>
            <div className="naver-verify-body">
              <span className="text-xs text-slate-600 font-semibold leading-relaxed">
                안전한 회원정보 보호를 위해 비밀번호를 다시 한번 입력해 주세요.
              </span>
              <div className="naver-input-group mt-2">
                <input 
                  type="password" 
                  value={verifyPasswordInput} 
                  onChange={(e) => setVerifyPasswordInput(e.target.value)} 
                  className="naver-input" 
                  placeholder="비밀번호를 입력해 주세요"
                  required
                  autoFocus
                />
              </div>
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('yt_token');
                    window.location.href = '/login?action=reset-password';
                  }}
                  className="text-xs text-slate-400 hover:text-primary underline transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  비밀번호가 기억나지 않으시나요? (비밀번호 찾기)
                </button>
              </div>
            </div>

            <div className="naver-edit-footer">
              <button 
                type="button" 
                onClick={() => setShowVerifyPasswordModal(false)} 
                className="btn-naver-cancel"
              >
                취소
              </button>
              <button 
                type="submit" 
                className="btn-naver-submit"
              >
                확인
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  );
}
