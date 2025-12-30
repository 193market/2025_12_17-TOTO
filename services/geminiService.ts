import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MatchData, CartItem, BatchAnalysisResult, GameType } from "../types";
import { getMatchContextData } from "./footballApi";

// [SYSTEM INSTRUCTION UPDATED - DEBATE MODE] 
// 2025-12-27 버전 (Paid Plan): 중립 분석 대신 '대립 토론(Debate)' 시스템 도입
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
    - **역할:** 감정을 배제하고 **시장(Market)**을 분석합니다.
    - **논리:** 현재 배당률이 적정한지(Fair Odds), 투표율이 쏠린 '함정(Trap)'인지 판단합니다.
    - **목표:** 어느 쪽의 주장이 배당률 대비 '돈이 되는 선택(Expected Value)'인지 조언합니다.

**Process (진행 방식)**
1.  **Fact Check:** 제공된 데이터(API)와 검색 결과(News)를 확인합니다.
2.  **Debate:** Red와 Blue가 서로의 데이터를 반박하며 치열하게 싸웁니다. (예: Red "우린 3연승이야!" vs Blue "그거 다 꼴찌팀 상대로 이긴 거잖아!")
3.  **Verdict:** 당신(Moderator)이 양측의 주장을 종합하여 최종 승패를 판결합니다.

**Output Format (Markdown)**
다음 형식을 엄격히 준수하십시오. 모든 텍스트는 **한국어(Korean)**입니다.

---
### 🏟️ [종목] 법정 공방: [홈팀] vs [원정팀]
> **경기 정보:** [일시/리그] | **시장 배당:** [홈승 / 무 / 패]

### ⚖️ 최종 판결 (The Verdict)
- **판결 요약:** (재판관으로서 내린 최종 결론. 예: "원정팀 변호인의 '상성 우위' 주장이 더 설득력 있음.")
- **예상 승률:** 홈 [XX]% / 무 [XX]% / 원정 [XX]%

### 🔴 홈팀 변호인단 (Home Advocate)
- **변론 요지:** (홈팀이 이길 수밖에 없는 이유 강력 주장)
- **공격 포인트:** (원정팀의 치명적 약점 지적)

### 🔵 원정팀 변호인단 (Away Advocate)
- **변론 요지:** (홈팀의 불안요소 폭로 및 원정팀의 승리/무승부 가능성 주장)
- **반박:** (홈팀 주장의 허점 찌르기)

### 💰 중립 배당 분석관 (Market Expert)
- **Odds Check:** (배당 흐름 및 투표율 분석)
- **Smart Pick:** (배당 대비 가치가 높은 쪽 추천)

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

async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 2) { // Retries reduced for Paid Plan
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContentStream(params);
    } catch (error: any) {
      attempt++;
      // [PAID PLAN] 429 에러 대응 완화 (대기 시간 단축)
      if (error.status === 429 || error.code === 429 || error.message?.includes('429')) {
        const delay = 1000; // 1초만 대기
        console.warn(`Gemini 429 Error (Attempt ${attempt}/${maxRetries}). Quick retry...`);
        if (attempt >= maxRetries) throw error;
        await wait(delay);
        continue;
      }
      throw error;
    }
  }
}

