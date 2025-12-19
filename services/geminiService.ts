
import { GoogleGenAI } from "@google/genai";
import { MatchData } from "../types";
import { getMatchContextData } from "./footballApi";

const SYSTEM_INSTRUCTION = `
**Role (역할)**
당신은 Google Gemini 3.0 Pro 기반의 **스포츠 데이터 분석 및 리스크 평가 전문 AI**입니다. 
특히 당신은 **대한민국 '배트맨(Betman/Proto)' 사이트 이용자를 위한 분석가**입니다.
API 데이터(전적, 스탯, 순위)와 시장 심리(Odds)를 분석하되, **배트맨 특유의 베팅 환경(핸디캡 무승부 존재, 보수적인 배당)**을 고려하여 전략을 제시하십시오.

**Analysis Philosophy (분석 철학)**
1. **배트맨 룰 적용 (Critical):** 
   - 해외와 달리 핸디캡(Handicap)에 '무승부' 선택지가 있음을 명심하십시오. (예: 홈팀 -1 핸디캡일 때, 홈팀이 1:0으로 이기면 해외는 '적중특례'지만 배트맨은 '핸디캡 무승부'임).
   - 강팀의 승리가 예상되더라도 1점 차 '똥줄승' 가능성이 높다면, **'핸디캡 승' 대신 '일반승'을 추천하거나 '핸디캡 무승부' 리스크**를 경고하십시오.
2. **데이터 심층 분석:** 단순 승률보다 '득실 마진'과 '최근 경기력'을 통해 1골 싸움인지, 대승 흐름인지 파악하십시오.
3. **시장 심리 (Odds):** 배당률이 지나치게 낮으면(1.1~1.3 배당), "이 배당에 걸만한 가치가 있는지(Risk/Reward)"를 냉정하게 평가하십시오.
4. **결론 도출:** 데이터가 상충하면 과감하게 **'패스(Pass/No Bet)'**를 권고하십시오.

**Output Format (출력 형식 - 필수 준수)**
반드시 아래 포맷을 따라 **한국어**로 작성하십시오.

---
### 🏟️ [종목] 경기 분석 리포트: [홈팀] vs [원정팀]
> **경기 정보:** [일시/라운드 정보]

### 🚑 핵심 변수: 부상자 및 라인업
- **홈팀 상황:** (부상자/라인업 반영)
- **원정팀 상황:** (부상자/라인업 반영)
- **영향 평가:** (전력 누수 및 전술적 영향)

### 🎯 배트맨(Proto) 관점 분석
- **승부 패턴:** (강팀의 대승 vs 꾸역승 vs 이변 가능성)
- **핸디캡 리스크:** (예: 홈팀 -1 핸디캡 적용 시 무승부 가능성 분석)
- **배당 가치:** (현재 배당이 리스크 대비 합리적인지 평가)

### 📊 데이터 딥 다이브
- **홈팀 폼:** (최근 흐름)
- **원정팀 폼:** (원정 약세 여부)
- **상성(H2H):** (천적 관계)

### 🧠 전술적 시뮬레이션
- **매치업:** (창 vs 방패 등 양상 예측)
- **키플레이어:** (해결사 혹은 구멍)

### ⚠️ 최종 픽 & 리스크
- **추천 픽:** [주력: 승/무/패] / [부주력: 언더/오버] (단, 확실하지 않으면 NO BET)
- **리스크:** (가장 조심해야 할 변수)
- **예상 스코어:** 0:0
- **한 줄 요약:** (배트맨 유저를 위한 핵심 조언)
---
`;

export const analyzeMatch = async (matchData: MatchData, apiKey: string) => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview"; 

  // 1. API-Sports에서 실제 데이터 가져오기
  let sportsData = null;
  let dataFetchError = null;
  
  try {
    sportsData = await getMatchContextData(matchData.sport, matchData.homeTeam, matchData.awayTeam);
  } catch (e: any) {
    console.warn("Sports API 가져오기 오류:", e);
    dataFetchError = e.message;
  }

  // 2. 프롬프트 구성
  let prompt = `
    다음 [${matchData.sport}] 경기를 정밀 분석해 주세요: ${matchData.homeTeam} (홈) vs ${matchData.awayTeam} (원정).
    사용자 입력 컨텍스트: ${matchData.context || "없음"}
  `;

  if (sportsData) {
    // 데이터가 너무 많으면 토큰 낭비이므로 핵심만 추출하여 문자열화
    prompt += `
      \n\n### ⚡ REAL-TIME API DATA (이 데이터를 절대적 근거로 사용하세요):
      
      **1. 경기 메타 정보:**
      ${JSON.stringify(sportsData.meta, null, 2)}

      **2. 배당률(Odds) - 시장의 예측:**
      ${sportsData.matchDetails.odds ? JSON.stringify(sportsData.matchDetails.odds, null, 2) : "배당률 데이터 없음 (예측 필요)"}

      **3. 부상자 명단(Injuries) - 핵심 변수:**
      ${sportsData.matchDetails.injuries && sportsData.matchDetails.injuries.length > 0 
        ? JSON.stringify(sportsData.matchDetails.injuries, null, 2) 
        : "보고된 주요 부상자 없음 (혹은 데이터 미제공)"}

      **4. 라인업(Lineups):**
      ${JSON.stringify(sportsData.matchDetails.lineups, null, 2)}

      **5. 최근 전적 및 순위:**
      - H2H: ${JSON.stringify(sportsData.headToHead, null, 2)}
      - Standings: ${JSON.stringify(sportsData.standings, null, 2)}
      - Home Last 5: ${JSON.stringify(sportsData.homeTeam.recentMatches?.slice(0, 5), null, 2)}
      - Away Last 5: ${JSON.stringify(sportsData.awayTeam.recentMatches?.slice(0, 5), null, 2)}
    `;
  } else {
    prompt += `\n\n경고: API 데이터를 가져오지 못했습니다 (${dataFetchError}). Google Search를 통해 최신 배당률, 부상자, 라인업을 반드시 검색하여 분석하세요.`;
  }

  prompt += `\n\n작성 지침: 위 API 데이터의 '배당률(Odds)'과 '부상자(Injuries)' 정보를 반드시 리포트에 언급하고, 이를 바탕으로 일반적인 통계 분석보다 더 깊이 있는 리스크 평가를 수행하세요. 한국어로 작성하세요.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.2, // 분석의 정확도를 위해 창의성 낮춤
      },
    });

    const text = response.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata, rawData: sportsData };
  } catch (error: any) {
    console.error("Gemini API 오류:", error);
    throw new Error(error.message || "경기 분석에 실패했습니다.");
  }
};
