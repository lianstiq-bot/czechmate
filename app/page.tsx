'use client';

import { useState } from 'react';

const DURATIONS = ['당일치기', '1박 2일', '2박 3일', '3박 4일', '4박 5일', '5박 6일', '6박 7일', '직접 입력'];

const CZECH_CITIES = [
  { name: '프라하', img: '/prague.jpg' },
  { name: '체스키 크룸로프', img: '/cesky.jpg' },
  { name: '카를로비 바리', img: '/karlovy.jpg' },
  { name: '쿠트나호라', img: '/kutna.jpg' },
  { name: '브르노', img: '/brno.jpg' },
  { name: '플젠', img: '/plzen.jpg' },
  { name: '올로모우츠', img: '/olomouc.jpg' },
  { name: '보헤미안 스위스', img: '/bohemian.jpg' },
];

export default function Home() {
  const [step, setStep] = useState('home');
  const [aiResult, setAiResult] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedDuration, setSelectedDuration] = useState('당일치기');
  const [customDuration, setCustomDuration] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>(['프라하']);

  const toggleCity = (cityName: string) => {
    setSelectedCities((prev) =>
      prev.includes(cityName) ? prev.filter((c) => c !== cityName) : [...prev, cityName]
    );
  };

  const handleGenerate = async () => {
    if (selectedCities.length === 0) {
      alert('방문할 도시를 최소 1개 이상 선택해주세요.');
      return;
    }

    const finalDuration = selectedDuration === '직접 입력' && customDuration.trim()
      ? customDuration.trim()
      : selectedDuration;

    setStep('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: finalDuration, cities: selectedCities }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'AI 호출에 실패했습니다.');
      }

      setAiResult(data.itinerary);
      setStep('result');
    } catch (error) {
      console.error('AI 호출 중 에러 발생:', error);
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMsg(message);
      alert(`앗! AI가 일정을 짜는 중 문제가 생겼습니다.\n\n사유: ${message}`);
      setStep('setup');
    }
  };

  const handleSavePDF = () => window.print();
  const handleOpenMap = () => window.open('https://www.google.com/maps/dir/Prague+Castle/Charles+Bridge/Old+Town+Square,+Prague', '_blank');

  // 결과를 day별로 묶기 (day 필드가 없으면 전부 1개 그룹으로 처리)
  const groupedByDay = aiResult.reduce((acc: Record<string, any[]>, item) => {
    const key = item.day || '일정';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800">

      {step === 'home' && (
        <div className="h-screen flex items-center justify-center bg-cover bg-center relative"
             style={{ backgroundImage: "url('/prague.jpg')" }}>
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative z-10 text-center px-4">
            <h1 className="text-7xl font-extrabold text-white drop-shadow-2xl mb-4">Prague Master</h1>
            <p className="text-2xl text-gray-200 drop-shadow-md mb-12">체코를 가장 잘 여행하는 법, 완벽한 체코 여행</p>
            <button onClick={() => setStep('setup')} className="rounded-full bg-blue-600 px-12 py-5 text-white text-2xl font-bold hover:bg-blue-700 transition-all shadow-2xl hover:scale-105">
              내 일정 만들기
            </button>
          </div>
        </div>
      )}

      {step === 'setup' && (
        <div className="min-h-screen py-16 px-4 bg-gray-100">
          <div className="max-w-5xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-xl">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">✈️ 디테일한 여행 설정</h2>

            {errorMsg && (
              <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                ⚠️ {errorMsg}
              </div>
            )}

            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6">🗓️ 여행 기간</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {DURATIONS.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDuration(day)}
                    className={`p-4 border rounded-xl font-semibold transition-colors ${selectedDuration === day ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {selectedDuration === '직접 입력' && (
                <input
                  type="text"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="예: 7박 8일"
                  className="mt-4 w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              )}
            </div>

            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6">🇨🇿 방문 도시 (다중 선택)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CZECH_CITIES.map((city) => (
                  <label key={city.name} className="relative group cursor-pointer block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all h-40 border border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedCities.includes(city.name)}
                      onChange={() => toggleCity(city.name)}
                      className="absolute top-3 right-3 w-5 h-5 z-20 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <img src={city.img} alt={city.name} className="absolute inset-0 object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 bg-gray-200" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:bg-black/40 transition-colors"></div>
                    <div className="absolute bottom-3 left-3 z-10 text-white font-bold text-xl drop-shadow-md">{city.name}</div>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} className="w-full py-5 bg-blue-600 text-white text-2xl font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg">
              ✨ 실시간 AI 맞춤 일정 생성하기
            </button>
          </div>
        </div>
      )}

      {step === 'loading' && (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
          <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-blue-500 mb-8"></div>
          <h2 className="text-3xl font-bold animate-pulse">Gemini AI가 실시간으로 일정을 짜고 있습니다...</h2>
          <p className="mt-4 text-xl text-gray-400">현지인의 동선과 최적의 사진 스팟을 계산 중 🇨🇿</p>
        </div>
      )}

      {step === 'result' && (
        <div className="min-h-screen bg-gray-50 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-12 print:hidden">
              <h2 className="text-4xl font-extrabold text-gray-900">✨ 완성된 실시간 맞춤형 체코 일정</h2>
              <button onClick={() => setStep('setup')} className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold">다시 설정</button>
            </div>

            {Object.entries(groupedByDay).map(([dayLabel, items]) => (
              <div key={dayLabel} className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border-t-8 border-blue-600 relative print:shadow-none print:border-none print:p-0 mb-10">
                <h3 className="text-3xl font-bold text-gray-800 mb-10 pb-4 border-b-2 border-gray-100">{dayLabel}</h3>

                <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">

                  {items.map((item, index) => (
                    <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white text-slate-100 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${index % 2 === 0 ? 'bg-blue-500' : 'bg-orange-500'}`}>
                        {index + 1}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm print:bg-white print:border-gray-300">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-bold text-xl ${index % 2 === 0 ? 'text-blue-600' : 'text-orange-600'}`}>{item.time}</span>
                        </div>
                        <h4 className="text-2xl font-bold text-gray-800 mb-2">{item.title}</h4>
                        <p className="text-gray-700 text-sm leading-relaxed mb-4">{item.desc}</p>

                        {item.tip && (
                          <div className={`p-4 rounded-xl border mb-4 print:bg-white print:border-gray-300 ${index % 2 === 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                            <p className={`font-bold mb-1 flex items-center ${index % 2 === 0 ? 'text-blue-800' : 'text-orange-800'}`}>💡 Master's Tip</p>
                            <p className="text-gray-700 text-sm leading-relaxed">{item.tip}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-4 flex flex-col sm:flex-row justify-center gap-4 print:hidden">
              <button onClick={handleOpenMap} className="px-8 py-4 flex-1 sm:flex-none justify-center bg-gray-800 text-white font-bold rounded-xl hover:bg-black transition-colors">🗺️ 전체 지도 보기</button>
              <button onClick={handleSavePDF} className="px-8 py-4 flex-1 sm:flex-none justify-center bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">📥 PDF로 저장</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}