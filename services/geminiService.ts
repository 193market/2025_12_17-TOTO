
import { GoogleGenAI } from "@google/genai";
import { MatchData } from "../types";
import { getMatchContextData } from "./footballApi";

// 변경: 전문 용어 배제, 초보자 친화적 용어 사용
const SYSTEM_INSTRUCTION = `
**Role (역할)**
당신은 Google Gemini 3.0 Pro 기반의 **친절한 스포츠 경기 해설가이자 분석가**입니다.
당신의 독자는 스포츠 분석 용어(핸디캡, 언오버, 정배/역배 등)를 전혀 모르는 **일반인 초보자**입니다.
따라서 전문 용어 대신 **누구나 이해할 수 있는 쉬운 일상 용어**로 풀어서 설명해야 합니다.

**Analysis Philosophy (분석 철학)**
1. **쉬운 용어 사용 (Critical):** 
   - '핸디캡 승' → **"홈팀이 2골 차 이상 여유 있게 이길 것 같습니다."**
   - '마핸/플핸' → 언급 금지. 점수 차이로 구체적으로 설명.
   - '언더/오버' → **"양 팀 합쳐 골이 많이(또는 적게) 날 것 같습니다."**
   - '배당률' → **"사람들의 기대치"** 혹은 **"예상 확률"**로 표현.
2. **명확한 승부 예측:** 
   - 애매한 표현보다 "A팀의 우세가 예상됩니다" 혹은 "무승부 가능성이 매우 높습니다"라고 명확히 하십시오.
3. **리스크 경고:** 
   - 강팀이라도 방심할 수 있는 이유(부상, 일정 등)를 이야기하듯 설명하십시오.

**Output Format (출력 형식 - 필수 준수)**
반드시 아래 포맷을 따라 **한국어**로 작성하십시오.

---
### 🏟️ [종목] 경기 분석 리포트: [홈팀] vs [원정팀]
> **경기 정보:** [일시/라운드 정보]

### 🚑 핵심 변수: 누가 나오고 못 나오나요?
- **홈팀 상황:** (주요 선수의 부상 여부와 그 영향)
- **원정팀 상황:** (주요 선수의 부상 여부와 그 영향)
- **알기 쉬운 설명:** (이 결장이 경기에 미칠 영향을 초등학생도 알게 설명)

### 🔭 승부 예측과 관전 포인트
- **예상 흐름:** (일방적인 공격일지, 지루한 공방전일지 설명)
- **점수 차 예상:** (예: 홈팀이 1점 차로 간신히 이길 듯 vs 3점 차 대승 예상)
- **득점 양상:** (골 잔치 vs 침묵의 경기)

### 📊 데이터가 말해주는 것
- **최근 분위기:** (누가 더 상승세인가요?)
- **상대 전적:** (과거에 만나면 누가 이겼나요?)

### ⚠️ 최종 픽 & 요약
- **최종 추천:** [홈팀 승리 / 무승부 / 원정팀 승리] 중 택 1
- **예상 스코어:** 0:0
- **한 줄 요약:** (친구에게 조언하듯 쉽고 명확하게)
---
`;

/**
 * 경기 분석 함수 (스트리밍 지원)
 * @param matchData 경기 데이터
 * @param apiKey Google API Key
 * @param onStreamChunk 스트리밍 데이터를 받아 UI를 업데이트할 콜백 함수
 */
