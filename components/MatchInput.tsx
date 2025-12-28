import React, { useState, useRef } from 'react';
import { MatchData, SportType, TrainingSample, CartItem, GameType } from '../types';

interface MatchInputProps {
  onAnalyze: (data: MatchData) => void;
  onLearn: (samples: TrainingSample[]) => void;
  // [UPDATED] Pass targetGameType to recommend function
  onRecommend?: (items: CartItem[], folderCount: number, recommendationCount: number, useAutoSearch: boolean, analysisMode: 'combination' | 'all', targetGameType?: GameType) => void;
  learnedCount: number;
  isLoading: boolean;
  previousAnalysis?: string | null;
}

const TEAM_MAPPINGS: Record<string, string> = {
  // EPL/EFL
  '토트넘': 'Tottenham Hotspur',
  '맨시티': 'Manchester City', '맨체스C': 'Manchester City', '맨체스터시티': 'Manchester City',
  '맨유': 'Manchester United', '맨체스U': 'Manchester United', '맨체스터유나이티드': 'Manchester United',
  '리버풀': 'Liverpool',
  '아스날': 'Arsenal', '아스널': 'Arsenal',
  '첼시': 'Chelsea',
  '울버햄튼': 'Wolverhampton Wanderers', '울버햄프': 'Wolverhampton Wanderers',
  '아스톤빌': 'Aston Villa', '아스톤': 'Aston Villa', 'A빌라': 'Aston Villa',
  '뉴캐슬': 'Newcastle United', '뉴캐슬U': 'Newcastle United',
  '브라이튼': 'Brighton & Hove Albion', '브라이턴': 'Brighton & Hove Albion',
  '웨스트햄': 'West Ham United',
  '에버튼': 'Everton', '에버턴': 'Everton',
  '노팅엄': 'Nottingham Forest', '노팅엄포': 'Nottingham Forest',
  '풀럼': 'Fulham',
  '크리스탈': 'Crystal Palace', '팰리스': 'Crystal Palace', '크리스털': 'Crystal Palace',
  '브렌트퍼': 'Brentford', '브렌트': 'Brentford',
  '본머스': 'Bournemouth', 'AFC본머스': 'Bournemouth',
  '루턴타운': 'Luton Town',
  '셰필드': 'Sheffield United', '셰필드U': 'Sheffield United',
  '번리': 'Burnley',
  '레스터C': 'Leicester City', '레스터': 'Leicester City',
  '리즈': 'Leeds United', '리즈U': 'Leeds United',
  '사우스햄': 'Southampton', '사우스햄튼': 'Southampton', '사우샘프': 'Southampton',
  '입스위치': 'Ipswich Town',
  '노리치C': 'Norwich City', '노리치': 'Norwich City',
  '웨스트브': 'West Bromwich Albion', 'WBA': 'West Bromwich Albion', '웨스브로': 'West Bromwich Albion',
  '헐시티': 'Hull City',
  '코번트리': 'Coventry City',
  '미들즈브': 'Middlesbrough',
  '프레스턴': 'Preston North End',
  '선덜랜드': 'Sunderland',
  '왓포드': 'Watford',
  '브리스톨': 'Bristol City', '브리스C': 'Bristol City',
  '밀월': 'Millwall',
  '카디프': 'Cardiff City',
  '스완지': 'Swansea City', '스완지C': 'Swansea City',
  '블랙번': 'Blackburn Rovers',
  '스토크': 'Stoke City',
  'QPR': 'QPR', '퀸즈파크': 'QPR',
  '버밍엄C': 'Birmingham City', '버밍엄': 'Birmingham City',
  '플리머스': 'Plymouth Argyle',
  '셰필드웬': 'Sheffield Wednesday', '셰필드W': 'Sheffield Wednesday',
  '로더럼': 'Rotherham United',
  '허더즈필': 'Huddersfield Town',
  '옥스퍼드': 'Oxford United', '옥스포드': 'Oxford United',
  '포츠머스': 'Portsmouth',
  '더비': 'Derby County', '더비카운': 'Derby County',
  '볼턴': 'Bolton Wanderers',
  '반즐리': 'Barnsley',
  '피터버러': 'Peterborough United',
  '블랙풀': 'Blackpool',
  '찰턴': 'Charlton Athletic',
  '위건': 'Wigan Athletic',
  '레딩': 'Reading',

  // La Liga
  '레알마드': 'Real Madrid', '레알': 'Real Madrid',
  '바르셀로': 'Barcelona', '바르사': 'Barcelona',
  '아틀레티': 'Atletico Madrid', 'AT마드리드': 'Atletico Madrid',
  '세비야': 'Sevilla',
  '발렌시아': 'Valencia',
  '지로나': 'Girona',
  '빌바오': 'Athletic Club', '아틀레틱': 'Athletic Club',
  '소시에다': 'Real Sociedad', 'R소시에': 'Real Sociedad',
  '베티스': 'Real Betis',
  '비야레알': 'Villarreal',
  '셀타비고': 'Celta Vigo',
  '오사수나': 'Osasuna',
  '헤타페': 'Getafe',
  '마요르카': 'Mallorca',
  '라요': 'Rayo Vallecano',
  '알라베스': 'Alaves',
  '라스팔마': 'Las Palmas',
  '카디스': 'Cadiz',
  '그라나다': 'Granada',
  '알메리아': 'Almeria',

  // Serie A/B
  '인터밀란': 'Inter Milan', '인테르': 'Inter Milan',
  'AC밀란': 'AC Milan',
  '유벤투스': 'Juventus',
  '나폴리': 'Napoli',
  '로마': 'AS Roma', 'AS로마': 'AS Roma',
  '라치오': 'Lazio',
  '아탈란타': 'Atalanta',
  '피오렌티': 'Fiorentina', '피오렌티나': 'Fiorentina',
  '볼로냐': 'Bologna',
  '토리노': 'Torino',
  '몬차': 'Monza',
  '제노아': 'Genoa',
  '레체': 'Lecce', 'US레체': 'Lecce',
  '우디네세': 'Udinese',
  '베로나': 'Hellas Verona', '엘라스': 'Hellas Verona', '헬라스': 'Hellas Verona',
  '엠폴리': 'Empoli',
  '사수올로': 'Sassuolo',
  '프로시노': 'Frosinone',
  '살레르니': 'Salernitana',
  '칼리아리': 'Cagliari',
  '파르마': 'Parma',
  '코모': 'Como', '코모1907': 'Como',
  '베네치아': 'Venezia',
  '크레모네': 'Cremonese',
  '피사': 'Pisa', '피사SC': 'Pisa',
  '팔레르모': 'Palermo',
  '삼프도리': 'Sampdoria',
  '스페치아': 'Spezia',
  '바리': 'Bari',
  '브레시아': 'Brescia',
  '코센차': 'Cosenza',
  '모데나': 'Modena',
  '레지아나': 'Reggiana',
  '수트티롤': 'Sudtirol',
  '치타델라': 'Cittadella',
  '카탄차로': 'Catanzaro',

  // Bundesliga
  '뮌헨': 'Bayern Munich', '바이에른': 'Bayern Munich', '바이에른뮌헨': 'Bayern Munich',
  '도르트문': 'Borussia Dortmund', '도르트': 'Borussia Dortmund',
  '레버쿠젠': 'Bayer Leverkusen',
  '라이프치': 'RB Leipzig',
  '슈투트가': 'VfB Stuttgart',
  '프랑크푸': 'Eintracht Frankfurt',
  '호펜하임': 'Hoffenheim',
  '프라이부': 'SC Freiburg',
  '브레멘': 'Werder Bremen', '베르더': 'Werder Bremen',
  '아우크스': 'Augsburg',
  '볼프스부': 'Wolfsburg',
  '묀헨글라': 'Borussia Monchengladbach', '글라트바': 'Borussia Monchengladbach',
  '우니온': 'Union Berlin', '유니온': 'Union Berlin',
  '마인츠': 'Mainz 05',
  '쾰른': 'FC Koln',
  '다름슈타': 'Darmstadt 98',
  '보훔': 'VfL Bochum',
  '하이덴하': 'Heidenheim',
  '상파울리': 'St. Pauli',
  '홀슈타인': 'Holstein Kiel',

  // Ligue 1
  '파리생제': 'Paris Saint Germain', '파리': 'Paris Saint Germain', 'PSG': 'Paris Saint Germain',
  '모나코': 'AS Monaco',
  '마르세유': 'Marseille',
  '릴': 'Lille',
  '리옹': 'Lyon',
  '랑스': 'Lens',
  '니스': 'Nice',
  '렌': 'Rennes',
  '랭스': 'Reims',
  '툴루즈': 'Toulouse',
  '스트라스': 'Strasbourg',
  '몽펠리에': 'Montpellier',
  '낭트': 'Nantes',
  '르아브르': 'Le Havre',
  '메스': 'Metz',
  '로리앙': 'Lorient',
  '클레르몽': 'Clermont Foot',
  '브레스트': 'Brest',
  '오세르': 'Auxerre',
  '앙제': 'Angers',
  '생테티엔': 'Saint-Etienne',

  // Eredivisie
  '에인트호': 'PSV Eindhoven', 'PSV': 'PSV Eindhoven',
  '페예노르': 'Feyenoord',
  '아약스': 'Ajax',
  '알크마르': 'AZ Alkmaar',
  'az': 'AZ Alkmaar',
  '트벤테': 'Twente',
  '위트레흐': 'Utrecht',
  '헤이렌베': 'Heerenveen',
  '고어헤드': 'Go Ahead Eagles',
  '시타르트': 'Fortuna Sittard',
  '발베이크': 'RKC Waalwijk',
  '즈볼러': 'PEC Zwolle',
  '알메러C': 'Almere City', '알메러': 'Almere City',
  'NEC네이': 'NEC Nijmegen',
  '스파르타': 'Sparta Rotterdam',
  '헤라클레': 'Heracles',

  // J-League
  '감바오사': 'Gamba Osaka',
  '가와사키': 'Kawasaki Frontale',
  '우라와': 'Urawa Red Diamonds',
  '요코하마M': 'Yokohama F. Marinos',
  '비셀고베': 'Vissel Kobe',
  '산프히로': 'Sanfrecce Hiroshima',
  '가시마': 'Kashima Antlers',
  'FC도쿄': 'FC Tokyo',
  '마치다': 'Machida Zelvia',
  'C오사카': 'Cerezo Osaka',
  '나고야': 'Nagoya Grampus',
  '가시와': 'Kashiwa Reysol',
  '교토상가': 'Kyoto Sanga',
  '알비니가': 'Albirex Niigata',
  '쇼난': 'Shonan Bellmare',
  '주빌로': 'Jubilo Iwata',
  '삿포로': 'Consadole Sapporo',
  '사간도스': 'Sagan Tosu',
  '도쿄베르': 'Tokyo Verdy',
  '후쿠오카': 'Avispa Fukuoka',

  // A-League
  '애들유나': 'Adelaide United',
  '웨스원더': 'Western Sydney Wanderers',
  '멜버른빅': 'Melbourne Victory',
  '멜버른시': 'Melbourne City', '멜버시티': 'Melbourne City',
  '센트럴코': 'Central Coast Mariners',
  '맥아서FC': 'Macarthur FC',
  '브리즈번': 'Brisbane Roar',
  '퍼스글로': 'Perth Glory',
  '뉴캐슬제': 'Newcastle Jets',
  '웰링턴': 'Wellington Phoenix',
  '웨스턴유': 'Western United',
  '오클랜드': 'Auckland FC',
  
  // National
  '대한민국': 'South Korea', '한국': 'South Korea',
  '일본': 'Japan',
  '중국': 'China',
  '이란': 'Iran',
  '호주': 'Australia',
  '사우디': 'Saudi Arabia',
  '카타르': 'Qatar',
  '요르단': 'Jordan',
  '이라크': 'Iraq',
  '우즈베키': 'Uzbekistan', '우즈벡': 'Uzbekistan',
  '태국': 'Thailand',
  '베트남': 'Vietnam',
  '인도네시': 'Indonesia',
  '말레이시': 'Malaysia',
  '바레인': 'Bahrain',
  '오만': 'Oman',
  '키르기스': 'Kyrgyzstan',
  '팔레스타': 'Palestine',
  '앙골라': 'Angola',
  '짐바브웨': 'Zimbabwe',
  '케냐': 'Kenya',
  '코모로': 'Comoros',
  '수단': 'Sudan',
  '니제르': 'Niger',
  '르완다': 'Rwanda',
  '베냉': 'Benin',
  '보츠와나': 'Botswana',
  '적도기니': 'Equatorial Guinea',
  '마다가스': 'Madagascar',
  '리비아': 'Libya',
  '알제리': 'Algeria',
  '부르키나': 'Burkina Faso', '부르키나파소': 'Burkina Faso',
  '모리타니': 'Mauritania',
  '튀니지': 'Tunisia',
  '나미비아': 'Namibia',
  '말리': 'Mali',
  '남아공': 'South Africa',
  '모로코': 'Morocco',
  '콩고민주': 'DR Congo', '콩고DR': 'DR Congo',
  '잠비아': 'Zambia',
  '탄자니아': 'Tanzania',
  '코트디부': 'Ivory Coast',
  '나이지리': 'Nigeria',
  '이집트': 'Egypt',
  '가나': 'Ghana',
  '카메룬': 'Cameroon',
  '세네갈': 'Senegal',
  '가봉': 'Gabon',
  '모잠비크': 'Mozambique',
  '감비아': 'Gambia',
  '중앙아프': 'Central African Republic',
  '기니': 'Guinea',
  '기니비사': 'Guinea-Bissau',
  '에스와티': 'Eswatini',
  '토고': 'Togo',
  '라이베리': 'Liberia',
  '시에라리': 'Sierra Leone',
  '차드': 'Chad',
  '레소토': 'Lesotho',
  '우간다': 'Uganda',
  '에티오피': 'Ethiopia',
  '아르헨티': 'Argentina',
  '브라질': 'Brazil',
  '우루과이': 'Uruguay',
  '콜롬비아': 'Colombia',
  '칠레': 'Chile',
  '페루': 'Peru',
  '에콰도르': 'Ecuador',
  '볼리비아': 'Bolivia',
  '베네수엘': 'Venezuela',
  '파라과이': 'Paraguay',
  '프랑스': 'France',
  '독일': 'Germany',
  '스페인': 'Spain',
  '잉글랜드': 'England',
  '이탈리아': 'Italy',
  '네덜란드': 'Netherlands',
  '포르투갈': 'Portugal',
  '벨기에': 'Belgium',
  '크로아티': 'Croatia',

  // NBA
  '뉴욕닉스': 'New York Knicks',
  '클리캐벌': 'Cleveland Cavaliers',
  '오클썬더': 'Oklahoma City Thunder',
  '샌안스퍼': 'San Antonio Spurs',
  '골든워리': 'Golden State Warriors',
  '댈러매버': 'Dallas Mavericks',
  'LA레이커': 'Los Angeles Lakers',
  '휴스로케': 'Houston Rockets',
  '덴버너게': 'Denver Nuggets',
  '미네울브': 'Minnesota Timberwolves',
  '보스셀틱': 'Boston Celtics',
  '필라세븐': 'Philadelphia 76ers',
  '토론랩터': 'Toronto Raptors',
  '브루네츠': 'Brooklyn Nets',
  '시카불스': 'Chicago Bulls',
  '밀워벅스': 'Milwaukee Bucks',
  '디트피스': 'Detroit Pistons',
  '인디페이': 'Indiana Pacers',
  '샬럿호네': 'Charlotte Hornets',
  '마이히트': 'Miami Heat',
  '애틀호크': 'Atlanta Hawks',
  '올랜매직': 'Orlando Magic',
  '워싱위저': 'Washington Wizards',
  '유타재즈': 'Utah Jazz',
  '포틀트레': 'Portland Trail Blazers',
  '새크킹스': 'Sacramento Kings',
  'LA클리퍼': 'Los Angeles Clippers',
  '피닉선즈': 'Phoenix Suns',
  '멤피그리': 'Memphis Grizzlies',
  '뉴올펠리': 'New Orleans Pelicans',

  // KBL
  '울산모비': 'Ulsan Hyundai Mobis',
  '고양소노': 'Goyang Sono',
  '한국가스': 'KOGAS',
  'KT소닉붐': 'Suwon KT Sonicboom', 'kt소닉붐': 'Suwon KT Sonicboom',
  '안양정관': 'Anyang JungKwanJang',
  '원주DB': 'Wonju DB Promy', '원주db': 'Wonju DB Promy',
  '부산KCC': 'Busan KCC Egis', '부산kcc': 'Busan KCC Egis',
  '서울SK': 'Seoul SK Knights', '서울sk': 'Seoul SK Knights',
  '서울삼성': 'Seoul Samsung Thunders',
  '창원LG': 'Changwon LG Sakers', '창원lg': 'Changwon LG Sakers',

  // KOVO
  'KB손보': 'KB Stars',
  '대한항공': 'Korean Air Jumbos',
  '현대건설': 'Hyundai Hillstate',
  '대전정관': 'Red Sparks', '정관장': 'Red Sparks',
  '우리카드': 'Woori Card',
  '한국전력': 'KEPCO',
  '현대캐피': 'Hyundai Capital', '현대캐피탈': 'Hyundai Capital',
  'OK금융': 'OK Financial Group', 'ok금융': 'OK Financial Group',
  '삼성화재': 'Samsung Bluefangs',
  '흥국생명': 'Pink Spiders',
  'GS칼텍스': 'GS Caltex',
  'IBK기업': 'IBK Altos',
  '페퍼저축': 'AI Peppers',
  '도로공사': 'Hi-pass',

  // MLB/KBO
  '다저스': 'Los Angeles Dodgers',
  '양키스': 'New York Yankees',
  '샌디에이': 'San Diego Padres',
  '샌프란시': 'San Francisco Giants',
  '토론토': 'Toronto Blue Jays',
  '애틀랜타': 'Atlanta Braves',
  '필라델피': 'Philadelphia Phillies',
  '텍사스': 'Texas Rangers',
  '휴스턴': 'Houston Astros',
  
  // Basic
  '미국': 'USA'
};

