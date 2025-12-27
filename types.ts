
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

export interface CartItem {
  id: string;
  sport: SportType;
  homeTeam: string;
  awayTeam: string;
  homeTeamKo?: string; // [NEW] 홈팀 한글 이름
  awayTeamKo?: string; // [NEW] 원정팀 한글 이름
}

export interface AnalyzedMatchItem {
  homeTeam: string;
  awayTeam: string;
  homeTeamKo?: string; // [NEW] 결과 표시용
  awayTeamKo?: string; // [NEW] 결과 표시용
  prediction: string;
  confidence: number;
  reason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RecommendedCombination {
  rank: number;
  matches: AnalyzedMatchItem[];
  totalReason: string;
  expectedValue: string; // "High", "Medium" etc.
}

export interface BatchAnalysisResult {
  matches: AnalyzedMatchItem[];
  // [UPDATED] 다중 조합 지원을 위해 배열로 변경
  recommendedCombinations: RecommendedCombination[]; 
}
