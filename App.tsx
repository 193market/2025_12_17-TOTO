
import React, { useState } from 'react';
import MatchInput from './components/MatchInput';
import AnalysisDisplay from './components/AnalysisDisplay';
import { analyzeMatch } from './services/geminiService';
import { MatchData, AnalysisState, TrainingSample } from './types';

const App: React.FC = () => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isLoading: false,
    data: null,
    error: null,
  });

  // [NEW] 학습된 데이터(컨텍스트)를 메모리에 저장하는 상태 (구조화된 데이터)
  const [learnedSamples, setLearnedSamples] = useState<TrainingSample[]>([]);

  const apiKey = process.env.API_KEY || '';

  // 학습 데이터 저장 핸들러 (중복 제거 및 누적)
  const handleLearn = (newSamples: TrainingSample[]) => {
    setLearnedSamples(prev => {
      // 내용(content)이 같은 것은 중복으로 간주하고 제거 (간단한 로직)
      const existingContents = new Set(prev.map(s => s.content));
      const uniqueNewSamples = newSamples.filter(s => !existingContents.has(s.content));
      
      return [...prev, ...uniqueNewSamples];
    });
  };

  const handleAnalyze = async (data: MatchData) => {
    if (!apiKey) {
      setAnalysisState({
        isLoading: false,
        data: null,
        error: "API 키가 누락되었습니다. 환경 변수 설정을 확인해주세요.",
      });
      return;
    }

    setAnalysisState({ isLoading: true, data: "", error: null });

    try {
      // [NEW] 스마트 필터링: 현재 분석하려는 종목(data.sport)과 일치하거나 'general'인 데이터만 추출
      const relevantSamples = learnedSamples.filter(sample => 
        sample.sport === 'general' || sample.sport === data.sport
      ).map(sample => sample.content); // string[] 형태로 변환하여 전달

      const finalMatchData: MatchData = {
        ...data,
        trainingData: [
          ...relevantSamples,            // 필터링된 학습 데이터
          ...(data.trainingData || [])   // (혹시 추가로 넘어온 일회성 데이터)
        ]
      };

      // analyzeMatch에 스트리밍 콜백 전달
      const result = await analyzeMatch(finalMatchData, apiKey, (chunkText) => {
         setAnalysisState(prev => ({
           ...prev,
           data: (prev.data || "") + chunkText, 
         }));
      });

      setAnalysisState(prev => ({
        isLoading: false,
        data: result.text || prev.data || "분석 결과가 없습니다.",
        groundingMetadata: result.groundingMetadata,
        error: null,
      }));

    } catch (err: any) {
      setAnalysisState({
        isLoading: false,
        data: null,
        error: err.message || "분석 중 예기치 않은 오류가 발생했습니다.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <svg className="w-6 h-6 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                MatchInsight AI
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-xs font-mono text-slate-500 border border-slate-700 px-2 py-1 rounded">
                POWERED BY GEMINI 3.0 & API-SPORTS
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Intro / Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            전문적인 스포츠 <span className="text-emerald-500">리스크 분석</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            API-Sports의 실시간 데이터와 Gemini의 추론 능력을 결합하여 
            축구, 농구, 야구 등 다양한 경기의 역학을 해석합니다.
          </p>
        </div>

        {/* Error Banner */}
        {analysisState.error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {analysisState.error}
          </div>
        )}

        {/* Input Form */}
        <div className="mb-12">
          <MatchInput 
            onAnalyze={handleAnalyze} 
            onLearn={handleLearn} 
            learnedCount={learnedSamples.length} 
            isLoading={analysisState.isLoading} 
            previousAnalysis={analysisState.data}
          />
        </div>

        {/* Analysis Output */}
        {(analysisState.data || analysisState.isLoading) && (
          <AnalysisDisplay 
            content={analysisState.data} 
            groundingMetadata={analysisState.groundingMetadata}
          />
        )}
        
        {/* Empty State / Placeholder */}
        {!analysisState.data && !analysisState.isLoading && !analysisState.error && (
          <div className="text-center text-slate-600 mt-20">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="font-mono text-sm">경기 종목과 팀 정보를 입력하면 분석이 시작됩니다...</p>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} MatchInsight AI. API-Sports & Google Gemini.</p>
          <p className="mt-2 text-xs">
            면책 조항: 이 도구는 통계 모델과 데이터를 기반으로 분석을 제공할 뿐, 결과를 보장하지 않습니다. 
            모든 투자의 책임은 본인에게 있습니다.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
