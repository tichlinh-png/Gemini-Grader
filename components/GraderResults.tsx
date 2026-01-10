
import React from 'react';
import { AlertCircle, Award, BookOpen, Star, Zap, Target, MessageSquare, X, ArrowRight, Info } from 'lucide-react';
import { GradingResult } from '../types';

interface GraderResultsProps {
  result: GradingResult;
}

const GraderResults: React.FC<GraderResultsProps> = ({ result }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 7) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const errorSentences = result.sentenceAnalysis.filter(s => !s.isCorrect);

  return (
    <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* 1. Score Dashboard */}
      <div className={`p-10 rounded-[3rem] border-2 ${getScoreColor(result.score)} shadow-2xl shadow-slate-200/40 relative overflow-hidden bg-white/50 backdrop-blur-sm`}>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-current opacity-5 rounded-full"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
          <div className="flex items-center gap-8">
            <div className="p-6 bg-white rounded-[2rem] shadow-lg text-indigo-600">
              <Award size={56} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.25em] opacity-40 mb-1">Band Score</h3>
              <p className="text-7xl font-black tracking-tighter">{result.score.toFixed(1)}<span className="text-3xl font-normal opacity-30 ml-1">/10</span></p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-12 flex-grow max-w-md">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest opacity-40">Phát hiện lỗi</p>
              <p className={`text-5xl font-black flex items-center gap-3 ${result.errorCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {result.errorCount}
                {result.errorCount > 0 ? <AlertCircle size={32} /> : <Zap size={32} />}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest opacity-40">Số lượng từ</p>
              <p className="text-5xl font-black text-slate-800">{result.recognizedText.split(/\s+/).filter(Boolean).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Full Error List */}
      {result.errors && result.errors.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h4 className="font-black text-slate-900 flex items-center gap-4 text-2xl">
              <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                <X size={24} strokeWidth={3} />
              </div>
              Báo cáo chi tiết {result.errors.length} lỗi sai
            </h4>
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
               <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Toàn diện</span>
            </div>
          </div>
          
          <div className="grid gap-5">
            {result.errors.map((error, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-rose-100 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all flex flex-col lg:flex-row gap-8 lg:items-center relative group">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-200 group-hover:bg-rose-500 transition-colors"></div>
                <div className="flex-grow space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm">#{idx + 1} • {error.type}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xl">
                    <span className="text-rose-600 bg-rose-50 px-5 py-2 rounded-2xl border border-rose-100 line-through font-bold">{error.wrong}</span>
                    <ArrowRight size={24} className="text-slate-300" />
                    <span className="text-emerald-600 bg-emerald-50 px-5 py-2 rounded-2xl border border-emerald-100 font-black shadow-sm">{error.correct}</span>
                  </div>
                </div>
                <div className="lg:w-2/5 bg-slate-50/80 p-6 rounded-[1.8rem] text-sm text-slate-600 border border-slate-100 italic relative">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="text-indigo-400 mt-1 shrink-0" />
                    <p className="leading-relaxed">{error.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Context Correction */}
      {errorSentences.length > 0 && (
        <div className="space-y-6">
          <h4 className="font-black text-slate-900 flex items-center gap-4 text-2xl px-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            Phân tích câu có lỗi
          </h4>
          <div className="grid gap-6">
            {errorSentences.map((item, idx) => (
              <div key={idx} className="p-8 rounded-[2.8rem] border border-indigo-50 bg-white shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-400 group-hover:bg-indigo-600 transition-colors"></div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest">Nội dung gốc</p>
                    <p className="text-slate-700 text-lg leading-relaxed font-medium italic">"{item.original}"</p>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-50 space-y-2">
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Đề xuất chỉnh sửa</p>
                    <p className="text-emerald-800 font-black text-xl leading-relaxed">"{item.corrected}"</p>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-[2rem] text-sm text-slate-300 border border-white/5 shadow-2xl">
                    <span className="font-black uppercase text-[10px] block mb-2 text-indigo-400 tracking-widest">GHI CHÚ GIÁM KHẢO</span>
                    <p className="leading-relaxed opacity-90">{item.feedback}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Overall Assessment */}
      <div className="grid md:grid-cols-3 gap-8 pt-6">
        {[
          { icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Điểm mạnh', content: result.assessment.strength, label: 'Strength' },
          { icon: Target, color: 'text-rose-500', bg: 'bg-rose-50', title: 'Điểm yếu', content: result.assessment.weakness, label: 'Weakness' },
          { icon: Zap, color: 'text-indigo-500', bg: 'bg-indigo-50', title: 'Lời khuyên', content: result.assessment.improvement, label: 'Improvement' }
        ].map((box, i) => (
          <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 group">
            <div className={`w-14 h-14 ${box.bg} ${box.color} rounded-[1.5rem] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
              <box.icon size={28} fill={i === 0 || i === 2 ? 'currentColor' : 'none'} />
            </div>
            <h5 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{box.label}</h5>
            <h4 className="font-black text-slate-800 text-lg mb-4">{box.title}</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">{box.content}</p>
          </div>
        ))}
      </div>

      {/* 5. OCR View */}
      <div className="bg-slate-900 p-10 rounded-[3.5rem] text-slate-400 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150 text-white">
           <BookOpen size={160} />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 text-indigo-400">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <h4 className="font-black uppercase text-xs tracking-[0.3em]">Full Transcribed Text</h4>
          </div>
          <p className="text-base leading-relaxed font-mono opacity-70 italic selection:bg-indigo-500 selection:text-white border-l-2 border-indigo-500/30 pl-6">
            "{result.recognizedText}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default GraderResults;
