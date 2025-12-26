
import React, { useState, useRef } from 'react';
import { MatchData, SportType, TrainingSample, CartItem } from '../types';

interface MatchInputProps {
  onAnalyze: (data: MatchData) => void;
  onLearn: (samples: TrainingSample[]) => void;
  onRecommend?: (items: CartItem[], folderCount: number, useAutoSearch: boolean) => void;
  learnedCount: number;
  isLoading: boolean;
  previousAnalysis?: string | null;
}

// [MAPPING UPDATE] 배트맨/토토 용어 및 주요 팀 매핑 데이터 대폭 확장 (API-Sports 공식 명칭 기준)
const TEAM_MAPPINGS: Record<string, string> = {
  // --- [축구: 영국 2부 (EFL 챔피언십) 및 하부] ---
  // * API 검색 성공률을 위해 City, United, Town, FC 등 풀네임 사용 필수
  '레스터C': 'Leicester City', '레스터': 'Leicester City',
  '리즈': 'Leeds United',
  '사우스햄': 'Southampton', '사우스햄튼': 'Southampton', '사우샘프': 'Southampton',
  '입스위치': 'Ipswich Town',
  '노리치C': 'Norwich City', '노리치': 'Norwich City',
  '웨스트브': 'West Bromwich Albion', 'WBA': 'West Bromwich Albion',
  '헐시티': 'Hull City',
  '코번트리': 'Coventry City',
  '미들즈브': 'Middlesbrough',
  '프레스턴': 'Preston North End',
  '선덜랜드': 'Sunderland',
  '왓포드': 'Watford',
  '브리스톨': 'Bristol City',
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

  // --- [축구: EPL 및 해외축구 주요 팀] ---
  '토트넘': 'Tottenham Hotspur',
  '맨시티': 'Manchester City',
  '맨유': 'Manchester United',
  '리버풀': 'Liverpool',
  '아스날': 'Arsenal',
  '첼시': 'Chelsea',
  '울버햄튼': 'Wolverhampton Wanderers',
  '아스톤빌': 'Aston Villa', '아스톤': 'Aston Villa',
  '뉴캐슬': 'Newcastle United',
  '브라이튼': 'Brighton & Hove Albion',
  '웨스트햄': 'West Ham United',
  '에버튼': 'Everton',
  '노팅엄': 'Nottingham Forest',
  '풀럼': 'Fulham',
  '크리스탈': 'Crystal Palace', '팰리스': 'Crystal Palace',
  '브렌트퍼': 'Brentford', '브렌트': 'Brentford',
  '본머스': 'Bournemouth', 'AFC본머스': 'Bournemouth',
  '루턴타운': 'Luton Town',
  '셰필드': 'Sheffield United', '셰필드U': 'Sheffield United',
  '번리': 'Burnley',
  '레알마드': 'Real Madrid', '레알': 'Real Madrid',
  '바르셀로': 'Barcelona', '바르사': 'Barcelona',
  '아틀레티': 'Atletico Madrid', 'AT마드리드': 'Atletico Madrid',
  '세비야': 'Sevilla',
  '발렌시아': 'Valencia',
  '지로나': 'Girona',
  '빌바오': 'Athletic Club',
  '뮌헨': 'Bayern Munich', '바이에른': 'Bayern Munich',
  '도르트문': 'Borussia Dortmund',
  '레버쿠젠': 'Bayer Leverkusen',
  '라이프치': 'RB Leipzig',
  '슈투트가': 'VfB Stuttgart',
  '파리생제': 'Paris Saint Germain', '파리': 'Paris Saint Germain', 'PSG': 'Paris Saint Germain',
  '모나코': 'AS Monaco',
  '마르세유': 'Marseille',
  '릴': 'Lille',
  '리옹': 'Lyon',
  '인터밀란': 'Inter Milan',
  'AC밀란': 'AC Milan',
  '유벤투스': 'Juventus',
  '나폴리': 'Napoli',
  '로마': 'AS Roma',
  '라치오': 'Lazio',
  '아탈란타': 'Atalanta',
  '피오렌티': 'Fiorentina',
  
  // --- [축구: 국가대표] ---
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
  '리비아': 'Libya',
  '알제리': 'Algeria',
  '부르키나': 'Burkina Faso', '부르키나파소': 'Burkina Faso',
  '모리타니': 'Mauritania',
  '튀니지': 'Tunisia',
  '나미비아': 'Namibia',
  '말리': 'Mali',
  '남아공': 'South Africa',
  '모로코': 'Morocco',
  '콩고민주': 'DR Congo',
  '잠비아': 'Zambia',
  '탄자니아': 'Tanzania',
  '코트디부': 'Ivory Coast',
  '나이지리': 'Nigeria',
  '이집트': 'Egypt',
  '가나': 'Ghana',
  '카메룬': 'Cameroon',
  '세네갈': 'Senegal',

  // --- [농구: NBA] ---
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

  // --- [농구: KBL] ---
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

  // --- [배구: KOVO] ---
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

  // --- [야구: MLB/KBO] ---
  '다저스': 'Los Angeles Dodgers',
  '양키스': 'New York Yankees',
  '샌디에이': 'San Diego Padres',
  '샌프란시': 'San Francisco Giants',
  '토론토': 'Toronto Blue Jays',
  '애틀랜타': 'Atlanta Braves',
  '필라델피': 'Philadelphia Phillies',
  '텍사스': 'Texas Rangers',
  '휴스턴': 'Houston Astros',
  
  // 기본 국가 매핑
  '미국': 'USA'
};

