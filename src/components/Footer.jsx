import React from 'react';
import { Cpu } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const telemarketingNo = import.meta.env.VITE_TELEMARKETING_NO || '{{입력 필요}}';

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top grid grid-cols-4 gap-8 py-6">
          <div className="footer-col company-summary">
            <div className="footer-logo flex items-center gap-2 mb-3">
              <div className="footer-logo-icon flex items-center justify-center">
                <Cpu size={22} className="text-white" />
              </div>
              <span className="footer-logo-text font-bold text-xl text-white">YoungTech</span>
            </div>
            <p className="text-base text-light mb-3">
              영테크는 서보모터, 서보드라이브 품번 또는 키워드 입력으로 빠르게 찾을 수 있는 산업 자동화 부품 쇼핑몰입니다.
            </p>
            <span className="text-sm text-light">© 2026 YoungTech. All rights reserved.</span>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title text-base font-semibold text-white mb-3">제품 카테고리</h4>
            <ul className="footer-links-list text-base">
              <li><a href="/products?category=motor">모터</a></li>
              <li><a href="/products?category=reducer">감속기</a></li>
              <li><a href="/products?category=plc">PLC</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title text-base font-semibold text-white mb-3">고객 서비스</h4>
            <ul className="footer-links-list text-base">
              <li><a href="/privacy">개인정보처리방침</a></li>
              <li><a href="https://globalyt.co.kr/bbs/board.php?bo_table=table42" target="_blank" rel="noopener noreferrer">3D CAD 도면 자료실</a></li>
              <li><a href="https://globalyt.co.kr/bbs/board.php?bo_table=table41" target="_blank" rel="noopener noreferrer">E-카탈로그 다운로드</a></li>
              <li><a href="https://globalyt.co.kr/bbs/board.php?bo_table=table44" target="_blank" rel="noopener noreferrer">기술 및 견적문의</a></li>
            </ul>
          </div>

          <div className="footer-col contact-info">
            <h4 className="footer-col-title text-base font-semibold text-white mb-3">고객센터 및 기술문의</h4>
            <p className="text-base text-light mb-2">
              <b>전화번호:</b> 070-7635-7550 (평일 09:00 ~ 18:00)
            </p>
            <p className="text-base text-light mb-2">
              <b>이메일:</b> youngtech001@gmail.com
            </p>
            <p className="text-sm text-light pt-2 border-top">
              고객 문의, 견적 요청, 기술 상담은 전화 또는 이메일로 연락해 주세요.
            </p>
          </div>
        </div>

        <div className="footer-business py-4 text-sm text-light">
          <p>
            <b>상호:</b> 영테크(YOUNG TECH) <span>|</span>
            <b>대표:</b> 심영찬 <span>|</span>
            <b>사업자등록번호:</b> 138-12-70745
          </p>
          <p>
            <b>통신판매업 신고번호:</b> {telemarketingNo} <span>|</span>
            <b>주소:</b> 경기도 시흥시 수풀안길 9-36, 601호(조남동, 케이엠텍지식산업센터)
          </p>
          <p>
            <b>고객센터:</b> 070-7635-7550 <span>|</span>
            <b>이메일:</b> youngtech001@gmail.com{' '}
            <a href="/privacy" className="footer-inline-privacy-link">개인정보처리방침</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
