
import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BatchAnalysisResult, SportType } from '../types';

interface AnalysisDisplayProps {
  content: string | null;
  groundingMetadata?: any;
  batchResult?: BatchAnalysisResult | null; // [NEW] 배치 결과 prop
  onSelectMatch?: (home: string, away: string, sport: SportType) => void; // [NEW] 정밀 분석 요청 콜백
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ content, groundingMetadata, batchResult, onSelectMatch }) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
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

  // PDF Download Logic
  const handlePdfDownload = async () => {
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
      pdf.save(`MatchInsight_Report.pdf`);
    } catch (err) {
      alert("PDF 생성 오류");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // [NEW] Text Download Logic
  const handleTxtDownload = () => {
    if (!content) return;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `MatchInsight_Analysis.txt`;
    document.body.appendChild(element); // FireFox support
    element.click();
    document.body.removeChild(element);
  };

  // --- RENDER: BATCH RESULT MODE (Combination Recommender) ---
  if (batchResult) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 space-y-8" ref={contentRef}>
         
         {/* 1. 추천 조합 카드 */}
         <div className="bg-gradient-to-br from-emerald-900 to-slate-900 border border-emerald-500 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <svg className="w-40 h-40 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="bg-emerald-500 text-emerald-950 text-xs px-2 py-1 rounded mr-3">AI PICK</span>
                최고의 {batchResult.recommendedCombination.matches.length}폴더 조합
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative z-10">
                {batchResult.recommendedCombination.matches.map((match, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-4 rounded-lg border border-emerald-500/30 flex justify-between items-center group shadow-md hover:bg-slate-800 transition-colors">
                        <div className="flex-1">
                            {/* [UPDATE] 팀 이름 가독성 강화 + 한글 이름 표시 */}
                            <div className="text-base font-bold text-white mb-1.5 flex flex-wrap items-center gap-2">
                                <div className="flex flex-col">
                                    <span className="text-emerald-50">{match.homeTeam}</span>
                                    {match.homeTeamKo && <span className="text-[10px] text-slate-400 font-normal">{match.homeTeamKo}</span>}
                                </div>
                                <span className="text-xs text-slate-500 font-normal px-1">vs</span>
                                <div className="flex flex-col">
                                    <span className="text-emerald-50">{match.awayTeam}</span>
                                    {match.awayTeamKo && <span className="text-[10px] text-slate-400 font-normal">{match.awayTeamKo}</span>}
                                </div>
                            </div>
                            <div className="text-xl font-extrabold text-emerald-400 tracking-wide">{match.prediction}</div>
                        </div>
                        <div className="text-right pl-4 border-l border-slate-700/50">
                             <div className="text-sm font-bold text-white mb-1">{match.confidence}% 확신</div>
                             <div className="flex flex-col items-end gap-1.5">
                                <span className="text-[10px] font-bold bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                                    RISK: {match.riskLevel}
                                </span>
                                <button 
                                    onClick={() => onSelectMatch && onSelectMatch(match.homeTeam, match.awayTeam, 'football')} 
                                    className="text-xs bg-slate-700 hover:bg-emerald-600 text-slate-200 hover:text-white px-2 py-1 rounded transition-colors flex items-center border border-slate-600"
                                >
                                    🔍 정밀분석
                                </button>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-emerald-950/50 p-4 rounded-lg border border-emerald-800 text-emerald-100 text-sm leading-relaxed relative z-10">
                <strong>💡 추천 이유:</strong> {batchResult.recommendedCombination.totalReason}
            </div>
         </div>

         {/* 2. 전체 분석 리스트 (등급표) */}
         <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-200 mb-4">전체 분석 결과 등급표</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">매치업</th>
                            <th className="px-4 py-3">AI 예측</th>
                            <th className="px-4 py-3">확신도</th>
                            <th className="px-4 py-3">리스크</th>
                            <th className="px-4 py-3">코멘트</th>
                            <th className="px-4 py-3 rounded-r-lg">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {batchResult.matches.map((match, idx) => (
                            <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-white">
                                    <div>
                                        {match.homeTeam} <span className="text-slate-500 text-xs">vs</span> {match.awayTeam}
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
                                <td className="px-4 py-3">
                                    <button 
                                        onClick={() => onSelectMatch && onSelectMatch(match.homeTeam, match.awayTeam, 'football')}
                                        className="text-xs bg-slate-600 hover:bg-emerald-600 text-white px-2 py-1 rounded transition-colors"
                                    >
                                        🔍 정밀분석
                                    </button>
                                </td>
                            </tr>
                        ))}
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
      <div className="text-right mb-2 text-xs text-slate-500 italic">
        * 다운로드 시 'C:\toto-power' 폴더를 선택하면 관리가 편합니다.
      </div>

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
                <button onClick={handleTxtDownload} className="text-xs flex items-center bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded transition-colors border border-slate-600">
                   TXT 저장
                </button>
                <button onClick={handlePdfDownload} disabled={isPdfGenerating} className={`text-xs flex items-center bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors border border-red-600 ${isPdfGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isPdfGenerating ? '생성 중...' : 'PDF 저장'}
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