const DEFAULT_CONTEXT = `(초보자 모드) 
다음 내용을 꼭 포함해줘:
1. 어려운 용어(핸디캡, 언오버 등) 쓰지 말고 "몇 점 차 승리" 처럼 쉽게 설명해줘.
2. 경기장 날씨나 감독 이슈 같은 최신 뉴스가 있다면 꼭 검색해서 반영해줘.
3. 정말 확실하지 않으면 "이번엔 쉬어가세요(NO BET)"라고 솔직하게 말해줘.`;

// [NEW] Helper to find Korean name from English name
const getKoreanName = (englishName: string): string | undefined => {
    // Reverse lookup: find the first key that maps to this English name and is Korean
    const foundKey = Object.keys(TEAM_MAPPINGS).find(key => 
        TEAM_MAPPINGS[key].toLowerCase() === englishName.toLowerCase() && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(key)
    );
    return foundKey; // Returns undefined if not found
};

const MatchInput: React.FC<MatchInputProps> = ({ onAnalyze, onLearn, onRecommend, learnedCount, isLoading, previousAnalysis }) => {
  const [mode, setMode] = useState<'cart' | 'single' | 'synthesis'>('cart');
  const [sport, setSport] = useState<SportType>('football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [autoSearch, setAutoSearch] = useState(true); 
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pasteInput, setPasteInput] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [folderCount, setFolderCount] = useState<number>(2);

  // Learning & Synthesis State
  const [selectedTrainingFiles, setSelectedTrainingFiles] = useState<TrainingSample[]>([]);
  const [fileWithContext, setFileWithContext] = useState<File | null>(null);
  const [fileNoContext, setFileNoContext] = useState<File | null>(null);
  const [fileContent1, setFileContent1] = useState<string>('');
  const [fileContent2, setFileContent2] = useState<string>('');
  const [conversionMsg, setConversionMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const contextFileInputRef = useRef<HTMLInputElement>(null);

  // [NEW] Helper to normalize and convert team names
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
    
    // [LOGIC UPDATE] Force conversion before adding to cart
    const finalHome = normalizeAndConvert(homeTeam);
    const finalAway = normalizeAndConvert(awayTeam);
    
    // [UPDATE] 한글 이름 추적 (원본이 한글이면 원본 사용, 아니면 역추적)
    const homeKo = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(homeTeam) ? homeTeam : getKoreanName(finalHome);
    const awayKo = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(awayTeam) ? awayTeam : getKoreanName(finalAway);

    const newItem: CartItem = {
        id: Date.now().toString(),
        sport,
        homeTeam: finalHome,
        awayTeam: finalAway,
        homeTeamKo: homeKo, 
        awayTeamKo: awayKo 
    };

    setCart([...cart, newItem]);
    
    // UI Update
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

      const lines = pasteInput.split('\n');
      let currentParsedSport: SportType = 'football';
      const newItems: CartItem[] = [];
      let addedCount = 0;
      
      const addedMatchKeys = new Set<string>();

      lines.forEach(line => {
          const cleanLine = line.trim();
          const isInfoLine = cleanLine.includes('상세정보') || cleanLine.includes('경기장');
          
          if (cleanLine.includes('농구') || cleanLine.includes('NBA') || cleanLine.includes('KBL')) currentParsedSport = 'basketball';
          else if (cleanLine.includes('배구') || cleanLine.includes('KOVO')) currentParsedSport = 'volleyball';
          else if (cleanLine.includes('야구') || cleanLine.includes('MLB') || cleanLine.includes('KBO')) currentParsedSport = 'baseball';
          else if (cleanLine.includes('축구') || cleanLine.includes('EPL')) currentParsedSport = 'football';

          if (isInfoLine) return; 

          if (cleanLine.includes(':')) {
              const parts = cleanLine.split(':');
              
              if (/^\d{1,2}$/.test(parts[0].trim())) {
                  return;
              }

              if (parts.length === 2) {
                  let rawHome = parts[0].trim();
                  let rawAway = parts[1].trim();
                  
                  if (rawHome.length > 1 && rawAway.length > 1 && isNaN(Number(rawHome))) {
                      const matchKey = `${rawHome}-${rawAway}`;
                      if (addedMatchKeys.has(matchKey)) return;

                      // [LOGIC UPDATE] Use normalizeAndConvert logic here too
                      const mappedHome = normalizeAndConvert(rawHome);
                      const mappedAway = normalizeAndConvert(rawAway);
                      
                      newItems.push({
                          id: Date.now().toString() + Math.random(),
                          sport: currentParsedSport,
                          homeTeam: mappedHome,
                          awayTeam: mappedAway,
                          homeTeamKo: rawHome !== mappedHome ? rawHome : undefined, // Store original if different
                          awayTeamKo: rawAway !== mappedAway ? rawAway : undefined  // Store original if different
                      });
                      
                      addedMatchKeys.add(matchKey);
                      addedCount++;
                  }
              }
          }
      });

      if (addedCount > 0) {
          setCart([...cart, ...newItems]);
          setConversionMsg(`${addedCount}경기 자동 추가 완료!`);
          setPasteInput('');
          setShowPasteArea(false);
          setTimeout(() => setConversionMsg(null), 3000);
      } else {
          setWarningMsg("유효한 경기 정보를 찾지 못했습니다. 복사한 텍스트 형식을 확인해주세요.");
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

    // [MODE 1] Combination Recommender
    if (mode === 'cart') {
        if (cart.length < 2) {
            alert("최소 2경기 이상 리스트에 담아야 조합을 추천할 수 있습니다.");
            return;
        }
        if (onRecommend) onRecommend(cart, folderCount, autoSearch);
    } 
    // [MODE 2] Single Analysis
    else if (mode === 'single') {
      if (!homeTeam || !awayTeam) return;

      // [LOGIC UPDATE] Force conversion on submit (covers manual entry without blur)
      const finalHome = normalizeAndConvert(homeTeam);
      const finalAway = normalizeAndConvert(awayTeam);

      // Update UI state to reflect conversion
      if (finalHome !== homeTeam) setHomeTeam(finalHome);
      if (finalAway !== awayTeam) setAwayTeam(finalAway);

      // Determine Korean name for display
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
    // [MODE 3] Synthesis
    else {
      if (!fileContent1 || !fileContent2) {
        alert("두 개의 분석 파일(맥락 포함/미포함)을 모두 업로드해주세요.");
        return;
      }
      onAnalyze({ 
        sport, 
        homeTeam: "Analysis", 
        awayTeam: "Comparison", 
        date, 
        context: "Synthesis Mode",
        uploadedContent: {
          contextAnalysis: fileContent1,
          noContextAnalysis: fileContent2
        },
        useAutoSearch: autoSearch
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'context' | 'no-context') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain') {
      alert("TXT 파일만 업로드 가능합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (type === 'context') {
        setFileWithContext(file);
        setFileContent1(text);
      } else {
        setFileNoContext(file);
        setFileContent2(text);
      }
    };
    reader.readAsText(file);
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

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 relative">
      
      <div className="flex border-b border-slate-700 mb-6">
        <button
          type="button"
          onClick={() => setMode('cart')}
          className={`flex-1 pb-3 text-sm font-bold transition-colors ${
            mode === 'cart' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🛒 조합 추천기 (Best)
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
          ⚽ 단일 정밀 분석
        </button>
        <button
          type="button"
          onClick={() => setMode('synthesis')}
          className={`flex-1 pb-3 text-sm font-bold transition-colors ${
            mode === 'synthesis' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📂 파일 종합
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
        
        {!showPasteArea && (
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

        {/* --- DYNAMIC MODE CONTENT --- */}

        {mode === 'cart' && (
            <div className="mb-4">
                  {!showPasteArea ? (
                      <button 
                        type="button"
                        onClick={() => setShowPasteArea(true)}
                        className="w-full py-3 bg-indigo-900/50 hover:bg-indigo-800/50 text-indigo-300 border border-indigo-700/50 rounded-lg flex items-center justify-center font-bold text-sm transition-all"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        📋 배트맨 사이트 텍스트 붙여넣기 (자동 파싱)
                      </button>
                  ) : (
                      <div className="bg-slate-900 rounded-lg p-4 border border-indigo-500/50">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-indigo-400 text-xs font-bold">배트맨 목록을 복사해서 붙여넣으세요</label>
                              <button type="button" onClick={() => setShowPasteArea(false)} className="text-xs text-slate-500 hover:text-white">닫기</button>
                          </div>
                          <textarea
                            value={pasteInput}
                            onChange={(e) => setPasteInput(e.target.value)}
                            placeholder={`예시:\n농구\n울산모비 : 고양소노\n...`}
                            className="w-full bg-slate-800 text-slate-300 text-xs p-3 rounded h-32 focus:outline-none focus:border-indigo-500 mb-3"
                          />
                          <button
                            type="button"
                            onClick={handleBulkParse}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-sm shadow-md"
                          >
                            ✨ 경기 자동 추출 및 카트에 담기
                          </button>
                      </div>
                  )}

                  <div className="mt-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         {/* Manual input for cart */}
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
                        className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-slate-600 border-dashed rounded-lg mb-4 flex items-center justify-center font-bold"
                     >
                        + 리스트에 추가
                     </button>

                     {/* Folder Selection */}
                     <div className="flex items-center justify-end mb-2 space-x-2">
                        <label className="text-xs text-slate-400 font-bold">🎯 조합 수 선택:</label>
                        <select 
                            value={folderCount}
                            onChange={(e) => setFolderCount(Number(e.target.value))}
                            className="bg-slate-900 border border-emerald-600 text-emerald-400 text-xs rounded px-2 py-1 font-bold focus:outline-none"
                        >
                            <option value={2}>2폴더 (안전 위주)</option>
                            <option value={3}>3폴더 (밸런스)</option>
                            <option value={4}>4폴더 (고배당 도전)</option>
                            <option value={5}>5폴더 (로또픽)</option>
                        </select>
                     </div>

                     {/* Cart List */}
                     <div className="bg-slate-900/80 rounded-lg p-4 min-h-[100px] border border-slate-700">
                        <h3 className="text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider flex justify-between">
                            <span>분석 대기 리스트 ({cart.length})</span>
                            <span className="text-emerald-500">2경기 이상 권장</span>
                        </h3>
                        {cart.length === 0 ? (
                            <p className="text-slate-600 text-sm text-center py-4">
                                관심 있는 경기를 추가하세요.<br/>
                                (여러 경기를 넣으면 AI가 옥석을 가려줍니다)
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {cart.map(item => (
                                    <li key={item.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 w-16 text-center truncate">{item.sport}</span>
                                            <div>
                                                <span className="text-sm font-bold text-white">{item.homeTeam}</span>
                                                {item.homeTeamKo && <span className="text-xs text-slate-400 ml-1">({item.homeTeamKo})</span>}
                                            </div>
                                            <span className="text-xs text-slate-500">vs</span>
                                            <div>
                                                <span className="text-sm font-bold text-white">{item.awayTeam}</span>
                                                {item.awayTeamKo && <span className="text-xs text-slate-400 ml-1">({item.awayTeamKo})</span>}
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-red-400 hover:text-red-300 p-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                     </div>
                </div>
            </div>
        )}

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

        {mode === 'synthesis' && (
          <div className="space-y-6 bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
             <div className="grid grid-cols-1 gap-6">
                <div className="relative">
                  <label className="block text-emerald-400 text-sm font-bold mb-2">📂 1. 맥락/뉴스 포함 분석</label>
                  <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'context')} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer bg-slate-900 rounded-lg border border-slate-600" />
                  {fileContent1 && <p className="mt-1 text-xs text-green-400">✓ 로드됨</p>}
                </div>
                <div className="relative">
                  <label className="block text-blue-400 text-sm font-bold mb-2">📂 2. 맥락 미포함 (데이터)</label>
                  <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, 'no-context')} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-slate-900 rounded-lg border border-slate-600" />
                  {fileContent2 && <p className="mt-1 text-xs text-green-400">✓ 로드됨</p>}
                </div>
             </div>
          </div>
        )}

        {/* --- GLOBAL SEARCH OPTION --- */}
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
          disabled={isLoading || (mode === 'cart' && cart.length < 2)}
          className={`w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.01] mt-2 ${
            isLoading || (mode === 'cart' && cart.length < 2)
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
            mode === 'cart' 
             ? `🚀 ${cart.length}경기 중 최고의 ${folderCount}폴더 조합 추천받기`
             : (mode === 'single' ? '⚽ 정밀 분석 시작' : '📂 종합 분석 실행')
          )}
        </button>
      </form>
    </div>
  );
};

export default MatchInput;
