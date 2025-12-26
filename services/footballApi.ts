
import { SportType } from "../types";

// [SECURITY] API Key 보안 강화: 환경 변수만 사용
const API_KEY = process.env.REACT_APP_SPORTS_API_KEY;

// 종목별 API 설정
const SPORT_CONFIG: Record<SportType, { host: string; matchEndpoint: string }> = {
  football: { host: 'v3.football.api-sports.io', matchEndpoint: 'fixtures' },
  basketball: { host: 'v1.basketball.api-sports.io', matchEndpoint: 'games' },
  baseball: { host: 'v1.baseball.api-sports.io', matchEndpoint: 'games' },
  volleyball: { host: 'v1.volleyball.api-sports.io', matchEndpoint: 'games' },
  hockey: { host: 'v1.hockey.api-sports.io', matchEndpoint: 'games' },
};

async function fetchFromApi(sport: SportType, endpoint: string, params: Record<string, string>) {
  if (!API_KEY) {
    throw new Error("REACT_APP_SPORTS_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.");
  }

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
    
    if (json.errors && (Array.isArray(json.errors) ? json.errors.length > 0 : Object.keys(json.errors).length > 0)) {
        const errorMsg = typeof json.errors === 'object' ? JSON.stringify(json.errors) : json.errors;
        // API 오류가 있어도 전체 로직을 죽이지 않고 null 처리를 위해 로그만 남김 (선택적)
        console.warn(`API-Sports 내부 경고: ${errorMsg}`);
    }

    return json.response;
  } catch (error: any) {
    throw new Error(`[${sport}] 데이터 수집 실패: ${error.message}`);
  }
}

export async function getTeamId(sport: SportType, teamName: string): Promise<number | null> {
  try {
    const data = await fetchFromApi(sport, '/teams', { search: teamName });
    if (data && data.length > 0) {
      return data[0].team?.id || data[0].id;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function getTeamForm(sport: SportType, teamId: number) {
  const config = SPORT_CONFIG[sport];
  try {
    return await fetchFromApi(sport, `/${config.matchEndpoint}`, { 
      team: teamId.toString(), 
      last: '5', 
      status: 'FT' 
    });
  } catch (e) {
    return null;
  }
}

export async function getHeadToHead(sport: SportType, teamIdA: number, teamIdB: number) {
  const config = SPORT_CONFIG[sport];
  try {
    return await fetchFromApi(sport, `/${config.matchEndpoint}/headtohead`, { 
      h2h: `${teamIdA}-${teamIdB}`,
      last: '5' 
    });
  } catch (e) {
    return null;
  }
}

export async function getStandings(sport: SportType, leagueId: number, season: string) {
  try {
    return await fetchFromApi(sport, '/standings', {
      league: leagueId.toString(),
      season: season
    });
  } catch (e) {
    return null;
  }
}

export async function getFixtureLineups(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
     try {
       return await fetchFromApi(sport, '/fixtures/lineups', { fixture: fixtureId.toString() });
     } catch(e) { return null; }
  }
  return null;
}

// [NEW] 경기 세부 스탯 (xG 포함) 가져오기
export async function getFixtureStatistics(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
    try {
      // API-Sports /fixtures/statistics 엔드포인트 호출
      const data = await fetchFromApi(sport, '/fixtures/statistics', { fixture: fixtureId.toString() });
      return data; // Array of statistics per team
    } catch(e) { return null; }
  }
  return null;
}

// [LOGIC UPDATE] 배당률(Odds) 가져오기 로직 강화
export async function getOdds(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
    try {
      const data = await fetchFromApi(sport, '/odds', { fixture: fixtureId.toString() });
      if (data && data.length > 0) {
        const bookmakers = data[0].bookmakers;
        if (bookmakers && bookmakers.length > 0) {
            // Match Winner (ID: 1) 찾기
            const matchWinnerBet = bookmakers[0].bets.find((bet: any) => bet.id === 1);
            return matchWinnerBet ? matchWinnerBet.values : bookmakers[0].bets[0].values;
        }
      }
      return null;
    } catch(e) { return null; }
  }
  return null;
}

export async function getInjuries(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
    try {
      return await fetchFromApi(sport, '/injuries', { fixture: fixtureId.toString() });
    } catch(e) { return null; }
  }
  return null;
}

export async function getMatchContextData(sport: SportType, homeName: string, awayName: string) {
  const config = SPORT_CONFIG[sport];

  // 1. 팀 ID 조회
  const [homeId, awayId] = await Promise.all([
    getTeamId(sport, homeName),
    getTeamId(sport, awayName)
  ]);

  if (!homeId || !awayId) {
    throw new Error(`팀 정보를 찾을 수 없습니다. (${sport}) 영어 팀 이름을 확인해주세요.`);
  }

  // 2. 기본 전적 데이터 조회 (최근 5경기)
  const [homeForm, awayForm, h2h] = await Promise.all([
    getTeamForm(sport, homeId),
    getTeamForm(sport, awayId),
    getHeadToHead(sport, homeId, awayId)
  ]);

  // 3. [NEW] 최근 경기의 xG(기대 득점) 데이터 확보
  // 최근 경기(Form의 0번째 인덱스)의 ID를 가져와서 상세 스탯을 조회합니다.
  let homeLastMatchStats = null;
  let awayLastMatchStats = null;

  if (sport === 'football') {
    try {
        if (homeForm && homeForm.length > 0) {
            const lastMatchId = homeForm[0].fixture.id;
            homeLastMatchStats = await getFixtureStatistics(sport, lastMatchId);
        }
        if (awayForm && awayForm.length > 0) {
            const lastMatchId = awayForm[0].fixture.id;
            awayLastMatchStats = await getFixtureStatistics(sport, lastMatchId);
        }
    } catch (e) {
        console.warn("xG 데이터 조회 실패 (API 제한 가능성)", e);
    }
  }

  // 4. 다음 경기 상세 정보 (배당률 포함)
  let lineups = null;
  let odds = null;
  let injuries = null;
  let nextMatchInfo = null;

  try {
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
            const [lineupData, oddsData, injuryData] = await Promise.all([
              getFixtureLineups(sport, fixtureId),
              getOdds(sport, fixtureId),
              getInjuries(sport, fixtureId)
            ]);
            lineups = lineupData;
            odds = oddsData;
            injuries = injuryData;
        }
    }
  } catch (e) {
      console.warn("다음 경기 상세 정보 조회 실패:", e);
  }

  // 5. 리그 순위
  let standings = null;
  try {
    if (homeForm && homeForm.length > 0) {
      const lastMatch = homeForm[0];
      const leagueId = lastMatch.league?.id;
      const season = lastMatch.league?.season?.toString();
      
      if (season && leagueId) {
        const standingsData = await getStandings(sport, leagueId, season);
        if (standingsData && standingsData.length > 0) {
           standings = standingsData[0]?.league?.standings || standingsData;
        }
      }
    }
  } catch (e) {
    console.warn("순위 정보 조회 실패:", e);
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
