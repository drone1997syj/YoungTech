import React from 'react';
import { useShop } from '../context/ShopContext';
import ProductCompare from '../components/ProductCompare';
import { ShoppingCart, ArrowLeftRight, Search } from 'lucide-react';
import './ProductList.css';

const CATEGORY_MAP = {
  motor: '모터',
  reducer: '감속기',
  robot: '로봇',
  plc: 'PLC',
  motion: '볼스크류/LM'
};

export default function ProductList() {
  const { 
    activeCategory, 
    setActiveCategory, 
    searchQuery, 
    setSearchQuery, 
    navigate, 
    addToCart, 
    addToCompare,
    compareList,
    products
  } = useShop();

  // Filter products based on category and search query
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.specs && typeof product.specs === 'object' && Object.entries(product.specs).some(([key, val]) => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      ));
    return matchesCategory && matchesSearch;
  });

  const handleCompareClick = (product, e) => {
    e.stopPropagation();
    const res = addToCompare(product);
    if (!res.success) {
      alert(res.message);
    } else {
      alert(`${product.name}이(가) 사양 비교 목록에 추가되었습니다.`);
    }
  };

  const handleCartClick = (product, e) => {
    e.stopPropagation();
    addToCart(product, 1);
    alert(`${product.name} 1개가 장바구니에 담겼습니다.`);
  };

  return (
    <div className="product-list-page container py-8 animate-fade-in">
      {/* Spec Comparison Component */}
      <ProductCompare />

      <div className="product-list-layout">
        {/* Sidebar Filter */}
        <aside className="list-sidebar card p-6">
          <h4 className="sidebar-title font-bold text-dark text-base mb-4">카테고리</h4>
          <div className="sidebar-category-list flex flex-col gap-2">
            <button 
              className={`sidebar-cat-btn ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
            >
              전체 상품 ({products.length})
            </button>
            {Object.entries(CATEGORY_MAP).map(([key, name]) => (
              <button 
                key={key}
                className={`sidebar-cat-btn ${activeCategory === key ? 'active' : ''}`}
                onClick={() => { setActiveCategory(key); setSearchQuery(''); }}
              >
                {name} ({products.filter(p => p.category === key).length})
              </button>
            ))}
          </div>

          <div className="sidebar-info-box mt-6 p-4 bg-purple-50 rounded text-xs text-primary font-medium">
            💡 <b>사양비교 팁:</b> 제품 카드 하단의 [비교] 버튼을 클릭해 최대 3개 제품의 세부 사양 테이블을 비교해 보세요.
          </div>
        </aside>

        {/* Main List Section */}
        <main className="list-main">
          <div className="list-header flex justify-between items-center mb-6">
            <div className="list-result-info">
              {searchQuery ? (
                <span className="text-sm">
                  검색어 <b>"{searchQuery}"</b>에 대한 검색 결과 <b>{filteredProducts.length}</b>건
                </span>
              ) : (
                <span className="text-sm">
                  <b>{activeCategory === 'all' ? '전체 상품' : CATEGORY_MAP[activeCategory]}</b> 목록 (총 <b>{filteredProducts.length}</b>개)
                </span>
              )}
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="card list-product-card cursor-pointer"
                  onClick={() => navigate('productDetail', product.id)}
                >
                  <div className="list-product-img">
                    <img src={product.image ? product.image.split(',')[0] : ''} alt={product.name} />
                  </div>
                  <div className="list-product-body p-4 flex flex-col justify-between">
                    <div>
                      <span className="product-category-tag text-xs">
                        {CATEGORY_MAP[product.category] || product.category}
                      </span>
                      <h4 className="product-title font-bold text-dark text-sm mb-2" title={product.name}>
                        {product.name}
                      </h4>
                      <p className="product-short-desc text-xs text-light mb-3">
                        {product.description ? product.description.slice(0, 45) + '...' : ''}
                      </p>
                    </div>

                    <div className="mt-2">
                      <div className="product-price font-extrabold text-primary text-base">
                        {product.price.toLocaleString()} 원
                      </div>
                      <div className="product-card-actions flex gap-2 mt-4 pt-3 border-t">
                        <button 
                          onClick={(e) => handleCompareClick(product, e)} 
                          className={`btn btn-secondary flex-1 py-1.5 px-2 text-xs flex items-center justify-center gap-1 ${compareList.some(item => item.id === product.id) ? 'compare-active' : ''}`}
                          title="사양 비교 목록에 담기"
                        >
                          <ArrowLeftRight size={12} /> 비교
                        </button>
                        <button 
                          onClick={(e) => handleCartClick(product, e)} 
                          className="btn btn-primary py-1.5 px-3 text-xs flex items-center justify-center"
                          title="장바구니에 담기"
                        >
                          <ShoppingCart size={12} /> 담기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-products card p-12 text-center">
              <Search size={48} className="text-light mx-auto mb-4" style={{ display: 'block', margin: '0 auto 1rem' }} />
              <h4 className="font-bold text-dark text-lg mb-2">검색 결과가 없습니다.</h4>
              <p className="text-sm text-light">다른 키워드나 품번을 입력해 보시거나, 좌측 카테고리 필터를 이용해 주세요.</p>
              <button 
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }} 
                className="btn btn-primary mt-6 text-sm"
              >
                전체 상품 목록으로 돌아가기
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
