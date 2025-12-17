
import React, { useState } from 'react';
import { MatchData, SportType } from '../types';

interface MatchInputProps {
  onAnalyze: (data: MatchData) => void;
  isLoading: boolean;
}

const MatchInput: React.FC<MatchInputProps> = ({ onAnalyze, isLoading }) => {
  const [sport, setSport] = useState<SportType>('football');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [context, setContext] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam) return;
    onAnalyze({ sport, homeTeam, awayTeam, date, context });
  };

  const getPlaceholder = (type: 'home' | 'away') => {
    switch (sport) {
      case 'basketball': return type === 'home' ? '예: LA Lakers' : '예: Golden State Warriors';
      case 'baseball': return type === 'home' ? '예: NY Yankees' : '예: LA Dodgers';
      case 'volleyball': return type === 'home' ? '예: Incheon KAL Jumbos' : '예: Ansan OK';
      default: return type === 'home' ? '예: Tottenham' : '예: Arsenal';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
      <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        새로운 분석 요청
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Sport Selector */}
        <div>
          <label className="block text-slate-400 text-sm font-semibold mb-2">분석 종목 (Sport)</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { id: 'football', label: '축구 ⚽' },
              { id: 'basketball', label: '농구 🏀' },
              { id: 'baseball', label: '야구 ⚾' },
              { id: 'volleyball', label: '배구 🏐' },
              { id: 'hockey', label: '하키 🏒' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSport(s.id as SportType)}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors border ${
                  sport === s.id
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 mb-2">
          <p className="text-xs text-slate-400">
            * <span className="text-emerald-400 font-bold">Tip:</span> 정확한 데이터 검색을 위해 팀 이름은 <span className="text-white font-bold">영어 공식 명칭</span>으로 입력해주세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">홈 팀 (Home Team)</label>
            <input
              type="text"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              placeholder={getPlaceholder('home')}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">원정 팀 (Away Team)</label>
            <input
              type="text"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              placeholder={getPlaceholder('away')}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">경기 날짜 (선택)</label>
             <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
           <div>
            <label className="block text-slate-400 text-sm font-semibold mb-2">경기 맥락 (선택)</label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="예: 플레이오프 1차전, 선발 투수 XX"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.01] ${
            isLoading
              ? 'bg-slate-600 cursor-not-allowed text-slate-300'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              데이터 수집 및 분석 중...
            </span>
          ) : (
            '분석 시작'
          )}
        </button>
      </form>
    </div>
  );
};

export default MatchInput;