export const analyzeMatch = async (
  matchData: MatchData, 
  apiKey: string,
  onStreamChunk?: (text: string) => void,
  signal?: AbortSignal
) => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview"; 

  const tools = matchData.useAutoSearch ? [{ googleSearch: {} }] : undefined;

  // --- [CASE 1: Synthesis Mode] ---
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
    prompt += `\n\n=== 🧠 Reference Style ===\n`;
    matchData.trainingData.slice(0, 3).forEach((data, index) => {
        prompt += `\n[Sample ${index + 1}]\n${data.substring(0, 1000)}... (참고하여 톤앤매너 유지)\n`;
    });
  }

  if (sportsData) {
    prompt += `
      \n\n### ⚡ Evidence for the Court (증거 자료):
      - **Home Team Last Match Stats (xG included if available):** ${JSON.stringify(sportsData.homeTeam.lastMatchStats) || "No advanced stats"}
      - **Away Team Last Match Stats (xG included if available):** ${JSON.stringify(sportsData.awayTeam.lastMatchStats) || "No advanced stats"}
      - **H2H (Last 5):** ${JSON.stringify(sportsData.headToHead) || "No H2H data"}
      - **League Standings:** ${JSON.stringify(sportsData.standings) || "Not Available"}
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
  targetGameType: GameType = 'General'
): Promise<BatchAnalysisResult> => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");
  if (cartItems.length < 2) throw new Error(`최소 2경기 이상이 필요합니다.`);

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview";

  // [PAID PLAN] Batch size reduced to 2 to prevent browser connection saturation
  const BATCH_SIZE = 2; 
  const enrichedMatches: {item: CartItem, data: any}[] = [];
  
  onStatusUpdate(`데이터 수집 시작 (총 ${cartItems.length}경기) - 안정적인 고속 모드...`);

  let completedCount = 0;
  
  for (let i = 0; i < cartItems.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
    
    // Brief pause to reset connection pool
    if (i > 0) await wait(200); 

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
      Constraints: 
      - If 'Handicap' is chosen, set 'gameType': "Handicap" and provide 'criteria'.
      - If 'UnOver' is chosen, set 'gameType': "UnOver" and provide 'criteria'.
      - If 'General' is chosen, set 'gameType': "General".
      `;
  } else if (isProtoMode) {
      typeSpecificInstruction = `
      **[GLOBAL SETTING: PROTO PREDICTION (DEBATE MODE)]**
      Mission: Analyze each match with the 'Debate System'.
      Constraints:
      - Max 10 combinations total (Limit Double Chance "승/무" usage).
      - Prioritize High EV (Expected Value) picks derived from the debate.
      `;
  } else {
      typeSpecificInstruction = `
      **[GLOBAL SETTING: TARGET GAME TYPE = '${targetGameType}']**
      Constraints: Strictly adhere to the ${targetGameType} format.
      - Handicap: Output "핸디승/핸디무/핸디패".
      - UnOver: Output "오버/언더".
      - General: Output "승/무/패".
      `;
  }

  let prompt = `
    당신은 스포츠 법정의 수석 재판관입니다.
    다음 ${cartItems.length}개 경기에 대해 **[Red:홈팀변호인] vs [Blue:원정팀변호인] vs [Green:중립분석관]**의 토론을 주재하고 판결을 내리십시오.

    [분석 모드: ${analysisMode === 'all' ? 'PROTO MATCH PREDICTION (ALL MATCHES)' : 'BEST COMBINATION RECOMMENDER (MANUAL)'}]
    
    ${typeSpecificInstruction}
    
    **MISSION:**
    1. **Debate Summary:** 'reason' 필드에 반드시 3명의 공방 내용을 요약해서 넣으십시오.
       - 형식: "🔴Red(Home): [주장] \n🔵Blue(Away): [주장] \n⚖️Verdict: [판결]"
       - 데이터에 기반하지 않은 주장은 기각하십시오.
    2. **Balanced Verdict:** Red와 Blue 중 논리적으로 더 타당한 쪽의 손을 들어주십시오.
    3. **Korean Output:** 모든 텍스트는 한국어로 작성하십시오.
    4. **MANDATORY:** Output JSON must contain FULL match details (homeTeam, awayTeam, etc.) inside the 'matches' array of each combination. Do NOT use references.

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
      riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
      sport: { type: Type.STRING },
      gameType: { type: Type.STRING },
      criteria: { type: Type.STRING },
      strategyStatus: { type: Type.STRING, enum: ["AXIS", "TRAP", "ERASER", "NONE"] },
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