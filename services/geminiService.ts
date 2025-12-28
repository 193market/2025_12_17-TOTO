import { GoogleGenAI } from "@google/genai";
import { MatchData, CartItem, BatchAnalysisResult, GameType } from "../types";
import { getMatchContextData } from "./footballApi";

// [SYSTEM INSTRUCTION UPDATED] 
// 2025-12-27 버전: 과도한 역배당/이변 강요(Contrarian) 로직을 제거하고,
// 데이터와 배당 가치(Value)를 중시하는 정석적인 분석 로직으로 복원.
const SYSTEM_INSTRUCTION = `
**Role (역할)**
당신은 **MatchInsight AI**의 수석 분석가입니다. 당신은 혼자 생각하지 않고, 내부적으로 **3명의 전문 에이전트**를 소환하여 토론을 거친 뒤 최종 결론을 내립니다.

**Language Guideline**
모든 분석 결과와 최종 판단은 **반드시 한국어(Korean)**로 작성하십시오.

**The 3 Agents (전문가 패널)**
1.  **🕵️ Agent A (Data Miner):** 감정을 배제하고 오직 **데이터(xG, 점유율, H2H)**만 봅니다. 최근 경기력의 '질(Quality)'에 집중합니다.
2.  **📰 Agent B (News Analyst):** Google Search를 통해 **최신 뉴스, 부상자, 라커룸 이슈, 동기부여** 등 정성적 변수를 체크합니다.
    - **중요:** 검색 결과가 없거나 정보가 부족할 경우, 절대 생략하지 말고 "특이사항 없음" 또는 "검색 정보 부족"이라고 명시하십시오.
3.  **💰 Agent C (Oddsmaker):** **배당률(Odds)**과 **대중 투표율(Public Vote)**을 분석합니다.
    - 투표율 쏠림에 휩쓸리지 않고, **배당률 대비 확률(Expected Value)**이 높은 합리적인 선택을 합니다.
    - 데이터가 뒷받침되지 않는 인기 팀(똥배당)을 경계하되, 무조건적인 역배당을 추구하지는 않습니다.

**Process (사고 과정)**
각 에이전트가 자신의 관점에서 분석한 뒤, 당신(Moderator)이 이를 종합하여 **'적중률 높은 결론'**으로 합의(Synthesis)하십시오.
⚠️ **중요 지침:** 배당률(Odds) 데이터가 없거나 'Unknown'인 경우에도 절대 '분석 불가'나 'Skip' 판정을 내리지 마십시오. 이 경우 Agent A(Data)와 Agent B(News)의 분석 비중을 높여 반드시 승패를 예측하십시오.

**Output Format (Markdown)**
다음 형식을 엄격히 준수하십시오.

---
### 🏟️ [종목] Ensemble 분석: [홈팀] vs [원정팀]
> **경기 정보:** [일시/리그] | **시장 배당:** [홈승 / 무 / 패]

### 🗳️ 전문가 합의 (Ensemble Result)
- **최종 판단:** (3명의 의견을 종합한 결론. 예: "데이터상 홈팀의 우세가 뚜렷하며, 배당 흐름도 이를 지지함.")
- **합의된 승률:** 홈 [XX]% / 무 [XX]% / 원정 [XX]%

### 📊 xG 기반 경기력 분석 (Agent A)
- **Data Insight:** (제공된 xG 데이터나 최근 스탯을 기반으로, 득점 불운이나 거품이 있는지 분석)
- **최근 폼 평가:** (단순 승패가 아닌 경기 내용의 질 평가)

### 📰 변수 & 리스크 체크 (Agent B)
- **News/Issue:** (검색된 부상자, 결장자, 감독 인터뷰 등)
- **Risk Factor:** (승부를 뒤집을 만한 치명적 변수)

### 💰 배당 밸류 & 전략 (Agent C)
- **Odds Analysis:** (배당 흐름 및 투표율 분석)
- **Betting Tip:** (주력 픽과 부주력/보험 픽 제안)

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

async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContentStream(params);
    } catch (error: any) {
      attempt++;
      if (error.status === 429 || error.code === 429 || error.message?.includes('429')) {
        const delay = 2000 * Math.pow(2, attempt - 1);
        console.warn(`Gemini 429 Error (Attempt ${attempt}/${maxRetries}). Waiting ${delay}ms...`);
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
      [임무] 두 개의 분석 리포트를 'Ensemble Prompting' 기법으로 교차 검토하여 최종 결론을 도출하십시오.
      
      [Report A - Context]: ${contextAnalysis}
      [Report B - Data]: ${noContextAnalysis}
      
      Agent A, B, C의 관점을 모두 적용하여 가장 합리적인 결론을 내리세요.
      **주의: 최종 결과는 반드시 한국어로 작성하십시오.**
    `;

    if (matchData.useAutoSearch) {
        synthesisPrompt += `\n\n[System Command] Agent B(News Analyst)는 Google Search를 사용하여 현재 시점의 최신 이슈를 팩트체크하고 반영하십시오.`;
    }

    try {
      const responseStream = await generateWithRetry(ai, {
        model,
        contents: synthesisPrompt,
        config: { 
            systemInstruction: SYSTEM_INSTRUCTION, 
            temperature: 0.1,
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

  let prompt = `[${matchData.sport}] Ensemble 분석 요청: ${matchData.homeTeam} vs ${matchData.awayTeam}.\n사용자 메모: ${matchData.context || "없음"}`;

  if (matchData.trainingData && matchData.trainingData.length > 0) {
    prompt += `\n\n=== 🧠 Reference Style ===\n`;
    matchData.trainingData.slice(0, 3).forEach((data, index) => {
        prompt += `\n[Sample ${index + 1}]\n${data.substring(0, 1000)}...\n`;
    });
  }

  if (sportsData) {
    prompt += `
      \n\n### ⚡ Data Source for Agent A (Data Miner):
      - **Home Team Last Match Stats (xG included if available):** ${JSON.stringify(sportsData.homeTeam.lastMatchStats) || "No advanced stats"}
      - **Away Team Last Match Stats (xG included if available):** ${JSON.stringify(sportsData.awayTeam.lastMatchStats) || "No advanced stats"}
      - **H2H (Last 5):** ${JSON.stringify(sportsData.headToHead) || "API Plan Restricted"}
      - **League Standings:** ${JSON.stringify(sportsData.standings) || "Not Available"}
      - **Home Recent Form:** ${JSON.stringify(sportsData.homeTeam.recentMatches) || "API Plan Restricted"}
      - **Away Recent Form:** ${JSON.stringify(sportsData.awayTeam.recentMatches) || "API Plan Restricted"}

      ### ⚡ Data Source for Agent C (Oddsmaker):
      - **Next Match Info:** ${JSON.stringify(sportsData.meta)}
      - **OFFICIAL BOOKMAKER ODDS:** ${JSON.stringify(sportsData.matchDetails.odds) || "Unknown (Odds data unavailable)"}
      
      ### ⚡ Data Source for Agent B (News):
      - **Official Injuries:** ${JSON.stringify(sportsData.matchDetails.injuries)}
      - **Predicted Lineups:** ${JSON.stringify(sportsData.matchDetails.lineups)}
    `;
  } else {
    prompt += `\n\nWarning: API Data failed (${dataFetchError}). All Agents must rely on Google Search.`;
  }

  if (matchData.useAutoSearch) {
      prompt += `\n\n[System Command] Agent B는 Google Search 도구를 사용하여 '${matchData.homeTeam} vs ${matchData.awayTeam} preview prediction injuries'를 검색하고 최신 정보를 확보하십시오.`;
  }

  try {
    const responseStream = await generateWithRetry(ai, {
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: tools,
        temperature: 0.2, // 분석 정확도를 위해 낮게 유지
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
    if (msg.includes('429')) msg = "현재 요청량이 많아 분석이 지연되고 있습니다 (429). 잠시 후 다시 시도해주세요.";
    throw new Error(msg);
  }
};

/**
 * [BATCH UPDATE] 조합 추천 및 전체 분석 기능 지원
 */
export const recommendCombination = async (
  cartItems: CartItem[], 
  apiKey: string,
  onStatusUpdate: (msg: string) => void,
  folderCount: number = 2,
  recommendationCount: number = 1,
  useAutoSearch: boolean = false,
  signal?: AbortSignal,
  analysisMode: 'combination' | 'all' = 'combination', // [NEW] Mode: 'combination' (subset) or 'all' (full list)
  targetGameType: GameType = 'General' // [NEW] Global Game Type Setting
): Promise<BatchAnalysisResult> => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");
  if (cartItems.length < 2) throw new Error(`최소 2경기 이상이 필요합니다.`);

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview";

  const BATCH_SIZE = 1; // Rate limit protection
  const enrichedMatches: {item: CartItem, data: any}[] = [];
  
  onStatusUpdate(`데이터 수집 시작 (총 ${cartItems.length}경기) - API 안정성을 위해 순차 처리 중...`);

  let completedCount = 0;
  
  for (let i = 0; i < cartItems.length; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
    
    // [MODIFIED] No delay for Paid Plan
    // if (i > 0) await wait(100); 

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
    ? "프로토 승부식 분석 (Proto Match Prediction)" 
    : `${recommendationCount}개의 최적 ${folderCount}폴더 조합 추천`;

  onStatusUpdate(`Gemini가 ${modeText}을(를) 수행 중입니다... (Auto-Search: ${useAutoSearch ? 'ON' : 'OFF'})`);

  const isProtoMode = analysisMode === 'all';
  const isMixedMode = targetGameType === 'Mixed';

  // [PROMPT CONSTRUCTION] - Dynamic Instruction based on Mode
  let typeSpecificInstruction = '';

  if (isMixedMode) {
      typeSpecificInstruction = `
      **[GLOBAL SETTING: MIXED MODE (혼합 추천)]**
      사용자가 '혼합(Mixed)' 유형을 선택했습니다.
      **MISSION:** 각 경기에 대해 General, Handicap, UnOver 중 **가장 적중 확률이 높고 EV(기대값)가 좋은 유형**을 AI가 스스로 선택하여 추천하십시오.
      
      🚨 **[CRITICAL OUTPUT RULE for Mixed Mode]** 🚨
      The 'gameType' field in your JSON output MUST be the specific type you chose (e.g., "General", "Handicap", "UnOver").
      **DO NOT return "Mixed" as the gameType.**
      
      - If you choose **Handicap**:
        1. Set 'gameType': "Handicap"
        2. Set 'criteria': The specific handicap line (e.g. -1.0, +2.5) you are betting on.
      
      - If you choose **UnOver** (Under/Over):
        1. Set 'gameType': "UnOver"
        2. Set 'criteria': The total goals line (e.g. 2.5, 3.5).
        
      - If you choose **General**:
        1. Set 'gameType': "General"
      `;
  } else if (isProtoMode) {
      typeSpecificInstruction = `
      **[GLOBAL SETTING: PROTO MATCH PREDICTION (INDIVIDUAL TYPES)]**
      이 모드에서는 **각 경기마다 지정된 [TARGET TYPE]과 [FIXED CRITERIA]가 서로 다릅니다.**
      
      🚨 **[CRITICAL INSTRUCTION - STRICT MATCHING]** 🚨
      1. 아래 "분석 대상 경기 목록"의 각 GAME 항목에 명시된 **[TARGET TYPE]**을 반드시 확인하십시오.
      2. **[FIXED CRITERIA]**가 있다면, **절대적으로 그 기준점**을 사용하여 판정하십시오. (AI 임의 변경 금지)
      
      - **Target 'Handicap'**: 반드시 제시된 핸디캡 기준점(예: -1.0, +2.5)을 적용하여 '핸디승', '핸디무', '핸디패' 중 하나를 예측하십시오.
      - **Target 'UnOver'**: 반드시 제시된 기준점(예: 2.5, 3.5)을 적용하여 '언더' 또는 '오버'를 예측하십시오.
      `;
  } else {
      // Manual Combination Mode with Single Target Type (Existing Logic)
      typeSpecificInstruction = `
      **[GLOBAL SETTING: TARGET GAME TYPE = '${targetGameType}']**
      
      🚨 **[CRITICAL INSTRUCTION - STRICT TYPE ENFORCEMENT]** 🚨
      
      You MUST strictly adhere to the [TARGET TYPE] for each game.
      The user has manually selected a game type, and you must NOT deviate.

      -----------------------------------------------------------------------------------
      👉 IF [TARGET TYPE] IS "Handicap":
         1. **Meaning:** Apply the [FIXED CRITERIA] (e.g. 2.5) to the Home Team's score.
            - Example: "Home (2.5)" means Home starts with +2.5 goals advantage.
            - **IT IS NOT OVER/UNDER. DO NOT PREDICT TOTAL GOALS.**
         2. **REQUIRED OUTPUT:** You MUST output one of: "핸디승", "핸디무", "핸디패".
         3. **FORBIDDEN:** Do NOT output "오버" or "언더". This is a syntax error.
      -----------------------------------------------------------------------------------
      👉 IF [TARGET TYPE] IS "UnOver" (언더오버):
         1. **Meaning:** Total goals vs [FIXED CRITERIA] (e.g. 2.5).
         2. **REQUIRED OUTPUT:** You MUST output one of: "오버", "언더".
         3. **FORBIDDEN:** Do NOT output "승", "무", "패", "핸디승".
      -----------------------------------------------------------------------------------
      👉 IF [TARGET TYPE] IS "General" (일반):
         1. **REQUIRED OUTPUT:** You MUST output one of: "승", "무", "패".
      -----------------------------------------------------------------------------------
      `;
  }

  let prompt = `
    당신은 최고의 승률을 자랑하는 AI 베팅 알고리즘입니다.
    다음 ${cartItems.length}개 경기를 정밀 분석합니다.

    [분석 모드: ${analysisMode === 'all' ? 'PROTO MATCH PREDICTION (ALL MATCHES)' : 'BEST COMBINATION RECOMMENDER (MANUAL)'}]
    
    ${typeSpecificInstruction}
    
    ${analysisMode === 'combination' 
       ? `**MISSION (수동 조합 모드):**
          1. **[전체 분석 필수]**: 입력된 **${cartItems.length}개 모든 경기**에 대해 분석을 수행합니다.
          2. **[GAME TYPE LOGIC]**: 위 Global Setting을 따르되, 개별 경기 정보에 Fixed Criteria가 있으면 그것을 우선하십시오.
          3. **[조합 추천]**: 분석된 결과 중 가장 적중 확률이 높은 것들을 골라 ${folderCount}폴더 조합을 ${recommendationCount}개(SET) 추천하십시오.
          4. **[3 Agent Analysis & Reasoning - STRICT FORMAT]**: 
             - 'reason' 필드에는 **반드시 3명의 에이전트 의견을 모두 포함**해야 합니다.
             - **⚠️ Agent B (News) 누락 금지:** 만약 Google 검색 결과에 특이사항이 없더라도 생략하지 말고, "📰News: 특이사항 없음 (검색 정보 부족)"이라고 명시하십시오.
             - **필수 형식:** "🕵️Data: [내용] \n📰News: [내용] \n💰Odds: [내용]" (줄바꿈 문자 \\n 반드시 사용)
          5. **[Expected Value - PROBABILITY]**: 'expectedValue' 필드에는 **이 조합이 적중할 확률**을 텍스트로 적으십시오.
             - **형식:** "적중 확률: 88% (매우 높음)" 또는 "예상 적중률: 75% (안전)"
          6. **[Detailed Comment]**: 'totalReason'에는 이 조합을 선택한 이유를 **최소 4~5문장**으로 아주 자세하게 설명해주세요.`
       : `**MISSION (전체 분석 모드):** 제공된 ${cartItems.length}개 **모든 경기**에 대해 예측을 수행하십시오. JSON 출력 시 'gameType'과 'criteria' 필드를 정확히 기재하십시오.`
    }

    **[CRITICAL INSTRUCTION: Balanced Analysis]**
    1. **Data Driven:** 투표율이나 인기도보다 **실제 경기력 데이터(Recent Form, H2H)**를 우선하십시오.
    2. **Logic Check:** 핸디캡이나 언더오버는 반드시 **예상 스코어**와 논리적으로 일치해야 합니다. (예: 예상 스코어 3:0인데 언더 2.5를 추천하면 안 됨)
    3. **Output Language:** 모든 텍스트는 **한국어(Korean)**로 작성하십시오.

    [분석 대상 경기 목록]
    ${enrichedMatches.map((m, idx) => {
        // [Logic] In Proto mode (analysisMode == 'all'), strict individual type. In Manual, follow global or individual if specified.
        const effectiveType = (isProtoMode || m.item.gameType !== 'General') ? (m.item.gameType || 'General') : targetGameType;
        const criteriaInfo = m.item.criteria ? `\n    - **[FIXED CRITERIA]: ${m.item.criteria}** (⚠️ STRICTLY COMPLY with this value)` : '';

        // [New] Explicit Constraint Per Match
        let outputConstraint = "PREDICT: [승, 무, 패]";
        if (effectiveType === 'Handicap') outputConstraint = "PREDICT ONLY: [핸디승, 핸디무, 핸디패] (DO NOT PREDICT UNDER/OVER)";
        if (effectiveType === 'UnOver') outputConstraint = "PREDICT ONLY: [오버, 언더] (DO NOT PREDICT WIN/LOSS)";
        if (effectiveType === 'Sum') outputConstraint = "PREDICT ONLY: [홀, 짝]";
        if (effectiveType === 'Mixed') outputConstraint = "AUTO SELECT BEST TYPE: [General, Handicap, UnOver]";

        return `
    GAME ${idx + 1}: ${m.item.sport} - ${m.item.homeTeam} vs ${m.item.awayTeam}
    - **[TARGET TYPE]: ${effectiveType}**${criteriaInfo}
    - **[CONSTRAINT]: ${outputConstraint}**
    - Public Vote Rates: ${m.item.voteRates || "Unknown"}
    - Official Odds: ${JSON.stringify(m.data?.matchDetails.odds) || "Unknown"}
    - H2H/Form: ${m.data?.homeTeam.recentMatches ? "Available" : "Missing"}
    - Details: ${m.data ? JSON.stringify(m.data.meta) : ""}
    `;}).join('\n')}

    [Output JSON Format Only]
    {
      "matches": [
        {
          "homeTeam": "Team A",
          "awayTeam": "Team B",
          "prediction": "${targetGameType === 'Handicap' ? '핸디승' : targetGameType === 'UnOver' ? '언더' : '승'}", 
          "confidence": 85,
          "reason": "🕵️Data: ... \n📰News: ... \n💰Odds: ...",
          "riskLevel": "LOW",
          "sport": "football",
          "gameType": "${isProtoMode || isMixedMode ? 'MUST match the specific [TARGET TYPE] chosen (General, Handicap, UnOver)' : targetGameType}", 
          "criteria": "${isProtoMode || isMixedMode ? 'MUST match the [FIXED CRITERIA] provided or chosen' : '-1.0'}" 
        }
      ],
      "recommendedCombinations": [
         ${analysisMode === 'combination' ? `{
            "rank": 1,
            "matches": [ 
               {
                  "homeTeam": "Team A",
                  "awayTeam": "Team B",
                  "prediction": "...",
                  "confidence": 92,
                  "reason": "...",
                  "sport": "football",
                  "gameType": "...",
                  "criteria": "..."
               }
            ],
            "totalReason": "...",
            "expectedValue": "적중 확률: 85% (안전)"
         }` : ''}
      ]
    }
  `;

  const tools = useAutoSearch ? [{ googleSearch: {} }] : undefined;

  try {
    if (signal?.aborted) throw new Error("사용자에 의해 분석이 중지되었습니다.");
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
        // [FIX]: Relaxed matching logic to handle AI variations in naming
        // 1. Try exact match with type/criteria
        let original = cartItems.find(item => 
            item.homeTeam.replace(/\s/g, '').toLowerCase() === match.homeTeam.replace(/\s/g, '').toLowerCase() &&
            item.awayTeam.replace(/\s/g, '').toLowerCase() === match.awayTeam.replace(/\s/g, '').toLowerCase()
        );

        // 2. Fallback: Relaxed name match (contains)
        if (!original) {
             original = cartItems.find(item => 
                (item.homeTeam.includes(match.homeTeam) || match.homeTeam.includes(item.homeTeam))
            );
        }

        const enriched = enrichedMatches.find(e => 
            e.item.homeTeam === match.homeTeam || 
            (e.item.homeTeam.replace(/\s/g, '').toLowerCase() === match.homeTeam.replace(/\s/g, '').toLowerCase())
        );

        let oddsData = undefined;
        // API Sports Odds Structure Parsing
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

        // [LOGIC] Determine effective GameType
        // If in Proto mode (analysisMode == 'all'), we prefer specific item type (e.g. 'Handicap') over global 'General'.
        // [UPDATED for Mixed Mode] If 'Mixed' is selected, we MUST trust the AI's resolved 'match.gameType'.
        let effectiveGameType: GameType = targetGameType;

        if (analysisMode === 'all') {
             // In Proto mode, use the item's specific type if not General
             effectiveGameType = (original?.gameType && original.gameType !== 'General') ? original.gameType : 'General';
        } else if (targetGameType === 'Mixed') {
             // In Mixed mode, prioritize AI's decision (match.gameType). 
             // Fallback to General if AI returned something weird or empty.
             if (match.gameType && match.gameType !== 'Mixed') {
                 effectiveGameType = match.gameType as GameType;
             } else {
                 effectiveGameType = 'General';
             }
        }

        return { 
            ...match, 
            homeTeamKo: original?.homeTeamKo, 
            awayTeamKo: original?.awayTeamKo,
            odds: oddsData,
            sport: match.sport || original?.sport || 'general',
            // [STRICT OVERRIDE] 
            gameType: effectiveGameType, 
            // [CRITERIA LOGIC] Prefer AI's criteria (if it picked a specific Handicap/UnOver), fallback to input
            criteria: match.criteria || original?.criteria 
        };
    };

    result.matches = result.matches.map(mergeMatchData);
    
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
