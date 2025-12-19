
import { SportType } from "../types";

const API_KEY = 'cfe7a64a3a829e43ece1bc2746b48a8d';

// 종목별 API 설정
const SPORT_CONFIG: Record<SportType, { host: string; matchEndpoint: string }> = {
  football: { host: 'v3.football.api-sports.io', matchEndpoint: 'fixtures' },
  basketball: { host: 'v1.basketball.api-sports.io', matchEndpoint: 'games' },
  baseball: { host: 'v1.baseball.api-sports.io', matchEndpoint: 'games' },
  volleyball: { host: 'v1.volleyball.api-sports.io', matchEndpoint: 'games' },
  hockey: { host: 'v1.hockey.api-sports.io', matchEndpoint: 'games' },
};

async function fetchFromApi(sport: SportType, endpoint: string, params: Record<string, string>) {
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
      if (response.status === 403) {
        // 403 오류는 무시하고 null 반환 (권한 없음)
        console.warn(`[${sport}] API 권한 제한: ${endpoint}`);
        return null;
      }
      throw new Error(`API 오류: ${response.statusText}`);
    }
    const json = await response.json();
    return json.response;
  } catch (error) {
    console.warn(`[${sport}] ${endpoint} 데이터 수집 실패 (Non-blocking):`, error);
    return null;
  }
}

export async function getTeamId(sport: SportType, teamName: string): Promise<number | null> {
  const data = await fetchFromApi(sport, '/teams', { search: teamName });
  if (data && data.length > 0) {
    return data[0].team?.id || data[0].id;
  }
  return null;
}

// 최근 경기(폼) 가져오기
export async function getTeamForm(sport: SportType, teamId: number) {
  const config = SPORT_CONFIG[sport];
  return await fetchFromApi(sport, `/${config.matchEndpoint}`, { 
    team: teamId.toString(), 
    last: '15', // 데이터 최적화를 위해 30 -> 15경기로 조정 (AI 토큰 효율성)
    status: 'FT' 
  });
}

// 상대 전적 가져오기
export async function getHeadToHead(sport: SportType, teamIdA: number, teamIdB: number) {
  const config = SPORT_CONFIG[sport];
  return await fetchFromApi(sport, `/${config.matchEndpoint}/headtohead`, { 
    h2h: `${teamIdA}-${teamIdB}`,
    last: '10' // 20 -> 10으로 조정
  });
}

// 리그 순위 정보 가져오기
export async function getStandings(sport: SportType, leagueId: number, season: string) {
  return await fetchFromApi(sport, '/standings', {
    league: leagueId.toString(),
    season: season
  });
}

// 팀의 해당 시즌 선수 스탯 가져오기
export async function getTeamPlayers(sport: SportType, teamId: number, season: string) {
  return await fetchFromApi(sport, '/players', {
    team: teamId.toString(),
    season: season
  });
}

// 다음 경기의 라인업 가져오기
export async function getFixtureLineups(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
     return await fetchFromApi(sport, '/fixtures/lineups', { fixture: fixtureId.toString() });
  }
  return null;
}

// [NEW] 경기 배당률 가져오기 (시장 심리 파악용)
export async function getOdds(sport: SportType, fixtureId: number) {
  // 축구만 우선 적용 (API 호출량 관리)
  if (sport === 'football') {
    const data = await fetchFromApi(sport, '/odds', { fixture: fixtureId.toString() });
    // 책방(Bookmaker) 중 첫 번째 데이터만 간략히 가져옴
    return data?.[0]?.bookmakers?.[0]?.bets?.[0]?.values || null; 
  }
  return null;
}

// [NEW] 부상자 명단 가져오기
export async function getInjuries(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
    return await fetchFromApi(sport, '/injuries', { fixture: fixtureId.toString() });
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

  // 2. 최근 경기력(폼) 및 상대 전적 조회
  const [homeForm, awayForm, h2h] = await Promise.all([
    getTeamForm(sport, homeId),
    getTeamForm(sport, awayId),
    getHeadToHead(sport, homeId, awayId)
  ]);

  // 3. 다음 예정된 경기 조회 (라인업, 배당률, 부상자 확보용)
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
          round: match.league?.round
        };

        if (fixtureId) {
            // 병렬로 상세 데이터 수집
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

  // 4. 리그 순위 및 선수 데이터 조회
  let standings = null;
  let homePlayers = null;
  let awayPlayers = null;

  try {
    if (homeForm && homeForm.length > 0) {
      const lastMatch = homeForm[0];
      const leagueId = lastMatch.league?.id;
      const season = lastMatch.league?.season?.toString();
      
      if (season) {
        const [standingsData, hPlayers, aPlayers] = await Promise.all([
          leagueId ? getStandings(sport, leagueId, season) : Promise.resolve(null),
          getTeamPlayers(sport, homeId, season),
          getTeamPlayers(sport, awayId, season)
        ]);

        if (standingsData && standingsData.length > 0) {
           standings = standingsData[0]?.league?.standings || standingsData;
        }

        // 선수 데이터가 너무 많으면 상위 10명만 필터링하거나 간소화 필요 (여기선 그대로 전달하되 Gemini Prompt에서 처리)
        homePlayers = hPlayers;
        awayPlayers = aPlayers;
      }
    }
  } catch (e) {
    console.warn("추가 정보(순위/선수) 조회 실패:", e);
  }

  return {
    sport,
    meta: nextMatchInfo,
    homeTeam: { name: homeName, id: homeId, recentMatches: homeForm },
    awayTeam: { name: awayName, id: awayId, recentMatches: awayForm },
    headToHead: h2h,
    standings: standings,
    matchDetails: {
      lineups,
      odds,     // 배당률 추가
      injuries  // 부상자 추가
    },
    players: {
      home: homePlayers,
      away: awayPlayers
    }
  };
}
