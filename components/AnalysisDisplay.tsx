import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BatchAnalysisResult, SportType, TrainingSample } from '../types';

interface AnalysisDisplayProps {
  content: string | null;
  isLoading?: boolean; 
  groundingMetadata?: any;
  batchResult?: BatchAnalysisResult | null;
  onSelectMatch?: (home: string, away: string, sport: SportType) => void;
  onLearn?: (samples: TrainingSample[]) => void;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ content, isLoading, groundingMetadata, batchResult, onSelectMatch, onLearn }) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [learnSuccessMsg, setLearnSuccessMsg] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const learnedBatchRef = useRef<string | null>(null);
  const learnedContentRef = useRef<string | null>(null);

  // [HOOKS MOVED UP] All Hooks must be declared before any early return
  const parsedData = useMemo(() => {
    if (!content) return null;
    const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [content]);

  const displayContent = useMemo(() => {
    if (!content) return "";
    return content.replace(/```json\s*\{[\s\S]*?\}\s*```/g, "").replace(/\*\*\[Machine Data\]\*\*\s*\(.*\)/g, "").trim();
  }, [content]);

  const sources = useMemo(() => {
     const metadata = batchResult?.groundingMetadata || groundingMetadata;
     return metadata?.groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];
  }, [groundingMetadata, batchResult]);

  // Memoize Markdown components to avoid spreading 'node' prop to DOM elements
  const markdownComponents = useMemo(() => ({
      h1: ({node, ...props}: any) => <h1 className="text-3xl font-bold text-white mb-6 border-b border-slate-600 pb-2" {...props} />,
      h2: ({node, ...props}: any) => <h2 className="text-2xl font-bold text-emerald-400 mt-8 mb-4" {...props} />,
      h3: ({node, ...props}: any) => <h3 className="text-xl font-bold text-white mt-6 mb-3 flex items-center" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc list-inside space-y-2 mb-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50" {...props} />,
      li: ({node, ...props}: any) => <li className="text-slate-300" {...props} />,
      strong: ({node, ...props}: any) => <strong className="text-emerald-300 font-semibold" {...props} />,
      blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-emerald-500 pl-4 italic bg-slate-900 py-2 my-4 rounded-r-lg" {...props} />,
  }), []);

  const handleLearnResult = useCallback((textToLearn: string | null) => {
      if (!onLearn) return;
      if (!textToLearn) return;
      const cleanText = textToLearn.replace(/\*\*/g, "").replace(/#/g, "");
      onLearn([{
          id: Date.now().toString(),
          content: `[Previous Analysis]\n${cleanText.substring(0, 3000)}...`,
          sport: 'general'
      }]);
      setLearnSuccessMsg("분석 스타일 저장 완료!");
      
      const timer = setTimeout(() => {
          setLearnSuccessMsg(null);
      }, 3000);
      
      return timer; 
  }, [onLearn]);

  const handleBatchLearn = useCallback((autoTrigger = false) => {
      if (!batchResult || !onLearn) return;
      
      const resultHash = JSON.stringify(batchResult.matches.map(m => m.prediction + m.reason));
      if (autoTrigger && learnedBatchRef.current === resultHash) {
          return;
      }

      let text = "AI Analysis Pattern & Logic:\n\n";
      if (batchResult.recommendedCombinations && batchResult.recommendedCombinations.length > 0) {
          batchResult.recommendedCombinations.forEach((combo) => {
              text += `[Combination Logic]\nGlobal Insight: ${combo.totalReason}\n`;
              combo.matches.forEach(m => {
                 text += `- Match: ${m.homeTeamKo || m.homeTeam} vs ${m.awayTeamKo || m.awayTeam}\n- Prediction: ${m.prediction}\n- Reasoning: ${m.reason}\n`;
              });
              text += "\n";
          });
      } else {
          batchResult.matches.forEach(m => {
             text += `- Match: ${m.homeTeamKo || m.homeTeam} vs ${m.awayTeamKo || m.awayTeam}\n- Prediction: ${m.prediction}\n- Reasoning: ${m.reason}\n\n`;
          });
      }
      
      if (autoTrigger) {
          learnedBatchRef.current = resultHash;
          const cleanText = text.replace(/\*\*/g, "").replace(/#/g, "");
          onLearn([{
              id: Date.now().toString(),
              content: `[Previous Analysis]\n${cleanText.substring(0, 3000)}...`,
              sport: 'general'
          }]);
          setLearnSuccessMsg("분석 결과 자동 학습 완료!");
          setTimeout(() => setLearnSuccessMsg(null), 3000);
      } else {
          handleLearnResult(text);
      }
  }, [batchResult, onLearn, handleLearnResult]);
  
  // [EFFECTS]
  useEffect(() => {
      if (batchResult && !isLoading) { // Check isLoading here instead of early return
          handleBatchLearn(true);
      }
  }, [batchResult, isLoading, handleBatchLearn]);

  useEffect(() => {
      if (content && onLearn && !isLoading) { // Check isLoading here
          if (learnedContentRef.current === content) return;
          learnedContentRef.current = content;
          
          const cleanText = content.replace(/\*\*/g, "").replace(/#/g, "");
          onLearn([{
              id: Date.now().toString(),
              content: `[Previous Analysis]\n${cleanText.substring(0, 3000)}...`,
              sport: 'general'
          }]);
          setLearnSuccessMsg("단일 분석 결과 자동 학습 완료!");
          setTimeout(() => setLearnSuccessMsg(null), 3000);
      }
  }, [content, onLearn, isLoading]);

  // [HELPER FUNCTIONS]
  const getPredictionType = (pred: string | undefined | null) => {
      if (!pred) return 'UNKNOWN';
      const p = pred.replace(/\s/g, '');
      if (p.includes('/')) return 'COMBO'; // [NEW] Handle Double/Triple Chance
      if (p.includes('언더') || p.includes('오버') || p.includes('홀') || p.includes('짝')) return 'SPECIAL';
      if (p.includes('홈') || (p.includes('승') && !p.includes('원정') && !p.includes('패') && !p.includes('무')) && !p.includes('핸디')) return 'HOME';
      if (p.includes('핸디승')) return 'HOME'; 
      if (p.includes('무')) return 'DRAW';
      if (p.includes('원정') || p.includes('패')) return 'AWAY';
      if (p.includes('핸디패')) return 'AWAY'; 
      return 'UNKNOWN';
  };

  const getStrategyBadge = (status: string | undefined) => {
      if (!status || status === 'NONE') return null;
      switch (status) {
          case 'AXIS': return <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold ml-1 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">💎 축 (AXIS)</span>;
          case 'TRAP': return <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-bold ml-1 border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]">💣 함정 (TRAP)</span>;
          case 'ERASER': return <span className="text-[10px] bg-slate-500 text-white px-1.5 py-0.5 rounded font-bold ml-1 border border-slate-400">🧹 지우개 (ERASER)</span>;
          default: return null;
      }
  };

  const generatePdf = async (fileName: string) => {
    if (!contentRef.current) return;
    setIsPdfGenerating(true);
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`${fileName}.pdf`);
    } catch (err) {
      alert("PDF 생성 오류");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleSinglePdfDownload = () => generatePdf('MatchInsight_Report');
  const handleSingleTxtDownload = () => { if (content) downloadTxt(content, 'MatchInsight_Analysis.txt'); };
  const handleBatchPdfDownload = () => generatePdf('MatchInsight_Batch_Report');
  const handleBatchTxtDownload = () => {
      if (!batchResult) return;
      let text = "========================================\n";
      text += "      MATCH INSIGHT - PROTO REPORT\n";
      text += "========================================\n\n";
      
      if (batchResult.recommendedCombinations && batchResult.recommendedCombinations.length > 0) {
          batchResult.recommendedCombinations.forEach((combo) => {
              text += `[COMBINATION #${combo.rank}] - ${combo.expectedValue}\n`;
              text += `Reason: ${combo.totalReason}\n`;
              combo.matches.forEach(m => {
                  const typeInfo = m.gameType ? `[${m.gameType}${m.criteria ? ` ${m.criteria}` : ''}] ` : '';
                  text += `  - ${typeInfo}${m.homeTeamKo || m.homeTeam} vs ${m.awayTeamKo || m.awayTeam} : [${m.prediction}] (Conf: ${m.confidence}%)\n`;
              });
              text += "\n";
          });
      } else {
          batchResult.matches.forEach((m, idx) => {
              text += `[GAME ${idx + 1}] ${m.homeTeamKo || m.homeTeam} vs ${m.awayTeamKo || m.awayTeam}\n`;
              const strategy = m.strategyStatus ? `[${m.strategyStatus}] ` : '';
              text += `PICK: ${strategy}${m.prediction}\nConfidence: ${m.confidence}%\nReason: ${m.reason}\n\n`;
          });
      }
      downloadTxt(text, 'MatchInsight_Analysis_Report.txt');
  };

  const downloadTxt = (text: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // [RENDER] 1. Loading State
  if (isLoading) {
      return (
          <div className="w-full max-w-4xl mx-auto mt-8 p-8 bg-slate-900/80 rounded-xl border border-emerald-500/30 flex flex-col items-center justify-center min-h-[300px] animate-pulse relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-900/10 to-transparent pointer-events-none"></div>
               <div className="relative mb-6">
                   <div className="w-16 h-16 border-4 border-slate-700 rounded-full"></div>
                   <div className="w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                   <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                       <span className="text-2xl">🤖</span>
                   </div>
               </div>
               <h3 className="text-xl font-bold text-white mb-4 animate-fade-in text-center">
                   AI 분석 진행 중...
               </h3>
               <div className="w-full max-w-lg bg-black/50 rounded-lg p-4 font-mono text-xs text-emerald-400 border border-slate-700 shadow-inner h-24 overflow-y-auto flex flex-col-reverse">
                   <span className="animate-pulse">{content || "시스템 초기화 중..."}</span>
               </div>
               <p className="text-slate-500 text-xs mt-4">
                   API 데이터 수집 및 3단계 추론(데이터/뉴스/배당) 과정을 거치고 있습니다.<br/>
                   잠시만 기다려주세요 (최대 30초 소요)
               </p>
          </div>
      );
  }

  // [RENDER] 2. Batch Result
  if (batchResult && batchResult.matches) {
    const hasCombinations = batchResult.recommendedCombinations && batchResult.recommendedCombinations.length > 0;

    return (
      <div className="w-full max-w-5xl mx-auto mt-8 relative" ref={contentRef}>
         {learnSuccessMsg && (
            <div className="absolute -top-12 left-0 right-0 mx-auto w-max bg-emerald-600/90 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 animate-bounce">
              🧠 {learnSuccessMsg}
            </div>
         )}
         <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 shadow-lg" data-html2canvas-ignore="true">
            <h2 className="text-xl font-bold text-white flex items-center">
                <span className="text-emerald-400 mr-2">{hasCombinations ? '💎' : '🧾'}</span> 
                {hasCombinations ? 'AI 추천 조합 (Best Combinations)' : '프로토 승부식 예측 결과'}
            </h2>
            <div className="flex space-x-2">
                <button onClick={handleBatchTxtDownload} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center border border-slate-600 font-bold">📄 TXT 저장</button>
                <button onClick={handleBatchPdfDownload} disabled={isPdfGenerating} className="text-xs bg-red-900/80 hover:bg-red-800 text-red-100 px-3 py-2 rounded-lg transition-colors flex items-center border border-red-700/50 font-bold">{isPdfGenerating ? '생성 중...' : '📑 PDF 이미지 저장'}</button>
                <button onClick={() => handleBatchLearn(false)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors flex items-center border border-indigo-500/50 font-bold shadow-md">🧠 결과 학습</button>
            </div>
         </div>
         {hasCombinations ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                {/* COMBINATION MODE (EXISTING) */}
                {batchResult.recommendedCombinations.map((combo, i) => (
                    <div key={i} className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-t-4 border-red-500 flex flex-col ring-1 ring-slate-700">
                        {/* Existing Combo Card Layout ... */}
                         <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <span className="text-2xl mr-1">🎫</span>
                                <span className="font-extrabold text-white text-lg tracking-tight">추천 조합 #{combo.rank}</span>
                            </div>
                            <span className="text-xs font-bold bg-emerald-900/50 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-sm flex items-center space-x-1">
                                <span>{combo.expectedValue}</span>
                            </span>
                        </div>
                        <div className="divide-y divide-slate-700 flex-grow">
                            {combo.matches.map((m, idx) => {
                                const pick = getPredictionType(m.prediction);
                                const isHomeWin = pick === 'HOME';
                                const isAwayWin = pick === 'AWAY';
                                const isSpecial = pick === 'SPECIAL';
                                const isCombo = pick === 'COMBO';
                                return (
                                <div key={idx} className="p-5 flex flex-col hover:bg-slate-700/50 transition-colors">
                                    <div className="flex flex-col mb-3">
                                        <div className="flex items-center mb-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold mr-2 ${m.gameType === 'Handicap' ? 'bg-purple-600/80 text-purple-100' : m.gameType === 'UnOver' ? 'bg-orange-600/80 text-orange-100' : m.gameType === 'Sum' ? 'bg-pink-600/80 text-pink-100' : 'bg-slate-600 text-slate-200'}`}>{m.gameType || 'General'}{m.criteria ? ` (${m.criteria})` : ''}</span>
                                            {getStrategyBadge(m.strategyStatus)}
                                            <div className="ml-auto text-xs text-slate-500 font-mono">VS</div>
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <div className={`flex items-center justify-between p-2 rounded ${isHomeWin ? 'bg-red-900/20 border border-red-500/40' : 'bg-transparent'}`}>
                                                <div className="flex items-center space-x-2"><span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded font-bold">HOME</span><span className={`text-base font-bold ${isHomeWin ? 'text-red-400' : 'text-slate-200'}`}>{m.homeTeamKo || m.homeTeam}</span></div>
                                                {isHomeWin && <span className="text-xs font-bold text-red-400 animate-pulse">WIN</span>}
                                            </div>
                                            <div className={`flex items-center justify-between p-2 rounded ${isAwayWin ? 'bg-red-900/20 border border-red-500/40' : 'bg-transparent'}`}>
                                                <div className="flex items-center space-x-2"><span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded font-bold">AWAY</span><span className={`text-base font-bold ${isAwayWin ? 'text-red-400' : 'text-slate-200'}`}>{m.awayTeamKo || m.awayTeam}</span></div>
                                                {isAwayWin && <span className="text-xs font-bold text-red-400 animate-pulse">WIN</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mb-3 border-t border-slate-700 pt-3">
                                         <div className="flex items-center space-x-2"><span className="text-xs text-slate-400">예측 결과:</span><span className={`text-sm font-extrabold ${isHomeWin || isAwayWin || isSpecial ? 'text-red-400' : isCombo ? 'text-purple-400' : 'text-yellow-400'}`}>{m.prediction} {pick === 'HOME' && !isSpecial ? '(홈승)' : pick === 'AWAY' && !isSpecial ? '(원정승)' : pick === 'DRAW' && !isSpecial ? '(무승부)' : ''}</span></div>
                                         <span className="text-xs text-emerald-400 font-mono font-bold">신뢰도 {m.confidence}%</span>
                                    </div>
                                    <div className="bg-slate-900 p-3 rounded border border-slate-700/50 shadow-inner"><p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{m.reason}</p></div>
                                </div>
                                );
                            })}
                        </div>
                        <div className="p-4 bg-slate-900 text-slate-400 text-xs italic border-t border-slate-700 leading-relaxed"><span className="text-emerald-500 font-bold mr-1">AI Comment:</span>"{combo.totalReason}"</div>
                    </div>
                ))}
             </div>
         ) : (
            // PROTO MATCH PREDICTION MODE (FULL DETAILS)
            <>
                {/* [NEW] Strategy Guide (Legend) */}
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700 mb-8 shadow-inner ring-1 ring-slate-800">
                    <h3 className="text-emerald-400 font-bold mb-4 flex items-center text-sm uppercase tracking-wider">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        3단계 전략 가이드 (Strategy Guide)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm">
                        <div className="flex flex-col bg-slate-800 p-3 rounded border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                            <span className="text-emerald-400 font-bold mb-2 flex items-center"><span className="mr-2 text-lg">💎</span> 축 (AXIS)</span>
                            <span className="text-slate-400 leading-snug">대중의 선택과 데이터가 일치하는 <strong className="text-slate-200">확실한 정배당</strong> 경기. 단통 승부를 추천합니다.</span>
                        </div>
                        <div className="flex flex-col bg-slate-800 p-3 rounded border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                            <span className="text-amber-400 font-bold mb-2 flex items-center"><span className="mr-2 text-lg">💣</span> 함정 (TRAP)</span>
                            <span className="text-slate-400 leading-snug">인기는 높지만 데이터상 <strong className="text-slate-200">이변 가능성</strong>이 높은 경기. 무승부/역배 보험이 필수입니다.</span>
                        </div>
                        <div className="flex flex-col bg-slate-800 p-3 rounded border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                            <span className="text-slate-300 font-bold mb-2 flex items-center"><span className="mr-2 text-lg">🧹</span> 지우개 (ERASER)</span>
                            <span className="text-slate-400 leading-snug">승무패 예측이 매우 힘든 <strong className="text-slate-200">혼전 양상</strong>. 아예 패스하거나 승/무/패 3마킹으로 지우는 것이 좋습니다.</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 animate-fade-in-up">
                    {batchResult.matches.map((match, idx) => {
                        const pick = getPredictionType(match.prediction);
                        const isHomeWin = pick === 'HOME';
                        const isAwayWin = pick === 'AWAY';
                        const isCombo = pick === 'COMBO';
                        const isSpecial = pick === 'SPECIAL';

                        return (
                            <div key={idx} className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700 ring-1 ring-slate-700/50 hover:border-emerald-500/30 transition-all duration-300">
                                {/* Header */}
                                <div className="bg-slate-900/80 p-4 border-b border-slate-700 flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-slate-300 font-bold font-mono text-sm shadow-inner">
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${match.gameType === 'Handicap' ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50' : match.gameType === 'UnOver' ? 'bg-orange-900/50 text-orange-300 border border-orange-700/50' : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'}`}>
                                            {match.gameType || 'General'}{match.criteria ? ` (${match.criteria})` : ''}
                                        </span>
                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{match.sport}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {getStrategyBadge(match.strategyStatus)}
                                        <button onClick={() => onSelectMatch && onSelectMatch(match.homeTeam, match.awayTeam, match.sport as SportType)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded border border-slate-600 transition-colors" data-html2canvas-ignore="true">
                                            정밀 재분석 🔄
                                        </button>
                                    </div>
                                </div>

                                {/* Match Info & Prediction */}
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className={`flex-1 text-right ${isHomeWin ? 'opacity-100' : 'opacity-70'}`}>
                                            <span className={`block text-lg md:text-xl font-black leading-tight ${isHomeWin ? 'text-red-400' : 'text-slate-200'}`}>{match.homeTeamKo || match.homeTeam}</span>
                                            {match.odds?.home && <span className="text-xs text-slate-500 font-mono mt-1 block">x{match.odds.home}</span>}
                                        </div>
                                        <div className="px-6 flex flex-col items-center">
                                            <span className="text-xs text-slate-600 font-bold tracking-widest mb-1">VS</span>
                                            <div className={`text-2xl font-black px-4 py-1 rounded-lg border-2 ${isHomeWin || isAwayWin || isSpecial ? 'border-red-500/50 text-red-400 bg-red-900/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : isCombo ? 'border-purple-500/50 text-purple-400 bg-purple-900/10' : 'border-yellow-500/50 text-yellow-400 bg-yellow-900/10'}`}>
                                                {match.prediction}
                                            </div>
                                            <div className="mt-2 w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${match.confidence >= 80 ? 'bg-emerald-500' : match.confidence >= 60 ? 'bg-yellow-500' : 'bg-slate-500'}`} style={{width: `${match.confidence}%`}}></div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-1 font-mono">{match.confidence}% Prob</span>
                                        </div>
                                        <div className={`flex-1 text-left ${isAwayWin ? 'opacity-100' : 'opacity-70'}`}>
                                            <span className={`block text-lg md:text-xl font-black leading-tight ${isAwayWin ? 'text-red-400' : 'text-slate-200'}`}>{match.awayTeamKo || match.awayTeam}</span>
                                            {match.odds?.away && <span className="text-xs text-slate-500 font-mono mt-1 block">x{match.odds.away}</span>}
                                        </div>
                                    </div>

                                    {/* 3-Agent Analysis Box */}
                                    <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/50 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                                            {match.reason}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
         )}
         {sources.length > 0 && (
            <div className="mt-6 bg-slate-900/50 px-6 py-4 rounded-xl border border-slate-700/50 animate-fade-in" data-html2canvas-ignore="true">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    AI 참조 정보 출처 (Reference Links)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sources.map((url: string, index: number) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400/80 hover:text-emerald-300 hover:underline bg-slate-800/50 px-3 py-2 rounded truncate block border border-slate-700/50 hover:border-emerald-500/30 transition-colors">{url}</a>
                    ))}
                </div>
            </div>
         )}
      </div>
    );
  }

  // [RENDER] 3. Single Result (Default)
  if (!content) return null;
  const probs = parsedData?.probabilities || { home: 0, draw: 0, away: 0 };
  const score = parsedData?.score || null;
  const singleModeSources = sources; 

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 relative" ref={contentRef}>
      {learnSuccessMsg && (
            <div className="absolute -top-12 left-0 right-0 mx-auto w-max bg-emerald-600/90 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 animate-bounce">
              🧠 {learnSuccessMsg}
            </div>
      )}
      {parsedData && (
         <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-center items-center shadow-lg md:col-span-1">
                <span className="text-xs text-slate-400 font-bold tracking-wider mb-2">AI 예상 스코어</span>
                <div className="flex items-center space-x-4">
                    <div className="text-center"><span className="text-xs text-emerald-400 font-bold block mb-1">HOME</span><span className="text-4xl font-extrabold text-white">{score?.home ?? '-'}</span></div>
                    <span className="text-2xl text-slate-600">:</span>
                    <div className="text-center"><span className="text-xs text-blue-400 font-bold block mb-1">AWAY</span><span className="text-4xl font-extrabold text-white">{score?.away ?? '-'}</span></div>
                </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-center shadow-lg md:col-span-2">
                 <div className="flex justify-between text-xs font-bold mb-2 text-slate-400"><span className="text-emerald-400">HOME {probs.home}%</span><span className="text-slate-400">DRAW {probs.draw}%</span><span className="text-blue-400">AWAY {probs.away}%</span></div>
                 <div className="w-full h-6 bg-slate-700 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 flex items-center justify-center text-[10px] text-emerald-950 font-bold" style={{ width: `${probs.home}%` }}>{probs.home > 10 && '승'}</div>
                    <div className="h-full bg-slate-500 flex items-center justify-center text-[10px] text-slate-900 font-bold" style={{ width: `${probs.draw}%` }}>{probs.draw > 10 && '무'}</div>
                    <div className="h-full bg-blue-500 flex items-center justify-center text-[10px] text-blue-950 font-bold" style={{ width: `${probs.away}%` }}>{probs.away > 10 && '패'}</div>
                 </div>
            </div>
         </div>
      )}
      <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 border-b border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4" data-html2canvas-ignore="true">
           <h3 className="text-lg font-mono text-emerald-400 font-bold tracking-wider truncate">경기 분석 리포트 (Beginner Ver.)</h3>
           <div className="flex space-x-2">
                <button onClick={handleSingleTxtDownload} className="text-xs flex items-center bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded transition-colors border border-slate-600">TXT 저장</button>
                <button onClick={handleSinglePdfDownload} disabled={isPdfGenerating} className={`text-xs flex items-center bg-red-900/80 hover:bg-red-800 text-white px-3 py-1.5 rounded transition-colors border border-red-700/50 ${isPdfGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}>{isPdfGenerating ? '생성 중...' : 'PDF 저장'}</button>
                <button onClick={() => handleLearnResult(content)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors flex items-center font-bold shadow-md">🧠 결과 학습</button>
           </div>
        </div>
        <div className="p-8 text-slate-300 leading-relaxed font-sans">
          <ReactMarkdown components={markdownComponents}>{displayContent}</ReactMarkdown>
        </div>
        {singleModeSources.length > 0 && (
          <div className="bg-slate-950 px-6 py-4 border-t border-slate-700">
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">참조한 웹 데이터</p>
             <ul className="text-xs text-emerald-600 space-y-1">
               {singleModeSources.map((url: string, index: number) => (
                 <li key={index}><a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 hover:underline truncate block">{url}</a></li>
               ))}
             </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDisplay;