
import { GoogleGenAI } from "@google/genai";
import { MatchData, CartItem, BatchAnalysisResult } from "../types";
import { getMatchContextData } from "./footballApi";

// [SYSTEM INSTRUCTION UPDATE] 
// Ensemble Prompting: 3명의 전문가 페르소나를 시뮬레이션하여 합의 도출
const SYSTEM_INSTRUCTION = `
**Role (역할)**
당신은 **MatchInsight AI**의 수석 분석가입니다. 당신은 혼자 생각하지 않고, 내부적으로 **3명의 전문 에이전트**를 소환하여 토론을 거친 뒤 최종 결론을 내립니다.

**The 3 Agents (전문가 패널)**
1.  **🕵️ Agent A (Data Miner):** 감정을 배제하고 오직 **데이터(xG, 점유율, H2H)**만 봅니다. 최근 경기력의 '질(Quality)'에 집중합니다.
2.  **📰 Agent B (News Analyst):** Google Search를 통해 **최신 뉴스, 부상자, 라커룸 이슈, 동기부여** 등 정성적 변수를 체크합니다.
3.  **💰 Agent C (Oddsmaker):** **배당률(Odds)**을 분석합니다. 시장의 기대치(내재 확률)와 실제 승률 간의 괴리(**Value**)를 찾습니다.

**Process (사고 과정)**
각 에이전트가 자신의 관점에서 분석한 뒤, 당신(Moderator)이 이를 종합하여 **'적중률 높은 결론'**으로 합의(Synthesis)하십시오.

**Output Format (Markdown)**
다음 형식을 엄격히 준수하십시오.

---
### 🏟️ [종목] Ensemble 분석: [홈팀] vs [원정팀]
> **경기 정보:** [일시/리그] | **시장 배당:** [홈승 / 무 / 패]

### 🗳️ 전문가 합의 (Ensemble Result)
- **최종 판단:** (3명의 의견을 종합한 결론. 예: "데이터는 홈 우세지만, 배당과 부상 변수를 고려하여 무승부 가능성 높음")
- **합의된 승률:** 홈 [XX]% / 무 [XX]% / 원정 [XX]%

### 📊 xG 기반 경기력 분석 (Agent A)
- **Data Insight:** (제공된 xG 데이터나 최근 스탯을 기반으로, 득점 불운이나 거품이 있는지 분석)
- **최근 폼 평가:** (단순 승패가 아닌 경기 내용의 질 평가)

### 📰 변수 & 리스크 체크 (Agent B)
- **News/Issue:** (검색된 부상자, 결장자, 감독 인터뷰 등)
- **Risk Factor:** (승부를 뒤집을 만한 치명적 변수)

### 💰 배당 밸류 & 전략 (Agent C)
- **Odds Analysis:** (현재 배당이 정배당 메리트가 있는지, 역배당 도전 가치가 있는지 평가)
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
  onStreamChunk?: (text: string) => void
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
      throw new Error("분석 종합 중 오류가 발생했습니다: " + error.message);
    }
  }

  // --- [CASE 2: Single Analysis Mode] ---
  let sportsData = null;
  let dataFetchError = null;
  
  try {
    sportsData = await getMatchContextData(matchData.sport, matchData.homeTeam, matchData.awayTeam);
  } catch (e: any) {
    console.warn("Sports API 가져오기 오류:", e);
    dataFetchError = e.message;
  }

  let prompt = `[${matchData.sport}] Ensemble 분석 요청: ${matchData.homeTeam} vs ${matchData.awayTeam}.\n사용자 메모: ${matchData.context || "없음"}`;

  if (matchData.trainingData && matchData.trainingData.length > 0) {
    prompt += `\n\n=== 🧠 Reference Style ===\n`;
    matchData.trainingData.slice(0, 3).forEach((data, index) => {
        prompt += `\n[Sample ${index + 1}]\n${data.substring(0, 1000)}...\n`;
    });
  }

  if (sportsData) {
    // [PROMPT UPDATE] xG 및 상세 스탯 포함
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
      - **OFFICIAL BOOKMAKER ODDS:** ${JSON.stringify(sportsData.matchDetails.odds) || "Not Available"}
      
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
    let msg = error.message || "분석 실패";
    if (msg.includes('429')) msg = "현재 요청량이 많아 분석이 지연되고 있습니다 (429). 잠시 후 다시 시도해주세요.";
    throw new Error(msg);
  }
};

/**
 * [BATCH UPDATE] 조합 추천 기능 - Ensemble 로직 적용
 */
export const recommendCombination = async (
  cartItems: CartItem[], 
  apiKey: string,
  onStatusUpdate: (msg: string) => void,
  folderCount: number = 2,
  useAutoSearch: boolean = false
): Promise<BatchAnalysisResult> => {
  if (!apiKey) throw new Error("API 키가 필요합니다.");
  if (cartItems.length < folderCount) throw new Error(`최소 ${folderCount}경기 이상이 필요합니다.`);

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview";

  onStatusUpdate(`데이터 수집 중... (0/${cartItems.length}) - 10초당 1건 처리`);

  const enrichedMatches = [];
  for (let i = 0; i < cartItems.length; i++) {
    const item = cartItems[i];
    onStatusUpdate(`데이터 수집 중... [${item.homeTeam} vs ${item.awayTeam}] (${i + 1}/${cartItems.length})`);
    
    let sportsData = null;
    try {
      // The throttle is handled inside getMatchContextData now.
      sportsData = await getMatchContextData(item.sport, item.homeTeam, item.awayTeam);
    } catch (e: any) {
      console.warn(`Data fetch failed for ${item.homeTeam}`, e);
    }
    enrichedMatches.push({ item, data: sportsData });
  }

  onStatusUpdate(`Gemini의 3 Agents(Data, News, Odds)가 전 경기를 심층 분석 중입니다... (Auto-Search: ${useAutoSearch ? 'ON' : 'OFF'})`);

  let prompt = `
    당신은 최고의 승률을 자랑하는 AI 베팅 알고리즘입니다.
    다음 ${cartItems.length}개 경기를 Agent A(Data), B(News), C(Odds)의 관점에서 평가하고, **가장 기대값(EV)이 높은 ${folderCount}폴더 조합**을 추출하십시오.

    [분석 대상 경기]
    ${enrichedMatches.map((m, idx) => `
    GAME ${idx + 1}: ${m.item.sport} - ${m.item.homeTeam} vs ${m.item.awayTeam}
    - Odds: ${JSON.stringify(m.data?.matchDetails.odds) || "Unknown"}
    - Form/H2H: ${m.data?.homeTeam.recentMatches ? "Available" : "Restricted/Missing"}
    - Details: ${m.data ? JSON.stringify(m.data.meta) : ""}
    `).join('\n')}

    [알고리즘 수행 지침]
    1. **Agent A (Data):** xG와 최근 경기력을 바탕으로 '정배당의 신뢰도'를 평가하십시오.
    2. **Agent C (Odds):** 배당률 대비 실제 승리 확률이 높은 'Value Bet'을 식별하십시오.
    3. **Ensemble:** 리스크가 적고 적중 확률이 가장 높은 경기를 우선순위로 선정하십시오.

    [System Command]
    ${useAutoSearch ? "Agent B(News)는 Google Search를 사용하여 부상자/결장자 정보를 확인하고 리스크를 필터링하십시오." : ""}

    [Output JSON Format Only]
    {
      "matches": [
        {
          "homeTeam": "Team A",
          "awayTeam": "Team B",
          "prediction": "홈승 (Ensemble Pick)",
          "confidence": 88,
          "reason": "Agent A: xG 우세, Agent C: 배당 1.70 메리트 있음. 부상자 없음.",
          "riskLevel": "LOW",
          "sport": "football" 
        },
        ...
      ],
      "recommendedCombination": {
        "matches": [ 
          // 위 matches 배열에서 선별된 ${folderCount}개 경기 객체 복사 (필드 누락 없이)
        ],
        "totalReason": "Agent A, B, C가 만장일치로 추천하는 가장 안전하고 기대값이 높은 조합입니다."
      }
    }
  `;

  const tools = useAutoSearch ? [{ googleSearch: {} }] : undefined;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, 
        tools: tools 
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI 응답이 비어있습니다.");
    
    const result = JSON.parse(text) as BatchAnalysisResult;

    // [MERGE UPDATE] 원래의 한글 팀 이름 복구
    const mergeKoreanNames = (match: any) => {
        const original = cartItems.find(item => 
            // 영문 이름 매칭 시도 (Gemini가 반환한 이름과 입력된 영문 이름이 일치한다고 가정)
            item.homeTeam === match.homeTeam && item.awayTeam === match.awayTeam
        );
        if (original) {
            return { 
                ...match, 
                homeTeamKo: original.homeTeamKo, 
                awayTeamKo: original.awayTeamKo 
            };
        }
        return match;
    };

    result.matches = result.matches.map(mergeKoreanNames);
    result.recommendedCombination.matches = result.recommendedCombination.matches.map(mergeKoreanNames);
    
    return result;

  } catch (error: any) {
    throw new Error("조합 분석 중 오류 발생: " + error.message);
  }
};
