
import React, { useState, useEffect, useRef } from 'react';
import MatchInput from './components/MatchInput';
import AnalysisDisplay from './components/AnalysisDisplay';
import { analyzeMatch, recommendCombination } from './services/geminiService';
import { MatchData, AnalysisState, TrainingSample, CartItem, SportType, GameType } from './types';

const STORAGE_KEY = 'matchInsight_learnedSamples';

const App: React.FC = () => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isLoading: false,
    data: null,
    error: null,
    batchResult: null,
  });

  const [learnedSamples, setLearnedSamples] = useState<TrainingSample[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [isApiKeyReady, setIsApiKeyReady] = useState<boolean>(!!process.env.API_KEY);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLearnedSamples(parsed);
        }
      } catch (e) {
        console.error("Failed to load learned samples", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learnedSamples));
  }, [learnedSamples]);

  useEffect(() => {
    const checkKey = async () => {
      if (process.env.API_KEY) {
        setIsApiKeyReady(true);
        return;
      }
      if (window.aistudio) {
        try {
            const has = await window.aistudio.hasSelectedApiKey();
            if (has) {
                setIsApiKeyReady(true);
            }
        } catch (e) {
            console.error("Failed to check API key status", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleSelectApiKey = async () => {
      if (window.aistudio) {
          try {
              await window.aistudio.openSelectKey();
              // Race condition mitigation: Assume success
              setIsApiKeyReady(true);
              setResetKey(prev => prev + 1); // Force re-render
          } catch (e) {
              console.error("API Key selection failed", e);
              alert("API 키 선택 중 오류가 발생했습니다. 다시 시도해주세요.");
          }
      } else {
          alert("이 환경에서는 API 키 자동 선택을 지원하지 않습니다. .env 파일을 확인해주세요.");
      }
  };

  const handleLearn = (newSamples: TrainingSample[]) => {
    setLearnedSamples(prev => {
      const existingContents = new Set(prev.map(s => s.content));
      const uniqueNewSamples = newSamples.filter(s => !existingContents.has(s.content));
      return [...prev, ...uniqueNewSamples];
    });
  };

  const handleClearLearning = () => {
    if (window.confirm("저장된 모든 학습 데이터를 삭제하시겠습니까?")) {
        setLearnedSamples([]);
        localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleReset = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      setAnalysisState({
          isLoading: false,
          data: null,
          error: null,
          batchResult: null,
      });
      setResetKey(prev => prev + 1);
  };

  const handleStopAnalysis = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setAnalysisState(prev => ({
              ...prev,
              isLoading: false,
              error: "사용자에 의해 분석이 중지되었습니다."
          }));
      }
  };

  const handleAnalyze = async (data: MatchData) => {
    const currentApiKey = process.env.API_KEY;
    if (!currentApiKey) {
      setAnalysisState({ isLoading: false, data: null, error: "API 키가 누락되었습니다. 상단의 키 설정을 확인해주세요." });
      return;
    }
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setAnalysisState({ isLoading: true, data: "", error: null, batchResult: null });

    try {
      const relevantSamples = learnedSamples.filter(sample => sample.sport === 'general' || sample.sport === data.sport).map(sample => sample.content);
      const finalMatchData: MatchData = { ...data, trainingData: [...relevantSamples, ...(data.trainingData || [])] };

      const result = await analyzeMatch(
          finalMatchData, 
          currentApiKey, 
          (chunkText) => {
             setAnalysisState(prev => ({ ...prev, data: (prev.data || "") + chunkText }));
          },
          abortControllerRef.current.signal
      );

      setAnalysisState(prev => ({ isLoading: false, data: result.text || prev.data || "분석 결과가 없습니다.", groundingMetadata: result.groundingMetadata, error: null, batchResult: null }));

    } catch (err: any) {
      if (err.message === "사용자에 의해 분석이 중지되었습니다.") return;
      setAnalysisState({ isLoading: false, data: null, error: err.message || "분석 중 예기치 않은 오류가 발생했습니다." });
    }
  };

  const handleRecommend = async (cartItems: CartItem[], folderCount: number, recommendationCount: number, useAutoSearch: boolean, analysisMode: 'combination' | 'all', targetGameType?: GameType, globalStrategy?: string) => {
     const currentApiKey = process.env.API_KEY;
     if (!currentApiKey) {
       setAnalysisState({ isLoading: false, data: null, error: "API 키가 누락되었습니다." });
       return;
     }

     if (abortControllerRef.current) abortControllerRef.current.abort();
     abortControllerRef.current = new AbortController();

     const loadingMsg = analysisMode === 'all' 
        ? `전체 ${cartItems.length}경기 승부식 분석을 진행 중입니다... (자동 검색: ${useAutoSearch ? 'ON' : 'OFF'})`
        : `${folderCount}폴더 조합(${recommendationCount}개 SET) 분석을 시작합니다... (자동 검색: ${useAutoSearch ? 'ON' : 'OFF'})`;

     setAnalysisState({ isLoading: true, data: loadingMsg, error: null, batchResult: null });

     try {
       const result = await recommendCombination(
           cartItems, 
           currentApiKey, 
           (statusMsg) => {
               setAnalysisState(prev => ({ ...prev, data: statusMsg }));
           }, 
           folderCount, 
           recommendationCount, 
           useAutoSearch,
           abortControllerRef.current.signal,
           analysisMode,
           targetGameType,
           globalStrategy
       );
       
       setAnalysisState({ isLoading: false, data: null, batchResult: result, error: null });

     } catch (err: any) {
       if (err.message === "사용자에 의해 분석이 중지되었습니다.") return;
       setAnalysisState({ isLoading: false, data: null, error: err.message });
     }
  };

  const handleSelectMatchFromBatch = (home: string, away: string, sport: SportType) => {
      handleAnalyze({
          sport,
          homeTeam: home,
          awayTeam: away,
          context: `(From Recommended Combination) 정밀 재분석 요청: ${home} vs ${away}`,
          useAutoSearch: true 
      });
  };

  // [RENDER] API Key Selection Screen
  if (!isApiKeyReady) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full animate-fade-in-up">
                  <div className="mb-6 flex justify-center">
                       <div className="bg-emerald-500/20 p-4 rounded-full">
                           <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                       </div>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">API 키 설정 필요</h1>
                  <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                      MatchInsight AI를 사용하려면 <strong>Google Gemini API 키</strong>가 필요합니다.<br/>
                      Gemini 3.0 Pro 모델(유료 권장)을 사용하기 위해<br/>
                      아래 버튼을 눌러 키를 선택해주세요.
                  </p>
                  
                  <button 
                      onClick={handleSelectApiKey}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-[1.02] active:scale-95 mb-4"
                  >
                      🔑 API 키 선택 / 연결하기
                  </button>

                  <div className="text-xs text-slate-600 space-y-2">
                       <p>
                           * API 키는 브라우저에 저장되지 않으며<br/>
                           Google 환경 변수를 통해 안전하게 주입됩니다.
                       </p>
                       <p>
                           <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-400 transition-colors">
                               Billing(결제) 설정 안내 보기
                           </a>
                       </p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo Area - Acts as Home */}
            <button 
                onClick={handleReset}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none group"
                title="처음으로 돌아가기 (새로운 분석)"
            >
              <div className="bg-emerald-500 p-2 rounded-lg group-hover:bg-emerald-400 transition-colors">
                <svg className="w-6 h-6 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 group-hover:from-emerald-300 group-hover:to-cyan-300">MatchInsight AI</span>
            </button>
            
            <div className="flex items-center space-x-4">
               {/* Explicit Home Button for User Clarity */}
               <button 
                   onClick={handleReset}
                   className="flex items-center space-x-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors border border-slate-700"
                   title="현재 분석 내용을 지우고 처음으로 돌아갑니다"
               >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                   <span className="text-sm font-bold">홈으로</span>
               </button>

               <div className="hidden md:flex items-center space-x-4">
                  {learnedSamples.length > 0 && (
                    <button onClick={handleClearLearning} className="text-xs text-slate-500 hover:text-red-400 transition-colors">학습 데이터 초기화 ({learnedSamples.length})</button>
                  )}
                  <span className="text-xs font-mono text-slate-500 border border-slate-700 px-2 py-1 rounded">POWERED BY GEMINI 3.0</span>
               </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">전문적인 스포츠 <span className="text-emerald-500">리스크 분석</span></h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">API-Sports의 실시간 데이터와 Gemini의 추론 능력을 결합하여 축구, 농구, 야구 등 다양한 경기의 역학을 해석합니다.</p>
        </div>

        {/* [STOP BUTTON UI] */}
        {analysisState.isLoading && (
            <div className="fixed bottom-8 right-8 z-50 animate-bounce">
                <button 
                    onClick={handleStopAnalysis}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-full shadow-lg border-2 border-red-400 flex items-center gap-2 transform transition-transform hover:scale-105"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    분석 중지 (STOP)
                </button>
            </div>
        )}

        {analysisState.error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg flex items-center animate-pulse">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {analysisState.error}
          </div>
        )}

        <div className="mb-12">
          <MatchInput 
            key={resetKey}
            onAnalyze={handleAnalyze} 
            onRecommend={handleRecommend}
            onLearn={handleLearn} 
            learnedCount={learnedSamples.length} 
            isLoading={analysisState.isLoading} 
            previousAnalysis={analysisState.data}
          />
        </div>

        {(analysisState.data || analysisState.batchResult || analysisState.isLoading) && (
          <AnalysisDisplay 
            content={analysisState.data} 
            isLoading={analysisState.isLoading}
            groundingMetadata={analysisState.groundingMetadata}
            batchResult={analysisState.batchResult} 
            onSelectMatch={handleSelectMatchFromBatch}
            onLearn={handleLearn} 
          />
        )}
        
        {!analysisState.data && !analysisState.batchResult && !analysisState.isLoading && !analysisState.error && (
          <div className="text-center text-slate-600 mt-20">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <p className="font-mono text-sm">경기 종목과 팀 정보를 입력하면 분석이 시작됩니다...</p>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} MatchInsight AI. API-Sports & Google Gemini.</p>
          <p className="mt-2 text-xs">면책 조항: 이 도구는 통계 모델과 데이터를 기반으로 분석을 제공할 뿐, 결과를 보장하지 않습니다. 모든 투자의 책임은 본인에게 있습니다.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
