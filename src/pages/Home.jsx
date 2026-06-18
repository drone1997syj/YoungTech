import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingCart, ArrowLeftRight, Check } from 'lucide-react';
import './Home.css';

const BANNERS = [
  {
    id: 1,
    title: "영테크 공식 대리점 자동화 솔루션",
    subtitle: "파나소닉 A6 서보모터 & 미쓰비시 J4 라인업",
    desc: "공식 유통망을 통한 신속한 납기, 경쟁력 있는 견적 및 무상 기술 지원 제공",
    bg: "linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)",
    badge: "OFFICIAL PARTNER",
    color: "#fff"
  },
  {
    id: 2,
    title: "설계 공수 80% 단축, 견적 즉시 확인",
    subtitle: "영테크 자동화 부품 및 직교 로봇 기술 의뢰",
    desc: "3D CAD 도면 검토 및 챗봇을 통한 즉각적인 사양 매칭 및 견적 산출 서비스",
    bg: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 100%)",
    badge: "ENGINEERING SUPPORT",
    color: "#fff"
  }
];

const CATEGORY_MAP = {
  motor: '모터',
  reducer: '감속기',
  robot: '로봇',
  plc: 'PLC',
  motion: '볼스크류/LM'
};

export default function Home() {
  const { navigate, addToCart, addToCompare, compareList, setChatOpen, products } = useShop();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto slide banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  };

  const recommendedProducts = (products || []).slice(0, 4); // Take first 4 as recommendations

  const handleCompareClick = (product, e) => {
    e.stopPropagation();
    const res = addToCompare(product);
    if (!res.success) {
      alert(res.message);
    } else {
      alert(`${product.name}이(가) 사양 비교 목록에 추가되었습니다. (현재 ${compareList.length + 1}개)`);
    }
  };

  const handleCartClick = (product, e) => {
    e.stopPropagation();
    addToCart(product, 1);
    alert(`${product.name} 1개가 장바구니에 담겼습니다.`);
  };

  return (
    <div className="home-page animate-fade-in">
      {/* Slider Banner Section */}
      <section className="hero-banner" style={{ background: BANNERS[currentSlide].bg }}>
        <button className="slide-arrow prev-arrow" onClick={prevSlide}>
          <ChevronLeft size={24} />
        </button>
        <button className="slide-arrow next-arrow" onClick={nextSlide}>
          <ChevronRight size={24} />
        </button>
        
        <div className="container hero-slide-content" key={currentSlide}>
          <span className="slide-badge">{BANNERS[currentSlide].badge}</span>
          <h2 className="slide-title">{BANNERS[currentSlide].subtitle}</h2>
          <h3 className="slide-main-title">{BANNERS[currentSlide].title}</h3>
          <p className="slide-desc">{BANNERS[currentSlide].desc}</p>
          <button onClick={() => navigate('productList')} className="slide-cta-btn btn btn-primary">
            제품 보러가기 <ArrowRight size={16} style={{ marginLeft: '6px' }} />
          </button>
        </div>

        <div className="slide-dots">
          {BANNERS.map((_, idx) => (
            <span 
              key={idx} 
              className={`slide-dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>
      </section>

      {/* Category Grid Section */}
      <section className="section-categories py-12 bg-white">
        <div className="container">
          <h3 className="section-title text-center text-dark font-bold text-2xl mb-8">핵심 제품 라인업</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="category-card cursor-pointer" onClick={() => navigate('productList')}>
              <div className="category-card-img bg-purple-50 flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=300" alt="모터" />
              </div>
              <div className="category-card-body p-4 text-center">
                <h4 className="font-bold text-dark mb-1">구동 모터 모듈</h4>
                <p className="text-xs text-light">파나소닉, 미쓰비시 AC 서보모터 및 스텝모터</p>
              </div>
            </div>

            <div className="category-card cursor-pointer" onClick={() => navigate('productList')}>
              <div className="category-card-img bg-purple-50 flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=300" alt="감속기 및 PLC" />
              </div>
              <div className="category-card-body p-4 text-center">
                <h4 className="font-bold text-dark mb-1">감속기 & PLC 제어기</h4>
                <p className="text-xs text-light">SHIMPO 유성 감속기 및 파나소닉 FP7 모션 PLC</p>
              </div>
            </div>

            <div className="category-card cursor-pointer" onClick={() => navigate('productList')}>
              <div className="category-card-img bg-purple-50 flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=300" alt="로봇 및 볼스크류" />
              </div>
              <div className="category-card-body p-4 text-center">
                <h4 className="font-bold text-dark mb-1">직교 로봇 & LM 가이드</h4>
                <p className="text-xs text-light">ATRO 직교 로봇 모듈 및 THK 고정밀 LM 가이드</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="section-featured py-12">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <h3 className="section-title text-dark font-bold text-2xl">추천 베스트 상품</h3>
            <button onClick={() => navigate('productList')} className="btn btn-outline flex items-center gap-1 text-sm">
              전체 상품보기 <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {recommendedProducts.map(product => (
              <div 
                key={product.id} 
                className="card product-card cursor-pointer"
                onClick={() => navigate('productDetail', product.id)}
              >
                <div className="product-card-img">
                  <img src={product.image ? product.image.split(',')[0] : ''} alt={product.name} />
                </div>
                <div className="product-card-body p-4 flex flex-col justify-between">
                  <div>
                    <span className="product-category-tag text-xs">{CATEGORY_MAP[product.category] || product.category}</span>
                    <h4 className="product-title font-bold text-dark text-sm mb-2">{product.name}</h4>
                  </div>
                  <div className="mt-4">
                    <span className="product-price font-extrabold text-primary text-base">
                      {product.price.toLocaleString()} 원
                    </span>
                    <div className="product-card-actions flex gap-2 mt-3 pt-3 border-t">
                      <button 
                        onClick={(e) => handleCompareClick(product, e)} 
                        className="btn btn-secondary flex-1 py-1 px-2 text-xs flex items-center justify-center gap-1"
                        title="비교 담기"
                      >
                        <ArrowLeftRight size={12} /> 비교
                      </button>
                      <button 
                        onClick={(e) => handleCartClick(product, e)} 
                        className="btn btn-primary py-1 px-2 text-xs flex items-center justify-center"
                        title="장바구니 담기"
                      >
                        <ShoppingCart size={12} /> 담기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industrial Design Case Section */}
      <section className="section-design-case py-12 bg-white border-t">
        <div className="container">
          <h3 className="section-title text-center text-dark font-bold text-2xl mb-8">자동화 설계 제안 사례</h3>
          <div className="design-case-wrapper grid grid-cols-2 gap-8 items-center">
            <div className="design-case-desc p-6">
              <span className="badge badge-primary mb-2">CASE STUDY</span>
              <h4 className="font-bold text-dark text-xl mb-4">멀티 자유도 반자동화 조절 연결 시스템</h4>
              <p className="text-sm mb-4">
                중저 정밀도 및 경부하 어셈블리 또는 부품 조립 연결 라인에 최적화된 기구 설계 사례입니다. 비교적 좁은 조립 공간에서도 뛰어난 안정성을 유지합니다.
              </p>
              <ul className="design-points text-sm">
                <li className="flex items-center gap-2 mb-2">
                  <Check size={16} className="text-success" /> 파나소닉 A6 서보모터 결합으로 이송축 제어 고도화
                </li>
                <li className="flex items-center gap-2 mb-2">
                  <Check size={16} className="text-success" /> 가이드 리니어 볼트 일체화로 백래쉬 최소화
                </li>
                <li className="flex items-center gap-2 mb-2">
                  <Check size={16} className="text-success" /> 20-bit 엔코더 드라이버 탑재로 미크론 단위 보정
                </li>
              </ul>
              <button 
                onClick={() => setChatOpen(true)}
                className="btn btn-primary mt-6 text-sm"
              >
                기술 사양 및 부품 선정 문의하기
              </button>
            </div>
            <div className="design-case-visual p-4 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="case-diagram flex flex-col items-center">
                <div className="case-graphic-box">
                  {/* Schematic box representing physical hardware assembly */}
                  <div className="schematic-motor">AC Servo Motor (400W)</div>
                  <div className="schematic-coupling">Flexible Coupling</div>
                  <div className="schematic-stage">Linear Guide Stage (670mm)</div>
                </div>
                <span className="text-xs text-light mt-4">멀티 자유도 연결 시스템 모식도</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Brand Logo Banner Section */}
      <section className="section-brands py-8 bg-gray-50 border-t">
        <div className="container">
          <h4 className="text-center text-xs font-bold text-light uppercase tracking-wider mb-6">FA BRAND PARTNERS</h4>
          <div className="brand-logos-flex flex justify-around items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-300 gap-6 flex-wrap">
            <span className="font-extrabold text-base text-dark">PANASONIC</span>
            <span className="font-extrabold text-base text-dark">MITSUBISHI</span>
            <span className="font-extrabold text-base text-dark">NIDEC SHIMPO</span>
            <span className="font-extrabold text-base text-dark">MOONS' STEP</span>
            <span className="font-extrabold text-base text-dark">NIKKI DENSO</span>
            <span className="font-extrabold text-base text-dark">INOVANCE</span>
            <span className="font-extrabold text-base text-dark">THK MOTION</span>
          </div>
        </div>
      </section>
    </div>
  );
}
