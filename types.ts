
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
  images?: string[]; // [UPDATED] 다중 이미지 지원 (Base64 string array)
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
export type AnalysisStrategy = 'ALL' | 'AXIS' | 'TRAP' | 'ERASER'; // [NEW] 분석 전략 타입

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
  prediction: string; // "승", "무", "패", "승/무", "승/무/패" 등
  confidence: number;
  reason: string;
  recommendedStake?: string; // [NEW] 권장 베팅 금액 (예: "5,000원")
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  odds?: { home: string; draw: string; away: string }; // [NEW] 배당률 정보
  gameType?: GameType; // [NEW] 분석된 게임 유형
  criteria?: string;   // [NEW] 분석된 기준점
  strategyStatus?: 'AXIS' | 'TRAP' | 'ERASER' | 'NONE'; // [NEW] 3단계 전략 분류
  riskType?: 'TYPE-A' | 'TYPE-B' | 'TYPE-C' | 'TYPE-D'; // [NEW] 리스크 유형 (정보, 동기, 시장, 상성)
}

export interface RecommendedCombination {
  rank: number;
  matches: AnalyzedMatchItem[];
  totalReason: string;
  expectedValue: string; // "High", "Medium" etc.
  riskValidation?: string; // [NEW] 리스크 디커플링 검증 메시지 (스트레스 테스트 결과)
}

export interface BatchAnalysisResult {
  matches: AnalyzedMatchItem[];
  recommendedCombinations: RecommendedCombination[]; 
  groundingMetadata?: any; // [NEW] 검색 출처 메타데이터
}
