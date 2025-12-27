
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

// [CACHE] 팀 ID 조회 결과를 메모리에 저장하여 API 호출 수 절약
const TEAM_ID_CACHE: Record<string, number> = {};

// [PREDEFINED IDS] 자주 쓰이는 팀 ID를 미리 정의하여 API 검색(Rate Limit 대상)을 회피
// 키 값은 소문자로 정규화하여 저장
const PREDEFINED_TEAM_IDS: Record<string, number> = {
  // --- EPL ---
  "manchester united": 33, "man utd": 33,
  "newcastle united": 34, "newcastle": 34,
  "bournemouth": 35,
  "fulham": 36,
  "wolverhampton wanderers": 39, "wolves": 39,
  "liverpool": 40,
  "southampton": 41,
  "arsenal": 42,
  "everton": 45,
  "leicester city": 46, "leicester": 46,
  "tottenham hotspur": 47, "tottenham": 47, "spurs": 47,
  "west ham united": 48, "west ham": 48,
  "chelsea": 49,
  "manchester city": 50, "man city": 50,
  "brighton & hove albion": 51, "brighton": 51,
  "crystal palace": 52,
  "brentford": 55,
  "ipswich town": 57, "ipswich": 57,
  "leeds united": 63, "leeds": 63,
  "nottingham forest": 65, "nottingham": 65,
  "aston villa": 66,
  "sheffield united": 62,
  "burnley": 44,
  "luton town": 1359,
  // --- Championship ---
  "sunderland": 746,
  "blackburn rovers": 68,
  "west bromwich albion": 60,
  "watford": 38,
  "norwich city": 71,
  "hull city": 67,
  "coventry city": 1361,
  "middlesbrough": 69,
  "preston north end": 1357,
  "bristol city": 1351,
  "millwall": 1354,
  "cardiff city": 720,
  "swansea city": 74,
  "stoke city": 70,
  "qpr": 73, "queens park rangers": 73,
  "sheffield wednesday": 1360,
  "plymouth argyle": 723,
  "portsmouth": 1363,
  "derby county": 58,
  "oxford united": 1362,
  // --- La Liga ---
  "real madrid": 541,
  "barcelona": 529,
  "atletico madrid": 530,
  "sevilla": 536,
  "real betis": 543,
  "real sociedad": 548,
  "villarreal": 533,
  "athletic club": 531, "athletic bilbao": 531,
  "valencia": 532,
  "girona": 547,
  "celta vigo": 538,
  "mallorca": 798,
  "osasuna": 727,
  "rayo vallecano": 728,
  "alaves": 537,
  "las palmas": 534,
  "getafe": 546,
  "granada": 539,
  "cadiz": 724,
  "almeria": 720,
  "espanyol": 540,
  "valladolid": 720, "real valladolid": 720,
  "leganes": 545,
  // --- Serie A ---
  "inter milan": 505, "inter": 505,
  "ac milan": 489, "milan": 489,
  "juventus": 496,
  "napoli": 492,
  "as roma": 497, "roma": 497,
  "atalanta": 499,
  "lazio": 487,
  "fiorentina": 502,
  "torino": 503,
  "bologna": 500,
  "monza": 1579,
  "genoa": 495,
  "lecce": 867,
  "udinese": 494,
  "hellas verona": 504, "verona": 504,
  "empoli": 511,
  "sassuolo": 488,
  "frosinone": 512,
  "salernitana": 514,
  "cagliari": 490,
  "parma": 506,
  "como": 518,
  "venezia": 519,
  // --- Serie B ---
  "cremonese": 520,
  "pisa": 517,
  "palermo": 515,
  "sampdoria": 498,
  "spezia": 516,
  "bari": 528,
  "brescia": 521,
  "sudtirol": 3317,
  "cittadella": 510,
  "catanzaro": 907,
  "cosenza": 857,
  "modena": 501,
  "reggiana": 894,
  // --- Bundesliga ---
  "bayern munich": 157, "bayern munchen": 157,
  "borussia dortmund": 165, "dortmund": 165,
  "bayer leverkusen": 168, "leverkusen": 168,
  "rb leipzig": 173, "leipzig": 173,
  "vfb stuttgart": 172, "stuttgart": 172,
  "eintracht frankfurt": 169, "frankfurt": 169,
  "hoffenheim": 167,
  "sc freiburg": 160, "freiburg": 160,
  "werder bremen": 162,
  "augsburg": 170,
  "wolfsburg": 161,
  "borussia monchengladbach": 163, "gladbach": 163,
  "union berlin": 182,
  "mainz 05": 164, "mainz": 164,
  "fc koln": 192, "koln": 192,
  "darmstadt 98": 185,
  "vfl bochum": 176, "bochum": 176,
  "heidenheim": 180,
  "st. pauli": 191, "st pauli": 191,
  "holstein kiel": 193,
  // --- Ligue 1 ---
  "paris saint germain": 85, "psg": 85,
  "monaco": 91, "as monaco": 91,
  "marseille": 81,
  "lille": 79,
  "lyon": 80,
  "lens": 116,
  "nice": 84,
  "rennes": 94,
  "reims": 93,
  "toulouse": 96,
  "strasbourg": 95,
  "montpellier": 82,
  "nantes": 83,
  "le havre": 92,
  "metz": 112,
  "lorient": 97,
  "clermont foot": 98,
  "brest": 106,
  "auxerre": 108,
  "angers": 77,
  "saint-etienne": 1063,
  // --- Eredivisie ---
  "psv eindhoven": 197, "psv": 197,
  "feyenoord": 209,
  "ajax": 194,
  "az alkmaar": 200, "az": 200,
  "twente": 213, "fc twente": 213,
  "utrecht": 201,
  "heerenveen": 206,
  // --- A-League (Australia) ---
  "melbourne city": 2957,
  "melbourne victory": 2959,
  "perth glory": 2963,
  "adelaide united": 2955,
  "western sydney wanderers": 2965, "wsw": 2965,
  "central coast mariners": 2954,
  "sydney fc": 2964,
  "brisbane roar": 2956,
  "newcastle jets": 2962,
  "wellington phoenix": 2966,
  "macarthur fc": 5085,
  "western united": 3192,
  "auckland fc": 24823,
  // --- National Teams ---
  "south korea": 17,
  "japan": 12,
  "china": 10,
  "australia": 20,
  "iran": 22,
  "saudi arabia": 23,
  "qatar": 15,
  "jordan": 26,
  "iraq": 19,
  "uzbekistan": 16,
  "senegal": 13,
  "dr congo": 113,
  "egypt": 32,
  "ivory coast": 14,
  "nigeria": 18,
  "cameroon": 37,
  "ghana": 36,
  "morocco": 31,
  "algeria": 24,
  "tunisia": 21,
  "mali": 111,
  "south africa": 38,
  "burkina faso": 112,
  "gabon": 115,
  "mozambique": 116,
  "guinea": 118,
  "gambia": 117,
  "angola": 114,
  "france": 2,
  "germany": 25,
  "england": 10,
  "italy": 768,
  "spain": 9,
  "brazil": 6,
  "argentina": 26,
  "portugal": 27,
  "netherlands": 1114,
  "belgium": 1,
  "croatia": 3,
  "usa": 2384, "united states": 2384
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFromApi(sport: SportType, endpoint: string, params: Record<string, string>, retries = 3): Promise<any> {
  if (!API_KEY) {
    return null;
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
      if (response.status === 429 && retries > 0) {
         const delay = 2000 * Math.pow(2, 3 - retries) + Math.random() * 1000;
         console.warn(`API Rate Limit (429) - Retrying in ${Math.round(delay)}ms... (${retries} left)`);
         await wait(delay);
         return fetchFromApi(sport, endpoint, params, retries - 1);
      }
      if (response.status === 403) throw new Error(`API 권한 제한 (403): ${endpoint}`);
      if (response.status === 429) throw new Error(`API 요청 한도 초과 (429)`);
      throw new Error(`API 오류: ${response.statusText}`);
    }

    const json = await response.json();
    
    if (json.errors && (Array.isArray(json.errors) ? json.errors.length > 0 : Object.keys(json.errors).length > 0)) {
        const errorMsg = typeof json.errors === 'object' ? JSON.stringify(json.errors) : json.errors;
        console.warn(`API-Sports 내부 경고 [${endpoint}]: ${errorMsg}`);
    }

    return json.response;
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes('Failed to fetch') || error.name === 'TypeError')) {
        const delay = 1000 + Math.random() * 1000;
        console.warn(`Network Error (${error.message}) - Retrying in ${Math.round(delay)}ms... (${retries} left)`);
        await wait(delay); 
        return fetchFromApi(sport, endpoint, params, retries - 1);
    }
    throw new Error(`[${sport}] 데이터 수집 실패: ${error.message}`);
  }
}

