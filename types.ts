export interface MatchData {
  homeTeam: string;
  awayTeam: string;
  date?: string;
  context?: string;
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
