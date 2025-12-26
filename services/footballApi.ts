
import { SportType } from "../types";

// [SECURITY] API Key 설정 (환경변수 우선, 없으면 하드코딩된 키 사용)
const API_KEY = process.env.REACT_APP_SPORTS_API_KEY || 'cfe7a64a3a829e43ece1bc2746b48a8d';

// 종목별 API 설정
const SPORT_CONFIG: Record<SportType, { host: string; matchEndpoint: string }> = {
  football: { host: 'v3.football.api-sports.io', matchEndpoint: 'fixtures' },
  basketball: { host: 'v1.basketball.api-sports.io', matchEndpoint: 'games' },
  baseball: { host: 'v1.baseball.api-sports.io', matchEndpoint: 'games' },
  volleyball: { host: 'v1.volleyball.api-sports.io', matchEndpoint: 'games' },
  hockey: { host: 'v1.hockey.api-sports.io', matchEndpoint: 'games' },
};

// [RATE LIMITING] 10 requests per minute = 1 request every 6 seconds.
// We add a buffer (6.5s) to be safe.
const MIN_REQUEST_INTERVAL = 6500; 
let lastRequestTime = 0;

async function fetchFromApi(sport: SportType, endpoint: string, params: Record<string, string>) {
  // [FALLBACK] API Key가 없으면 조용히 null 반환 (Gemini 전용 모드)
  if (!API_KEY) {
    return null;
  }

  // [THROTTLE] Enforce minimum interval between calls
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLast;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();

  const config = SPORT_CONFIG[sport];
  const url = new URL(`https://${config.host}${endpoint}`);
  
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const headers = {
    'x-rapidapi-host': config.host,
    'x-rapidapi-key': API_KEY
  };

  try {
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      if (response.status === 403) throw new Error(`API 권한 제한 (403): ${endpoint}`);
      if (response.status === 429) throw new Error(`API 요청 한도 초과 (429)`);
      throw new Error(`API 오류: ${response.statusText}`);
    }

    const json = await response.json();
    
    // [ERROR HANDLING] API-Sports Free Plan Restrictions
    if (json.errors) {
        // Handle array or object style errors
        const errors = Array.isArray(json.errors) ? json.errors : Object.values(json.errors);
        if (errors.length > 0) {
             const errorMsg = JSON.stringify(errors);
             // If plan restricted, return null gracefully instead of throwing
             if (errorMsg.includes("Free plans do not have access")) {
                 console.warn(`[API-Limit] Plan restriction on ${endpoint}:`, errorMsg);
                 return null; 
             }
             if (errorMsg.includes("rate limit")) {
                 throw new Error("Rate limit exceeded (API Internal)");
             }
             console.warn(`API-Sports 내부 경고: ${errorMsg}`);
        }
    }

    return json.response;
  } catch (error: any) {
    // If it's a rate limit error, propagate it. Otherwise log and return null to keep app running.
    if (error.message.includes('429') || error.message.includes('Rate limit')) {
        throw error;
    }
    console.warn(`[${sport}] 데이터 수집 부분 실패 (${endpoint}): ${error.message}`);
    return null;
  }
}

export async function getTeamId(sport: SportType, teamName: string): Promise<number | null> {
  try {
    const data = await fetchFromApi(sport, '/teams', { search: teamName });
    if (data && data.length > 0) {
      return data[0].team?.id || data[0].id;
    }
    return null;
  } catch (e: any) {
    if (e.message.includes('429')) throw e;
    return null;
  }
}

export async function getTeamForm(sport: SportType, teamId: number) {
  const config = SPORT_CONFIG[sport];
  // Free plan might block 'last=5'. If so, fetchFromApi returns null.
  return await fetchFromApi(sport, `/${config.matchEndpoint}`, { 
    team: teamId.toString(), 
    last: '5', 
    status: 'FT' 
  });
}

export async function getHeadToHead(sport: SportType, teamIdA: number, teamIdB: number) {
  const config = SPORT_CONFIG[sport];
  return await fetchFromApi(sport, `/${config.matchEndpoint}/headtohead`, { 
    h2h: `${teamIdA}-${teamIdB}`,
    last: '5' 
  });
}

