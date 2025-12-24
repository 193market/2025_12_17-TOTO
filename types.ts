
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
  date?: string;
  context?: string;
  // 파일 업로드 분석을 위한 필드 추가
  uploadedContent?: {
    contextAnalysis: string; // 맥락이 포함된 분석 파일 내용
    noContextAnalysis: string; // 맥락이 없는(데이터 위주) 분석 파일 내용
  };
  // 인-컨텍스트 러닝을 위한 과거 데이터 (단순 문자열 배열로 전달됨, App.tsx에서 필터링 후 주입)
  trainingData?: string[];
}

export interface AnalysisState {
  isLoading: boolean;
  data: string | null;
  error: string | null;
  groundingMetadata?: any;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
