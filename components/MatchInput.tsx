
import React, { useState } from 'react';
import { MatchData, SportType } from '../types';

interface MatchInputProps {
  onAnalyze: (data: MatchData) => void;
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

const DEFAULT_CONTEXT = `(비전문가 모드) 최종 픽 섹션을 작성할 때 다음 3가지를 추가해주세요:
1. 추천 강도를 '별 5개(⭐⭐⭐⭐⭐)' 만점으로 표시해 주세요.
2. '핸디캡', '언더오버' 같은 용어 대신 "홈팀이 2점 차 이상으로 이길 듯", "양 팀 합쳐 3골 이상 터질 듯" 처럼 풀어서 설명해 주세요.
3. 확신이 70% 미만이면 과감하게 'NO BET(베팅 금지)'이라고 적어주세요.

[추가 검색 요청]
경기 시간(현지 시각) 경기장 날씨를 검색해서 비가 오는지 확인해 주고, 최근 3일간 홈팀 감독 경질이나 불화설 같은 뉴스가 있는지 검색해서 분석에 반영해 줘. 배당률이 어제보다 급격히 떨어졌는지도 검색해 줘.`;

const MatchInput: React.FC<MatchInputProps> = ({ onAnalyze, isLoading, previousAnalysis }) => {
  const [sport, setSport] = useState<SportType>('football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  
  // 알림 메시지 상태
  const [conversionMsg, setConversionMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam) return;
    onAnalyze({ sport, homeTeam, awayTeam, date, context });
  };

  // 팀 이름 자동 변환 및 추천 핸들러
  const handleTeamBlur = (type: 'home' | 'away') => {
    const currentName = type === 'home' ? homeTeam : awayTeam;
    if (!currentName) return;

    // 공백 제거 및 소문자화
    const normalizedInput = currentName.replace(/\s+/g, '').toLowerCase();
    
    // 1. 정확한 매핑 확인
    const converted = TEAM_MAPPINGS[normalizedInput];
    if (converted && converted.toLowerCase() !== currentName.toLowerCase()) {
      if (type === 'home') setHomeTeam(converted);
      else setAwayTeam(converted);
      
      setConversionMsg(`'${currentName}' → '${converted}' 자동 변환됨`);
      setWarningMsg(null);
      setTimeout(() => setConversionMsg(null), 3000);
      return;
    }

    // 2. 한글 입력 시 유사 검색 또는 경고
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentName);
    if (isKorean) {
        // 포함된 키워드 검색 (Partial Match)
        const matches = Object.keys(TEAM_MAPPINGS).filter(key => key.includes(normalizedInput));
        
        if (matches.length > 0) {
            // 중복된 영문 팀명 제거 후 상위 3개만 추천
            const uniqueSuggestions = Array.from(new Set(matches.map(k => TEAM_MAPPINGS[k]))).slice(0, 3);
            const suggestionsStr = uniqueSuggestions.join(', ');
            
            setWarningMsg(`'${currentName}' 변환 실패. 혹시 다음 팀인가요? : ${suggestionsStr}`);
        } else {
            setWarningMsg(`'${currentName}'에 대한 영문명을 찾을 수 없습니다. 공식 영문 명칭을 직접 입력해주세요.`);
        }
        setConversionMsg(null);
        setTimeout(() => setWarningMsg(null), 6000); // 경고는 조금 더 오래 표시
    }
  };

  const extractContextFromAnalysis = () => {
    if (!previousAnalysis) return;

    let extractedText = "";

    const summaryMatch = previousAnalysis.match(/한 줄 요약:\s*(.*?)(\n|$)/);
    if (summaryMatch && summaryMatch[1]) {
      extractedText += `[이전 분석 요약: ${summaryMatch[1].trim()}] `;
    }

    const riskMatch = previousAnalysis.match(/리스크:\s*(.*?)(\n|$)/);
    if (riskMatch && riskMatch[1]) {
      extractedText += `[주요 리스크: ${riskMatch[1].trim()}] `;
    }

    const injuryMatch = previousAnalysis.match(/핵심 변수:.*?\n([\s\S]*?)(?=\n###|$)/);
    if (injuryMatch) {
        const cleanInjury = injuryMatch[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, 100);
        extractedText += `[변수: ${cleanInjury}...]`;
    }

    if (extractedText) {
      setContext((prev) => {
        const prefix = prev ? prev + "\n\n" : "";
        return prefix + "재분석 요청: " + extractedText;
      });
    } else {
      alert("추출할 핵심 정보가 분석 결과에 부족합니다.");
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
      <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        새로운 분석 요청
      </h2>

      {/* Success Notification */}
      {conversionMsg && (
        <div className="absolute top-4 right-6 bg-emerald-600/90 text-white text-xs px-3 py-1.5 rounded-full shadow-lg animate-fade-in-up border border-emerald-400/50 z-10">
          ✨ {conversionMsg}
        </div>
      )}

      {/* Warning/Suggestion Notification */}
      {warningMsg && (
        <div className="absolute top-4 right-6 bg-amber-600/95 text-white text-xs px-3 py-1.5 rounded-full shadow-lg animate-pulse border border-amber-400/50 z-10">
          💡 {warningMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Sport Selector */}
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

        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 mb-2">
          <p className="text-xs text-slate-400">
            * <span className="text-emerald-400 font-bold">Tip:</span> <span className="text-white font-bold">한글 팀명/국가명</span>을 입력하면 자동으로 <span className="text-emerald-300">영문 공식 명칭</span>으로 변환됩니다. (예: 대한민국 → South Korea)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">홈 팀 (Home Team)</label>
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
            <label className="block text-slate-400 text-sm font-semibold mb-2">원정 팀 (Away Team)</label>
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

        {/* Date Field */}
        <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">경기 날짜 (선택)</label>
             <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
            />
        </div>
           
        {/* Context Field (TextArea) */}
        <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-slate-400 text-sm font-semibold">경기 맥락 (선택 & 가이드)</label>
              {previousAnalysis && (
                <button
                  type="button"
                  onClick={extractContextFromAnalysis}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded flex items-center transition-colors shadow-sm"
                  title="이전 분석 결과에서 리스크와 요약을 추출하여 입력합니다"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  맥락 자동 추출
                </button>
              )}
            </div>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="예: 플레이오프 1차전, 선발 투수 XX"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors h-32 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
            />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.01] ${
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
              데이터 수집 및 분석 중...
            </span>
          ) : (
            '분석 시작'
          )}
        </button>
      </form>
    </div>
  );
};

export default MatchInput;
