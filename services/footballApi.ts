const API_KEY = 'cfe7a64a3a829e43ece1bc2746b48a8d';
const BASE_URL = 'https://v3.football.api-sports.io';

const headers = {
  'x-rapidapi-host': 'v3.football.api-sports.io',
  'x-rapidapi-key': API_KEY
};

async function fetchFromApi(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`API 오류: ${response.statusText}`);
    }
    const json = await response.json();
    return json.response;
  } catch (error) {
    console.error(`${endpoint} 가져오기 실패:`, error);
    return null;
  }
}

export async function getTeamId(teamName: string): Promise<number | null> {
  const data = await fetchFromApi('/teams', { search: teamName });
  if (data && data.length > 0) {
    return data[0].team.id;
  }
  return null;
}

// 최근 30경기(거의 한 시즌 분량)를 가져옵니다.
export async function getTeamForm(teamId: number) {
  return await fetchFromApi('/fixtures', { 
    team: teamId.toString(), 
    last: '30', 
    status: 'FT'
  });
}

// 상대 전적 최근 20경기를 가져옵니다.
export async function getHeadToHead(teamIdA: number, teamIdB: number) {
  return await fetchFromApi('/fixtures/headtohead', { 
    h2h: `${teamIdA}-${teamIdB}`,
    last: '20'
  });
}

// 리그 순위 정보를 가져옵니다.
export async function getStandings(leagueId: number, season: number) {
  return await fetchFromApi('/standings', {
    league: leagueId.toString(),
    season: season.toString()
  });
}

// 팀의 해당 시즌 선수 스탯을 가져옵니다. (1페이지만 가져와도 주요 선수는 포함됨)
export async function getTeamPlayers(teamId: number, season: number) {
  return await fetchFromApi('/players', {
    team: teamId.toString(),
    season: season.toString()
  });
}

export async function getMatchContextData(homeName: string, awayName: string) {
  // 1. 팀 ID 조회
  const [homeId, awayId] = await Promise.all([
    getTeamId(homeName),
    getTeamId(awayName)
  ]);

  if (!homeId || !awayId) {
    throw new Error(`팀 정보를 찾을 수 없습니다. 영어 팀 이름을 확인해주세요. (홈 ID: ${homeId}, 원정 ID: ${awayId})`);
  }

  // 2. 최근 경기력(폼) 및 상대 전적 조회 (병렬 처리)
  const [homeForm, awayForm, h2h] = await Promise.all([
    getTeamForm(homeId),
    getTeamForm(awayId),
    getHeadToHead(homeId, awayId)
  ]);

  // 3. 리그 순위 및 선수 데이터 조회 (홈팀의 가장 최근 경기를 기준으로 시즌 파악)
  let standings = null;
  let homePlayers = null;
  let awayPlayers = null;

  try {
    if (homeForm && homeForm.length > 0) {
      const lastMatch = homeForm[0];
      const leagueId = lastMatch.league?.id;
      const season = lastMatch.league?.season;
      
      if (season) {
        // 순위표와 양 팀 선수 데이터를 병렬로 요청
        const [standingsData, hPlayers, aPlayers] = await Promise.all([
          leagueId ? getStandings(leagueId, season) : Promise.resolve(null),
          getTeamPlayers(homeId, season),
          getTeamPlayers(awayId, season)
        ]);

        // 순위표 필터링
        if (standingsData && standingsData.length > 0) {
           standings = standingsData[0].league.standings; 
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
    homeTeam: { name: homeName, id: homeId, recentMatches: homeForm, players: homePlayers },
    awayTeam: { name: awayName, id: awayId, recentMatches: awayForm, players: awayPlayers },
    headToHead: h2h,
    standings: standings
  };
}