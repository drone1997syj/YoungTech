import React, { useMemo, useState } from 'react';
import { useShop } from '../context/ShopContext';
import ProductCompare from '../components/ProductCompare';
import { ArrowLeftRight, Search, ShoppingCart } from 'lucide-react';
import './ProductList.css';

const FALLBACK_CATEGORY_NAMES = {
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
    products,
    categories
  } = useShop();

  const [selectedBrand, setSelectedBrand] = useState('all');

  const visibleProducts = useMemo(
    () => (products || []).filter(product => product.is_active !== false && product.is_active !== 0),
    [products]
  );

  const getCategoryName = (categoryId) => {
    const category = (categories || []).find(cat => cat.id === categoryId);
    return category?.name || FALLBACK_CATEGORY_NAMES[categoryId] || categoryId;
  };

  const motorBrands = useMemo(() => {
    const brands = visibleProducts
      .filter(product => product.category === 'motor')
      .map(product => String(product.brand || '').trim())
      .filter(Boolean);
    return [...new Set(brands)].sort((a, b) => a.localeCompare(b, 'ko-KR'));
  }, [visibleProducts]);

  const filteredProducts = visibleProducts.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesBrand = activeCategory !== 'motor' || selectedBrand === 'all' || product.brand === selectedBrand;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      product.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      (product.specs && typeof product.specs === 'object' && Object.values(product.specs).some(value =>
        String(value).toLowerCase().includes(query)
      ));
    return matchesCategory && matchesBrand && matchesSearch;
  });

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    setSelectedBrand('all');
    setSearchQuery('');
  };

  const handleCompareClick = (product, event) => {
    event.stopPropagation();
    const res = addToCompare(product);
    alert(res.success ? `${product.name} 상품을 사양 비교 목록에 추가했습니다.` : res.message);
  };

  const handleCartClick = (product, event) => {
    event.stopPropagation();
    addToCart(product, 1);
    alert(`${product.name} 1개가 장바구니에 담겼습니다.`);
  };

  return (
    <div className="product-list-page">
      <ProductCompare />

      <div className="product-list-shell container">
        <aside className="category-card">
          <h4>카테고리</h4>
          <button
            className={`category-pill ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleCategoryClick('all')}
          >
            전체 상품 <span>{visibleProducts.length}</span>
          </button>
          {(categories || []).map(category => (
            <button
              key={category.id}
              className={`category-pill ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category.id)}
            >
              {category.name} <span>{visibleProducts.filter(product => product.category === category.id).length}</span>
            </button>
          ))}
        </aside>

        <main className="product-list-main">
          <section className="list-hero-card">
            <div>
              <p className="eyebrow">B2B FA Parts</p>
              <h2>{activeCategory === 'all' ? '전체 상품' : getCategoryName(activeCategory)}</h2>
              <p>
                {activeCategory === 'motor'
                  ? '브랜드를 선택하면 모터 제품만 빠르게 정리해서 볼 수 있습니다.'
                  : '필요한 자동화 부품을 카테고리와 검색어로 간단하게 찾아보세요.'}
              </p>
            </div>
            <strong>{filteredProducts.length}개</strong>
          </section>

          {activeCategory === 'motor' && motorBrands.length > 0 && (
            <section className="brand-filter-card">
              <div className="brand-filter-title">
                <span>브랜드 퀵 필터</span>
                <small>관리자 상품 브랜드 값 기준 자동 생성</small>
              </div>
              <div className="brand-chip-row">
                <button
                  type="button"
                  className={`brand-chip ${selectedBrand === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedBrand('all')}
                >
                  전체
                </button>
                {motorBrands.map(brand => (
                  <button
                    key={brand}
                    type="button"
                    className={`brand-chip ${selectedBrand === brand ? 'active' : ''}`}
                    onClick={() => setSelectedBrand(brand)}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </section>
          )}

          {filteredProducts.length > 0 ? (
            <div className="product-card-grid">
              {filteredProducts.map(product => (
                <article
                  key={product.id}
                  className="simple-product-card"
                  onClick={() => navigate('productDetail', product.id)}
                >
                  <div className="simple-product-image">
                    <img src={product.image ? product.image.split(',')[0] : ''} alt={product.name} />
                  </div>
                  <div className="simple-product-body">
                    <div className="product-meta-line">
                      <span>{getCategoryName(product.category)}</span>
                      {product.brand && <span>{product.brand}</span>}
                    </div>
                    <h3>{product.name}</h3>
                    <p>{product.description ? `${product.description.slice(0, 58)}...` : '상세 사양은 제품 페이지에서 확인할 수 있습니다.'}</p>
                    <div className="simple-product-bottom">
                      <strong>{Number(product.price || 0).toLocaleString()}원</strong>
                      <div className="product-action-row">
                        <button
                          type="button"
                          className={`mini-action-btn ${compareList.some(item => item.id === product.id) ? 'active' : ''}`}
                          onClick={(event) => handleCompareClick(product, event)}
                        >
                          <ArrowLeftRight size={13} /> 비교
                        </button>
                        <button
                          type="button"
                          className="mini-action-btn primary"
                          onClick={(event) => handleCartClick(product, event)}
                        >
                          <ShoppingCart size={13} /> 담기
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-product-card">
              <Search size={42} />
              <h4>조건에 맞는 상품이 없습니다.</h4>
              <p>브랜드 필터나 검색어를 바꿔 다시 확인해 주세요.</p>
              <button onClick={() => { setSearchQuery(''); setSelectedBrand('all'); setActiveCategory('all'); }}>
                전체 상품 보기
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