export async function getStandings(sport: SportType, leagueId: number, season: string) {
  return await fetchFromApi(sport, '/standings', {
    league: leagueId.toString(),
    season: season
  });
}

export async function getFixtureLineups(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
       return await fetchFromApi(sport, '/fixtures/lineups', { fixture: fixtureId.toString() });
  }
  return null;
}

export async function getFixtureStatistics(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
      return await fetchFromApi(sport, '/fixtures/statistics', { fixture: fixtureId.toString() });
  }
  return null;
}

export async function getOdds(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
    const data = await fetchFromApi(sport, '/odds', { fixture: fixtureId.toString() });
    if (data && data.length > 0) {
      const bookmakers = data[0].bookmakers;
      if (bookmakers && bookmakers.length > 0) {
          const matchWinnerBet = bookmakers[0].bets.find((bet: any) => bet.id === 1);
          return matchWinnerBet ? matchWinnerBet.values : bookmakers[0].bets[0].values;
      }
    }
    return null;
  }
  return null;
}

export async function getInjuries(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
    return await fetchFromApi(sport, '/injuries', { fixture: fixtureId.toString() });
  }
  return null;
}

export async function getMatchContextData(sport: SportType, homeName: string, awayName: string) {
  if (!API_KEY) return null;

  const config = SPORT_CONFIG[sport];

  // 1. Team ID Lookup
  const [homeId, awayId] = await Promise.all([
    getTeamId(sport, homeName),
    getTeamId(sport, awayName)
  ]);

  if (!homeId || !awayId) {
    throw new Error(`${homeName} 또는 ${awayName} 정보를 찾을 수 없습니다. (Rate Limit or Naming issue)`);
  }

  // 2. Form & H2H
  // Sequential execution to respect rate limiter more reliably than Promise.all with throttle
  const homeForm = await getTeamForm(sport, homeId);
  const awayForm = await getTeamForm(sport, awayId);
  const h2h = await getHeadToHead(sport, homeId, awayId);

  // 3. Advanced Stats (xG) - Only try if we have form data (implies we are not fully blocked)
  let homeLastMatchStats = null;
  let awayLastMatchStats = null;

  if (sport === 'football') {
     if (homeForm && homeForm.length > 0) {
         homeLastMatchStats = await getFixtureStatistics(sport, homeForm[0].fixture.id);
     }
     if (awayForm && awayForm.length > 0) {
         awayLastMatchStats = await getFixtureStatistics(sport, awayForm[0].fixture.id);
     }
  }

  // 4. Next Match Details
  let lineups = null;
  let odds = null;
  let injuries = null;
  let nextMatchInfo = null;
  let standings = null;

  const nextMatch = await fetchFromApi(sport, `/${config.matchEndpoint}`, {
        h2h: `${homeId}-${awayId}`,
        next: '1'
  });

  if (nextMatch && nextMatch.length > 0) {
    const match = nextMatch[0];
    const fixtureId = match.fixture?.id || match.id;
    nextMatchInfo = {
      date: match.fixture?.date || match.date,
      league: match.league?.name,
      round: match.league?.round,
      venue: match.fixture?.venue?.name
    };

    if (fixtureId) {
        // Fetch details sequentially to avoid burst
        lineups = await getFixtureLineups(sport, fixtureId);
        odds = await getOdds(sport, fixtureId);
        injuries = await getInjuries(sport, fixtureId);
    }
    
    // 5. Standings
    if (match.league?.id && match.league?.season) {
        const standingsData = await getStandings(sport, match.league.id, match.league.season.toString());
        if (standingsData && standingsData.length > 0) {
            standings = standingsData[0]?.league?.standings || standingsData;
        }
    }
  }

  return {
    sport,
    meta: nextMatchInfo,
    homeTeam: { name: homeName, id: homeId, recentMatches: homeForm, lastMatchStats: homeLastMatchStats },
    awayTeam: { name: awayName, id: awayId, recentMatches: awayForm, lastMatchStats: awayLastMatchStats },
    headToHead: h2h,
    standings: standings,
    matchDetails: {
      lineups,
      odds, 
      injuries
    }
  };
}
