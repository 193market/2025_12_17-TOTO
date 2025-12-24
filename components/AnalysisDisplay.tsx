
import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface AnalysisDisplayProps {
  content: string | null;
  groundingMetadata?: any;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ content, groundingMetadata }) => {
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract Final Verdict Section
  const verdictSection = useMemo(() => {
    if (!content) return null;
    const match = content.match(/### ⚠️ 최종 픽 & 요약([\s\S]*?)(?=(?:###|---|$))/);
    return match ? match[1].trim() : null;
  }, [content]);

  const handleDownload = () => {
    if (!content) return;

    // 1. 파일명 생성 규칙 적용 (사용자 요청 사항)
    let fileTag = "[분석]"; // 기본값
    
    // 내용 기반으로 태그 결정
    if (content.includes("[최종분석]") || content.includes("종합 정밀 분석")) {
        fileTag = "[최종분석]";
    } else if (content.includes("사용자 입력 컨텍스트") || content.includes("맥락")) {
        // 맥락이 포함된 경우 (단순 판단 로직 강화 가능)
        fileTag = "[맥락]";
    }

    let filename = `${fileTag}_MatchInsight.txt`;
    const titleMatch = content.match(/###\s*🏟️.*?:\s*(.*?)(\n|$)/); 
    if (titleMatch && titleMatch[1]) {
        const safeName = titleMatch[1].trim().replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
        filename = `${fileTag}_${safeName}.txt`;
    }

    // 2. 텍스트 가공
    const fileContent = `
[MatchInsight AI 경기 분석 리포트]
작성일: ${new Date().toLocaleString()}
--------------------------------------------------
${content}
--------------------------------------------------
* 이 분석은 AI 예측 결과이며, 실제 경기 결과와 다를 수 있습니다.
    `.trim();

    // 3. 다운로드 트리거
    const element = document.createElement("a");
    const file = new Blob([fileContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePdfDownload = async () => {
    if (!contentRef.current) return;
    setIsPdfGenerating(true);

    try {
      const element = contentRef.current;
      
      let fileTag = "Analysis";
      if (content?.includes("[최종분석]")) fileTag = "Final_Analysis";
      else if (content?.includes("맥락")) fileTag = "Context_Analysis";

      let filename = `${fileTag}.pdf`;
      const titleMatch = content?.match(/###\s*🏟️.*?:\s*(.*?)(\n|$)/);
      if (titleMatch && titleMatch[1]) {
           const safeName = titleMatch[1].trim().replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
           filename = `[${fileTag}]_${safeName}.pdf`;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false
      });

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

      pdf.save(filename);

    } catch (err) {
      console.error("PDF generation error:", err);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  if (!content) return null;

  const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 relative" ref={contentRef}>
      
      {/* 팁 메세지 */}
      <div className="text-right mb-2 text-xs text-slate-500 italic">
        * 다운로드 시 'C:\toto-power' 폴더를 선택하면 관리가 편합니다.
      </div>

      {/* 🏆 Final Verdict Summary Card */}
      {verdictSection && (
        <div className="mb-8 bg-gradient-to-br from-emerald-900/60 to-slate-900/80 border border-emerald-500/50 rounded-xl p-6 shadow-lg backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <svg className="w-32 h-32 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center border-b border-emerald-500/30 pb-3">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            최종 판단 요약 (쉬운 설명)
          </h3>
          
          <div className="text-slate-200 leading-relaxed font-medium">
             <ReactMarkdown 
               components={{
                 strong: ({node, ...props}) => <span className="text-white font-bold bg-emerald-600/40 px-1.5 py-0.5 rounded mx-1 shadow-sm border border-emerald-500/30" {...props} />,
                 li: ({node, ...props}) => <li className="mb-3 flex items-start" {...props} />,
               }}
             >
               {verdictSection}
             </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-fade-in">
        <div 
          className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 border-b border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4"
          data-html2canvas-ignore="true"
        >
           <h3 className="text-lg font-mono text-emerald-400 font-bold tracking-wider truncate">
             경기 분석 리포트 (Beginner Ver.)
           </h3>
           <div className="flex items-center space-x-3">
             <button
                onClick={handleDownload}
                className="text-xs flex items-center bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 px-3 py-1.5 rounded transition-colors border border-emerald-700/50"
             >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                텍스트 저장 (C:\toto-power 권장)
             </button>

             <button 
               onClick={handlePdfDownload}
               disabled={isPdfGenerating}
               className={`text-xs flex items-center bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors border border-red-600 ${isPdfGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               {isPdfGenerating ? '생성 중...' : 'PDF 저장'}
             </button>
           </div>
        </div>

        <div className="p-8 text-slate-300 leading-relaxed font-sans">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-white mb-6 border-b border-slate-600 pb-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-emerald-400 mt-8 mb-4" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold text-white mt-6 mb-3 flex items-center" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50" {...props} />,
              li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
              strong: ({node, ...props}) => <strong className="text-emerald-300 font-semibold" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500 pl-4 italic bg-slate-900 py-2 my-4 rounded-r-lg" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {sources.length > 0 && (
          <div className="bg-slate-950 px-6 py-4 border-t border-slate-700">
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">참조한 웹 데이터</p>
             <ul className="text-xs text-emerald-600 space-y-1">
               {sources.map((url: string, index: number) => (
                 <li key={index}>
                   <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 hover:underline truncate block">
                     {url}
                   </a>
                 </li>
               ))}
             </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisDisplay;
