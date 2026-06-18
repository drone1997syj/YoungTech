import React from 'react';
import { useShop } from '../context/ShopContext';
import { Trash2, ArrowRight, ShoppingBag, Plus, Minus } from 'lucide-react';
import './Cart.css';

export default function Cart() {
  const { cart, updateQty, removeFromCart, clearCart, navigate, user } = useShop();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = subtotal >= 500000 || subtotal === 0 ? 0 : 3000; // 50만원 이상 무료배송 (산업용 고가 장비 감안)
  const total = subtotal + shippingFee;

  const handleCheckoutClick = () => {
    if (!user) {
      alert('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.');
      navigate('login');
      return;
    }
    navigate('checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="cart-page-empty container py-16 text-center animate-fade-in">
        <div className="empty-cart-icon-wrapper mb-6 flex justify-center">
          <ShoppingBag size={64} className="text-light" />
        </div>
        <h3 className="font-extrabold text-dark text-xl mb-2">장바구니가 비어 있습니다.</h3>
        <p className="text-sm text-light mb-6">영테크의 엄선된 고성능 서보 시스템 부품들을 추가해 보세요.</p>
        <button onClick={() => navigate('productList')} className="btn btn-primary text-sm py-2.5 px-6">
          제품 쇼핑하러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page container py-8 animate-fade-in">
      <h2 className="page-title font-extrabold text-dark text-2xl mb-8">장바구니</h2>

      <div className="cart-layout">
        {/* Cart Items List */}
        <div className="cart-items-section flex flex-col gap-4">
          <div className="card p-6">
            <table className="cart-table">
              <thead>
                <tr>
                  <th className="th-product">상품 정보</th>
                  <th className="th-price">단가</th>
                  <th className="th-qty">수량</th>
                  <th className="th-total">합계</th>
                  <th className="th-action"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.id}>
                    <td className="td-product flex items-center gap-4">
                      <img src={item.image ? item.image.split(',')[0] : ''} alt={item.name} className="cart-item-img" />
                      <div>
                        <h4 className="cart-item-title font-bold text-dark text-sm">{item.name}</h4>
                        <span className="text-xs text-light block mt-1">품번: {item.id.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="td-price text-sm text-dark font-medium">
                      {(item.price || 0).toLocaleString()} 원
                    </td>
                    <td className="td-qty">
                      <div className="qty-counter flex items-center">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} className="qty-btn-sm">
                          <Minus size={10} />
                        </button>
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
                          className="qty-input-sm text-center" 
                        />
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} className="qty-btn-sm">
                          <Plus size={10} />
                        </button>
                      </div>
                    </td>
                    <td className="td-total text-sm text-primary font-bold">
                      {((item.price || 0) * item.quantity).toLocaleString()} 원
                    </td>
                    <td className="td-action">
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="cart-delete-btn"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-6 pt-6 border-t">
              <button onClick={() => navigate('productList')} className="btn btn-outline text-xs">
                ← 쇼핑 계속하기
              </button>
              <button onClick={clearCart} className="btn btn-secondary py-2 px-4 text-xs flex items-center gap-1">
                <Trash2 size={12} /> 장바구니 비우기
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="cart-summary-section">
          <div className="card p-6 summary-card">
            <h3 className="summary-title font-bold text-dark text-lg mb-6 border-b pb-3">결제 예정 금액</h3>
            
            <div className="summary-row flex justify-between text-sm mb-4">
              <span className="text-light">상품 합계</span>
              <span className="font-semibold text-dark">{subtotal.toLocaleString()} 원</span>
            </div>
            
            <div className="summary-row flex justify-between text-sm mb-4">
              <span className="text-light">가상 배송비</span>
              <span className="font-semibold text-dark">
                {shippingFee === 0 ? '무료배송' : `${shippingFee.toLocaleString()} 원`}
              </span>
            </div>
            <p className="shipping-notice text-xs text-light mb-6">
              * 영테크 회원 대상 50만원 이상 무료 가상 배송을 지원합니다.
            </p>

            <div className="total-row flex justify-between items-center border-t pt-4 mb-6">
              <span className="font-bold text-dark">최종 결제 금액</span>
              <span className="total-price font-extrabold text-primary text-xl">
                {total.toLocaleString()} 원
              </span>
            </div>

            <button 
              onClick={handleCheckoutClick}
              className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 font-bold text-sm"
            >
              주문서 작성하기 <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
