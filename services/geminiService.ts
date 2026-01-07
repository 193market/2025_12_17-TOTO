
// ... (Previous imports and system instructions remain the same) ...
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MatchData, CartItem, BatchAnalysisResult, GameType, AnalysisStrategy } from "../types";
import { getMatchContextData } from "./footballApi";

// [SYSTEM INSTRUCTION UPDATED - DEBATE MODE & BANKROLL MANAGEMENT & PYTHAGOREAN & RISK DECOUPLING] 
// 2025-12-27 버전 (Paid Plan): 중립 분석 대신 '대립 토론(Debate)' 시스템 및 자금 관리 로직 도입
// [UDPATE] 60% 적중률 목표 리스크 디커플링(Risk Decoupling) 프로토콜 추가
const SYSTEM_INSTRUCTION = `
**Role (역할)**
당신은 **MatchInsight Sports Court**의 수석 재판관(Chief Judge)입니다.
당신은 단순히 경기 결과를 예측하는 것이 아니라, 다음 **3명의 전문가들의 치열한 토론(Debate)**을 듣고 판결을 내리는 역할을 합니다.

**The 3 Agents (전문가 패널 - 대립 토론)**

1.  **🔴 Agent Red (홈팀 변호인단 - Home Advocate):** 
    - **역할:** 철저하게 **[홈팀]**의 입장에서 변호합니다.
    - **논리:** 홈팀의 최근 상승세, 홈 이점, 상대 전적 우위, 긍정적인 뉴스(부상 복귀 등)를 강조합니다.
    - **공격:** 원정팀의 약점, 최근 부진, 원정 징크스, 불화설 등을 집요하게 파고듭니다.
    - **목표:** "홈팀 승리" 또는 "홈팀 지지 않는 흐름"을 설득하는 것.

2.  **🔵 Agent Blue (원정팀 변호인단 - Away Advocate):**
    - **역할:** 철저하게 **[원정팀]**의 입장에서 변호합니다.
    - **논리:** 원정팀의 전술적 상성, 최근 득점력, 배당 대비 가치(Value), 홈팀의 거품을 지적합니다.
    - **공격:** 홈팀의 부상 공백, 체력 저하, 최근 패배의 충격 등을 공격합니다.
    - **목표:** "원정팀 승리" 또는 "무승부"를 설득하여 홈팀 승리를 막는 것.

3.  **💰 Agent Green (중립 배당/시장 분석관 - Oddsmaker):**
    - **역할:** 감정을 배제하고 **시장(Market)의 수학**을 분석합니다.
    - **핵심 논리 (The Math of Oddsmaking):** 
      1. **환급률(Payout Rate) 적용:** 배당률은 순수 확률이 아닌 환급률(통상 85~90%)이 적용된 값입니다.
      2. **시장 확률 역산(Implied Probability):** 공식 **[확률 = 환급률 / 배당률]**을 사용하여 오즈메이커가 예측한 승리 확률을 계산합니다.
      3. **피타고리안 기대 승률 (Pythagorean Expectation):**
         - 팀의 **'진짜 실력'**을 측정하기 위해 승패 기록이 아닌 **득점/실점** 데이터를 사용하십시오.
         - **공식:** (득점^2) / (득점^2 + 실점^2)
         - **분석 적용:** 
           - 실제 승률 > 피타고리안 승률: "운이 좋았다(거품)" → **위험 신호 (정배당 기피)**
           - 실제 승률 < 피타고리안 승률: "운이 나빴다(불운)" → **가치 발견 (역배당/플핸 추천)**
      4. **가치 평가(Value Bet):** Red/Blue의 경기력 분석과 피타고리안 기대치를 종합한 **'실제 확률'**이 **'시장 확률'**보다 높을 때만 "가치(Value)가 있다"고 선언합니다.
      5. **자금 관리 (Bankroll Management):**
         - 사용자의 1회 최대 베팅 한도(Unit Limit)는 **5,000원**입니다.
         - 확신도(Confidence)와 켈리 기준(Kelly Criterion)에 의거하여 권장 베팅 금액을 산출하십시오.
         - **강승부 (Confidence 80%+):** 4,000원 ~ 5,000원 (Full Unit)
         - **중승부 (Confidence 60~79%):** 2,500원 ~ 3,500원 (Half Unit)
         - **소액/이변 노리기 (Confidence <60%):** 1,000원 ~ 2,000원 (Low Unit)
         - **패스 권장:** 리스크가 너무 크면 0원 또는 "PASS"를 권장.
    - **목표:** "얼마를 걸어야 하는가?"에 대한 수학적 해답을 제시합니다.

**Risk Decoupling Protocol (60% Winning Rate Logic)**
모든 경기는 잠재적 낙첨 리스크에 따라 다음 4가지 중 하나로 반드시 분류되어야 합니다.

*   **TYPE-A (변수 미포착):** 정보의 공백. (예: 주전 부상, 로테이션, 날씨 변수)
*   **TYPE-B (심리/동기):** 동기부여 이슈. (예: 이미 우승 확정팀의 태업, 하위권의 강한 잔류 의지)
*   **TYPE-C (시장 왜곡):** 배당 함정. (예: 대중의 몰림으로 인한 배당 하락, 오즈메이커의 Trap)
*   **TYPE-D (상성 오류):** 전술적 상성 및 징크스. (예: 특정 팀에게만 약한 모습)

**Process (진행 방식)**
1.  **Fact Check:** 제공된 데이터(API)와 검색 결과(News)를 확인합니다.
2.  **Debate:** Red와 Blue가 서로의 데이터를 반박하며 치열하게 싸웁니다.
3.  **Risk Tagging:** 해당 경기가 만약 틀린다면 어떤 이유일지(TYPE A~D) 식별합니다.
4.  **Verdict:** 당신(Moderator)이 양측의 주장을 종합하여 최종 승패를 판결합니다.

**Output Format (Markdown)**
다음 형식을 엄격히 준수하십시오. 모든 텍스트는 **한국어(Korean)**입니다.

---
### 🏟️ [종목] 법정 공방: [홈팀] vs [원정팀]
> **경기 정보:** [일시/리그] | **시장 배당:** [홈승 / 무 / 패]

### ⚖️ 최종 판결 (The Verdict)
- **판결 요약:** (재판관으로서 내린 최종 결론)
- **예상 승률:** 홈 [XX]% / 무 [XX]% / 원정 [XX]%
- **리스크 유형:** [TYPE-A/B/C/D] (설명)

### 🔴 홈팀 변호인단 (Home Advocate)
- **변론 요지:** (홈팀이 이길 수밖에 없는 이유 강력 주장)
- **공격 포인트:** (원정팀의 치명적 약점 지적)

### 🔵 원정팀 변호인단 (Away Advocate)
- **변론 요지:** (홈팀의 불안요소 폭로 및 원정팀의 승리/무승부 가능성 주장)
- **반박:** (홈팀 주장의 허점 찌르기)

### 💰 중립 배당 분석관 (Market Expert)
- **Odds Check:** (환급률을 고려한 시장 확률 vs 피타고리안 기대 승률 기반 비교)
- **Smart Pick:** (+EV 가치 배팅 추천)
- **💸 Money Talk:** (권장 베팅 금액 및 이유. 예: "피타고리안 기대치 상위, 확신도 85% 강승부 구간, 5,000원 풀베팅 권장")

### 🏁 최종 픽 (Final Pick)
- **Main:** [홈승 / 무승부 / 원정승 / 언더 / 오버]
- **Sub:** [핸디캡 등]
- **Score:** [홈] : [원정]
---

**[Machine Data]**
(마지막에 반드시 아래 JSON 포맷을 코드 블록으로 출력. 승률 합은 100)
\`\`\`json
{
  "probabilities": {
    "home": 55,
    "draw": 25,
    "away": 20
  },
  "score": {
    "home": 2,
    "away": 1
  }
}
\`\`\`
`;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 2) { 
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContentStream(params);
    } catch (error: any) {
      attempt++;
      if (error.status === 429 || error.code === 429 || error.message?.includes('429')) {
        const delay = 1000; 
        console.warn(`Gemini 429 Error (Attempt ${attempt}/${maxRetries}). Quick retry...`);
        if (attempt >= maxRetries) throw error;
        await wait(delay);
        continue;
      }
      throw error;
    }
  }
}