export async function getTeamId(sport: SportType, teamName: string): Promise<number | null> {
  if (/[^a-zA-Z0-9\s-&.']/.test(teamName)) {
      console.warn(`[API Skip] Team name '${teamName}' contains unsupported characters. Skipping API call.`);
      return null;
  }

  const normalizedKey = teamName.toLowerCase().trim();
  const cacheKey = `${sport}:${normalizedKey}`;

  // 1. [CHECK PREDEFINED LIST] Check hardcoded list first
  if (sport === 'football' && PREDEFINED_TEAM_IDS[normalizedKey]) {
      return PREDEFINED_TEAM_IDS[normalizedKey];
  }

  // 2. [CHECK CACHE] Check memory cache
  if (TEAM_ID_CACHE[cacheKey]) {
      return TEAM_ID_CACHE[cacheKey];
  }

  // 3. [API SEARCH] Fallback to API search
  const searchName = teamName.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  try {
    const data = await fetchFromApi(sport, '/teams', { search: searchName });
    if (data && data.length > 0) {
      const id = data[0].team?.id || data[0].id;
      if (id) TEAM_ID_CACHE[cacheKey] = id;
      return id;
    }
    return null;
  } catch (e: any) {
    console.error(`Error fetching team ID for ${teamName} (search: ${searchName}):`, e);
    return null;
  }
}

export async function getTeamForm(sport: SportType, teamId: number) {
  if (!teamId) return null;
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
  if (!teamIdA || !teamIdB) return null; 
  
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

export async function getFixtureStatistics(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
    try {
      return await fetchFromApi(sport, '/fixtures/statistics', { fixture: fixtureId.toString() });
    } catch(e) { return null; }
  }
  return null;
}

export async function getOdds(sport: SportType, fixtureId: number) {
  if (sport === 'football') {
    try {
      const data = await fetchFromApi(sport, '/odds', { fixture: fixtureId.toString() });
      if (data && data.length > 0) {
        const bookmakers = data[0].bookmakers;
        if (bookmakers && bookmakers.length > 0) {
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
  if (!API_KEY) return null;

  const config = SPORT_CONFIG[sport];

  // 1. Team ID Lookup
  const [homeId, awayId] = await Promise.all([
    getTeamId(sport, homeName),
    getTeamId(sport, awayName)
  ]);

  if (!homeId || !awayId) {
    throw new Error(`${homeName} 또는 ${awayName} 정보를 찾을 수 없습니다. (매핑 실패 또는 API 오류)`);
  }

  // 2. Basic Data (Form & H2H)
  const [homeForm, awayForm, h2h] = await Promise.all([
    getTeamForm(sport, homeId),
    getTeamForm(sport, awayId),
    getHeadToHead(sport, homeId, awayId)
  ]);

  // 3. Advanced Stats (xG)
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
        console.warn("xG 데이터 조회 실패", e);
    }
  }

  // 4. Next Match Details
  let lineups = null;
  let odds = null;
  let injuries = null;
  let nextMatchInfo = null;
  let standings = null;

  try {
    let nextMatchEndpoint = `/${config.matchEndpoint}`;
    if (sport === 'football') {
        nextMatchEndpoint = `/${config.matchEndpoint}/headtohead`;
    }

    const nextMatch = await fetchFromApi(sport, nextMatchEndpoint, {
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

        if (match.league?.id && match.league?.season) {
            const standingsData = await getStandings(sport, match.league.id, match.league.season.toString());
            if (standingsData && standingsData.length > 0) {
                standings = standingsData[0]?.league?.standings || standingsData;
            }
        }
    }
  } catch (e) {
      console.warn("다음 경기 상세 정보 조회 실패:", e);
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
