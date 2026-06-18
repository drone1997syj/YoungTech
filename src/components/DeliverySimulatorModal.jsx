import React, { useState, useEffect } from 'react';
import { X, Truck, Package, MapPin, CheckCircle, Loader, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { BACKEND_BASE_URL } from '../context/ShopContext';

const CARRIER_NAMES = { logen: '로젠택배', cj: 'CJ대한통운', post: '우체국택배' };
const CARRIER_OFFICIAL_URLS = {
  logen: 'https://www.ilogen.com/m/personal/tkSearch',
  cj: 'https://www.cjlogistics.com/ko/tool/parcel/tracking',
  post: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm'
};

// Map Sweet Tracker level codes to display info
function getStepStyle(level) {
  // level 1=집하, 2=이동중, 3=배송출발, 4=배송완료
  switch (level) {
    case 4: return { color: '#059669', bg: '#ecfdf5', label: '배송완료' };
    case 3: return { color: '#2563eb', bg: '#eff6ff', label: '배송출발' };
    case 2: return { color: '#7c3aed', bg: '#f5f3ff', label: '이동중' };
    default: return { color: '#64748b', bg: '#f8fafc', label: '집하' };
  }
}

export default function DeliverySimulatorModal({ isOpen, onClose, order }) {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [nextRefreshAt, setNextRefreshAt] = useState(null);

  const fetchTracking = async () => {
    if (!order?.tracking_number || !order?.carrier) return;

    setLoading(true);
    setError(null);
    setQuotaError(null);
    setTrackingData(null);

    try {
      const token = localStorage.getItem('yt_token');
      const params = new URLSearchParams({
        tracking_number: order.tracking_number,
        carrier: order.carrier,
        ...(order.id ? { order_id: order.id } : {})
      });
      const res = await fetch(
        `${BACKEND_BASE_URL}/api/delivery/track?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'TRACKING_QUOTA_EXHAUSTED') {
          setQuotaError(data);
          return;
        }
        setError(data.message || '배송 정보 조회에 실패했습니다.');
        return;
      }
      setTrackingData(data);
      setFromCache(!!data.fromCache);
      setNextRefreshAt(data.nextRefreshAt || null);
    } catch (err) {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && order?.tracking_number) {
      fetchTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.tracking_number]);

  if (!isOpen || !order) return null;

  const carrierName = CARRIER_NAMES[order.carrier] || order.carrier;
  const details = trackingData?.trackingDetails || [];
  const latestStep = details[0]; // API returns newest first
  const nextRefreshLabel = nextRefreshAt ? new Date(nextRefreshAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';

  const handleOpenExternal = () => {
    const url = CARRIER_OFFICIAL_URLS[order.carrier] || CARRIER_OFFICIAL_URLS.logen;
    window.open(url, '_blank', 'width=1100,height=850,scrollbars=yes');
  };

  return (
    <div
      className="flex items-center justify-center"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.68)',
        backdropFilter: 'blur(4px)',
        padding: '1rem'
      }}
    >
      <div
        className="flex flex-col"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85vh',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.35)'
        }}
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center text-white flex-shrink-0" style={{ backgroundColor: '#0f172a', padding: '1rem' }}>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-black bg-amber-500 text-white">
              {carrierName}
            </span>
            <span className="font-extrabold text-sm">실시간 배송 조회</span>
            {fromCache && (
              <span className="text-3xs text-slate-400 ml-1">(최근 조회 결과)</span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Info Strip */}
        <div className="px-4 py-3 border-b flex-shrink-0" style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
          <div className="flex justify-between items-center text-xs">
            <div>
              <span className="text-light mr-2">송장번호</span>
              <span className="font-mono font-bold text-dark">{order.tracking_number}</span>
            </div>
            <button
              onClick={fetchTracking}
              disabled={loading || !!trackingData}
              className="flex items-center gap-1 text-primary text-3xs font-bold hover:opacity-70 transition-all"
              title={trackingData && nextRefreshLabel ? `${nextRefreshLabel} 이후 새 조회가 가능합니다.` : ''}
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              {trackingData && nextRefreshLabel ? `${nextRefreshLabel} 이후 재조회` : '새로고침'}
            </button>
          </div>
          {trackingData && (
            <div className="mt-1 text-2xs text-light">
              수신인: <span className="font-bold text-dark">{trackingData.receiverName || '-'}</span>
              {trackingData.itemName && (
                <span className="ml-3">품목: <span className="font-bold text-dark">{trackingData.itemName}</span></span>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4" style={{ overflowY: 'auto', padding: '1rem' }}>
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader size={28} className="animate-spin text-primary" />
              <span className="text-sm text-light">배송 정보를 조회하고 있습니다...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm text-dark font-bold text-center">{error}</p>
              <button onClick={fetchTracking} className="btn btn-primary text-xs py-2 px-4 font-bold">
                다시 시도
              </button>
            </div>
          )}

          {quotaError && !loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <AlertCircle size={36} className="text-red-400" />
              <h4 className="text-base font-extrabold text-dark">현재 배송조회가 어렵습니다.</h4>
              <p className="text-xs text-light" style={{ lineHeight: 1.6 }}>
                택배사 공식 사이트에서 송장번호를 입력하시면 확인이 가능합니다.
              </p>
              <div
                className="w-full rounded border p-3"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}
              >
                <div className="text-3xs text-light font-bold mb-1">송장번호</div>
                <div className="font-mono font-extrabold text-dark text-base">{quotaError.tracking_number || order.tracking_number}</div>
              </div>
              <button
                onClick={handleOpenExternal}
                className="btn btn-secondary text-xs py-2.5 px-4 font-bold w-full"
                style={{ backgroundColor: 'white' }}
              >
                <ExternalLink size={14} /> {carrierName} 공식 사이트에서 조회하기
              </button>
              <p className="text-3xs text-light">
                월간 실시간 배송조회 한도가 소진되어 공식 택배사 조회 페이지로 안내드립니다.
              </p>
            </div>
          )}

          {trackingData && !loading && (
            <div className="flex flex-col gap-3">
              {/* Status Summary Card */}
              {latestStep && (
                <div
                  className="rounded-xl p-4 flex items-center gap-4"
                  style={{ backgroundColor: getStepStyle(latestStep.level).bg }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getStepStyle(latestStep.level).color }}
                  >
                    {latestStep.level === 4 ? (
                      <CheckCircle size={22} className="text-white" />
                    ) : latestStep.level === 3 ? (
                      <Truck size={22} className="text-white" />
                    ) : (
                      <Package size={22} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className="text-sm font-extrabold mb-0.5"
                      style={{ color: getStepStyle(latestStep.level).color }}
                    >
                      {getStepStyle(latestStep.level).label}
                    </div>
                    <div className="text-xs text-dark">{latestStep.kind}</div>
                    <div className="text-2xs text-light mt-0.5">{latestStep.where} · {latestStep.timeString}</div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="flex flex-col gap-0 relative pl-5 border-l-2 border-slate-100 mt-2">
                {details.map((step, idx) => {
                  const style = getStepStyle(step.level);
                  const isFirst = idx === 0;
                  return (
                    <div key={idx} className="relative pb-5 last:pb-0">
                      {/* Bullet */}
                      <div
                        className="absolute -left-[25px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{
                          backgroundColor: isFirst ? style.color : 'white',
                          borderColor: style.color
                        }}
                      >
                        {isFirst && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>

                      {/* Content */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div
                            className="text-xs font-bold"
                            style={{ color: isFirst ? style.color : '#334155' }}
                          >
                            {step.kind}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-light flex-shrink-0" />
                            <span className="text-2xs text-light">{step.where}</span>
                          </div>
                          {step.telno && (
                            <div className="text-3xs text-light mt-0.5">담당: {step.telno}</div>
                          )}
                        </div>
                        <span className="text-3xs font-mono text-light flex-shrink-0 mt-0.5 text-right">
                          {step.timeString}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t flex gap-2 flex-shrink-0" style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <button
            onClick={handleOpenExternal}
            className="flex-1 btn btn-secondary text-2xs py-2.5 flex items-center justify-center gap-1 font-bold"
            style={{ backgroundColor: 'white' }}
            title={`${carrierName} 공식 사이트에서 송장번호 ${order.tracking_number}를 입력해 조회할 수 있습니다.`}
          >
            <ExternalLink size={13} /> {carrierName} 공식 사이트
          </button>
          <button onClick={onClose} className="btn btn-primary text-2xs py-2.5 px-4 font-bold">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
