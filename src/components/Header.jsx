import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Search, ShoppingCart, User, MessageSquare, ArrowLeftRight, LogOut, Cpu } from 'lucide-react';
import './Header.css';

export default function Header() {
  const { 
    user, 
    cart, 
    categories,
    compareList, 
    setSearchQuery, 
    setActiveCategory, 
    navigate, 
    logout, 
    setChatOpen 
  } = useShop();

  const [searchInput, setSearchInput] = useState('');

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    navigate('productList');
  };

  const handleCategoryClick = (category) => {
    setActiveCategory(category);
    setSearchQuery(''); // Reset search when clicking category
    navigate('productList');
  };

  return (
    <header className="site-header">
      {/* Top Utility Bar */}
      <div className="top-bar">
        <div className="container flex justify-between items-center text-xs">
          <div className="top-bar-message font-medium text-white">
            ⚡ 영테크 데모 쇼핑몰 - 인터넷 주소 구매 전 테스트용 (모의 결제 지원)
          </div>
          <div className="top-bar-links flex gap-4 text-white">
            {user ? (
              <>
                <span className="user-welcome"><b>{user.name}</b>님 환영합니다</span>
                {user.role === 'admin' && (
                  <button onClick={() => navigate('admin')} className="top-link-btn font-bold text-yellow-300" style={{ color: '#fbbf24', fontWeight: 'bold' }}>★ 관리자 모드</button>
                )}
                <button onClick={() => navigate('myPage')} className="top-link-btn">마이페이지</button>
                <button onClick={logout} className="top-link-btn flex items-center gap-1">
                  <LogOut size={12} /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('login')} className="top-link-btn">로그인</button>
                <button onClick={() => navigate('register')} className="top-link-btn">회원가입</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="main-header">
        <div className="container flex justify-between items-center py-4 gap-4 flex-wrap">
          {/* Logo */}
          <div className="logo flex items-center gap-2 cursor-pointer" onClick={() => navigate('home')}>
            <img 
              src="https://globalyt.co.kr/sh_img/hd/top_menu/logo.png" 
              alt="영테크 로고" 
              className="logo-image" 
              style={{ height: '51px', objectFit: 'contain' }}
            />
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="search-form flex-1 max-w-xl">
            <div className="search-input-wrapper flex">
              <input 
                type="text" 
                placeholder="서보모터, 서보드라이버 품번 또는 키워드 입력..." 
                className="search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="search-submit-btn">
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* Action Icons */}
          <div className="header-actions flex gap-4">
            {/* Compare Button */}
            <button 
              className="action-btn-item flex flex-col items-center justify-center relative"
              onClick={() => {
                setActiveCategory('all');
                navigate('productList');
                // Scroll to compare section if it is shown
              }}
              title="사양 비교"
            >
              <div className="icon-badge-wrapper">
                <ArrowLeftRight size={22} />
                {compareList.length > 0 && <span className="action-badge bg-warning">{compareList.length}</span>}
              </div>
              <span className="action-label">사양비교</span>
            </button>

            {/* Cart Button */}
            <button 
              className="action-btn-item flex flex-col items-center justify-center relative"
              onClick={() => navigate('cart')}
              title="장바구니"
            >
              <div className="icon-badge-wrapper">
                <ShoppingCart size={22} />
                {cartCount > 0 && <span className="action-badge bg-primary">{cartCount}</span>}
              </div>
              <span className="action-label">장바구니</span>
            </button>

            {/* Live Chat Button */}
            <button 
              className="action-btn-item flex flex-col items-center justify-center"
              onClick={() => setChatOpen(true)}
              title="채팅 상담"
            >
              <div className="icon-badge-wrapper">
                <MessageSquare size={22} />
              </div>
              <span className="action-label">채팅문의</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Category Bar */}
      <nav className="category-nav">
        <div className="container flex gap-1">
          <button onClick={() => handleCategoryClick('all')} className="nav-item">
            전체 상품
          </button>
          {categories && categories.map(cat => (
            <button key={cat.id} onClick={() => handleCategoryClick(cat.id)} className="nav-item">
              {cat.name}
            </button>
          ))}
          <button 
            onClick={() => alert('영테크 도면/견적 문의 서비스 준비중입니다. 우측 하단의 채팅문의를 이용해 주세요.')} 
            className="nav-item nav-item-highlight"
          >
            견적 및 도면의뢰
          </button>
        </div>
      </nav>
    </header>
  );
}
