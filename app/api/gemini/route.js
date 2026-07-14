import { NextResponse } from 'next/server';

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY가 서버 환경변수에 설정되어 있지 않습니다. .env.local 확인 후 서버를 재시작하세요.' },
      { status: 500 }
    );
  }

  let duration = '당일치기';
  let cities = ['프라하'];

  try {
    const body = await request.json();
    if (body?.duration) duration = body.duration;
    if (Array.isArray(body?.cities) && body.cities.length > 0) cities = body.cities;
  } catch {
    // 바디가 없으면 기본값(당일치기, 프라하) 사용
  }

  const cityList = cities.join(', ');

  const prompt = `당신은 체코를 가장 잘 여행하는 법을 아는 한국인 여행 전문가 'Prague Master'입니다.
사용자는 '${duration}' 일정으로 '${cityList}' 도시(들)를 여행하려고 합니다. 이 조건에 맞는 마스터 일정을 짜주세요.

결과는 반드시 아래와 같은 순수 JSON 배열 형식으로만 출력하세요. (마크다운 백틱 쓰지 마세요)
[
  { "day": "1일차", "time": "08:30", "title": "장소명", "desc": "상세한 일정 설명", "tip": "전문가의 진짜 꿀팁" }
]

* 특별 지시사항:1. "day" 필드는 여행 일수에 맞게 "1일차", "2일차" 식으로 넣어주세요. 당일치기라면 모든 항목의 day를 "당일 코스"로 통일하세요.
2. 여행 기간이 여러 날이면, 날짜별로 방문 도시를 자연스럽게 배분하세요 (예: 2박 3일 + 프라하/체스키크룸로프 선택 시 1일차는 프라하, 2일차는 체스키크룸로프 당일치기, 3일차는 다시 프라하 마무리 등).
3. 뻔한 관광 가이드가 아닌, 현지인이나 여러 번 방문한 사람만 알 수 있는 디테일한 꿀팁(예: 인생샷 찍기 좋은 최적의 시간대, 인파를 피하는 팁, 숨겨진 로컬 미식 포인트 등)을 'tip' 항목에 넣어주세요.
4. 특정 카메라 기종이나 개인적인 장비 언급은 하지 마세요.
5. 각 장소의 실제 소요 시간을 반드시 지켜서 시간표를 짜세요. 참고 기준: 대형 관광지(성, 대성당, 박물관 등)는 1.5~2시간, 중소 규모 명소나 전망 포인트는 30분~1시간, 식사는 1~1.5시간, 카페/휴식은 30분~1시간. 한 장소에 3시간 이상 머무는 일정은 만들지 마세요.
6. 장소 간 이동 시간(도보 또는 대중교통)도 감안해서 다음 시간을 자연스럽게 이어지게 하세요. 이동 시간을 무시하고 시간을 억지로 벌리지 마세요.
7. 첫째 날(1일차, 또는 당일치기의 경우 유일한 하루)은 다른 도시나 국가에서 이동해오는 것을 감안하여 낮 12시~13시 사이에 시작하세요. 오전 시간대(체크인, 짐 풀기, 이동 피로 회복 등)는 일정에 넣지 마세요. 둘째 날부터는 아침 8~9시에 시작해도 됩니다. 모든 날의 종료 시간은 저녁 19~21시 정도로 잡으세요.
8. 그 안에서 소요 시간과 이동 시간을 합산했을 때 자연스럽게 채워지는 만큼만 동선을 넣으세요. 시간이 남으면 억지로 늘리지 말고 자유 시간이나 산책 코스를 추가하는 식으로 채우세요.
9. 동선 개수를 억지로 맞추려 하지 마세요. 각 장소의 특성, 이동 동선, 그날의 시작/종료 시간을 곰곰이 고려해서, 여유롭고 알차게 하루를 채울 수 있는 만큼만 자연스럽게 넣으세요. 빡빡하게 욱여넣거나 시간을 때우려고 불필요한 장소를 끼워넣지 마세요. 선택된 모든 도시가 최소 한 번씩은 일정에 포함되어야 합니다.`;

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