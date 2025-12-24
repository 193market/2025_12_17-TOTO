
import React, { useState, useRef } from 'react';
import { MatchData, SportType, TrainingSample } from '../types';

interface MatchInputProps {
  onAnalyze: (data: MatchData) => void;
  onLearn: (samples: TrainingSample[]) => void; // 변경: 객체 배열 전달
  learnedCount: number;
  isLoading: boolean;
  previousAnalysis?: string | null;
}

// 한글 팀명/국가명 -> 영문 공식 명칭 매핑 데이터
const TEAM_MAPPINGS: Record<string, string> = {
  // [축구 - EPL]
  '토트넘': 'Tottenham', '스퍼스': 'Tottenham', '토트넘홋스퍼': 'Tottenham',
  '맨시티': 'Manchester City', '맨체스터시티': 'Manchester City',
  '맨유': 'Manchester United', '맨체스터유나이티드': 'Manchester United',
  '리버풀': 'Liverpool',
  '아스날': 'Arsenal', '아스널': 'Arsenal',
  '첼시': 'Chelsea',
  '울버햄튼': 'Wolverhampton', '울버햄턴': 'Wolverhampton', '늑대군단': 'Wolverhampton',
  '아스톤빌라': 'Aston Villa', '애스턴빌라': 'Aston Villa',
  '뉴캐슬': 'Newcastle',
  '브라이튼': 'Brighton', '브라이턴': 'Brighton',
  '웨스트햄': 'West Ham',
  '에버튼': 'Everton', '에버턴': 'Everton',
  '노팅엄': 'Nottingham Forest',
  '풀럼': 'Fulham', '펄럼': 'Fulham',
  '팰리스': 'Crystal Palace', '크리스탈팰리스': 'Crystal Palace',
  '브렌트포드': 'Brentford',

  // [축구 - 라리가]
  '레알': 'Real Madrid', '레알마드리드': 'Real Madrid',
  '바르셀로나': 'Barcelona', '바르사': 'Barcelona', '꾸레': 'Barcelona',
  '아틀레티코': 'Atletico Madrid', 'at마드리드': 'Atletico Madrid', '꼬마': 'Atletico Madrid',
  '소시에다드': 'Real Sociedad',
  '빌바오': 'Athletic Club',
  '지로나': 'Girona',
  '발렌시아': 'Valencia',
  '세비야': 'Sevilla',

  // [축구 - 분데스리가]
  '뮌헨': 'Bayern Munich', '바이에른뮌헨': 'Bayern Munich', '바이언': 'Bayern Munich',
  '도르트문트': 'Dortmund', '돌문': 'Dortmund',
  '레버쿠젠': 'Bayer Leverkusen',
  '라이프치히': 'RB Leipzig',
  '슈투트가르트': 'VfB Stuttgart',
  '마인츠': 'Mainz',

  // [축구 - 세리에A]
  '나폴리': 'Napoli',
  '유벤투스': 'Juventus',
  '인터밀란': 'Inter', '인테르': 'Inter',
  'ac밀란': 'AC Milan', '밀란': 'AC Milan',
  '로마': 'AS Roma',
  '라치오': 'Lazio',
  '아탈란타': 'Atalanta',

  // [축구 - 리그앙]
  '파리': 'Paris Saint Germain', 'psg': 'Paris Saint Germain', '파리생제르맹': 'Paris Saint Germain',
  '모나코': 'Monaco',
  '릴': 'Lille',
  '마르세유': 'Marseille',

  // [축구 - K리그]
  '울산': 'Ulsan Hyundai', '울산현대': 'Ulsan Hyundai', '울산hd': 'Ulsan Hyundai',
  '전북': 'Jeonbuk Motors', '전북현대': 'Jeonbuk Motors',
  '포항': 'Pohang Steelers', '포항스틸러스': 'Pohang Steelers',
  '서울': 'FC Seoul', 'fc서울': 'FC Seoul',
  '수원': 'Suwon Samsung Bluewings', '수원삼성': 'Suwon Samsung Bluewings',
  '광주': 'Gwangju FC', '광주fc': 'Gwangju FC',
  '인천': 'Incheon United', '인천유나이티드': 'Incheon United',
  '대구': 'Daegu FC', '대구fc': 'Daegu FC',
  '대전': 'Daejeon Hana Citizen', '대전하나시티즌': 'Daejeon Hana Citizen',
  '강원': 'Gangwon FC', '강원fc': 'Gangwon FC',
  '제주': 'Jeju United', '제주유나이티드': 'Jeju United',

  // [야구 - MLB]
  '다저스': 'Los Angeles Dodgers', 'la다저스': 'Los Angeles Dodgers',
  '양키스': 'New York Yankees', '뉴욕양키스': 'New York Yankees',
  '샌디에이고': 'San Diego Padres', '파드리스': 'San Diego Padres', '샌디': 'San Diego Padres',
  '샌프란시스코': 'San Francisco Giants', '자이언츠': 'San Francisco Giants',
  '보스턴': 'Boston Red Sox', '레드삭스': 'Boston Red Sox', 
  '휴스턴': 'Houston Astros', '애스트로스': 'Houston Astros',
  '텍사스': 'Texas Rangers', '레인저스': 'Texas Rangers',
  '애틀랜타': 'Atlanta Braves', '브레이브스': 'Atlanta Braves',
  '필라델피아': 'Philadelphia Phillies', '필리스': 'Philadelphia Phillies',
  '토론토': 'Toronto Blue Jays', '블루제이스': 'Toronto Blue Jays',

  // [농구 - NBA]
  '레이커스': 'Los Angeles Lakers', 'la레이커스': 'Los Angeles Lakers',
  '골스': 'Golden State Warriors', '골든스테이트': 'Golden State Warriors', '워리어스': 'Golden State Warriors',
  '클리퍼스': 'Los Angeles Clippers', 'la클리퍼스': 'Los Angeles Clippers',
  '셀틱스': 'Boston Celtics', 
  '마이애미': 'Miami Heat', '히트': 'Miami Heat',
  '덴버': 'Denver Nuggets', '너게츠': 'Denver Nuggets',
  '피닉스': 'Phoenix Suns', '선즈': 'Phoenix Suns',
  '밀워키': 'Milwaukee Bucks', '벅스': 'Milwaukee Bucks',

  // [국가대표 - 축구/야구 공통]
  '대한민국': 'South Korea', '한국': 'South Korea', '국대': 'South Korea',
  '일본': 'Japan',
  '중국': 'China',
  '미국': 'USA', '천조국': 'USA',
  '잉글랜드': 'England', '영국': 'England',
  '프랑스': 'France',
  '독일': 'Germany',
  '스페인': 'Spain',
  '포르투갈': 'Portugal',
  '이탈리아': 'Italy', '이태리': 'Italy',
  '네덜란드': 'Netherlands',
  '벨기에': 'Belgium',
  '브라질': 'Brazil',
  '아르헨티나': 'Argentina', '아르헨': 'Argentina',
  '우루과이': 'Uruguay',
  '크로아티아': 'Croatia',
  '호주': 'Australia',
  '사우디': 'Saudi Arabia', '사우디아라비아': 'Saudi Arabia',
  '이란': 'Iran',
  '카타르': 'Qatar',
  '요르단': 'Jordan',
  '베트남': 'Vietnam',
  '태국': 'Thailand',
  '우즈벡': 'Uzbekistan', '우즈베키스탄': 'Uzbekistan',
  '인도네시아': 'Indonesia',
  '말레이시아': 'Malaysia'
};