// ... (analyzeMatch remains similar, already updated previously) ...
export const analyzeMatch = async (
  matchData: MatchData, 
  apiKey: string,
  onStreamChunk?: (text: string) => void,
  signal?: AbortSignal
) => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview"; 

  // --- [CASE 3: Review Mode (Image based - Multiple)] ---
  if (matchData.images && matchData.images.length > 0) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const reviewPrompt = `
      [SYSTEM: Current Date is ${today}]
      [MISSION: Forensic Post-Mortem Analysis (다중 경기 정밀 복기)]
      
      당신은 스포츠 데이터 분석 전문가입니다. 사용자가 제공한 이미지(들)에서 확인되는 **모든 경기**를 하나씩 정밀 분석해야 합니다.
      여러 경기가 있다고 해서 내용을 요약하거나 뭉뚱그리지 마십시오. **각 경기를 독립된 섹션으로 나누어 상세히 분석**하십시오.

      **[CRITICAL: Time Travel Check (미래 경기 감지)]**
      1. 이미지 속 경기 날짜(Date)를 확인하십시오.
      2. 만약 경기 날짜가 오늘(${today})보다 **미래**라면, 절대 결과를 예측하거나 분석하지 마십시오.
      3. 대신, 다음과 같이 경고 메시지만 출력하고 해당 경기의 분석을 건너뛰십시오.
         - "⚠️ **[경고] 미래 경기 감지:** [홈팀] vs [원정팀] 경기는 [날짜] 예정입니다. 아직 결과가 존재하지 않습니다."

      **[PROCESS]**
      1. **Image Parsing:** 이미지 내의 모든 경기 리스트(팀명, 베팅 내역, 결과/배당)를 추출합니다.
      2. **Fact Check:** 과거 경기라면 Google Search를 통해 실제 스코어, 득점 시간, 주요 이벤트(레드카드 등)를 확인합니다.
      3. **Analyze:** 사용자의 선택이 왜 적중했는지, 혹은 왜 실패했는지 논리적으로 분석합니다.

      **[OUTPUT FORMAT (Korean)]**
      아래 포맷을 그대로 따르십시오.

      ## 🕵️‍♂️ AI 복기 리포트 (Post-Mortem Report)

      ### 1. 경기 요약 (Match Summary)
      (이미지에서 식별된 모든 경기를 리스트업)
      - **[결과] [N]경기: [홈팀] vs [원정팀]** ([리그명])
        - **내 베팅:** [픽]
        - **실제 결과:** [스코어] ([적중/미적중])
        - **상태:** (예: 💀 처참한 패배 / 🎯 완벽한 적중 / ⚠️ 미래 경기)

      ---

      ### 2. 팩트 체크 (Fact Check)
      (각 경기별로 실제 경기 흐름을 시간대별로 정리. 미래 경기는 제외)
      
      #### ⚽ [홈팀] vs [원정팀] (최종 스코어)
      *   **경기 흐름:**
          *   **전반 [N]분:** [득점자/이벤트] (상황 설명)
          *   **후반 [N]분:** [득점자/이벤트] (상황 설명)
      *   **핵심 스탯:** (xG, 점유율, 슈팅 수 등 승패를 가른 핵심 지표)

      ---

      ### 3. 패인/승인 분석 (Deep Dive)
      (가장 중요한 섹션. 각 경기별로 상세 분석)

      #### 📉 왜 [팀]전은 '[베팅]'이 실패(혹은 성공)했는가?
      1.  **[원인 1]:** (예: 이른 선제골로 인한 전술 붕괴)
      2.  **[원인 2]:** (예: 데이터상 압도했으나 골 결정력 부족)
      3.  **[원인 3]:** (예: 퇴장 변수 발생)

      ---

      ### 4. 교훈 (Lesson Learned)
      *   **[Rule 1]:** (이번 복기를 통해 얻은 구체적인 배팅 원칙)
      *   **[Rule 2]:** (팀별/리그별 특성 발견)

      **[Machine Data]**
      \`\`\`json
      {
        "probabilities": { "home": 0, "draw": 0, "away": 0 },
        "score": { "home": 0, "away": 0 }
      }
      \`\`\`
    `;

    // Create prompt parts: multiple images + text prompt
    const parts = [
        ...matchData.images.map(imgData => ({
            inlineData: { mimeType: "image/jpeg", data: imgData }
        })),
        { text: reviewPrompt }
    ];

    try {
        const responseStream = await generateWithRetry(ai, {
            model,
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }], 
                temperature: 0.2
            }
        });

        let fullText = "";
        let finalGroundingMetadata = null;
        for await (const chunk of responseStream) {
            if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
            if (chunk.text) {
                fullText += chunk.text;
                if (onStreamChunk) onStreamChunk(chunk.text);
            }
            if (chunk.candidates?.[0]?.groundingMetadata) {
                finalGroundingMetadata = chunk.candidates[0].groundingMetadata;
            }
        }
        return { text: fullText, groundingMetadata: finalGroundingMetadata, rawData: null };
    } catch (error: any) {
        if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
        throw new Error("이미지 복기 분석 중 오류 발생: " + error.message);
    }
  }

  // --- [CASE 1: Synthesis Mode] ---
  const tools = matchData.useAutoSearch ? [{ googleSearch: {} }] : undefined;

  if (matchData.uploadedContent) {
    const { contextAnalysis, noContextAnalysis } = matchData.uploadedContent;
    let synthesisPrompt = `
      [임무] 두 개의 분석 리포트를 'Debate(토론)' 형식으로 재구성하여 최종 판결을 내리십시오.
      
      [Report A - Context]: ${contextAnalysis}
      [Report B - Data]: ${noContextAnalysis}
      
      Red(홈팀), Blue(원정팀), Green(배당) 에이전트의 관점을 적용하여 치열한 토론 후 결론을 내리세요.
      **주의: 최종 결과는 반드시 한국어로 작성하십시오.**
    `;

    if (matchData.useAutoSearch) {
        synthesisPrompt += `\n\n[System Command] Green Agent는 Google Search를 사용하여 현재 시점의 최신 이슈를 팩트체크하고 토론에 반영하십시오.`;
    }

    try {
      const responseStream = await generateWithRetry(ai, {
        model,
        contents: synthesisPrompt,
        config: { 
            systemInstruction: SYSTEM_INSTRUCTION, 
            temperature: 0.2, // 창의적인 토론을 위해 약간 높임
            tools: tools 
        },
      });

      let fullText = "";
      let finalGroundingMetadata = null;
      for await (const chunk of responseStream) {
        if (signal?.aborted) {
           throw new Error("사용자에 의해 분석이 중지되었습니다.");
        }
        if (chunk.text) {
          fullText += chunk.text;
          if (onStreamChunk) onStreamChunk(chunk.text);
        }
        if (chunk.candidates?.[0]?.groundingMetadata) {
            finalGroundingMetadata = chunk.candidates[0].groundingMetadata;
        }
      }
      return { text: fullText, groundingMetadata: finalGroundingMetadata, rawData: null };
    } catch (error: any) {
      if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
      throw new Error("분석 종합 중 오류가 발생했습니다: " + error.message);
    }
  }

  // --- [CASE 2: Single Analysis Mode] ---
  let sportsData = null;
  let dataFetchError = null;
  
  try {
    if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
    sportsData = await getMatchContextData(matchData.sport, matchData.homeTeam, matchData.awayTeam);
  } catch (e: any) {
    if (signal?.aborted) throw e;
    console.warn("Sports API 가져오기 오류:", e);
    dataFetchError = e.message;
  }

  if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");

  let prompt = `[${matchData.sport}] 'Sports Court' 법정 개정 요청: ${matchData.homeTeam} vs ${matchData.awayTeam}.\n사용자 메모: ${matchData.context || "없음"}`;

  if (matchData.trainingData && matchData.trainingData.length > 0) {
    prompt += `\n\n=== 🧠 Reference Style & Future Memory ===\n`;
    matchData.trainingData.slice(0, 3).forEach((data, index) => {
        prompt += `\n[Learned Memory ${index + 1}]\n${data.substring(0, 1000)}... (이 교훈을 이번 분석 논리에 적용할 것)\n`;
    });
  }

  if (sportsData) {
    prompt += `
      \n\n### ⚡ Evidence for the Court (증거 자료):
      - **Home Team Last Match Stats (xG included if available):** ${JSON.stringify(sportsData.homeTeam.lastMatchStats) || "No advanced stats"}
      - **Away Team Last Match Stats (xG included if available):** ${JSON.stringify(sportsData.awayTeam.lastMatchStats) || "No advanced stats"}
      - **H2H (Last 5):** ${JSON.stringify(sportsData.headToHead) || "No H2H data"}
      - **League Standings (중요: 피타고리안 승률 계산용):** ${JSON.stringify(sportsData.standings) || "Not Available"}
      - **Home Recent Form:** ${JSON.stringify(sportsData.homeTeam.recentMatches) || "No form data"}
      - **Away Recent Form:** ${JSON.stringify(sportsData.awayTeam.recentMatches) || "No form data"}

      ### ⚡ Market Data (Agent Green):
      - **Next Match Info:** ${JSON.stringify(sportsData.meta)}
      - **OFFICIAL BOOKMAKER ODDS:** ${JSON.stringify(sportsData.matchDetails.odds) || "Unknown (Odds data unavailable)"}
      
      ### ⚡ News Data (Fact Check):
      - **Official Injuries:** ${JSON.stringify(sportsData.matchDetails.injuries)}
      - **Predicted Lineups:** ${JSON.stringify(sportsData.matchDetails.lineups)}
    `;
  } else {
    prompt += `\n\nWarning: API Data failed (${dataFetchError}). All Agents must rely on Google Search.`;
  }

  if (matchData.useAutoSearch) {
      prompt += `\n\n[System Command] 각 변호인단은 Google Search를 사용하여 '${matchData.homeTeam} vs ${matchData.awayTeam} preview prediction injuries'를 검색하고, 검색된 최신 뉴스를 근거로 변론을 펼치십시오.`;
  }

  try {
    const responseStream = await generateWithRetry(ai, {
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: tools,
        temperature: 0.25, // 토론의 다양성을 위해 약간 높임
      },
    });

    let fullText = "";
    let finalGroundingMetadata = null;
    for await (const chunk of responseStream) {
      if (signal?.aborted) {
        throw new Error("사용자에 의해 분석이 중지되었습니다.");
      }
      if (chunk.text) {
        fullText += chunk.text;
        if (onStreamChunk) onStreamChunk(chunk.text);
      }
      if (chunk.candidates?.[0]?.groundingMetadata) {
        finalGroundingMetadata = chunk.candidates[0].groundingMetadata;
      }
    }

    return { text: fullText, groundingMetadata: finalGroundingMetadata, rawData: sportsData };
  } catch (error: any) {
    if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
    let msg = error.message || "분석 실패";
    if (msg.includes('429')) msg = "API 요청 과부하 (429). 잠시 후 다시 시도해주세요.";
    throw new Error(msg);
  }
};

