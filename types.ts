
export type SportType = 'football' | 'basketball' | 'baseball' | 'volleyball' | 'hockey';

export interface TrainingSample {
  id: string; // 중복 제거 및 관리를 위한 ID (해시값 또는 내용 기반)
  content: string;
  sport: SportType | 'general'; // 자동 감지된 종목
}

export interface MatchData {
  sport: SportType;
  homeTeam: string;
  awayTeam: string;
  homeTeamKo?: string; // [NEW] 홈팀 한글 이름
  awayTeamKo?: string; // [NEW] 원정팀 한글 이름
  date?: string;
  context?: string;
  useAutoSearch?: boolean;
  uploadedContent?: {
    contextAnalysis: string;
    noContextAnalysis: string;
  };
  trainingData?: string[];
}

export interface AnalysisState {
  isLoading: boolean;
  data: string | null;
  error: string | null;
  groundingMetadata?: any;
  batchResult?: BatchAnalysisResult | null;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type GameType = 'General' | 'Handicap' | 'UnOver' | 'Sum' | 'Mixed';

export interface CartItem {
  id: string;
  sport: SportType;
  homeTeam: string;
  awayTeam: string;
  homeTeamKo?: string; // [NEW] 홈팀 한글 이름
  awayTeamKo?: string; // [NEW] 원정팀 한글 이름
  voteRates?: string; // [NEW] 투표율 정보
  gameType?: GameType; // [NEW] 게임 유형 (일반, 핸디캡 등)
  criteria?: string;   // [NEW] 기준점 (예: -1.0, 2.5)
}

export interface AnalyzedMatchItem {
  homeTeam: string;
  awayTeam: string;
  homeTeamKo?: string; // [NEW] 결과 표시용
  awayTeamKo?: string; // [NEW] 결과 표시용
  prediction: string; // "승", "무", "패", "홈승", "원정승" 등
  confidence: number;
  reason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  odds?: { home: string; draw: string; away: string }; // [NEW] 배당률 정보
  gameType?: GameType; // [NEW] 분석된 게임 유형
  criteria?: string;   // [NEW] 분석된 기준점
}

export interface RecommendedCombination {
  rank: number;
  matches: AnalyzedMatchItem[];
  totalReason: string;
  expectedValue: string; // "High", "Medium" etc.
}

export interface BatchAnalysisResult {
  matches: AnalyzedMatchItem[];
  recommendedCombinations: RecommendedCombination[]; 
  groundingMetadata?: any; // [NEW] 검색 출처 메타데이터
}