const DEFAULT_CONTEXT = `(초보자 모드) 
다음 내용을 꼭 포함해줘:
1. 어려운 용어(핸디캡, 언오버 등) 쓰지 말고 "몇 점 차 승리" 처럼 쉽게 설명해줘.
2. 경기장 날씨나 감독 이슈 같은 최신 뉴스가 있다면 꼭 검색해서 반영해줘.
3. 정말 확실하지 않으면 "이번엔 쉬어가세요(NO BET)"라고 솔직하게 말해줘.`;

// 간단한 키워드 기반 종목 감지 함수
const detectSport = (text: string): SportType | 'general' => {
  const t = text.toLowerCase();
  
  // 야구 키워드
  if (t.includes("이닝") || t.includes("투수") || t.includes("타자") || t.includes("방어율") || t.includes("홈런") || t.includes("선발") || t.includes("era")) return 'baseball';
  
  // 농구 키워드
  if (t.includes("쿼터") || t.includes("리바운드") || t.includes("3점") || t.includes("자유투") || t.includes("어시스트") || t.includes("가드") || t.includes("포워드")) return 'basketball';
  
  // 배구 키워드
  if (t.includes("세트") && (t.includes("서브") || t.includes("블로킹") || t.includes("리시브") || t.includes("공격 성공률"))) return 'volleyball';
  
  // 하키 키워드
  if (t.includes("피리어드") || t.includes("퍽") || t.includes("파워플레이") || t.includes("골리")) return 'hockey';
  
  // 축구 키워드 (가장 일반적이므로 마지막에 체크하거나 특정 키워드 확인)
  if (t.includes("전반") || t.includes("후반") || t.includes("골키퍼") || t.includes("수비수") || t.includes("미드필더") || t.includes("코너킥") || t.includes("오프사이드")) return 'football';

  return 'general';
};