/**
 * [BATCH UPDATE] 조합 추천 및 전체 분석 기능 지원 (Paid Plan Optimized)
 */
export const recommendCombination = async (
  cartItems: CartItem[], 
  apiKey: string,
  onStatusUpdate: (msg: string) => void,
  folderCount: number = 2,
  recommendationCount: number = 1,
  useAutoSearch: boolean = false,
  signal?: AbortSignal,
  analysisMode: 'combination' | 'all' = 'combination', 
  targetGameType: GameType = 'General',
  globalStrategy?: string, // [NEW] Added Global Strategy Text
  targetStrategy?: AnalysisStrategy // [NEW] Added Strategy Type (AXIS, TRAP, ERASER)
): Promise<BatchAnalysisResult> => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");
  if (cartItems.length < 2) throw new Error(`최소 2경기 이상이 필요합니다.`);

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview";

  const BATCH_SIZE = 1; 
  const enrichedMatches: {item: CartItem, data: any}[] = [];
  
  onStatusUpdate(`데이터 수집 시작 (총 ${cartItems.length}경기) - 정밀 분석 모드...`);

  let completedCount = 0;
  
  for (let i = 0; i < cartItems.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
    if (i > 0) await wait(1500); 

    const chunk = cartItems.slice(i, i + BATCH_SIZE);
    
    const chunkResults = await Promise.all(chunk.map(async (item) => {
      if (signal?.aborted) return { item, data: null };
      
      let sportsData = null;
      try {
        sportsData = await getMatchContextData(item.sport, item.homeTeam, item.awayTeam);
      } catch (e: any) {
        console.warn(`Data fetch failed for ${item.homeTeam}`, e);
      }
      return { item, data: sportsData };
    }));
    
    enrichedMatches.push(...chunkResults);
    completedCount += chunk.length;
    
    if (!signal?.aborted) {
        onStatusUpdate(`데이터 수집 중... (${Math.min(completedCount, cartItems.length)}/${cartItems.length})`);
    }
  }

  if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");

  const modeText = analysisMode === 'all' 
    ? "프로토 승부식 전체 예측 (Debate Mode)" 
    : `${recommendationCount}개의 최적 ${folderCount}폴더 조합 추천`;

  onStatusUpdate(`Gemini가 ${modeText}을(를) 수행 중입니다... (Auto-Search: ${useAutoSearch ? 'ON' : 'OFF'})`);

  const isProtoMode = analysisMode === 'all';
  const isMixedMode = targetGameType === 'Mixed';

  // [PROMPT CONSTRUCTION]
  let typeSpecificInstruction = '';

  if (isMixedMode) {
      typeSpecificInstruction = `
      **[GLOBAL SETTING: MIXED MODE]**
      Mission: Choose the best winning probability type among General, Handicap, and UnOver.
      **GOAL: Recommend ${recommendationCount} sets of ${folderCount}-folder combinations.**
      Constraints: 
      - If 'Handicap' is chosen, set 'gameType': "Handicap" and provide 'criteria'.
      - If 'UnOver' is chosen, set 'gameType': "UnOver" and provide 'criteria'.
      - If 'General' is chosen, set 'gameType': "General".
      `;
  } else if (isProtoMode) {
      typeSpecificInstruction = `
      **[GLOBAL SETTING: PROTO MATCH PREDICTION (FULL LIST)]**
      Mission: Analyze ALL ${cartItems.length} matches individually.
      **MANDATORY**: 
      1. DO NOT create combinations. 
      2. Provide a specific prediction (Win/Draw/Loss/Under/Over) for **EVERY SINGLE MATCH** in the list.
      3. Do not omit any match. If you received ${cartItems.length} matches, return ${cartItems.length} predictions in the 'matches' array.
      4. Focus on predicting the outcome (Win/Draw/Loss) for each match.
      `;
  } else {
      typeSpecificInstruction = `
      **[GLOBAL SETTING: TARGET GAME TYPE = '${targetGameType}']**
      **GOAL: Recommend ${recommendationCount} sets of ${folderCount}-folder combinations.**
      Constraints: 
      1. Select the Top ${folderCount} matches with the highest confidence/EV from the list.
      2. Create ${recommendationCount} distinct combinations.
      3. Strictly adhere to the ${targetGameType} format.
      `;
  }

  // [INJECT USER STRATEGY IF AVAILABLE]
  const strategyInstruction = globalStrategy 
    ? `\n**[USER PROVIDED STRATEGY & MEMORY RULES]**\n다음은 사용자가 제공한 절대적인 분석 지침입니다. 이 규칙을 모든 분석에 최우선적으로 적용하십시오:\n${globalStrategy}\n` 
    : "";
  
  // [NEW] TARGET STRATEGY FILTER
  let targetStrategyInstruction = "";
  if (!isProtoMode && targetStrategy && targetStrategy !== 'ALL') {
      if (targetStrategy === 'AXIS') {
          targetStrategyInstruction = `
          **[STRATEGY FILTER: AXIS (💎)]**
          - **MANDATORY CRITERIA:** You MUST strictly select only matches identified as 'AXIS' (High Confidence, Low Risk, Public Favorite aligned with Data).
          - **GOAL:** Maximize Hit Rate. Do not select risky bets.
          `;
      } else if (targetStrategy === 'TRAP') {
          targetStrategyInstruction = `
          **[STRATEGY FILTER: TRAP (💣)]**
          - **MANDATORY CRITERIA:** You MUST strictly select only matches identified as 'TRAP' (High Odds, Potential Upset, Value Bet).
          - **GOAL:** High Return / Jackpot. Do not select obvious low-odds favorites.
          `;
      } else if (targetStrategy === 'ERASER') {
          targetStrategyInstruction = `
          **[STRATEGY FILTER: ERASER (🧹)]**
          - **MANDATORY CRITERIA:** Select matches that are chaotic or hard to predict. 
          - **GOAL:** Identify unpredictable matches (often Draws).
          `;
      }
  }

  // [NEW] RISK DECOUPLING INSTRUCTION (Updated Output Format)
  const riskDecouplingInstruction = `
  **[60% Winning Rate Protocol: Risk Decoupling]**
  1. **Assign Risk Type to EVERY match**:
     - TYPE-A (변수 미포착): Info Gap (Injury, Rotation, Weather).
     - TYPE-B (심리/동기): Motivation (Desperation vs Complacency).
     - TYPE-C (시장 왜곡): Market Trap (Public Bubble).
     - TYPE-D (상성 오류): Matchup/Jinx.
  
  2. **Combination Filtering Rule (CRITICAL)**:
     - When forming a combination, **DO NOT combine matches with the SAME Risk Type**. (e.g., A+A is Forbidden).
     - This ensures independence of failure. "Twin Insurance" Strategy.
     - Avoid combining matches from the same league at the same time if possible.

  3. **AI Stress Test (Reverse Simulation)**:
     - Ask yourself: "If today is 'Favorite Killer Day', does this combination survive?"
     - In 'riskValidation' field, output a confirmation string exactly like: "조합 안전 승인: [Match1 TYPE-A] + [Match2 TYPE-D] 검증 완료. 논리적 독립성: 두 경기가 동시에 틀릴 확률은 수학적으로 독립적임을 확인했습니다."
  `;

  let prompt = `
    당신은 스포츠 법정의 수석 재판관입니다.
    다음 ${cartItems.length}개 경기에 대해 **[Red:홈팀변호인] vs [Blue:원정팀변호인] vs [Green:중립분석관]**의 토론을 주재하고 판결을 내리십시오.

    [분석 모드: ${analysisMode === 'all' ? 'PROTO MATCH PREDICTION (ALL MATCHES)' : 'BEST COMBINATION RECOMMENDER (MANUAL)'}]
    
    ${typeSpecificInstruction}
    ${targetStrategyInstruction}
    ${riskDecouplingInstruction}
    ${strategyInstruction}
    
    **MISSION:**
    1. **Debate Summary:** 'reason' 필드에 반드시 3명의 공방 내용을 요약해서 넣으십시오.
       - 형식: "🔴Red(Home): [주장] \n🔵Blue(Away): [주장] \n⚖️Verdict: [판결]"
       - 데이터에 기반하지 않은 주장은 기각하십시오.
    2. **Balanced Verdict:** Red와 Blue 중 논리적으로 더 타당한 쪽의 손을 들어주십시오.
    3. **Korean Output:** 모든 텍스트는 한국어로 작성하십시오.
    4. **Bankroll Advice:** Max Limit is 5,000 KRW. Suggest stake amount in 'recommendedStake' field based on confidence level. (e.g. "5,000원", "3,000원")
    5. **Strategy & Risk Tagging:** For EVERY match, you MUST assign a 'strategyStatus' AND 'riskType'.
    6. **MANDATORY:** Output JSON must contain FULL match details (homeTeam, awayTeam, etc.) inside the 'matches' array. Do NOT use references.

    [분석 대상 경기 목록]
    ${enrichedMatches.map((m, idx) => {
        const effectiveType = (isProtoMode || m.item.gameType !== 'General') ? (m.item.gameType || 'General') : targetGameType;
        const criteriaInfo = m.item.criteria ? `\n    - **[FIXED CRITERIA]: ${m.item.criteria}**` : '';
        let outputConstraint = "PREDICT: [승, 무, 패]";
        if (effectiveType === 'Handicap') outputConstraint = "PREDICT: [핸디승, 핸디무, 핸디패]";
        else if (effectiveType === 'UnOver') outputConstraint = "PREDICT: [오버, 언더]";

        return `
    GAME ${idx + 1}: ${m.item.sport} - ${m.item.homeTeam} vs ${m.item.awayTeam}
    - **[TARGET TYPE]: ${effectiveType}**${criteriaInfo}
    - **[CONSTRAINT]: ${outputConstraint}**
    - Public Vote Rates: ${m.item.voteRates || "Unknown"}
    - Official Odds: ${JSON.stringify(m.data?.matchDetails.odds) || "Unknown"}
    - League Standings (For Pythagorean Calc): ${JSON.stringify(m.data?.standings) || "Unknown"}
    - H2H/Form: ${m.data?.homeTeam.recentMatches ? "Available" : "Missing"}
    `;}).join('\n')}
  `;

  // [SCHEMA DEFINITION] Ensure strict JSON output
  const matchSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      homeTeam: { type: Type.STRING },
      awayTeam: { type: Type.STRING },
      prediction: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
      reason: { type: Type.STRING },
      recommendedStake: { type: Type.STRING, description: "Recommended stake amount (max 5000 KRW). e.g., '5,000원'" },
      riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
      sport: { type: Type.STRING },
      gameType: { type: Type.STRING },
      criteria: { type: Type.STRING },
      strategyStatus: { type: Type.STRING, enum: ["AXIS", "TRAP", "ERASER", "NONE"] },
      riskType: { type: Type.STRING, enum: ["TYPE-A", "TYPE-B", "TYPE-C", "TYPE-D"], description: "Risk Decoupling Type" },
    },
    required: ["homeTeam", "awayTeam", "prediction", "confidence", "reason"],
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      matches: {
        type: Type.ARRAY,
        items: matchSchema,
        description: "List of all analyzed matches."
      },
      recommendedCombinations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rank: { type: Type.NUMBER },
            totalReason: { type: Type.STRING },
            expectedValue: { type: Type.STRING },
            riskValidation: { type: Type.STRING, description: "Safety Approval Message from AI Stress Test" },
            matches: {
              type: Type.ARRAY,
              items: matchSchema,
              description: "Must contain full match objects, not just references."
            },
          },
          required: ["rank", "matches", "totalReason"],
        },
      },
    },
  };

  const tools = useAutoSearch ? [{ googleSearch: {} }] : undefined;

  try {
    if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, 
        tools: tools 
      },
    });

    if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어있습니다.");
    
    const result = JSON.parse(text) as BatchAnalysisResult;

    // [NEW] Capture Grounding Metadata
    if (response.candidates?.[0]?.groundingMetadata) {
        result.groundingMetadata = response.candidates[0].groundingMetadata;
    }

    // [MERGE] API에서 가져온 실제 배당률(Odds) 데이터를 결과에 병합
    const mergeMatchData = (match: any) => {
        const aiHome = match?.homeTeam ? String(match.homeTeam) : "";
        const aiAway = match?.awayTeam ? String(match.awayTeam) : "";

        if (!aiHome || !aiAway) {
            return match; 
        }

        let original = cartItems.find(item => {
            const itemHome = item.homeTeam || "";
            const itemAway = item.awayTeam || "";
            return itemHome.replace(/\s/g, '').toLowerCase() === aiHome.replace(/\s/g, '').toLowerCase() &&
                   itemAway.replace(/\s/g, '').toLowerCase() === aiAway.replace(/\s/g, '').toLowerCase();
        });

        if (!original) {
             original = cartItems.find(item => {
                const itemHome = item.homeTeam || "";
                return (itemHome && aiHome && (itemHome.includes(aiHome) || aiHome.includes(itemHome)));
             });
        }

        const enriched = enrichedMatches.find(e => 
            e.item.homeTeam === aiHome || 
            (e.item.homeTeam && e.item.homeTeam.replace(/\s/g, '').toLowerCase() === aiHome.replace(/\s/g, '').toLowerCase())
        );

        let oddsData = undefined;
        if (enriched?.data?.matchDetails?.odds) {
             const rawOdds = enriched.data.matchDetails.odds;
             if (Array.isArray(rawOdds)) {
                 const homeOdd = rawOdds.find((o: any) => o.value === "Home")?.odd;
                 const drawOdd = rawOdds.find((o: any) => o.value === "Draw")?.odd;
                 const awayOdd = rawOdds.find((o: any) => o.value === "Away")?.odd;
                 if (homeOdd && awayOdd) {
                     oddsData = { home: homeOdd, draw: drawOdd || '-', away: awayOdd };
                 }
             }
        }

        let effectiveGameType: GameType = targetGameType;

        if (analysisMode === 'all') {
             effectiveGameType = (original?.gameType && original.gameType !== 'General') ? original.gameType : 'General';
        } else if (targetGameType === 'Mixed') {
             if (match.gameType && match.gameType !== 'Mixed') {
                 effectiveGameType = match.gameType as GameType;
             } else {
                 effectiveGameType = 'General';
             }
        }

        return { 
            ...match, 
            homeTeamKo: original?.homeTeamKo || match.homeTeam, 
            awayTeamKo: original?.awayTeamKo || match.awayTeam,
            odds: oddsData,
            sport: match.sport || original?.sport || 'general',
            gameType: effectiveGameType, 
            criteria: match.criteria || original?.criteria 
        };
    };

    if (result.matches) {
        result.matches = result.matches.map(mergeMatchData);
    } else {
        result.matches = [];
    }
    
    if (result.recommendedCombinations && Array.isArray(result.recommendedCombinations)) {
        result.recommendedCombinations = result.recommendedCombinations.map(combo => ({
            ...combo,
            matches: combo.matches.map(mergeMatchData)
        }));
    } else {
        result.recommendedCombinations = [];
    }
    
    return result;

  } catch (error: any) {
    if (signal?.aborted || error.message?.includes('중지')) throw new Error("사용자에 의해 분석이 중지되었습니다.");
    throw new Error("조합 분석 중 오류 발생: " + error.message);
  }
};
