import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
  Lock,
  MessageSquare,
  Package,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  ZoomIn
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import './ProductDetail.css';

const CATEGORY_LABELS = {
  motor: '????',
  reducer: '???',
  robot: '??',
  plc: 'PLC',
  motion: '????/LM'
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString()}원`;

const toImageList = (imageValue) =>
  String(imageValue || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getCategoryLabel = (product, categoryMap) => {
  if (!product) return '상품';
  return categoryMap.get(product.category)?.name
    || CATEGORY_LABELS[product.category]
    || product.sub_category
    || product.category
    || '상품';
};

function DetailBadge({ children, tone = 'neutral' }) {
  return <span className={`detail-badge detail-badge-${tone}`}>{children}</span>;
}

function DetailStat({ label, value, hint, icon }) {
  return (
    <div className="detail-stat">
      <div className="detail-stat-icon">{icon}</div>
      <div className="detail-stat-copy">
        <span className="detail-stat-label">{label}</span>
        <strong className="detail-stat-value">{value}</strong>
        {hint ? <span className="detail-stat-hint">{hint}</span> : null}
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button type="button" className={`detail-tab-btn${active ? ' is-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function ProductDetail() {
  const {
    selectedProductId,
    navigate,
    addToCart,
    addToCompare,
    products,
    categories,
    user,
    fetchReviews,
    createReview,
    fetchQnas,
    createQna,
    answerQna
  } = useShop();

  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [qnas, setQnas] = useState([]);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [qnaTitle, setQnaTitle] = useState('');
  const [qnaContent, setQnaContent] = useState('');
  const [qnaSecret, setQnaSecret] = useState(false);
  const [adminAnswerMap, setAdminAnswerMap] = useState({});

  const product = products.find((item) => item.id === selectedProductId);

  const categoryMap = useMemo(
    () => new Map((categories || []).map((item) => [item.id, { ...item, parent_id: item.parent_id ?? null }])),
    [categories]
  );

  const categoryTrail = useMemo(() => {
    if (!product) return [];

    const trail = [];
    const seen = new Set();
    let current = categoryMap.get(product.category) || null;

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      trail.unshift(current);
      const parentId = String(current.parent_id || '').trim();
      current = parentId ? categoryMap.get(parentId) || null : null;
    }

    return trail;
  }, [product, categoryMap]);

  const categoryLabel = getCategoryLabel(product, categoryMap);
  const imageList = useMemo(() => toImageList(product?.image), [product?.image]);
  const stockCount = Number(product?.stock || 0);
  const isSoldOut = stockCount <= 0 || product?.is_active === false || product?.is_active === 0;
  const specsEntries = useMemo(
    () => Object.entries(product?.specs || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== ''),
    [product?.specs]
  );
  const summarySpecs = useMemo(() => {
    const entries = specsEntries.slice(0, 4);
    if (entries.length > 0) return entries;
    return [
      ['브랜드', product?.brand || '등록 정보 없음'],
      ['카테고리', categoryLabel],
      ['재고', `${stockCount.toLocaleString()}개`],
      ['상태', isSoldOut ? '품절' : '판매중']
    ];
  }, [specsEntries, product?.brand, categoryLabel, stockCount, isSoldOut]);

  const loadReviewsAndQna = async () => {
    if (!selectedProductId) {
      setReviews([]);
      setQnas([]);
      return;
    }

    try {
      const nextReviews = await fetchReviews(selectedProductId);
      const nextQnas = await fetchQnas(selectedProductId);
      setReviews(Array.isArray(nextReviews) ? nextReviews : []);
      setQnas(Array.isArray(nextQnas) ? nextQnas : []);
    } catch (error) {
      console.error('Failed to load product detail discussion data:', error);
      setReviews([]);
      setQnas([]);
    }
  };

  useEffect(() => {
    loadReviewsAndQna();
    setActiveImgIdx(0);
    setActiveTab('overview');
    setQuantity(1);
    setRating(5);
    setReviewComment('');
    setQnaTitle('');
    setQnaContent('');
    setQnaSecret(false);
    setAdminAnswerMap({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="container product-detail-empty">
          <div className="card product-detail-empty-card">
            <h3>상품을 찾을 수 없습니다.</h3>
            <p>이동한 상품 정보가 더 이상 존재하지 않거나, 잘못된 경로일 수 있습니다.</p>
            <button type="button" onClick={() => navigate('productList')} className="btn btn-primary">
              목록으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleQtyChange = (nextValue) => {
    const numeric = Number.isFinite(nextValue) ? nextValue : 1;
    const upperBound = isSoldOut ? 1 : Math.max(1, stockCount || 1);
    const clamped = Math.min(upperBound, Math.max(1, numeric));
    setQuantity(clamped);
  };

  const handleAddToCart = () => {
    if (isSoldOut) {
      alert('품절 상품입니다.');
      return;
    }
    addToCart(product, quantity);
    alert(`${product.name} ${quantity}개를 장바구니에 담았습니다.`);
  };

  const handleBuyNow = () => {
    if (isSoldOut) {
      alert('품절 상품입니다.');
      return;
    }
    addToCart(product, quantity);
    navigate('checkout');
  };

  const handleCompareClick = () => {
    const result = addToCompare(product);
    if (!result.success) {
      alert(result.message);
      return;
    }
    alert(`${product.name} 상품을 비교 목록에 추가했습니다.`);
  };

  const handleOpenInquiry = () => {
    const chatBtn = document.querySelector('.chat-widget-toggle');
    if (chatBtn) {
      chatBtn.click();
      return;
    }
    alert('문의창을 열 수 없습니다. 하단 채팅 버튼을 확인해주세요.');
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      alert('리뷰를 작성하려면 로그인이 필요합니다.');
      return;
    }
    const result = await createReview(product.id, rating, reviewComment);
    if (result.success) {
      setReviewComment('');
      loadReviewsAndQna();
      alert('리뷰가 등록되었습니다.');
      return;
    }
    alert(result.message);
  };

  const handleQnaSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      alert('문의를 작성하려면 로그인이 필요합니다.');
      return;
    }
    if (!qnaTitle.trim() || !qnaContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const result = await createQna(product.id, qnaTitle, qnaContent, qnaSecret);
    if (result.success) {
      setQnaTitle('');
      setQnaContent('');
      setQnaSecret(false);
      loadReviewsAndQna();
      alert('문의가 등록되었습니다.');
      return;
    }
    alert(result.message);
  };

  const handleAnswerSubmit = async (qnaId) => {
    const answer = adminAnswerMap[qnaId];
    if (!answer?.trim()) {
      alert('답변 내용을 입력해주세요.');
      return;
    }

    const result = await answerQna(qnaId, answer);
    if (result.success) {
      setAdminAnswerMap((prev) => ({ ...prev, [qnaId]: '' }));
      loadReviewsAndQna();
      alert('답변이 등록되었습니다.');
      return;
    }
    alert(result.message);
  };

  const detailPrice = Number(product.price || 0);
  const detailTotalPrice = detailPrice * quantity;

  return (
    <div className="product-detail-page">
      <div className="product-detail-topbar" />
      <div className="container product-detail-shell">
        <button type="button" className="detail-back-link" onClick={() => navigate('productList')}>
          <ArrowLeft size={16} />
          <span>상품 목록으로 돌아가기</span>
        </button>

        <nav className="detail-breadcrumbs" aria-label="breadcrumb">
          <button type="button" onClick={() => navigate('home')}>홈</button>
          <ChevronRight size={14} />
          <button type="button" onClick={() => navigate('productList')}>전체 상품</button>
          {categoryTrail.map((node) => (
            <React.Fragment key={node.id}>
              <ChevronRight size={14} />
              <button type="button" onClick={() => navigate('productList')}>{node.name}</button>
            </React.Fragment>
          ))}
          <ChevronRight size={14} />
          <span>{product.name}</span>
        </nav>

        <div className="detail-hero-grid">
          <section className="card detail-gallery-panel">
            <div className="detail-gallery-main">
              {imageList.length > 0 ? (
                <img src={imageList[activeImgIdx]} alt={product.name} className="detail-gallery-image" />
              ) : (
                <div className="detail-gallery-empty">
                  <ZoomIn size={28} />
                  <span>상품 이미지가 없습니다.</span>
                </div>
              )}
            </div>
            {imageList.length > 1 ? (
              <div className="detail-gallery-thumbs">
                {imageList.map((imageSrc, index) => (
                  <button
                    key={`${imageSrc}-${index}`}
                    type="button"
                    className={`detail-thumb${activeImgIdx === index ? ' is-active' : ''}`}
                    onClick={() => setActiveImgIdx(index)}
                  >
                    <img src={imageSrc} alt={`${product.name} 썸네일 ${index + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card detail-summary-panel">
            <div className="detail-chip-row">
              <DetailBadge tone="primary">{categoryLabel}</DetailBadge>
              {product.brand ? <DetailBadge tone="soft">{product.brand}</DetailBadge> : null}
              <DetailBadge tone={isSoldOut ? 'danger' : 'success'}>{isSoldOut ? '품절' : '판매중'}</DetailBadge>
            </div>

            <h1 className="detail-title">{product.name}</h1>
            <p className="detail-subtitle">
              {product.description || '상품 상세 설명이 등록되어 있지 않습니다.'}
            </p>

            <div className="detail-stat-grid">
              <DetailStat
                label="판매가"
                value={formatCurrency(detailPrice)}
                hint="VAT 별도"
                icon={<BadgeCheck size={18} />}
              />
              <DetailStat
                label="재고"
                value={`${stockCount.toLocaleString()}개`}
                hint={isSoldOut ? '품절 상태' : '구매 가능'}
                icon={<Package size={18} />}
              />
              <DetailStat
                label="문의"
                value="상담 가능"
                hint="채팅/문의 버튼 활용"
                icon={<MessageSquare size={18} />}
              />
              <DetailStat
                label="배송"
                value="출고 전 확인"
                hint="정책에 따라 달라질 수 있음"
                icon={<Truck size={18} />}
              />
            </div>

            <div className="detail-summary-cards">
              {summarySpecs.map(([key, value]) => (
                <div className="detail-summary-card" key={key}>
                  <span>{key}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))}
            </div>

            <div className="detail-info-row">
              <div className="detail-info-item">
                <ShieldCheck size={18} />
                <span>정품 및 사양 확인 후 구매를 안내합니다.</span>
              </div>
              <div className="detail-info-item">
                <Clock3 size={18} />
                <span>주문 후 출고 일정은 재고와 상황에 따라 달라질 수 있습니다.</span>
              </div>
            </div>
          </section>

          <aside className="card detail-purchase-panel">
            <div className="detail-purchase-box">
              <span className="detail-purchase-label">판매가</span>
              <strong className="detail-purchase-price">{formatCurrency(detailPrice)}</strong>
              <span className="detail-purchase-note">(VAT 별도)</span>
            </div>

            <div className="detail-qty-block">
              <span className="detail-purchase-label">수량</span>
              <div className="detail-qty-stepper">
                <button type="button" onClick={() => handleQtyChange(quantity - 1)} className="detail-qty-btn">
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={stockCount > 0 ? stockCount : undefined}
                  value={quantity}
                  onChange={(event) => handleQtyChange(Number(event.target.value))}
                  className="detail-qty-input"
                />
                <button type="button" onClick={() => handleQtyChange(quantity + 1)} className="detail-qty-btn">
                  +
                </button>
              </div>
            </div>

            <div className="detail-total-box">
              <div className="detail-total-copy">
                <span className="detail-purchase-label">총 수량</span>
                <strong className="detail-total-count">총 {quantity.toLocaleString()}개</strong>
              </div>
              <div className="detail-total-price-wrap">
                <span className="detail-purchase-label">총 금액</span>
                <strong className="detail-total-price">{formatCurrency(detailTotalPrice)}</strong>
              </div>
            </div>

            <div className="detail-action-stack">
              <button
                type="button"
                className="detail-buy-btn"
                onClick={handleBuyNow}
                disabled={isSoldOut}
              >
                <ShoppingCart size={18} />
                <span>{isSoldOut ? '품절' : '구매하기'}</span>
              </button>
              <button type="button" className="detail-inquiry-btn" onClick={handleOpenInquiry}>
                <MessageSquare size={18} />
                <span>문의하기</span>
              </button>
            </div>

            <button
              type="button"
              className="detail-ghost-link"
              onClick={handleAddToCart}
              disabled={isSoldOut}
            >
              장바구니 담기
            </button>

            <button
              type="button"
              className="detail-ghost-link detail-ghost-link-soft"
              onClick={handleCompareClick}
            >
              <ArrowLeftRight size={16} />
              비교하기
            </button>

            <div className="detail-benefit-list">
              <div className="detail-benefit-item">
                <BadgeCheck size={16} />
                <span>결제 전 가격과 재고를 다시 확인합니다.</span>
              </div>
              <div className="detail-benefit-item">
                <Truck size={16} />
                <span>배송 및 출고 일정은 관리자가 별도 안내할 수 있습니다.</span>
              </div>
              <div className="detail-benefit-item">
                <Lock size={16} />
                <span>문의 내용은 비공개로 작성할 수 있습니다.</span>
              </div>
            </div>
          </aside>
        </div>

        <section className="card detail-content-panel">
          <div className="detail-tabs">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>상세 설명</TabButton>
            <TabButton active={activeTab === 'specs'} onClick={() => setActiveTab('specs')}>사양</TabButton>
            <TabButton active={activeTab === 'shipping'} onClick={() => setActiveTab('shipping')}>배송안내</TabButton>
          </div>

          {activeTab === 'overview' && (
            <div className="detail-overview-grid">
              <div className="detail-overview-copy">
                <h3>{product.name}</h3>
                <p>
                  {product.description || '이 상품의 상세 설명이 아직 준비되지 않았습니다. 관리자가 등록한 사양과 이미지가 있으면 이 영역에 제품의 핵심 정보를 한눈에 확인할 수 있습니다.'}
                </p>
                <div className="detail-tag-row">
                  {categoryTrail.length > 0 ? (
                    categoryTrail.map((node) => <DetailBadge key={node.id} tone="soft">{node.name}</DetailBadge>)
                  ) : (
                    <DetailBadge tone="soft">{categoryLabel}</DetailBadge>
                  )}
                </div>
              </div>

              <div className="detail-overview-highlights">
                <div className="detail-highlight-card">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>고효율 설계</strong>
                    <span>제품 사양과 재고를 서버 기준으로 확인해 안전하게 주문합니다.</span>
                  </div>
                </div>
                <div className="detail-highlight-card">
                  <Package size={20} />
                  <div>
                    <strong>컴팩트 구성</strong>
                    <span>현장 적용을 고려한 간결한 정보 배치로 빠르게 비교할 수 있습니다.</span>
                  </div>
                </div>
                <div className="detail-highlight-card">
                  <Truck size={20} />
                  <div>
                    <strong>배송 안내</strong>
                    <span>출고 가능 여부와 납기는 주문 후 다시 확인될 수 있습니다.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="detail-specs-area">
              <table className="detail-spec-table">
                <tbody>
                  {specsEntries.length > 0 ? (
                    specsEntries.map(([key, value]) => (
                      <tr key={key}>
                        <th>{key}</th>
                        <td>{String(value)}</td>
                      </tr>
                    ))
                  ) : (
                    summarySpecs.map(([key, value]) => (
                      <tr key={key}>
                        <th>{key}</th>
                        <td>{String(value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="detail-shipping-area">
              <div className="detail-shipping-card">
                <Truck size={22} />
                <div>
                  <strong>출고</strong>
                  <p>재고 및 담당자 확인 후 출고 일정을 안내합니다.</p>
                </div>
              </div>
              <div className="detail-shipping-card">
                <Clock3 size={22} />
                <div>
                  <strong>소요 시간</strong>
                  <p>상품 특성에 따라 즉시 출고 또는 별도 확인이 필요할 수 있습니다.</p>
                </div>
              </div>
              <div className="detail-shipping-card">
                <BadgeCheck size={22} />
                <div>
                  <strong>증빙</strong>
                  <p>구매 확정 및 증빙 관련 안내는 주문 진행 과정에서 제공됩니다.</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="detail-bottom-grid">
          <section className="card detail-review-panel">
            <div className="detail-section-head">
              <div>
                <h3>고객 리뷰</h3>
                <p>구매 후기를 확인하고 남길 수 있습니다.</p>
              </div>
              <span className="detail-section-count">{reviews.length}개</span>
            </div>

            <div className="detail-list">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <article key={review.id} className="detail-list-item">
                    <div className="detail-list-top">
                      <strong>{review.user_name}</strong>
                      <div className="detail-star-row" aria-label={`${review.rating}점`}>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star key={index} size={12} fill={index < Number(review.rating || 0) ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                    </div>
                    <p>{review.comment}</p>
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                  </article>
                ))
              ) : (
                <div className="detail-empty-state">등록된 리뷰가 없습니다.</div>
              )}
            </div>

            {user ? (
              <form className="detail-form" onSubmit={handleReviewSubmit}>
                <div className="detail-form-row">
                  <label>평점</label>
                  <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                    <option value={5}>5점</option>
                    <option value={4}>4점</option>
                    <option value={3}>3점</option>
                    <option value={2}>2점</option>
                    <option value={1}>1점</option>
                  </select>
                </div>
                <textarea
                  className="detail-textarea"
                  placeholder="리뷰 내용을 입력해주세요."
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary">리뷰 등록</button>
              </form>
            ) : (
              <div className="detail-empty-state detail-empty-state-soft">리뷰를 작성하려면 로그인이 필요합니다.</div>
            )}
          </section>

          <section className="card detail-qna-panel">
            <div className="detail-section-head">
              <div>
                <h3>상품 Q&amp;A</h3>
                <p>구매 전 문의를 남기거나 답변을 확인할 수 있습니다.</p>
              </div>
              <span className="detail-section-count">{qnas.length}개</span>
            </div>

            <div className="detail-list">
              {qnas.length > 0 ? (
                qnas.map((qna) => {
                  const canRead = !qna.is_secret || (user && (user.id === qna.user_id || user.role === 'admin'));
                  return (
                    <article key={qna.id} className="detail-list-item">
                      <div className="detail-list-top">
                        <div className="detail-qna-title-row">
                          {qna.is_secret ? <Lock size={12} /> : null}
                          <strong>{canRead ? qna.title : '비밀글입니다'}</strong>
                        </div>
                        <span>{qna.user_name} · {new Date(qna.created_at).toLocaleDateString()}</span>
                      </div>

                      {canRead ? (
                        <div className="detail-qna-body">
                          <p>{qna.content}</p>

                          {qna.answer ? (
                            <div className="detail-answer-box">
                              <strong>관리자 답변</strong>
                              <p>{qna.answer}</p>
                            </div>
                          ) : (
                            user && user.role === 'admin' && (
                              <div className="detail-answer-form">
                                <textarea
                                  className="detail-textarea detail-textarea-sm"
                                  placeholder="답변을 입력하세요."
                                  value={adminAnswerMap[qna.id] || ''}
                                  onChange={(event) => setAdminAnswerMap((prev) => ({ ...prev, [qna.id]: event.target.value }))}
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => handleAnswerSubmit(qna.id)}
                                >
                                  답변 등록
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="detail-empty-state detail-empty-state-soft">
                          비밀글은 작성자와 관리자만 볼 수 있습니다.
                        </div>
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="detail-empty-state">등록된 문의가 없습니다.</div>
              )}
            </div>

            {user ? (
              <form className="detail-form" onSubmit={handleQnaSubmit}>
                <div className="detail-form-row">
                  <input
                    type="text"
                    className="input"
                    placeholder="문의 제목"
                    value={qnaTitle}
                    onChange={(event) => setQnaTitle(event.target.value)}
                    required
                  />
                </div>
                <label className="detail-secret-row">
                  <input
                    type="checkbox"
                    checked={qnaSecret}
                    onChange={(event) => setQnaSecret(event.target.checked)}
                  />
                  비밀글로 작성
                </label>
                <textarea
                  className="detail-textarea"
                  placeholder="문의 내용을 입력해주세요."
                  value={qnaContent}
                  onChange={(event) => setQnaContent(event.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary">문의 등록</button>
              </form>
            ) : (
              <div className="detail-empty-state detail-empty-state-soft">문의하려면 로그인이 필요합니다.</div>
            )}
          </section>
        </div>

        <section className="detail-support-banner">
          <div className="detail-support-copy">
            <ShieldCheck size={28} />
            <div>
              <h3>기술 상담 및 구매 문의</h3>
              <p>제품 사양, 호환성, 납기, 대량 구매는 채팅으로 빠르게 확인할 수 있습니다.</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleOpenInquiry}>
            상담 열기
          </button>
        </section>
      </div>
    </div>
  );
}
