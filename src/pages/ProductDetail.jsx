import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { ShoppingCart, ArrowLeftRight, ArrowLeft, ShieldCheck, Star, Lock, MessageSquare } from 'lucide-react';
import './ProductDetail.css';

const CATEGORY_MAP = {
  motor: '모터',
  reducer: '감속기',
  robot: '로봇',
  plc: 'PLC',
  motion: '볼스크류/LM'
};

export default function ProductDetail() {
  const { 
    selectedProductId, navigate, addToCart, addToCompare, products, user,
    fetchReviews, createReview, fetchQnas, createQna, answerQna 
  } = useShop();

  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [qnas, setQnas] = useState([]);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Review Form States
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  
  // Q&A Form States
  const [qnaTitle, setQnaTitle] = useState('');
  const [qnaContent, setQnaContent] = useState('');
  const [qnaSecret, setQnaSecret] = useState(false);

  // Q&A Admin Answer State
  const [adminAnswerMap, setAdminAnswerMap] = useState({});

  const product = products.find(p => p.id === selectedProductId);

  const loadReviewsAndQna = async () => {
    if (selectedProductId) {
      const rList = await fetchReviews(selectedProductId);
      setReviews(rList);
      const qList = await fetchQnas(selectedProductId);
      setQnas(qList);
    }
  };

  useEffect(() => {
    loadReviewsAndQna();
    setActiveImgIdx(0); // Reset main image view
  }, [selectedProductId]);

  if (!product) {
    return (
      <div className="container py-12 text-center">
        <h3 className="font-bold text-dark text-lg mb-4">상품을 찾을 수 없습니다.</h3>
        <button onClick={() => navigate('productList')} className="btn btn-primary">
          목록으로 이동
        </button>
      </div>
    );
  }

  const handleQtyChange = (val) => {
    if (val < 1) return;
    setQuantity(val);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    alert(`${product.name} ${quantity}개가 장바구니에 담겼습니다.`);
  };

  const handleCompareClick = () => {
    const res = addToCompare(product);
    if (!res.success) {
      alert(res.message);
    } else {
      alert(`${product.name}이(가) 사양 비교 목록에 추가되었습니다.`);
    }
  };

  // Submit Review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('리뷰를 남기려면 로그인이 필요합니다.');
      return;
    }
    const res = await createReview(product.id, rating, reviewComment);
    if (res.success) {
      setReviewComment('');
      loadReviewsAndQna();
      alert('리뷰가 성공적으로 등록되었습니다.');
    } else {
      alert(res.message);
    }
  };

  // Submit QnA
  const handleQnaSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('문의를 작성하려면 로그인이 필요합니다.');
      return;
    }
    if (!qnaTitle || !qnaContent) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    const res = await createQna(product.id, qnaTitle, qnaContent, qnaSecret);
    if (res.success) {
      setQnaTitle('');
      setQnaContent('');
      setQnaSecret(false);
      loadReviewsAndQna();
      alert('문의 사항이 접수되었습니다.');
    } else {
      alert(res.message);
    }
  };

  // Submit Answer (Admin only)
  const handleAnswerSubmit = async (qnaId) => {
    const answer = adminAnswerMap[qnaId];
    if (!answer) {
      alert('답변 내용을 입력해 주세요.');
      return;
    }
    const res = await answerQna(qnaId, answer);
    if (res.success) {
      setAdminAnswerMap(prev => ({ ...prev, [qnaId]: '' }));
      loadReviewsAndQna();
      alert('답변이 등록되었습니다.');
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="product-detail-page container py-8 animate-fade-in">
      {/* Back to list Link */}
      <button 
        onClick={() => navigate('productList')}
        className="back-btn flex items-center gap-1 text-sm font-semibold text-light mb-6"
      >
        <ArrowLeft size={16} /> 목록으로 돌아가기
      </button>

      {/* Main Info Box */}
      <div className="detail-layout grid grid-cols-2 gap-8 card p-8 mb-8">
        {/* Product Image Gallery */}
        {(() => {
          const images = product.image ? product.image.split(',').filter(Boolean) : [];
          return (
            <div className="detail-img-gallery flex flex-col gap-3">
              <div 
                className="detail-img-box bg-purple-50 rounded-lg overflow-hidden flex items-center justify-center"
                style={{ height: '350px', position: 'relative' }}
              >
                {images.length > 0 ? (
                  <img 
                    src={images[activeImgIdx]} 
                    alt={product.name} 
                    className="detail-img" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div className="text-light text-xs">등록된 이미지가 없습니다.</div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {images.map((imgUrl, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setActiveImgIdx(idx)}
                      className={`border rounded overflow-hidden cursor-pointer transition-all ${activeImgIdx === idx ? 'border-primary ring-2 ring-purple-100' : 'border-slate-200 hover:border-slate-400'}`}
                      style={{ 
                        width: '60px', 
                        height: '60px', 
                        backgroundColor: '#f8fafc', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: '6px'
                      }}
                    >
                      <img src={imgUrl} alt={`Thumb ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Product Order Control */}
        <div className="detail-order-info flex flex-col justify-between">
          <div>
            <span className="product-category-tag text-xs font-bold text-primary block mb-2">
              {CATEGORY_MAP[product.category] || product.category}
            </span>
            <h2 className="detail-title font-extrabold text-dark text-2xl mb-4">{product.name}</h2>
            <p className="detail-desc text-sm text-light mb-6">{product.description}</p>
          </div>

          <div className="detail-purchase-box border-t pt-6">
            <div className="price-row flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-light">판매 가격</span>
              <span className="detail-price font-extrabold text-primary text-2xl">
                {product.price.toLocaleString()} 원
              </span>
            </div>

            {/* Qty Counter */}
            <div className="qty-row flex justify-between items-center mb-6">
              <span className="text-sm font-bold text-light">수량 선택</span>
              <div className="qty-counter flex items-center">
                <button onClick={() => handleQtyChange(quantity - 1)} className="qty-btn">-</button>
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
                  className="qty-input text-center" 
                />
                <button onClick={() => handleQtyChange(quantity + 1)} className="qty-btn">+</button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons-row flex gap-4">
              <button 
                onClick={handleAddToCart}
                className="btn btn-primary flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm"
              >
                <ShoppingCart size={18} /> 장바구니 담기
              </button>
              <button 
                onClick={handleCompareClick}
                className="btn btn-secondary py-3 px-4 flex items-center justify-center gap-1 text-sm font-bold"
                title="사양 비교"
              >
                <ArrowLeftRight size={18} /> 사양비교 담기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Spec Table Section */}
      <div className="detail-spec-section card p-8 mb-8">
        <h3 className="section-title text-dark font-bold text-lg mb-6 border-b pb-3">기술 사양 (Technical Specifications)</h3>
        <table className="spec-table-detail">
          <tbody>
            {product.specs && Object.entries(product.specs).map(([key, val]) => (
              <tr key={key}>
                <td className="spec-key-col font-bold text-dark text-sm bg-purple-50">{key}</td>
                <td className="spec-val-col text-sm text-light">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reviews Section */}
      <div className="detail-reviews-section card p-8 mb-8">
        <h3 className="section-title text-dark font-bold text-lg mb-6 border-b pb-3">고객 리뷰 및 평점 ({reviews.length})</h3>
        
        {/* Review list */}
        <div className="reviews-list flex flex-col gap-4 mb-6">
          {reviews.length > 0 ? (
            reviews.map(rev => (
              <div key={rev.id} className="review-item border-b pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-dark">{rev.user_name}</span>
                  <div className="rating-stars flex gap-0.5 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < rev.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-light">{rev.comment}</p>
                <span className="text-3xs text-light block mt-1">{new Date(rev.created_at).toLocaleDateString()}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-light py-4 text-center">작성된 리뷰가 없습니다. 첫 리뷰를 작성해 보세요!</p>
          )}
        </div>

        {/* Review Form */}
        {user ? (
          <form onSubmit={handleReviewSubmit} className="review-form bg-slate-50 p-4 rounded border">
            <h4 className="text-xs font-bold mb-3">리뷰 작성하기</h4>
            <div className="flex gap-4 items-center mb-3">
              <label className="text-2xs text-light font-bold">평점 선택:</label>
              <select 
                value={rating} 
                onChange={(e) => setRating(Number(e.target.value))}
                className="form-select text-2xs p-1 border rounded"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5점)</option>
                <option value={4}>⭐⭐⭐⭐ (4점)</option>
                <option value={3}>⭐⭐⭐ (3점)</option>
                <option value={2}>⭐⭐ (2점)</option>
                <option value={1}>⭐ (1점)</option>
              </select>
            </div>
            <textarea 
              className="form-input text-xs h-20 resize-none mb-3"
              placeholder="리뷰 내용을 입력하세요..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary text-xs font-bold py-2 px-4">리뷰 등록</button>
          </form>
        ) : (
          <div className="text-center p-4 bg-slate-50 border rounded text-xs text-light">
            리뷰를 남기시려면 로그인이 필요합니다.
          </div>
        )}
      </div>

      {/* Q&A Section */}
      <div className="detail-qna-section card p-8 mb-8">
        <h3 className="section-title text-dark font-bold text-lg mb-6 border-b pb-3">상품 문의 Q&A ({qnas.length})</h3>

        {/* Q&A List */}
        <div className="qna-list flex flex-col gap-4 mb-6">
          {qnas.length > 0 ? (
            qnas.map(q => {
              const canRead = !q.is_secret || (user && (user.id === q.user_id || user.role === 'admin'));
              return (
                <div key={q.id} className="qna-item border-b pb-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5">
                      {q.is_secret && <Lock size={12} className="text-light" />}
                      <span className="text-xs font-bold text-dark">
                        {canRead ? q.title : '비밀글입니다.'}
                      </span>
                    </div>
                    <span className="text-3xs text-light">{q.user_name} | {new Date(q.created_at).toLocaleDateString()}</span>
                  </div>

                  {canRead ? (
                    <div className="qna-body pl-4 border-l-2 border-purple-200 mt-2">
                      <p className="text-xs text-light">{q.content}</p>
                      
                      {q.answer ? (
                        <div className="qna-answer bg-slate-50 p-3 rounded mt-3 text-xs">
                          <span className="font-bold text-primary block mb-1">↳ 관리자 답변:</span>
                          <p className="text-dark">{q.answer}</p>
                        </div>
                      ) : (
                        user && user.role === 'admin' && (
                          <div className="qna-answer-form mt-4">
                            <textarea
                              className="form-input text-2xs h-16 resize-none mb-2"
                              placeholder="관리자 답변을 작성하세요..."
                              value={adminAnswerMap[q.id] || ''}
                              onChange={(e) => setAdminAnswerMap({
                                ...adminAnswerMap,
                                [q.id]: e.target.value
                              })}
                            />
                            <button 
                              onClick={() => handleAnswerSubmit(q.id)}
                              className="btn btn-primary text-2xs font-bold py-1.5 px-3"
                            >
                              답변 등록
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-light pl-4 italic">비밀글 설정을 통해 작성자 본인 및 관리자만 조회 가능합니다.</p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-light py-4 text-center">작성된 문의가 없습니다.</p>
          )}
        </div>

        {/* Q&A Write Form */}
        {user ? (
          <form onSubmit={handleQnaSubmit} className="qna-form bg-slate-50 p-4 rounded border flex flex-col gap-3">
            <h4 className="text-xs font-bold">문의 작성하기</h4>
            <div className="flex gap-4 items-center">
              <input 
                type="text" 
                className="form-input text-xs flex-1"
                placeholder="문의 제목을 입력하세요..."
                value={qnaTitle}
                onChange={(e) => setQnaTitle(e.target.value)}
                required
              />
              <label className="flex items-center gap-1 text-xs text-light cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={qnaSecret} 
                  onChange={(e) => setQnaSecret(e.target.checked)} 
                  className="accent-primary"
                />
                비밀글 설정
              </label>
            </div>
            <textarea 
              className="form-input text-xs h-24 resize-none"
              placeholder="상세 문의 내용을 작성해 주세요..."
              value={qnaContent}
              onChange={(e) => setQnaContent(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary text-xs font-bold py-2 w-28">문의 등록</button>
          </form>
        ) : (
          <div className="text-center p-4 bg-slate-50 border rounded text-xs text-light">
            문의를 남기시려면 로그인이 필요합니다.
          </div>
        )}
      </div>

      {/* Warranty / Consultation banner */}
      <div className="detail-consult-banner card p-6 bg-indigo-950 text-white flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="banner-icon-bg bg-primary p-3 rounded-full flex items-center justify-center">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-base mb-1">영테크 안심 보증 및 기술 상담 서비스</h4>
            <p className="text-xs text-slate-300">구입일로부터 1년 무상 품질보증 제공. 해당 모델의 2D/3D CAD 도면 및 상세 기술자료가 필요하신가요?</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const chatBtn = document.querySelector('.chat-widget-toggle');
            if (chatBtn) chatBtn.click();
          }} 
          className="btn btn-primary text-xs font-bold py-2 px-4"
        >
          실시간 기술상담 문의
        </button>
      </div>
    </div>
  );
}