export const analyzeMatch = async (
  matchData: MatchData, 
  apiKey: string,
  onStreamChunk?: (text: string) => void
) => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview"; 

  // --- [CASE 1: 파일 업로드 종합 분석 모드] ---
  if (matchData.uploadedContent) {
    const { contextAnalysis, noContextAnalysis } = matchData.uploadedContent;

    const synthesisPrompt = `
      당신은 스포츠 분석 최종 결정권자입니다.
      동일한 경기에 대해 작성된 **두 가지 버전의 리포트**가 있습니다.
      
      하나는 '뉴스/맥락'을 중요시했고, 다른 하나는 '데이터/통계'를 중요시했습니다.
      이 두 리포트를 읽고, 초보자도 이해하기 쉽게 하나로 합쳐서 **최종 결론**을 내려주세요.

      ---
      **📂 리포트 A (맥락 & 뉴스 중심):**
      ${contextAnalysis}

      **📂 리포트 B (데이터 & 통계 중심):**
      ${noContextAnalysis}
      ---

      **작성 요청:**
      1. 두 리포트의 결론이 같다면 더 확신을 가지고 추천해주세요.
      2. 결론이 다르다면, 왜 다른지 설명하고 당신의 최종 판단을 알려주세요.
      3. **절대 전문 용어를 쓰지 마세요.** 쉽고 친절하게 설명해주세요.
      4. 위 SYSTEM_INSTRUCTION의 양식을 그대로 따르세요. 제목 앞에는 반드시 '[최종분석]' 태그를 붙여주세요.
    `;

    try {
      // 스트리밍 요청
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: synthesisPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
        },
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          if (onStreamChunk) onStreamChunk(chunkText);
        }
      }

      return { text: fullText, groundingMetadata: null, rawData: null };
    } catch (error: any) {
      console.error("Gemini Synthesis Error:", error);
      throw new Error("분석 종합 중 오류가 발생했습니다: " + error.message);
    }
  }

  // --- [CASE 2: 일반 신규 분석 모드 (+ In-Context Learning)] ---
  
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
    다음 [${matchData.sport}] 경기를 분석해 주세요: ${matchData.homeTeam} (홈) vs ${matchData.awayTeam} (원정).
    사용자 입력 컨텍스트: ${matchData.context || "없음"}
  `;

  // [중요] 학습 데이터(Training Data) 주입 - In-Context Learning
  if (matchData.trainingData && matchData.trainingData.length > 0) {
    prompt += `\n\n=== 🧠 [나의 분석 스타일 학습 데이터] ===\n`;
    prompt += `아래는 내가 평소에 분석했던 스타일이나 선호하는 형식의 예시들입니다. \n`;
    prompt += `이 예시들의 **말투, 논리 전개 방식, 분석 깊이**를 학습하여 이번 경기 분석에 적용하세요.\n`;
    
    matchData.trainingData.forEach((data, index) => {
        prompt += `\n--- [학습 예시 파일 #${index + 1}] ---\n`;
        prompt += data.substring(0, 3000); 
        prompt += `\n--- [예시 파일 #${index + 1} 끝] ---\n`;
    });
    prompt += `\n=========================================\n`;
    prompt += `위 학습 데이터를 참고하되, 분석 내용은 아래의 최신 실시간 데이터(REAL-TIME API DATA)를 기반으로 작성하세요.\n`;
  }

  if (sportsData) {
    prompt += `
      \n\n### ⚡ REAL-TIME API DATA (이 데이터를 절대적 근거로 사용하세요):
      
      **1. 경기 메타 정보:**
      ${JSON.stringify(sportsData.meta, null, 2)}

      **2. 배당률(Odds) - 시장의 예측:**
      ${sportsData.matchDetails.odds ? JSON.stringify(sportsData.matchDetails.odds, null, 2) : "배당률 데이터 없음"}

      **3. 부상자 명단(Injuries):**
      ${sportsData.matchDetails.injuries && sportsData.matchDetails.injuries.length > 0 
        ? JSON.stringify(sportsData.matchDetails.injuries, null, 2) 
        : "보고된 주요 부상자 없음"}

      **4. 라인업(Lineups):**
      ${JSON.stringify(sportsData.matchDetails.lineups, null, 2)}

      **5. 최근 전적 및 순위:**
      - H2H: ${JSON.stringify(sportsData.headToHead, null, 2)}
      - Standings: ${JSON.stringify(sportsData.standings, null, 2)}
      - Home Last 5: ${JSON.stringify(sportsData.homeTeam.recentMatches?.slice(0, 5), null, 2)}
      - Away Last 5: ${JSON.stringify(sportsData.awayTeam.recentMatches?.slice(0, 5), null, 2)}
    `;
  } else {
    prompt += `\n\n경고: API 데이터를 가져오지 못했습니다 (${dataFetchError}). Google Search를 통해 정보를 수집하세요.`;
  }

  prompt += `\n\n작성 지침: 전문 용어(핸디캡, 언오버 등)를 절대 사용하지 말고, 친구에게 설명하듯 쉬운 말로 풀어서 작성하세요.`;

  try {
    // 스트리밍 요청
    const responseStream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }], // 검색 도구 사용
        temperature: 0.2,
      },
    });

    let fullText = "";
    let finalGroundingMetadata = null;

    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      
      // 스트리밍 중에는 텍스트를 계속 UI로 전달
      if (chunkText) {
        fullText += chunkText;
        if (onStreamChunk) onStreamChunk(chunkText);
      }
      
      // 메타데이터는 보통 마지막 청크 혹은 누적된 응답에 포함됨
      if (chunk.candidates?.[0]?.groundingMetadata) {
        finalGroundingMetadata = chunk.candidates[0].groundingMetadata;
      }
    }

    return { text: fullText, groundingMetadata: finalGroundingMetadata, rawData: sportsData };
  } catch (error: any) {
    console.error("Gemini API 오류:", error);
    throw new Error(error.message || "경기 분석에 실패했습니다.");
  }
};
