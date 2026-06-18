import React from 'react';
import { Cpu } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top grid grid-cols-4 gap-8 py-6">
          {/* Company Info column */}
          <div className="footer-col company-summary">
            <div className="footer-logo flex items-center gap-2 mb-3">
              <div className="footer-logo-icon flex items-center justify-center">
                <Cpu size={22} className="text-white" />
              </div>
              <span className="footer-logo-text font-bold text-xl text-white">YoungTech</span>
            </div>
            <p className="text-base text-light mb-3">
              영테크는 서보모터, 서보드라이버 등 최첨단 공장 자동화(FA) 제어기기 전문 회사입니다.
            </p>
            <span className="text-sm text-light">© 2026 YoungTech Co., Ltd. All rights reserved.</span>
          </div>

          {/* Links Column 1 */}
          <div className="footer-col">
            <h4 className="footer-col-title text-base font-semibold text-white mb-3">제품 카테고리</h4>
            <ul className="footer-links-list text-base">
              <li><a href="#/motors">모터 (서보/스텝/DD)</a></li>
              <li><a href="#/reducers">고정밀 유성감속기</a></li>
              <li><a href="#/robots">직교 로봇 모듈</a></li>
              <li><a href="#/plc">PLC & 모션 제어기</a></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="footer-col">
            <h4 className="footer-col-title text-base font-semibold text-white mb-3">고객 서비스</h4>
            <ul className="footer-links-list text-base">
              <li><a href="#/compare">사양비교 가이드</a></li>
              <li><a href="https://globalyt.co.kr/bbs/board.php?bo_table=table42" target="_blank" rel="noopener noreferrer">3D CAD 도면 자료실</a></li>
              <li><a href="https://globalyt.co.kr/bbs/board.php?bo_table=table41" target="_blank" rel="noopener noreferrer">E-카달로그 다운로드</a></li>
              <li><a href="https://globalyt.co.kr/bbs/board.php?bo_table=table44" target="_blank" rel="noopener noreferrer">기술 및 견적문의</a></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="footer-col contact-info">
            <h4 className="footer-col-title text-base font-semibold text-white mb-3">고객센터 및 기술문의</h4>
            <p className="text-base text-light mb-2">
              <b>전화번호:</b> 070-7635-7550 (평일 09:00 ~ 18:00)
            </p>
            <p className="text-base text-light mb-2">
              <b>이메일:</b> youngtech001@gmail.com
            </p>
            <p className="text-sm text-light pt-2 border-top">
              * 본 사이트는 도메인 구매 전 시스템 동작 검증을 위한 데모(Mock) 쇼핑몰이며, 실제 제품 판매 및 실제 결제는 이루어지지 않습니다.
            </p>
          </div>
        </div>

        <div className="footer-bottom py-4 text-center text-sm text-light border-t border-gray-800">
          <p>상호명: 영테크 | 대표자: 심영찬 | 경기도 시흥시 수풀안길 9-36 케이엠텍 지식산업센터 601호 | 사업자등록번호: 138-12-70745 | 팩스: 0303-3440-4677</p>
        </div>
      </div>
    </footer>
  );
}