const MatchInput: React.FC<MatchInputProps> = ({ onAnalyze, onLearn, learnedCount, isLoading, previousAnalysis }) => {
  const [mode, setMode] = useState<'new' | 'synthesis'>('new');
  const [sport, setSport] = useState<SportType>('football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  
  // 학습 관련 로컬 상태
  const [selectedTrainingFiles, setSelectedTrainingFiles] = useState<TrainingSample[]>([]);
  const [fileCount, setFileCount] = useState(0);

  // 파일 업로드 관련 상태 (종합 모드용)
  const [fileWithContext, setFileWithContext] = useState<File | null>(null);
  const [fileNoContext, setFileNoContext] = useState<File | null>(null);
  const [fileContent1, setFileContent1] = useState<string>('');
  const [fileContent2, setFileContent2] = useState<string>('');
  
  const [conversionMsg, setConversionMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const trainingInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'new') {
      if (!homeTeam || !awayTeam) return;
      
      onAnalyze({ 
        sport, 
        homeTeam, 
        awayTeam, 
        date, 
        context: context + (learnedCount > 0 ? `\n\n[System] 메모리에 저장된 ${learnedCount}개의 스타일을 참조하여 분석합니다.` : ""),
        trainingData: [] 
      });
    } else {
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
        }
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

  const handleTrainingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    const validFiles = fileList.filter(f => f.type === 'text/plain' || f.name.endsWith('.txt'));
    
    if (validFiles.length === 0) {
        alert("TXT 파일이 없습니다.");
        return;
    }

    let loadedCount = 0;
    const samples: TrainingSample[] = [];

    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            // 자동 종목 감지
            const detectedSport = detectSport(text);
            
            samples.push({
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              content: text,
              sport: detectedSport
            });
            
            loadedCount++;
            
            if (loadedCount === validFiles.length) {
                setSelectedTrainingFiles(samples);
                setFileCount(loadedCount);
            }
        };
        reader.readAsText(file);
    });
  };

  const handleExecuteLearn = () => {
    if (selectedTrainingFiles.length === 0) {
        alert("먼저 학습할 파일들을 선택해주세요.");
        return;
    }
    
    // 감지된 종목 통계
    const sportCounts = selectedTrainingFiles.reduce((acc, curr) => {
        acc[curr.sport] = (acc[curr.sport] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const summary = Object.entries(sportCounts)
        .map(([sp, count]) => `${sp}: ${count}개`)
        .join(', ');

    onLearn(selectedTrainingFiles);
    
    // UI 초기화
    setSelectedTrainingFiles([]);
    setFileCount(0);
    if (trainingInputRef.current) trainingInputRef.current.value = '';
    
    alert(`학습 완료!\n자동 분류 결과: ${summary}\n이제 분석 시 자동으로 해당 종목의 스타일을 적용합니다.`);
  };

  const handleTeamBlur = (type: 'home' | 'away') => {
    const currentName = type === 'home' ? homeTeam : awayTeam;
    if (!currentName) return;

    const normalizedInput = currentName.replace(/\s+/g, '').toLowerCase();
    
    const converted = TEAM_MAPPINGS[normalizedInput];
    if (converted && converted.toLowerCase() !== currentName.toLowerCase()) {
      if (type === 'home') setHomeTeam(converted);
      else setAwayTeam(converted);
      
      setConversionMsg(`'${currentName}' → '${converted}' 자동 변환됨`);
      setWarningMsg(null);
      setTimeout(() => setConversionMsg(null), 3000);
      return;
    }

    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentName);
    if (isKorean) {
        const matches = Object.keys(TEAM_MAPPINGS).filter(key => key.includes(normalizedInput));
        if (matches.length > 0) {
            const uniqueSuggestions = Array.from(new Set(matches.map(k => TEAM_MAPPINGS[k]))).slice(0, 3);
            setWarningMsg(`변환 실패. 추천: ${uniqueSuggestions.join(', ')}`);
        } else {
            setWarningMsg(`공식 영문 명칭을 찾을 수 없습니다.`);
        }
        setConversionMsg(null);
        setTimeout(() => setWarningMsg(null), 6000);
    }
  };

  const extractContextFromAnalysis = () => {
    if (!previousAnalysis) return;
    let extractedText = "";
    const summaryMatch = previousAnalysis.match(/한 줄 요약:\s*(.*?)(\n|$)/);
    if (summaryMatch && summaryMatch[1]) extractedText += `[이전 요약: ${summaryMatch[1].trim()}] `;
    
    if (extractedText) {
      setContext((prev) => {
        const prefix = prev ? prev + "\n\n" : "";
        return prefix + "재분석 요청: " + extractedText;
      });
    } else {
      alert("추출할 핵심 정보가 부족합니다.");
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
          onClick={() => setMode('new')}
          className={`flex-1 pb-3 text-sm font-bold transition-colors ${
            mode === 'new' 
              ? 'text-emerald-400 border-b-2 border-emerald-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚽ 새로운 경기 분석
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
          📂 분석 결과 종합
        </button>
      </div>

      <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mode === 'new' ? (
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          ) : (
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          )}
        </svg>
        {mode === 'new' ? '새로운 분석 요청' : '두 분석 결과 비교 및 종합'}
      </h2>

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
        
        <div>
          <label className="block text-slate-400 text-sm font-semibold mb-2">분석 종목 (Sport)</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { id: 'football', label: '축구 ⚽' },
              { id: 'basketball', label: '농구 🏀' },
              { id: 'baseball', label: '야구 ⚾' },
              { id: 'volleyball', label: '배구 🏐' },
              { id: 'hockey', label: '하키 🏒' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSport(s.id as SportType)}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors border ${
                  sport === s.id
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'new' && (
          <>
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 mb-2">
              <p className="text-xs text-slate-400">
                * <span className="text-emerald-400 font-bold">Tip:</span> AI가 학습 파일을 자동으로 분석해 종목별로 분류합니다.
              </p>
            </div>

            <div className={`p-4 rounded-lg border mb-4 transition-colors ${learnedCount > 0 ? "bg-emerald-900/20 border-emerald-500/50" : "bg-slate-700/30 border-slate-600"}`}>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-emerald-400 text-sm font-bold flex items-center">
                        🧠 내 분석 스타일 학습시키기 (파일 자동 분류)
                    </label>
                    {learnedCount > 0 && (
                        <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                            {learnedCount}개 스타일 메모리 저장됨
                        </span>
                    )}
                </div>

                <input 
                    type="file" 
                    multiple 
                    ref={trainingInputRef}
                    onChange={handleTrainingFileSelect}
                    className="hidden"
                    accept=".txt"
                />
                
                <div className="flex space-x-2">
                    <button 
                        type="button"
                        onClick={() => trainingInputRef.current?.click()}
                        className="flex-1 py-2 px-4 rounded border text-sm transition-colors bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 flex justify-center items-center"
                    >
                         {fileCount > 0 ? `${fileCount}개 파일 분석됨` : "📂 학습용 파일 선택 (종목 혼합 가능)"}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={handleExecuteLearn}
                        disabled={fileCount === 0}
                        className={`flex-1 py-2 px-4 rounded border text-sm transition-colors font-bold flex justify-center items-center ${
                             fileCount > 0 
                             ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-lg" 
                             : "bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed"
                        }`}
                    >
                        🚀 지금 분류 및 학습하기
                    </button>
                </div>
            </div>

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
                  required
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
                  required
                />
              </div>
            </div>
              
            <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-slate-400 text-sm font-semibold">경기 맥락 (선택 & 가이드)</label>
                  {previousAnalysis && (
                    <button
                      type="button"
                      onClick={extractContextFromAnalysis}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded flex items-center transition-colors shadow-sm"
                    >
                      맥락 자동 추출
                    </button>
                  )}
                </div>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors h-32 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
                />
            </div>
          </>
        )}

        {mode === 'synthesis' && (
          <div className="space-y-6 bg-slate-900/50 p-6 rounded-lg border border-slate-700/50">
             <div className="text-sm text-slate-300 mb-4">
                <strong>[맥락]</strong> 파일과 <strong>[데이터]</strong> 파일을 각각 업로드하세요. <br/>
                AI가 두 관점을 합쳐서 <strong>[최종분석]</strong>을 도출합니다.
             </div>

             <div className="grid grid-cols-1 gap-6">
                <div className="relative">
                  <label className="block text-emerald-400 text-sm font-bold mb-2">📂 1. 맥락/뉴스 포함 분석</label>
                  <div className="flex items-center">
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => handleFileUpload(e, 'context')}
                      className="block w-full text-sm text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-emerald-600 file:text-white
                        hover:file:bg-emerald-500
                        cursor-pointer bg-slate-900 rounded-lg border border-slate-600"
                    />
                  </div>
                  {fileContent1 && <p className="mt-1 text-xs text-green-400">✓ 파일 로드 완료 ({fileContent1.length}자)</p>}
                </div>

                <div className="relative">
                  <label className="block text-blue-400 text-sm font-bold mb-2">📂 2. 맥락 미포함 (데이터 중심)</label>
                  <div className="flex items-center">
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => handleFileUpload(e, 'no-context')}
                      className="block w-full text-sm text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-500
                        cursor-pointer bg-slate-900 rounded-lg border border-slate-600"
                    />
                  </div>
                  {fileContent2 && <p className="mt-1 text-xs text-green-400">✓ 파일 로드 완료 ({fileContent2.length}자)</p>}
                </div>
             </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.01] mt-6 ${
            isLoading
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
              {learnedCount > 0 ? '🧠 학습된 스타일로 분석 시작' : '분석 시작'}
            </span>
          ) : (
            mode === 'new' ? (learnedCount > 0 ? '🧠 학습된 스타일로 분석 시작' : '분석 시작') : '최종 종합 분석 실행'
          )}
        </button>
      </form>
    </div>
  );
};

export default MatchInput;
