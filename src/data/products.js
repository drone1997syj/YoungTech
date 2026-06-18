// Products database for YoungTech shopping mall
// Based on actual YoungTech product categories: 모터, 감속기, 로봇, PLC, 볼스크류/LM

export const products = [
  {
    id: 'inovance-md290',
    name: '이노밴스 범용 인버터 MD290',
    category: 'motor',
    price: 450000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-988007405_dxJw9qjU_4832414a8565cd70d1632029007334005361131c_174x124.png',
    description: '0.4~500kW 용량의 이노밴스(INOVANCE) 고성능 범용 인버터입니다. 우수한 제어 성능 and 강력한 과부하 내량을 제공합니다.',
    specs: {
      '메이커': 'INOVANCE (이노밴스)',
      '용량 범위': '0.4 ~ 500 kW',
      '제어 방식': 'V/F 제어, 센서리스 벡터 제어',
      '보호 등급': 'IP20'
    }
  },
  {
    id: 'inovance-sv670',
    name: '이노밴스 SV670 서보드라이브',
    category: 'motor',
    price: 320000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-988007405_GJDmdzxh_05635de7b1f7ad1e67f4c198011dabc3e781d8b8_174x124.png',
    description: '유럽 기술력과 최적의 가성비를 자랑하는 이노밴스(INOVANCE)의 주력 서보드라이브입니다. 고속 응답 주파수와 간편한 디버깅을 지원합니다.',
    specs: {
      '메이커': 'INOVANCE (이노밴스)',
      '통신 제어': 'EtherCAT, 펄스 열 제어',
      '정격 전압': '단상/삼상 AC 220V',
      '기타 기능': 'STOF 안전 기능 내장'
    }
  },
  {
    id: 'rs-csd7',
    name: '알에스 오토메이션 CSD 7 서보드라이버',
    category: 'motor',
    price: 380000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-32633931_K3QosPTZ_d71c96b6ad23cf86b29f6b1d5b5ab4446a0924a3_174x124.jpg',
    description: '대한민국 대표 국산 서보드라이버 CSD 7 시리즈입니다. 23bit 고분해능 엔코더 및 실시간 공진 억제 제어 알고리즘이 적용되었습니다.',
    specs: {
      '메이커': 'RS Automation (알에스 오토메이션)',
      '분해능': '23-bit',
      '네트워크': 'EtherCAT, RTEX, Modbus',
      '제어 루프': '속도/위치/토크 루프 200μs'
    }
  },
  {
    id: 'panasonic-a6-yt',
    name: '파나소닉 MINAS A6 서보모터',
    category: 'motor',
    price: 480000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-32633931_qrE28jOd_d749361f0a1f2e318f5e3e976d4b9592d19d7374_174x124.gif',
    description: '분해능 향상, 앱솔루트 엔코더 기본 사용가능, 초경량화 실현 및 자동 튜닝 성능 강화로 최고 속도 제어가 가능한 PANASONIC 대표 서보모터입니다.',
    specs: {
      '메이커': 'PANASONIC (파나소닉)',
      '분해능': '23-bit (8388608 pulse/rev)',
      '정격 속도': '3000 RPM',
      '보호 등급': 'IP67 기본 탑재'
    }
  },
  {
    id: 'nikki-dd-motor',
    name: '니키덴소 정밀 DD 모터 (ND-c / 박형)',
    category: 'motor',
    price: 1850000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-3745434262_eson0ErF_a001145a47569e78bc4dd1d0ac14b9c56a17e379_174x124.jpg',
    description: '최고 성능의 정밀 다이렉트 드라이브(DD) 모터입니다. 기어리스 직결 구동으로 백래시가 전혀 없으며 저소음과 초정밀 위치결정을 보장합니다.',
    specs: {
      '메이커': 'Nikki Denso (니키덴소)',
      '최대 토크': '12 N·m ~ 120 N·m',
      '구조': '박형 및 고토크 지향 구조',
      '정격 출력': '고정밀 분해능 엔코더 지원'
    }
  },
  {
    id: 'nidec-kh-step',
    name: '니덱재팬서보 KH 시리즈 스텝모터',
    category: 'motor',
    price: 65000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-2943748487_QzxDVIHW_5bf0f8c4581726b09159b477d10c922fc5ae5704_174x124.jpg',
    description: '소형화, 경량화 및 고출력을 실현한 니덱재팬서보의 고성능 2상 스텝모터입니다. 저진동 및 우수한 저속 구간 회전 안정성을 가집니다.',
    specs: {
      '메이커': 'NIDEC Japan Servo (니덱재팬서보)',
      '기본 구조': 'KH 시리즈 하이브리드 타입',
      '스텝 각도': '1.8 도',
      '특징': '고효율 마그네틱 회로 설계'
    }
  },
  {
    id: 'fastech-ezi-servo',
    name: '파스텍 Ezi-Servo 클로즈루프 스텝모터',
    category: 'motor',
    price: 240000,
    image: 'https://images.unsplash.com/photo-1504607798333-52a30db54a5d?auto=format&fit=crop&q=80&w=600',
    description: '국산 폐루프 제어 스텝모터 Ezi-Servo입니다. 스텝모터의 고탈조 한계를 완벽히 극복하고 실시간 위치 보정을 통해 서보에 준하는 성능을 냅니다.',
    specs: {
      '메이커': 'FASTECH (파스텍 / 이지서보)',
      '네트워크': 'EtherCAT, CC-Link, 펄스입력',
      '제어 방식': 'Closed-Loop 제어',
      '기타': '엔코더 일체형 고정밀 튜닝'
    }
  },
  {
    id: 'moons-stm-yt',
    name: '문스 하이브리드 스텝모터 (SSM/STM)',
    category: 'motor',
    price: 145000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-2943748487_mgQZE7q1_35857a4daada1a9b9d74839ced8af2fb8112a2e8_174x124.jpg',
    description: '세계 3대 스텝모터 제조사인 MOONS의 고신뢰성 스텝모터 시리즈입니다. 정교한 코일 설계로 발열 및 진동을 최소화했습니다.',
    specs: {
      '메이커': 'MOONS (문스)',
      '동작 타입': '2상/4상 하이브리드',
      '기타': '발열 제어 및 전용 드라이브 패키지 대응'
    }
  },
  {
    id: 'mitsubishi-j4-yt',
    name: '미쓰비시 MELSERVO-J4 서보모터',
    category: 'motor',
    price: 520000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-2943748487_T1GDkoXj_6fb16b050be9a98b133b3b3253e284d6d278eaf1_174x124.jpg',
    description: '미쓰비시의 특허받은 공진 억제 및 고속 진동 억제 튜닝 필터가 탑재된 MR-J4 시리즈 하이엔드 서보모터입니다.',
    specs: {
      '메이커': 'MITSUBISHI (미쓰비시)',
      '분해능': '22-bit (4194304 pulse/rev)',
      '네트워크': 'SSCNET III/H'
    }
  },
  {
    id: 'panasonic-a5-yt',
    name: '파나소닉 MINAS A5 서보모터',
    category: 'motor',
    price: 390000,
    image: 'https://globalyt.co.kr/data/file/table34/thumb-2943748487_VplFJkHS_c8b0ec9587e05c0c7a5328ebd3d34e2441463107_174x124.jpg',
    description: '빠르고, 똑똑하며, 컴팩트한 파나소닉의 전 세대 베스트셀러 MINAS A5 시리즈 서보모터입니다. 실무 현장 설치 호환성이 매우 우수합니다.',
    specs: {
      '메이커': 'PANASONIC (파나소닉)',
      '정격 속도': '3000 RPM',
      '입력 전압': '단상 AC 220V'
    }
  },
  {
    id: 'shimpo-vrsf',
    name: '심포(SHIMPO) 정밀 감속기 VRSF 시리즈 (VRSF-85D)',
    category: 'reducer',
    price: 240000,
    image: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?auto=format&fit=crop&q=80&w=600',
    description: '백래시가 매우 적어 정밀 고속 위치 결정 서보 기구에 널리 사용되는 심포(SHIMPO)의 고정밀 유성기어 감속기입니다.',
    specs: {
      '메이커': 'NIDEC SHIMPO (심포)',
      '감속비': '1/5, 1/10, 1/15 선택 가능',
      '백래시': '3 arcmin 이하',
      '정격 출력 토크': '45 N·m',
      '취부 치수': '85 mm 플랜지 대응',
      '효율': '95% 이상'
    }
  },
  {
    id: 'atro-robot',
    name: '아트로 로봇 AR 시리즈 직교 로봇 (AR-S120)',
    category: 'robot',
    price: 1800000,
    image: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=600',
    description: '강력한 볼스크류와 리니어 가이드를 일체형 알루미늄 프로파일로 최적 설계하여 고하중, 고정밀 반복 구동을 보장하는 아트로(ATRO) 직교 로봇 모듈입니다.',
    specs: {
      '메이커': 'ATRO ROBOT (아트로)',
      '최대 스트로크': '1200 mm',
      '반복 정밀도': '±0.02 mm',
      '최대 가속 속도': '1000 mm/s',
      '가변 하중': '수평 30 kg / 수직 12 kg',
      '적용 모터': '100W/200W 서보모터 대응'
    }
  },
  {
    id: 'panasonic-fp7',
    name: '파나소닉 고속 네트워크형 PLC CPU (FP7-CPS11)',
    category: 'plc',
    price: 680000,
    image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&q=80&w=600',
    description: '고속 연산 처리 및 대용량 메모리를 장착하여 복잡한 다축 서보 모션 동기 제어를 유연하게 실현하는 파나소닉 최신 FP7 시리즈 컴팩트 CPU입니다.',
    specs: {
      '메이커': 'PANASONIC (파나소닉)',
      '연산 속도': '11 ns / 기본 명령',
      '프로그램 용량': '120k Steps',
      '통신포트': 'Ethernet 내장 (MEWTOCOL / Modbus)',
      '다축 모션 제어': '최대 64축 동기 구동 지원',
      '동작 전압': 'DC 24 V'
    }
  },
  {
    id: 'thk-lm-hsr25',
    name: 'THK 정밀 리니어 가이드 HSR25 시리즈 (HSR25-A)',
    category: 'motion',
    price: 120000,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600',
    description: '4방향 등하중 형으로 설계되어 상하좌우 모든 방향의 정하중에 균등하게 대응하며 고강성, 저소음 구동이 우수한 THK 오리지널 정밀 리니어 가이드입니다.',
    specs: {
      '메이커': 'THK (티에이치케이)',
      '블록 형식': '플랜지형 (HSR25A)',
      '레일 너비': '23 mm',
      '기본 동정격 하중': '27.6 kN',
      '기본 정정격 하중': '36.4 kN',
      '정밀 등급': '정밀급 (P 등급)'
    }
  }
];
