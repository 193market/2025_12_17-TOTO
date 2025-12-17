import React from 'react';
import ReactMarkdown from 'react-markdown';

interface AnalysisDisplayProps {
  content: string | null;
  groundingMetadata?: any;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ content, groundingMetadata }) => {
  if (!content) return null;

  // Extract grounding URLs if available
  const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-fade-in">
      <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
           <h3 className="text-lg font-mono text-emerald-400 font-bold tracking-wider">
             경기_분석_리포트_V3.0
           </h3>
           <div className="flex space-x-2">
             <span className="h-3 w-3 rounded-full bg-red-500"></span>
             <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
             <span className="h-3 w-3 rounded-full bg-green-500"></span>
           </div>
        </div>

        {/* Content Area */}
        <div className="p-8 text-slate-300 leading-relaxed font-sans">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-white mb-6 border-b border-slate-600 pb-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-emerald-400 mt-8 mb-4" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold text-white mt-6 mb-3 flex items-center" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50" {...props} />,
              li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
              strong: ({node, ...props}) => <strong className="text-emerald-300 font-semibold" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 text-slate-300" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500 pl-4 italic bg-slate-900 py-2 my-4 rounded-r-lg" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Footer / Sources */}
        {sources.length > 0 && (
          <div className="bg-slate-950 px-6 py-4 border-t border-slate-700">
             <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">참조한 웹 데이터 (Grounding Sources)</p>
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