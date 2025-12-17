
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
      // 403이나 401 에러는 해당 종목 구독이 없을 수 있음
      if (response.status === 403) {
        throw new Error(`해당 종목(${sport})에 대한 API 접근 권한이 없습니다.`);
      }
      throw new Error(`API 오류: ${response.statusText}`);
    }
    const json = await response.json();
    return json.response;
  } catch (error) {
    console.error(`[${sport}] ${endpoint} 가져오기 실패:`, error);
    return null;
  }
}

export async function getTeamId(sport: SportType, teamName: string): Promise<number | null> {
  const data = await fetchFromApi(sport, '/teams', { search: teamName });
  if (data && data.length > 0) {
    // 종목마다 ID 필드 구조가 다를 수 있지만 API-Sports는 보통 response[0].team.id 또는 response[0].id 형태임
    return data[0].team?.id || data[0].id;
  }
  return null;
}

// 최근 경기(폼) 가져오기
export async function getTeamForm(sport: SportType, teamId: number) {
  const config = SPORT_CONFIG[sport];
  return await fetchFromApi(sport, `/${config.matchEndpoint}`, { 
    team: teamId.toString(), 
    last: '30', // 최근 30경기
    status: 'FT' // 종료된 경기만
  });
}

// 상대 전적 가져오기
export async function getHeadToHead(sport: SportType, teamIdA: number, teamIdB: number) {
  const config = SPORT_CONFIG[sport];
  return await fetchFromApi(sport, `/${config.matchEndpoint}/headtohead`, { 
    h2h: `${teamIdA}-${teamIdB}`,
    last: '20'
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
     // 축구만 별도 엔드포인트가 명확함
     return await fetchFromApi(sport, '/fixtures/lineups', { fixture: fixtureId.toString() });
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
    throw new Error(`팀 정보를 찾을 수 없습니다. (${sport}) 영어 팀 이름을 확인해주세요. (홈 ID: ${homeId}, 원정 ID: ${awayId})`);
  }

  // 2. 최근 경기력(폼) 및 상대 전적 조회
  const [homeForm, awayForm, h2h] = await Promise.all([
    getTeamForm(sport, homeId),
    getTeamForm(sport, awayId),
    getHeadToHead(sport, homeId, awayId)
  ]);

  // 3. 다음 예정된 경기 조회 (라인업 확보용)
  let lineups = null;
  try {
    const nextMatch = await fetchFromApi(sport, `/${config.matchEndpoint}`, {
        h2h: `${homeId}-${awayId}`,
        next: '1'
    });
    
    if (nextMatch && nextMatch.length > 0) {
        const fixtureId = nextMatch[0].fixture?.id || nextMatch[0].id;
        if (fixtureId) {
            lineups = await getFixtureLineups(sport, fixtureId);
        }
    }
  } catch (e) {
      console.warn("다음 경기/라인업 조회 실패:", e);
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

        homePlayers = hPlayers;
        awayPlayers = aPlayers;
      }
    }
  } catch (e) {
    console.warn("추가 정보(순위/선수) 조회 실패:", e);
  }

  return {
    sport,
    homeTeam: { name: homeName, id: homeId, recentMatches: homeForm, players: homePlayers },
    awayTeam: { name: awayName, id: awayId, recentMatches: awayForm, players: awayPlayers },
    headToHead: h2h,
    standings: standings,
    lineups: lineups
  };
}
