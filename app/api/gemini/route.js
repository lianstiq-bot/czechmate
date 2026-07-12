import { NextResponse } from 'next/server';

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY가 서버 환경변수에 설정되어 있지 않습니다. .env.local 확인 후 서버를 재시작하세요.' },
      { status: 500 }
    );
  }

  const prompt = `당신은 프라하를 10번 다녀온 한국인 여행 전문가 'Prague Master'입니다. 사용자를 위해 프라하 당일치기 마스터 일정을 짜주세요. 
  결과는 반드시 아래와 같은 순수 JSON 배열 형식으로만 출력하세요. (마크다운 백틱 쓰지 마세요)
  [
    { "time": "08:30", "title": "장소명", "desc": "상세한 일정 설명", "tip": "전문가의 진짜 꿀팁" }
  ]
  * 특별 지시사항: 
  1. 뻔한 관광 가이드가 아닌, 현지인이나 여러 번 방문한 사람만 알 수 있는 디테일한 꿀팁(예: 인생샷 찍기 좋은 최적의 시간대, 인파를 피하는 팁, 숨겨진 로컬 미식 포인트 등)을 'tip' 항목에 넣어주세요.
  2. 특정 카메라 기종이나 개인적인 장비 언급은 하지 마세요.
  3. 오전부터 저녁까지 총 4개의 핵심 동선을 시간 순서대로 짜주세요.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok || data.error) {
      console.error('Gemini API error:', data.error);
      return NextResponse.json(
        { error: data?.error?.message || 'Gemini API 호출에 실패했습니다.' },
        { status: geminiRes.status || 500 }
      );
    }

    const candidate = data?.candidates?.[0];

    if (!candidate || !candidate.content) {
      console.error('Unexpected Gemini response:', JSON.stringify(data));
      return NextResponse.json(
        { error: `AI가 응답을 생성하지 못했습니다. (사유: ${candidate?.finishReason || '알 수 없음'})` },
        { status: 500 }
      );
    }

    const textResult = candidate.content.parts[0].text;
    const cleanJson = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedItinerary;
    try {
      parsedItinerary = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('JSON parse error. Raw text:', textResult);
      return NextResponse.json(
        { error: 'AI 응답을 JSON으로 파싱하지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ itinerary: parsedItinerary });
  } catch (err) {
    console.error('AI 호출 중 에러 발생:', err);
    return NextResponse.json({ error: '서버에서 AI 호출 중 오류가 발생했습니다.' }, { status: 500 });
  }
}