const DEFAULT_CONTEXT = `(초보자 모드) 
다음 내용을 꼭 포함해줘:
1. 어려운 용어(핸디캡, 언오버 등) 쓰지 말고 "몇 점 차 승리" 처럼 쉽게 설명해줘.
2. 경기장 날씨나 감독 이슈 같은 최신 뉴스가 있다면 꼭 검색해서 반영해줘.
3. 정말 확실하지 않으면 "이번엔 쉬어가세요(NO BET)"라고 솔직하게 말해줘.`;

const getKoreanName = (englishName: string): string | undefined => {
    // English -> Korean Reverse Lookup
    // Find keys where Value === englishName AND Key contains Korean
    const foundKey = Object.keys(TEAM_MAPPINGS).find(key => 
        TEAM_MAPPINGS[key].toLowerCase() === englishName.toLowerCase() && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(key)
    );
    return foundKey; 
};

const MatchInput: React.FC<MatchInputProps> = ({ onAnalyze, onLearn, onRecommend, learnedCount, isLoading, previousAnalysis }) => {
  const [mode, setMode] = useState<'proto' | 'manual' | 'single'>('manual');
  const [sport, setSport] = useState<SportType>('football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [autoSearch, setAutoSearch] = useState(true); 
  
  // [NEW] Global Game Type State for Manual Mode (Batch Config)
  const [targetGameType, setTargetGameType] = useState<GameType>('General');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [pasteInput, setPasteInput] = useState('');
  const [folderCount, setFolderCount] = useState<number>(2);
  const [recommendationCount, setRecommendationCount] = useState<number>(1); 

  const [conversionMsg, setConversionMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const contextFileInputRef = useRef<HTMLInputElement>(null);

  const normalizeAndConvert = (name: string): string => {
      const normalized = name.trim();
      const noSpace = normalized.replace(/\s+/g, '');
      return TEAM_MAPPINGS[normalized] || TEAM_MAPPINGS[noSpace] || normalized;
  };

  const addToCart = () => {
    if (!homeTeam || !awayTeam) {
        setWarningMsg("팀 이름을 입력해주세요.");
        return;
    }
    
    const finalHome = normalizeAndConvert(homeTeam);
    const finalAway = normalizeAndConvert(awayTeam);
    
    // [FIX] Improved Korean name lookup logic
    // If input is already Korean, use it.
    // If input is English (normalized), try to find Key in Mappings.
    const homeKo = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(homeTeam) ? homeTeam : (getKoreanName(finalHome) || homeTeam);
    const awayKo = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(awayTeam) ? awayTeam : (getKoreanName(finalAway) || awayTeam);

    const newItem: CartItem = {
        id: Date.now().toString(),
        sport,
        homeTeam: finalHome,
        awayTeam: finalAway,
        homeTeamKo: homeKo, 
        awayTeamKo: awayKo,
        gameType: 'General', // Default placeholder, will be overridden by batch setting
        criteria: null
    };

    setCart([...cart, newItem]);
    
    if (finalHome !== homeTeam || finalAway !== awayTeam) {
        setConversionMsg("영어 팀명으로 자동 변환되어 추가되었습니다.");
    } else {
        setConversionMsg("리스트에 추가되었습니다.");
    }
    
    setHomeTeam('');
    setAwayTeam('');
    setTimeout(() => setConversionMsg(null), 3000);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleBulkParse = () => {
      if (!pasteInput.trim()) return;

      let currentParsedSport: SportType = 'football';
      if (pasteInput.includes('농구') || pasteInput.includes('NBA') || pasteInput.includes('KBL')) currentParsedSport = 'basketball';
      else if (pasteInput.includes('배구') || pasteInput.includes('KOVO')) currentParsedSport = 'volleyball';
      else if (pasteInput.includes('야구') || pasteInput.includes('MLB') || pasteInput.includes('KBO')) currentParsedSport = 'baseball';

      const newItems: CartItem[] = [];
      let addedCount = 0;
      
      const existingKeys = new Set(cart.map(item => 
          `${normalizeAndConvert(item.homeTeam)}-${normalizeAndConvert(item.awayTeam)}-${item.gameType || 'gen'}-${item.criteria || '0'}`
      ));
      const addedMatchKeys = new Set<string>();

      const sortedMappingKeys = Object.keys(TEAM_MAPPINGS).sort((a, b) => b.length - a.length);

      const processLineOrBlock = (text: string, voteRateStr?: string) => {
          let gameType: GameType = 'General';
          let criteria: string | undefined = undefined;

          // Only parse game type from text if in Proto mode, 
          // but for Manual/Bulk, we generally default to General and let user select global type later.
          // However, preserving original parsing logic for Proto Paste compatibility.
          if (text.includes('핸디캡')) gameType = 'Handicap';
          else if (text.includes('언더오버')) gameType = 'UnOver';
          else if (text.includes('SUM')) gameType = 'Sum';
          
          if (gameType === 'Handicap') {
              const hMatch = text.match(/H\s*([-+]?\d+(\.\d+)?)/);
              if (hMatch) criteria = hMatch[1];
              else {
                  const nMatch = text.match(/(?:H\s*)?([-+]\d+(\.\d+)?)/);
                  if (nMatch) criteria = nMatch[1];
              }
          } else if (gameType === 'UnOver') {
              const uMatch = text.match(/U\/O\s*(\d+(\.\d+)?)/);
              if (uMatch) criteria = uMatch[1];
              else {
                   const nMatch = text.match(/\d+(\.\d+)?/);
                   if (nMatch && parseFloat(nMatch[0]) < 10) criteria = nMatch[0];
              }
          }

          const foundTeams: { key: string, en: string, idx: number }[] = [];
          
          // [FIX] Use a temporary string and mask found terms to prevent substring matching
          // Example: '적도기니 : 수단' -> '적도기니' found -> mask it -> '기니' (part of 적도기니) won't be found again.
          let tempText = text;

          for (const key of sortedMappingKeys) {
             const idx = tempText.indexOf(key);
             if (idx !== -1) {
                 foundTeams.push({ key, en: TEAM_MAPPINGS[key], idx });
                 // Replace found key with spaces to preserve indices but prevent re-matching
                 const mask = " ".repeat(key.length);
                 tempText = tempText.substring(0, idx) + mask + tempText.substring(idx + key.length);
             }
          }
          
          foundTeams.sort((a, b) => a.idx - b.idx);

          const distinctTeams: {en: string, ko: string}[] = [];
          const seenEn = new Set<string>();
          
          for (const item of foundTeams) {
              if (!seenEn.has(item.en)) {
                  distinctTeams.push({ en: item.en, ko: item.key });
                  seenEn.add(item.en);
              }
              if (distinctTeams.length === 2) break;
          }

          if (distinctTeams.length === 2) {
              const homeData = distinctTeams[0];
              const awayData = distinctTeams[1];

              const matchKey = `${homeData.en}-${awayData.en}-${gameType}-${criteria || '0'}`;
              
              if (!existingKeys.has(matchKey) && !addedMatchKeys.has(matchKey)) {
                  newItems.push({
                      id: Date.now().toString() + Math.random(),
                      sport: currentParsedSport,
                      homeTeam: homeData.en,
                      awayTeam: awayData.en,
                      homeTeamKo: homeData.ko,
                      awayTeamKo: awayData.ko,
                      voteRates: voteRateStr,
                      gameType,
                      criteria
                  });
                  addedMatchKeys.add(matchKey);
                  addedCount++;
              }
          }
      };

      const hasVoteRates = pasteInput.includes('투표율');

      if (hasVoteRates) {
          const blocks = pasteInput.split(/(?=\d+경기)/g);
          blocks.forEach(block => {
              if (!block.trim()) return;
              const voteMatches = block.match(/투표율\s*(\d+(\.\d+)?)%/g);
              let voteRateStr = undefined;
              if (voteMatches && voteMatches.length >= 3) {
                   const rates = voteMatches.map(v => v.replace(/투표율\s*/, ''));
                   voteRateStr = `Public Vote - Home: ${rates[0]}, Draw: ${rates[1]}, Away: ${rates[2]}`;
              }
              processLineOrBlock(block, voteRateStr);
          });
      } else {
          const blocks = pasteInput.split(/(?=\d{3,}\s)/); 
          if (blocks.length > 1) {
             blocks.forEach(b => processLineOrBlock(b));
          } else {
             const lines = pasteInput.split('\n');
             lines.forEach(line => processLineOrBlock(line));
          }
      }

      if (addedCount > 0) {
          setCart([...cart, ...newItems]);
          setConversionMsg(`${addedCount}경기 자동 추가 완료!`);
          setPasteInput('');
          setTimeout(() => setConversionMsg(null), 3000);
      } else {
          if (newItems.length === 0 && addedMatchKeys.size > 0) {
               setWarningMsg("이미 리스트에 있는 경기들이라 추가되지 않았습니다.");
          } else {
               setWarningMsg("등록된 팀 정보를 찾지 못했습니다.");
          }
      }
  };

  const handleSaveContextToTxt = () => {
    if (!context.trim()) return;
    const element = document.createElement("a");
    const file = new Blob([context], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `context_${homeTeam || 'match'}_vs_${awayTeam || 'analysis'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleLearnContext = () => {
    if(!context.trim()) return;
    const newSample: TrainingSample = {
        id: Date.now().toString(),
        content: context,
        sport: sport
    };
    onLearn([newSample]);
    setConversionMsg("스타일이 학습 메모리에 저장되었습니다.");
    setTimeout(() => setConversionMsg(null), 3000);
  };
  
  const handleLoadContextFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain') {
        alert("TXT 파일만 가능합니다.");
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        setContext(text);
        setConversionMsg("파일 내용이 입력창에 로드되었습니다.");
        setTimeout(() => setConversionMsg(null), 3000);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (mode === 'proto' || mode === 'manual') {
        if (cart.length < 2) {
            alert("최소 2경기 이상 리스트에 담아야 조합을 추천할 수 있습니다.");
            return;
        }
        if (onRecommend) {
            if (mode === 'proto') {
                onRecommend(cart, cart.length, 1, autoSearch, 'all');
            } else {
                onRecommend(cart, folderCount, recommendationCount, autoSearch, 'combination', targetGameType);
            }
        }
    } 
    else if (mode === 'single') {
      if (!homeTeam || !awayTeam) return;

      const finalHome = normalizeAndConvert(homeTeam);
      const finalAway = normalizeAndConvert(awayTeam);

      if (finalHome !== homeTeam) setHomeTeam(finalHome);
      if (finalAway !== awayTeam) setAwayTeam(finalAway);

      const homeKo = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(homeTeam) ? homeTeam : getKoreanName(finalHome);
      const awayKo = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(awayTeam) ? awayTeam : getKoreanName(finalAway);
      
      onAnalyze({ 
        sport, 
        homeTeam: finalHome, 
        awayTeam: finalAway, 
        homeTeamKo: homeKo,
        awayTeamKo: awayKo,
        date, 
        context: context + (learnedCount > 0 ? `\n\n[System] 메모리에 저장된 ${learnedCount}개의 스타일을 참조하여 분석합니다.` : ""),
        trainingData: [],
        useAutoSearch: autoSearch
      });
    }
  };

  const handleTeamBlur = (type: 'home' | 'away') => {
    const currentName = type === 'home' ? homeTeam : awayTeam;
    if (!currentName) return;
    
    const converted = normalizeAndConvert(currentName);
    
    if (converted && converted.toLowerCase() !== currentName.toLowerCase()) {
      if (type === 'home') setHomeTeam(converted);
      else setAwayTeam(converted);
      setConversionMsg(`'${currentName}' → '${converted}' 자동 변환됨`);
      setWarningMsg(null);
      setTimeout(() => setConversionMsg(null), 3000);
      return;
    }
  };

  const getPlaceholder = (type: 'home' | 'away') => {
    switch (sport) {
      case 'basketball': return type === 'home' ? '예: 한국 (또는 South Korea)' : '예: 미국 (또는 USA)';
      case 'baseball': return type === 'home' ? '예: 다저스' : '예: 양키스';
      case 'volleyball': return type === 'home' ? '예: 대한항공' : '예: OK금융그룹';
      default: return type === 'home' ? '예: 토트넘 (또는 Tottenham)' : '예: 아스날 (또는 Arsenal)';
    }
  };

  const isBatchMode = mode === 'proto' || mode === 'manual';

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 relative">
      
      <div className="flex border-b border-slate-700 mb-6">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 pb-3 text-sm font-bold transition-colors ${
            mode === 'manual' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🛒 수동 조합
        </button>
        <button
          type="button"
          onClick={() => setMode('proto')}
          className={`flex-1 pb-3 text-sm font-bold transition-colors ${
            mode === 'proto' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📝 프로토 승부식
        </button>
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`flex-1 pb-3 text-sm font-bold transition-colors ${
            mode === 'single' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚽ 단일 분석
        </button>
      </div>

      {conversionMsg && (
        <div className="absolute top-4 right-6 bg-emerald-600/90 text-white text-xs px-3 py-1.5 rounded-full shadow-lg animate-fade-in-up border border-emerald-400/50 z-10">
          ✨ {conversionMsg}
        </div>
      )}
      {warningMsg && (
        <div className="absolute top-4 right-6 bg-amber-600/95 text-white text-xs px-3 py-1.5 rounded-full shadow-lg animate-pulse border border-amber-400/50 z-10">
          💡 {warningMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Sport Selector - Visible for Manual & Single */}
        {(mode === 'manual' || mode === 'single') && (
        <div>
          <label className="block text-slate-400 text-sm font-semibold mb-2">분석 종목 (Sport)</label>
          <div className="grid grid-cols-5 gap-2">
            {[{ id: 'football', label: '축구' }, { id: 'basketball', label: '농구' }, { id: 'baseball', label: '야구' }, { id: 'volleyball', label: '배구' }, { id: 'hockey', label: '하키' }].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSport(s.id as SportType)}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors border ${sport === s.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* --- PROTO MODE (Bulk Paste) --- */}
        {mode === 'proto' && (
            <div className="bg-slate-900 rounded-lg p-4 border border-indigo-500/50 mb-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-indigo-400 text-xs font-bold">📋 배트맨/베트맨 사이트 경기 목록 붙여넣기</label>
                </div>
                <textarea
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder={`[예시]\n307 12.28 (일) 17:00 마감 축구 A리그 일반 멜버시티 : 퍼스글로\n308 ... 핸디캡 ... H -1.0 ...\n(텍스트 전체를 붙여넣으면 유형별로 자동 인식합니다)`}
                  className="w-full bg-slate-800 text-slate-300 text-xs p-3 rounded h-40 focus:outline-none focus:border-indigo-500 mb-3 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={handleBulkParse}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-sm shadow-md transition-colors"
                >
                  ✨ 경기 자동 추출 및 리스트 추가
                </button>
            </div>
        )}

        {/* --- MANUAL MODE (Manual Input) --- */}
        {mode === 'manual' && (
            <div className="mb-4">
                {/* Bulk Input Area in Manual Mode */}
                <div className="bg-slate-900 rounded-lg p-4 border border-indigo-500/50 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-indigo-400 text-xs font-bold">📋 경기 목록 붙여넣기 (자동 추출)</label>
                    </div>
                    <textarea
                        value={pasteInput}
                        onChange={(e) => setPasteInput(e.target.value)}
                         placeholder={`[예시]\n307 12.28 (일) 17:00 마감 축구 A리그 일반 멜버시티 : 퍼스글로\n308 ... 핸디캡 ... H -1.0 ...\n(텍스트 전체를 붙여넣으면 유형별로 자동 인식합니다)`}
                        className="w-full bg-slate-800 text-slate-300 text-xs p-3 rounded h-24 focus:outline-none focus:border-indigo-500 mb-3 leading-relaxed"
                    />
                    <button
                        type="button"
                        onClick={handleBulkParse}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-sm shadow-md transition-colors"
                    >
                        ✨ 경기 자동 추출 및 리스트 추가
                    </button>
                </div>

                {/* Existing Manual Inputs with Divider */}
                <div className="border-t border-slate-700 pt-4">
                    <label className="text-slate-400 text-xs font-bold mb-3 block">✍️ 직접 입력 추가</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                        <input
                            type="text"
                            value={homeTeam}
                            onChange={(e) => setHomeTeam(e.target.value)}
                            onBlur={() => handleTeamBlur('home')}
                            placeholder={getPlaceholder('home')}
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addToCart(); } }}
                        />
                        <input
                            type="text"
                            value={awayTeam}
                            onChange={(e) => setAwayTeam(e.target.value)}
                            onBlur={() => handleTeamBlur('away')}
                            placeholder={getPlaceholder('away')}
                            className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addToCart(); } }}
                        />
                    </div>
                    
                    <button
                        type="button"
                        onClick={addToCart}
                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-slate-600 border-dashed rounded-lg flex items-center justify-center font-bold text-sm"
                    >
                        + 리스트에 추가
                    </button>
                </div>
            </div>
        )}

        {/* --- SHARED LIST (Proto & Manual) --- */}
        {isBatchMode && (
             <div className="mt-4">
                 {/* Options visible ONLY in MANUAL mode */}
                 {mode === 'manual' && (
                 <div className="flex flex-col space-y-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-4">
                    
                    {/* [NEW LOCATION] Game Type Selection for Batch */}
                    <div className="flex flex-col">
                         <label className="text-xs text-purple-400 font-bold mb-1">🎮 게임 유형 선택 (전체 적용)</label>
                         <select
                            value={targetGameType}
                            onChange={(e) => setTargetGameType(e.target.value as GameType)}
                            className="bg-slate-900 border border-purple-600 text-purple-400 text-xs rounded px-2 py-2 font-bold focus:outline-none w-full text-center"
                        >
                            <option value="General">일반 (승무패)</option>
                            <option value="Handicap">핸디캡 (AI 자동 라인 설정)</option>
                            <option value="UnOver">언더/오버 (AI 자동 기준점)</option>
                            <option value="Sum">합 (홀/짝)</option>
                            <option value="Mixed">혼합 (AI 추천 - 가장 확률 높은 유형 선택)</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1 text-center">
                            * 혼합 선택 시 AI가 일반/핸디캡/언더오버 중 가장 유리한 배팅 유형을 자동으로 추천합니다.
                        </p>
                    </div>

                    <div className="flex justify-between space-x-2 border-t border-slate-700/50 pt-2">
                        <div className="flex flex-col flex-1">
                            <label className="text-[10px] text-slate-400 font-bold mb-1 text-right">🎯 폴더(조합) 크기</label>
                            <select 
                                value={folderCount}
                                onChange={(e) => setFolderCount(Number(e.target.value))}
                                className="bg-slate-900 border border-emerald-600 text-emerald-400 text-xs rounded px-2 py-1.5 font-bold focus:outline-none w-full text-right"
                            >
                                <option value={2}>2폴더 (안전)</option>
                                <option value={3}>3폴더 (밸런스)</option>
                                <option value={4}>4폴더 (도전)</option>
                                <option value={5}>5폴더 (로또)</option>
                            </select>
                        </div>
                        
                        <div className="flex flex-col flex-1">
                            <label className="text-[10px] text-blue-400 font-bold mb-1 text-right">🎫 추천 조합 개수</label>
                            <select 
                                value={recommendationCount}
                                onChange={(e) => setRecommendationCount(Number(e.target.value))}
                                className="bg-slate-900 border border-blue-600 text-blue-400 text-xs rounded px-2 py-1.5 font-bold focus:outline-none w-full text-right"
                            >
                                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num}>{num}개 세트</option>
                                ))}
                            </select>
                        </div>
                    </div>
                 </div>
                 )}

                 <div className="bg-slate-900/80 rounded-lg p-4 min-h-[100px] border border-slate-700">
                    <h3 className="text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider flex justify-between">
                        <span>분석 대기 리스트 ({cart.length})</span>
                        <span className="text-emerald-500">{mode === 'proto' ? '모든 경기 분석' : '2경기 이상 권장'}</span>
                    </h3>
                    {cart.length === 0 ? (
                        <p className="text-slate-600 text-sm text-center py-4">
                            {mode === 'proto' ? '위 입력창에 경기 목록을 붙여넣고 추출하세요.' : '관심 있는 경기를 추가하세요.'}<br/>
                            (여러 경기를 넣으면 AI가 옥석을 가려줍니다)
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {cart.map(item => (
                                <li key={item.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                                    <div className="flex items-center space-x-2 overflow-hidden">
                                        <div className="truncate flex flex-col">
                                            <div className="flex items-center">
                                                <span className="text-sm font-bold text-white">{item.homeTeam}</span>
                                                <span className="text-xs text-slate-500 mx-1">vs</span>
                                                <span className="text-sm font-bold text-white">{item.awayTeam}</span>
                                            </div>
                                            {(item.homeTeamKo || item.awayTeamKo) && (
                                                <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                                                    {item.homeTeamKo && <span>{item.homeTeamKo}</span>}
                                                    {item.homeTeamKo && item.awayTeamKo && <span>vs</span>}
                                                    {item.awayTeamKo && <span>{item.awayTeamKo}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-red-400 hover:text-red-300 p-1 shrink-0 ml-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                 </div>
            </div>
        )}

        {/* --- SINGLE MODE --- */}
        {mode === 'single' && (
          <div className="mt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2">홈 팀</label>
                <input
                  type="text"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  onBlur={() => handleTeamBlur('home')}
                  placeholder={getPlaceholder('home')}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm font-semibold mb-2">원정 팀</label>
                <input
                  type="text"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  onBlur={() => handleTeamBlur('away')}
                  placeholder={getPlaceholder('away')}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            
             <div className="mt-4 flex flex-col sm:flex-row justify-end items-center mb-2 gap-2">
                <div className="flex space-x-2">
                     <input 
                        type="file" 
                        accept=".txt" 
                        className="hidden" 
                        ref={contextFileInputRef} 
                        onChange={handleLoadContextFromFile} 
                     />
                     <button 
                        type="button" 
                        onClick={() => contextFileInputRef.current?.click()}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition-colors flex items-center border border-slate-600"
                     >
                        📂 파일 불러오기
                     </button>
                     <button 
                        type="button" 
                        onClick={handleSaveContextToTxt} 
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition-colors flex items-center border border-slate-600"
                     >
                        💾 메모 저장
                     </button>
                     <button 
                        type="button" 
                        onClick={handleLearnContext} 
                        className="text-xs bg-slate-700 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1 rounded transition-colors flex items-center border border-slate-600"
                     >
                        🧠 스타일 학습
                     </button>
                </div>
             </div>
             <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="추가적인 메모나 상황을 적어주세요..."
                className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 h-24 text-sm"
             />
          </div>
        )}

        <div className="flex justify-end pt-2">
            <label className="flex items-center space-x-2 cursor-pointer bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-700 hover:border-emerald-500 transition-colors">
                <input 
                    type="checkbox" 
                    checked={autoSearch} 
                    onChange={(e) => setAutoSearch(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-600 bg-slate-800 focus:ring-emerald-500"
                />
                <span className="text-xs text-emerald-400 font-bold">🔍 구글 자동 검색 (뉴스/결장자/프리뷰)</span>
            </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || (isBatchMode && cart.length < 2)}
          className={`w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.01] mt-2 ${
            isLoading || (isBatchMode && cart.length < 2)
              ? 'bg-slate-600 cursor-not-allowed text-slate-300'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              분석 진행 중...
            </span>
          ) : (
             mode === 'proto' 
             ? `🚀 프로토 승부식 분석 실행 (전체 예측)` 
             : (mode === 'manual'
                ? `🎲 최고의 ${folderCount}폴더 조합 추천받기`
                : '⚽ 정밀 분석 시작')
             )
          }
        </button>
      </form>
    </div>
  );
};

export default MatchInput;