import React from 'react';
import './PrivacyPolicy.css';

const companyInfo = [
  { label: '상호', value: '영테크(YOUNG TECH)' },
  { label: '대표자', value: '심영찬' },
  { label: '사업자등록번호', value: '138-12-70745' },
  { label: '주소', value: '경기도 시흥시 수풀안길 9-36, 601호(조남동, 케이엠텍지식산업센터)' },
  { label: '전화번호', value: '070-7635-7550' },
  { label: '팩스', value: '0303-3440-4677' },
  { label: '전자세금계산서 이메일', value: 'youngtechacc@gmail.com' },
  { label: '통신판매업 신고번호', value: '{{입력 필요}}' },
  { label: '고객문의용 이메일', value: '{{입력 필요}}' },
  { label: '개인정보보호책임자', value: '{{입력 필요}}' },
  { label: '호스팅사', value: '{{입력 필요}}' },
  { label: 'PG사', value: '{{입력 필요}}' },
  { label: '택배사', value: '{{입력 필요}}' },
  { label: '시행일자', value: '{{입력 필요}}' }
];

const sections = [
  {
    title: '2. 개인정보의 처리 목적',
    body: [
      '영테크(YOUNG TECH)는 다음의 목적을 위하여 개인정보를 처리합니다. 처리한 개인정보는 다음의 목적 이외의 용도로는 사용되지 않으며, 이용 목적이 변경되는 경우에는 관련 법령에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.',
      '가. 회원 가입 및 관리: 회원 식별, 본인확인, 가입 의사 확인, 부정 이용 방지, 고지사항 전달',
      '나. 상품 주문 및 배송: 주문 확인, 결제 처리, 상품 배송, 교환·반품·환불 처리',
      '다. 민원 처리 및 고객 지원: 문의 응대, 분쟁 조정, 서비스 개선'
    ]
  },
  {
    title: '3. 처리하는 개인정보 항목',
    body: [
      '가. 필수항목: 이름, 이메일 주소, 비밀번호, 연락처, 배송지 주소, 수취인 정보, 주문 정보, 결제 정보 중 필요한 항목',
      '나. 선택항목: 회사명, 부서명, 직급, 추가 연락처, 요청사항',
      '다. 자동 수집 항목: 접속 IP, 쿠키, 브라우저 정보, 접속 일시, 서비스 이용 기록, 불량 이용 기록',
      '라. 간편가입 이용 시: 소셜 계정 식별 정보(예: 제공사별 고유 식별자), 이름, 이메일 등 서비스 제공에 필요한 항목'
    ]
  },
  {
    title: '4. 개인정보의 처리 및 보유기간',
    body: [
      '영테크(YOUNG TECH)는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.',
      '가. 회원 정보: 회원 탈퇴 시까지. 다만 관계 법령상 보존 의무가 있는 경우 해당 기간 동안 보관',
      '나. 주문 및 결제 관련 정보: 전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령에서 정한 기간',
      '다. 고객문의 기록: 처리 완료 후 3년 또는 관련 법령에 따른 기간',
      '라. 접속 로그 및 보안 관련 기록: 관련 법령 및 내부 정책에 따라 보관'
    ]
  },
  {
    title: '5. 개인정보의 제3자 제공',
    body: [
      '영테크(YOUNG TECH)는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우에는 예외로 합니다.',
      '가. 정보주체가 사전에 동의한 경우',
      '나. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우',
      '다. 배송, 결제, 본인확인 등 서비스 제공에 필수적인 경우에는 관련 법령에 따라 최소한의 범위에서 제공될 수 있습니다.',
      '현재 구체적인 제3자 제공 대상은 {{입력 필요}}'
    ]
  },
  {
    title: '6. 개인정보 처리의 위탁',
    body: [
      '영테크(YOUNG TECH)는 서비스 향상을 위하여 필요한 경우 개인정보 처리 업무의 일부를 외부 업체에 위탁할 수 있습니다.',
      '위탁 업무 내용, 수탁자, 보유 및 이용기간은 별도 고지하며, 현재 기준 구체적인 위탁 현황은 {{입력 필요}}',
      '위탁 계약 체결 시 개인정보보호 관련 법령을 준수하도록 관리·감독합니다.'
    ]
  },
  {
    title: '7. 정보주체의 권리와 행사방법',
    body: [
      '정보주체는 영테크(YOUNG TECH)에 대해 언제든지 다음의 권리를 행사할 수 있습니다.',
      '가. 개인정보 열람 요구',
      '나. 오류 등이 있을 경우 정정 요구',
      '다. 삭제 요구',
      '라. 처리정지 요구',
      '권리 행사는 서면, 전자우편, 고객센터 등을 통해 가능하며, 법령에서 정한 경우 일부 권리 행사가 제한될 수 있습니다.'
    ]
  },
  {
    title: '8. 개인정보의 파기',
    body: [
      '영테크(YOUNG TECH)는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.',
      '전자적 파일 형태의 정보는 복구 및 재생이 불가능한 방법으로 삭제하며, 종이 문서는 분쇄 또는 소각의 방법으로 파기합니다.'
    ]
  },
  {
    title: '9. 개인정보의 안전성 확보조치',
    body: [
      '영테크(YOUNG TECH)는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.',
      '가. 관리적 조치: 내부관리계획 수립, 접근권한 관리, 직원 교육',
      '나. 기술적 조치: 비밀번호 암호화, 보안프로그램 설치, 접근통제, 로그관리',
      '다. 물리적 조치: 전산실, 자료보관실 등의 접근통제'
    ]
  },
  {
    title: '10. 쿠키의 설치·운영 및 거부',
    body: [
      '영테크(YOUNG TECH)는 맞춤형 서비스 제공을 위해 쿠키를 사용할 수 있습니다.',
      '쿠키는 웹사이트를 운영하는데 이용되는 서버가 사용자의 브라우저에 보내는 소량의 정보이며, 브라우저 설정을 통해 저장을 거부하거나 삭제할 수 있습니다.',
      '브라우저 설정 방법은 각 브라우저의 도움말을 참고해 주시기 바랍니다.'
    ]
  },
  {
    title: '11. 개인정보보호책임자',
    body: [
      '영테크(YOUNG TECH)는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 관련 문의, 불만 처리 및 피해 구제 등을 위하여 개인정보보호책임자를 지정하고 있습니다.',
      '개인정보보호책임자: {{입력 필요}}',
      '연락처: {{입력 필요}}'
    ]
  },
  {
    title: '12. 권익침해 구제방법',
    body: [
      '정보주체는 아래 기관에 개인정보 침해에 대한 피해구제, 상담 등을 문의할 수 있습니다.',
      (
        <>
          가. 개인정보침해신고센터: (국번없이) 118 /{' '}
          <a href="https://privacy.kisa.or.kr" target="_blank" rel="noreferrer">privacy.kisa.or.kr</a>
        </>
      ),
      (
        <>
          나. 개인정보분쟁조정위원회: 1833-6972 /{' '}
          <a href="https://www.kopico.go.kr" target="_blank" rel="noreferrer">www.kopico.go.kr</a>
        </>
      )
    ]
  },
  {
    title: '13. 개인정보처리방침 변경 안내',
    body: [
      '본 개인정보처리방침은 시행일자로부터 적용됩니다. 내용 추가, 삭제 및 수정이 있을 경우 변경 사항을 홈페이지 공지 또는 별도 안내를 통해 알려드립니다.',
      '시행일자: {{입력 필요}}'
    ]
  }
];

export default function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <div className="container privacy-page__container">
        <div className="privacy-page__hero card">
          <p className="privacy-page__eyebrow">개인정보처리방침</p>
          <h1 className="privacy-page__title">영테크(YOUNG TECH) 개인정보처리방침</h1>
          <p className="privacy-page__summary">
            영테크(YOUNG TECH)는 이용자의 개인정보를 소중하게 생각하며, 관련 법령을 준수하여 안전하게 관리합니다.
          </p>
        </div>

        <div className="privacy-page__content card">
          <section className="privacy-section">
            <h2 className="privacy-section__title">기본 정보</h2>
            <div className="privacy-info-grid">
              {companyInfo.map((item) => (
                <div key={item.label} className="privacy-info-item">
                  <span className="privacy-info-item__label">{item.label}</span>
                  <span className="privacy-info-item__value">{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.title} className="privacy-section">
              <h2 className="privacy-section__title">{section.title}</h2>
              <div className="privacy-section__body">
                {section.body.map((line, index) => (
                  <p key={`${section.title}-${index}`} className="privacy-section__paragraph">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
