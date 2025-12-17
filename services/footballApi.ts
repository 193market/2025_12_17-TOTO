
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
    // 대부분 response[0].team.id를 따름
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
    status: 'FT' // 종료된 경기만 (Full Time) - 야구/농구 등에서도 FT가 일반적 코드
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
  // 야구, 농구 등은 /players 엔드포인트 파라미터가 다를 수 있으나, 보통 team, season을 사용함.
  // 에러 발생 시 try-catch로 무시됨.
  return await fetchFromApi(sport, '/players', {
    team: teamId.toString(),
    season: season
  });
}

export async function getMatchContextData(sport: SportType, homeName: string, awayName: string) {
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

  // 3. 리그 순위 및 선수 데이터 조회
  let standings = null;
  let homePlayers = null;
  let awayPlayers = null;

  try {
    if (homeForm && homeForm.length > 0) {
      const lastMatch = homeForm[0];
      // API-Sports 응답 구조는 대부분 league.id, league.season을 포함
      const leagueId = lastMatch.league?.id;
      // season은 종목에 따라 number(2023) 또는 string("2023-2024")일 수 있음. 안전하게 string 변환
      const season = lastMatch.league?.season?.toString();
      
      if (season) {
        // 순위표와 양 팀 선수 데이터를 병렬로 요청
        const [standingsData, hPlayers, aPlayers] = await Promise.all([
          leagueId ? getStandings(sport, leagueId, season) : Promise.resolve(null),
          getTeamPlayers(sport, homeId, season),
          getTeamPlayers(sport, awayId, season)
        ]);

        // 순위표 구조 처리 (종목마다 약간 다를 수 있으나 보통 response[0].league.standings)
        if (standingsData && standingsData.length > 0) {
           // 축구는 response[0].league.standings (2차원 배열)
           // 농구 등은 response[0] 자체가 순위표일 수도 있음. 유연하게 처리 필요하지만 일단 표준 접근 시도
           standings = standingsData[0]?.league?.standings || standingsData;
        }

        homePlayers = hPlayers;
        awayPlayers = aPlayers;
      }
    }
  } catch (e) {
    console.warn("추가 정보(순위/선수) 조회 실패:", e);
    // 실패해도 기본 폼 데이터로 분석 진행
  }

  return {
    sport,
    homeTeam: { name: homeName, id: homeId, recentMatches: homeForm, players: homePlayers },
    awayTeam: { name: awayName, id: awayId, recentMatches: awayForm, players: awayPlayers },
    headToHead: h2h,
    standings: standings
  };
}
