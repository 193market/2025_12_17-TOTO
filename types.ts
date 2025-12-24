
export type SportType = 'football' | 'basketball' | 'baseball' | 'volleyball' | 'hockey';

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
  // 인-컨텍스트 러닝을 위한 과거 데이터 (개별 파일들의 배열)
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
