import React from 'react';
import { Cpu } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const telemarketingNo = import.meta.env.VITE_TELEMARKETING_NO || '신고 준비중';

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
              영테크는 서보모터, 서보드라이버 등 공장 자동화(FA) 제어기기 전문 회사입니다.
            </p>
            <span className="text-sm text-light">© 2026 YoungTech. All rights reserved.</span>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title text-base font-semibold text-white mb-3">제품 카테고리</h4>
            <ul className="footer-links-list text-base">
              <li><a href="#/motors">모터 (서보/스텝/DD)</a></li>
              <li><a href="#/reducers">고정밀 유성감속기</a></li>
              <li><a href="#/robots">직교 로봇 모듈</a></li>
              <li><a href="#/plc">PLC & 모션 제어기</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title text-base font-semibold text-white mb-3">고객 서비스</h4>
            <ul className="footer-links-list text-base">
              <li><a href="#/compare">사양비교 가이드</a></li>
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
              <b>팩스:</b> 0303-3440-4677
            </p>
            <p className="text-base text-light mb-2">
              <b>이메일:</b> youngtech001@gmail.com
            </p>
            <p className="text-sm text-light pt-2 border-top">
              * 본 사이트는 정식 오픈 전 기능 검증을 위한 테스트 쇼핑몰이며, 실제 판매 및 실제 결제 전 별도 안내가 제공됩니다.
            </p>
          </div>
        </div>

        <div className="footer-business py-4 text-sm text-light">
          <p>
            <b>상호명:</b> 영테크 (YOUNG TECH) <span>|</span>
            <b>대표자:</b> 심영찬 <span>|</span>
            <b>사업자등록번호:</b> 138-12-70745
          </p>
          <p>
            <b>주소:</b> 경기도 시흥시 수풀안길 9-36 케이엠텍 지식산업센터 601호
          </p>
          <p>
            <b>통신판매업 신고번호:</b> {telemarketingNo} <span>|</span>
            <b>도메인:</b> globalyt.shop
          </p>
        </div>
      </div>
    </footer>
  );
}
