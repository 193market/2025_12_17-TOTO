
import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BatchAnalysisResult, SportType, TrainingSample } from '../types';

interface AnalysisDisplayProps {
  content: string | null;
  groundingMetadata?: any;
  batchResult?: BatchAnalysisResult | null;
  onSelectMatch?: (home: string, away: string, sport: SportType) => void;
  onLearn?: (samples: TrainingSample[]) => void; // [NEW] 결과 학습 핸들러
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ content, groundingMetadata, batchResult, onSelectMatch, onLearn }) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [learnSuccessMsg, setLearnSuccessMsg] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse JSON Data (Probabilities & Score) - for Single Mode
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

  // Clean content for display
  const displayContent = useMemo(() => {
    if (!content) return "";
    return content.replace(/```json\s*\{[\s\S]*?\}\s*```/g, "").replace(/\*\*\[Machine Data\]\*\*\s*\(.*\)/g, "").trim();
  }, [content]);

  // PDF Download Logic (Generic for Ref)
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

  // --- DOWNLOAD HANDLERS ---

  const handleSinglePdfDownload = () => generatePdf('MatchInsight_Report');
  
  const handleSingleTxtDownload = () => {
    if (!content) return;
    downloadTxt(content, 'MatchInsight_Analysis.txt');
  };

  const handleBatchPdfDownload = () => generatePdf('MatchInsight_Batch_Report');

  const handleBatchTxtDownload = () => {
      if (!batchResult) return;
      let text = "========================================\n";
      text += "      MATCH INSIGHT - INTEGRATED REPORT\n";
      text += "========================================\n\n";

      if (batchResult.recommendedCombinations) {
          text += "[AI 추천 조합 TOP " + batchResult.recommendedCombinations.length + "]\n\n";
          batchResult.recommendedCombinations.forEach((combo, idx) => {
              text += `[RANK ${combo.rank}] (EV: ${combo.expectedValue})\n`;
              text += `Reason: ${combo.totalReason}\n`;
              combo.matches.forEach(m => {
                  text += `  - ${m.homeTeamKo || m.homeTeam} vs ${m.awayTeamKo || m.awayTeam} : ${m.prediction} (Confidence: ${m.confidence}%)\n`;
              });
              text += "\n";
          });
          text += "----------------------------------------\n\n";
      }

      text += "[전체 경기 상세 분석]\n\n";
      batchResult.matches.forEach((m, idx) => {
          text += `GAME ${idx + 1}: ${m.homeTeamKo || m.homeTeam} vs ${m.awayTeamKo || m.awayTeam}\n`;
          text += `Prediction: ${m.prediction}\n`;
          text += `Confidence: ${m.confidence}%\n`;
          text += `Risk Level: ${m.riskLevel}\n`;
          text += `Analysis: ${m.reason}\n`;
          text += "\n";
      });

      downloadTxt(text, 'MatchInsight_Integrated_Report.txt');
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

  // --- LEARNING HANDLERS ---

  const handleLearnResult = (textToLearn: string) => {
      if (!onLearn) return;
      // Clean up markup slightly for better learning context
      const cleanText = textToLearn.replace(/\*\*/g, "").replace(/#/g, "");
      
      onLearn([{
          id: Date.now().toString(),
          content: `[Previous Good Analysis Style]\n${cleanText.substring(0, 3000)}...`, // Limit size
          sport: 'general'
      }]);
      
      setLearnSuccessMsg("분석 스타일이 메모리에 저장되었습니다! (다음 분석 시 참조)");
      setTimeout(() => setLearnSuccessMsg(null), 3000);
  };

  // --- RENDER: BATCH RESULT MODE (Combination Recommender) ---
  if (batchResult && batchResult.recommendedCombinations) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 relative" ref={contentRef}>
         {learnSuccessMsg && (
            <div className="absolute -top-12 left-0 right-0 mx-auto w-max bg-emerald-600/90 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 animate-bounce">
              🧠 {learnSuccessMsg}
            </div>
         )}

         {/* [NEW] Batch Actions Bar */}
         <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 shadow-lg" data-html2canvas-ignore="true">
            <h2 className="text-xl font-bold text-white flex items-center">
                <span className="text-emerald-400 mr-2">📊</span> 통합 분석 결과
            </h2>
            <div className="flex space-x-2">
                <button 
                    onClick={handleBatchTxtDownload}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center border border-slate-600 font-bold"
                >
                    📄 통합 TXT 저장
                </button>
                <button 
                    onClick={handleBatchPdfDownload} 
                    disabled={isPdfGenerating}
                    className="text-xs bg-red-900/80 hover:bg-red-800 text-red-100 px-3 py-2 rounded-lg transition-colors flex items-center border border-red-700/50 font-bold"
                >
                    {isPdfGenerating ? '생성 중...' : '📑 통합 PDF 저장'}
                </button>
                <button 
                    onClick={() => handleLearnResult(JSON.stringify(batchResult))}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors flex items-center font-bold shadow-md"
                >
                    🧠 이 결과 학습시키기
                </button>
            </div>
         </div>
         
         {/* 추천 조합 카드 리스트 */}
         <div className="space-y-6 mb-8">
            <h3 className="text-lg font-bold text-slate-300 mb-2 px-2">AI 추천 조합 (Best Combinations)</h3>
            {batchResult.recommendedCombinations.map((combo, comboIdx) => (
                <div key={comboIdx} className="bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/50 rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg shadow-md z-10">
                        Rank {combo.rank} (EV: {combo.expectedValue})
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {combo.matches.map((match, idx) => {
                            const pred = match.prediction.replace(/\s/g, '');
                            const isHomeWin = pred.includes('홈') || (pred.includes('승') && !pred.includes('원정') && !pred.includes('무'));
                            const isAwayWin = pred.includes('원정') || pred.includes('패');
                            
                            return (
                                <div key={idx} className="bg-slate-950/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-white mb-1 flex items-center flex-wrap gap-2">
                                            <div className={`truncate transition-colors ${isHomeWin ? 'text-emerald-400 font-extrabold text-base border-b border-emerald-500/50' : 'text-slate-500'}`}>
                                                {match.homeTeamKo || match.homeTeam}
                                            </div>
                                            <span className="text-xs text-slate-600">vs</span>
                                            <div className={`truncate transition-colors ${isAwayWin ? 'text-emerald-400 font-extrabold text-base border-b border-emerald-500/50' : 'text-slate-500'}`}>
                                                {match.awayTeamKo || match.awayTeam}
                                            </div>
                                        </div>
                                        <div className="text-lg font-extrabold text-emerald-400 tracking-wide mt-1">
                                            {match.prediction}
                                        </div>
                                    </div>
                                    <div className="text-right pl-3 border-l border-slate-700/50 ml-3">
                                        <div className="text-xs font-bold text-slate-400">{match.confidence}%</div>
                                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${
                                            match.riskLevel === 'LOW' ? 'bg-emerald-900/80 text-emerald-300' : 'bg-yellow-900/80 text-yellow-300'
                                        }`}>
                                            {match.riskLevel}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="mt-4 bg-emerald-950/30 p-3 rounded-lg border border-emerald-500/20 text-emerald-100 text-xs leading-relaxed">
                        <strong>💡 추천 이유:</strong> {combo.totalReason}
                    </div>
                </div>
            ))}
         </div>

         {/* 2. 전체 분석 리스트 (등급표) */}
         <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-300 mb-4">전체 분석 상세 (Details)</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">매치업</th>
                            <th className="px-4 py-3">AI 예측</th>
                            <th className="px-4 py-3">확신도</th>
                            <th className="px-4 py-3">리스크</th>
                            <th className="px-4 py-3">코멘트</th>
                            <th className="px-4 py-3 rounded-r-lg" data-html2canvas-ignore="true">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {batchResult.matches.map((match, idx) => {
                            const pred = match.prediction.replace(/\s/g, '');
                            const isHomeWin = pred.includes('홈') || (pred.includes('승') && !pred.includes('원정') && !pred.includes('무'));
                            const isAwayWin = pred.includes('원정') || pred.includes('패');

                            return (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-white">
                                        <div className="flex items-center space-x-2">
                                            <span className={isHomeWin ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{match.homeTeam}</span>
                                            <span className="text-slate-600 text-xs">vs</span>
                                            <span className={isAwayWin ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{match.awayTeam}</span>
                                        </div>
                                        {(match.homeTeamKo || match.awayTeamKo) && (
                                            <div className="text-[10px] text-slate-500 mt-1">
                                                {match.homeTeamKo} vs {match.awayTeamKo}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-emerald-400">{match.prediction}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            <div className="w-16 h-2 bg-slate-600 rounded-full mr-2 overflow-hidden">
                                                <div 
                                                    className={`h-full ${match.confidence >= 80 ? 'bg-emerald-500' : (match.confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500')}`} 
                                                    style={{width: `${match.confidence}%`}}
                                                ></div>
                                            </div>
                                            <span className="text-xs">{match.confidence}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            match.riskLevel === 'LOW' ? 'bg-emerald-900 text-emerald-300' :
                                            match.riskLevel === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                                            'bg-red-900 text-red-300'
                                        }`}>
                                            {match.riskLevel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{match.reason}</td>
                                    <td className="px-4 py-3" data-html2canvas-ignore="true">
                                        <button 
                                            onClick={() => onSelectMatch && onSelectMatch(match.homeTeam, match.awayTeam, 'football')}
                                            className="text-xs bg-slate-600 hover:bg-emerald-600 text-white px-2 py-1 rounded transition-colors"
                                        >
                                            🔍 정밀분석
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
         </div>
      </div>
    );
  }

  // --- RENDER: SINGLE ANALYSIS MODE (Existing) ---
  if (!content) return null;
  const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];
  const probs = parsedData?.probabilities || { home: 0, draw: 0, away: 0 };
  const score = parsedData?.score || null;

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
                    <div className="text-center">
                         <span className="text-xs text-emerald-400 font-bold block mb-1">HOME</span>
                         <span className="text-4xl font-extrabold text-white">{score?.home ?? '-'}</span>
                    </div>
                    <span className="text-2xl text-slate-600">:</span>
                    <div className="text-center">
                         <span className="text-xs text-blue-400 font-bold block mb-1">AWAY</span>
                         <span className="text-4xl font-extrabold text-white">{score?.away ?? '-'}</span>
                    </div>
                </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-center shadow-lg md:col-span-2">
                 <div className="flex justify-between text-xs font-bold mb-2 text-slate-400">
                    <span className="text-emerald-400">HOME {probs.home}%</span>
                    <span className="text-slate-400">DRAW {probs.draw}%</span>
                    <span className="text-blue-400">AWAY {probs.away}%</span>
                 </div>
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
                <button onClick={handleSingleTxtDownload} className="text-xs flex items-center bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded transition-colors border border-slate-600">
                   TXT 저장
                </button>
                <button onClick={handleSinglePdfDownload} disabled={isPdfGenerating} className={`text-xs flex items-center bg-red-900/80 hover:bg-red-800 text-white px-3 py-1.5 rounded transition-colors border border-red-700/50 ${isPdfGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isPdfGenerating ? '생성 중...' : 'PDF 저장'}
                </button>
                <button 
                    onClick={() => handleLearnResult(content)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors flex items-center font-bold shadow-md"
                >
                    🧠 결과 학습
                </button>
           </div>
        </div>
        <div className="p-8 text-slate-300 leading-relaxed font-sans">
          <ReactMarkdown components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-white mb-6 border-b border-slate-600 pb-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-emerald-400 mt-8 mb-4" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold text-white mt-6 mb-3 flex items-center" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50" {...props} />,
              li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
              strong: ({node, ...props}) => <strong className="text-emerald-300 font-semibold" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500 pl-4 italic bg-slate-900 py-2 my-4 rounded-r-lg" {...props} />,
            }}>{displayContent}</ReactMarkdown>
        </div>
        {sources.length > 0 && (
          <div className="bg-slate-950 px-6 py-4 border-t border-slate-700">
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">참조한 웹 데이터</p>
             <ul className="text-xs text-emerald-600 space-y-1">
               {sources.map((url: string, index: number) => (
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
