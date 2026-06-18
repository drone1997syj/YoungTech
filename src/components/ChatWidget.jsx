import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import * as mockDb from '../utils/mockDb';
import { MessageSquare, X, Send, Cpu } from 'lucide-react';
import './ChatWidget.css';

export default function ChatWidget() {
  const { chatOpen, setChatOpen } = useShop();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (chatOpen) {
      setMessages(mockDb.getChatMessages());
    }
  }, [chatOpen]);

  useEffect(() => {
    // Scroll to bottom whenever messages list change
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setInputText('');

    // 1. Save and display user message
    const userMsg = mockDb.sendChatMessage('user', userText);
    setMessages(prev => [...prev, userMsg]);

    // 2. Trigger bot response typing delay
    setIsTyping(true);

    setTimeout(() => {
      let botText = '';
      const query = userText.toLowerCase();

      if (query.includes('안녕') || query.includes('인사') || query.includes('방가')) {
        botText = '안녕하세요! 영테크 FA 자동화 솔루션 고객 상담 챗봇입니다. 파나소닉/미쓰비시 모터, SHIMPO 감속기, 아트로 로봇, PLC, 카달로그/도면 다운로드에 대해 질문해 보세요!';
      } else if (query.includes('모터') || query.includes('motor') || query.includes('서보')) {
        botText = '영테크는 파나소닉 MINAS A6/A5, 미쓰비시 MELSERVO-J4 서보모터 및 문스 스텝모터, 니덱재팬 스텝모터, 니키덴소 DD모터를 공식 전문 유통합니다. 원하시는 사양(출력, 토크 등)에 맞는 최적 모터를 매칭해 드립니다.';
      } else if (query.includes('감속기') || query.includes('reducer') || query.includes('심포')) {
        botText = 'NIDEC SHIMPO(심포)의 고정밀 유성기어 감속기 VRSF, VRB 시리즈를 전문 공급합니다. 3 arcmin 이하 초정밀 백래시 사양으로, 서보모터 용량 및 프레임에 맞는 감속비와 취부 어댑터를 즉시 상담해 드립니다.';
      } else if (query.includes('로봇') || query.includes('robot') || query.includes('아트로')) {
        botText = '아트로(ATRO) 직교 로봇 AR 시리즈 모듈을 공급합니다. 반복정밀도 ±0.02mm 급 고정밀 볼스크류 구동 스테이지 형태로, 원하시는 스트로크(최대 1200mm)에 맞춤 견적이 가능합니다.';
      } else if (query.includes('plc') || query.includes('피엘씨')) {
        botText = '파나소닉 FP7 시리즈 고속 모션 제어 PLC를 유통하고 있습니다. 기본 연산 11ns 급 고속 CPU와 이더넷 기반 실시간 제어 카드를 갖추어 멀티축 동기 정밀 제어 시스템 구축을 지원합니다.';
      } else if (query.includes('도면') || query.includes('cad') || query.includes('캐드')) {
        botText = '영테크가 제공하는 제품들의 2D/3D CAD 도면자료(STEP, DXF 파일)는 공식 사이트 도면자료 게시판(https://globalyt.co.kr/bbs/board.php?bo_table=table42)에서 다운로드 가능하며, 챗봇을 통한 개별 전송도 준비 중입니다.';
      } else if (query.includes('카달로그') || query.includes('카탈로그') || query.includes('catalog')) {
        botText = '영테크 취급 제품군의 종합 E-카달로그는 공식 자료실(https://globalyt.co.kr/bbs/board.php?bo_table=table41)에서 즉시 다운로드하여 전체 사양을 열람하실 수 있습니다.';
      } else if (query.includes('결제') || query.includes('카드') || query.includes('pg')) {
        botText = '영테크 테스트 쇼핑몰은 모의 신용카드 결제 모듈을 자체 탑재하고 있습니다. 장바구니에 상품을 담으신 후 테스트 계정(ID: test / PW: password)으로 로그인하시면 승인 시나리오별 결제 검증이 가능합니다.';
      } else {
        botText = '문의해 주셔서 감사합니다. 메이커 품번, 견적 의뢰 및 납기 문의는 영테크 고객센터(070-7635-7550) 또는 공식 이메일(globalyt@naver.com)로 보내주시면 빠르게 답변드리겠습니다.';
      }

      const botMsg = mockDb.sendChatMessage('bot', botText);
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1200);
  };

  if (!chatOpen) {
    return (
      <button 
        className="chat-widget-toggle flex items-center justify-center"
        onClick={() => setChatOpen(true)}
        title="실시간 채팅 상담"
      >
        <MessageSquare size={26} className="text-white" />
      </button>
    );
  }

  return (
    <div className="chat-widget-panel card flex flex-col">
      {/* Panel Header */}
      <div className="chat-panel-header flex justify-between items-center p-4 bg-primary text-white">
        <div className="flex items-center gap-2">
          <div className="chat-logo-icon flex items-center justify-center bg-white rounded-full p-1">
            <Cpu size={16} className="text-primary" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-xs leading-none">영테크 기술지원</h4>
            <span className="text-3xs text-purple-200">실시간 가상 상담 챗봇</span>
          </div>
        </div>
        <button onClick={() => setChatOpen(false)} className="chat-close-btn text-white">
          <X size={18} />
        </button>
      </div>

      {/* Messages List Area */}
      <div className="chat-panel-body p-4 flex-1 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}>
            {msg.sender === 'bot' && (
              <div className="chat-avatar bg-purple-100 flex items-center justify-center">
                <Cpu size={14} className="text-primary" />
              </div>
            )}
            <div className={`chat-bubble text-xs ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-bubble-row bot-row">
            <div className="chat-avatar bg-purple-100 flex items-center justify-center">
              <Cpu size={14} className="text-primary" />
            </div>
            <div className="chat-bubble bot-bubble typing-bubble text-xs">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Message Input Footer Form */}
      <form onSubmit={handleSendMessage} className="chat-panel-footer border-t p-3 flex gap-2">
        <input 
          type="text" 
          placeholder="메시지를 입력하세요 (모터, 도면 등)..."
          className="chat-input flex-1 text-xs"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="chat-send-btn btn btn-primary flex items-center justify-center">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
