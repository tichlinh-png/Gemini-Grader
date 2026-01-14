
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AlertCircle, Award, Star, Zap, Target, MessageSquare, X, ArrowRight, Info, Search, Eye, Highlighter, CheckCircle2, UserRound, Clock, FileType, Filter, ListFilter, Sparkles } from 'lucide-react';
import { GradingResult, ErrorDetail } from '../types';

interface GraderResultsProps {
  result: GradingResult;
}

const GraderResults: React.FC<GraderResultsProps> = ({ result }) => {
  const [selectedErrorIdx, setSelectedErrorIdx] = useState<number | null>(null);
  const [hoveredErrorIdx, setHoveredErrorIdx] = useState<number | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [filterType, setFilterType] = useState<string | 'All'>('All');
  const [filterPage, setFilterPage] = useState<number | 'All'>('All');
  
  const textSectionRef = useRef<HTMLDivElement>(null);
  const errorCardsRef = useRef<(HTMLDivElement | null)[]>([]);

  const getTypeStyles = (type: string, isSelected: boolean) => {
    const active = isSelected || hoveredErrorIdx !== null;
    switch (type) {
      case 'Grammar':
        return isSelected 
          ? 'bg-blue-600 text-white border-transparent' 
          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'Spelling':
        return isSelected 
          ? 'bg-rose-600 text-white border-transparent' 
          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
      case 'Vocabulary':
        return isSelected 
          ? 'bg-emerald-600 text-white border-transparent' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
      case 'Style':
        return isSelected 
          ? 'bg-amber-600 text-white border-transparent' 
          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      case 'Punctuation':
        return isSelected 
          ? 'bg-slate-600 text-white border-transparent' 
          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
      default:
        return isSelected 
          ? 'bg-indigo-600 text-white border-transparent' 
          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';
    }
  };

  const availableTypes = useMemo(() => {
    const types = new Set(result.errors.map(e => e.type));
    return Array.from(types);
  }, [result.errors]);

  const availablePages = useMemo(() => {
    const pages = new Set(result.errors.map(e => e.page).filter((p): p is number => p !== undefined));
    return Array.from(pages).sort((a: number, b: number) => a - b);
  }, [result.errors]);

  const filteredErrors = useMemo(() => {
    return result.errors.map((err, originalIdx) => ({ ...err, originalIdx }))
      .filter(err => {
        const matchesType = filterType === 'All' || err.type === filterType;
        const matchesPage = filterPage === 'All' || err.page === filterPage;
        return matchesType && matchesPage;
      });
  }, [result.errors, filterType, filterPage]);

  const filteredSentenceAnalysis = useMemo(() => {
    return result.sentenceAnalysis.filter(s => {
      if (s.isCorrect) return false;
      return filterPage === 'All' || s.page === filterPage;
    });
  }, [result.sentenceAnalysis, filterPage]);

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 7) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const handleSelectError = (idx: number) => {
    setSelectedErrorIdx(idx);
    setShowRawText(false); 
    textSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSelectFromText = (idx: number) => {
    const isFiltered = filteredErrors.some(e => e.originalIdx === idx);
    if (!isFiltered) {
      setFilterType('All');
      setFilterPage('All');
    }
    setSelectedErrorIdx(idx);
    setTimeout(() => {
      errorCardsRef.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const renderHighlightedText = () => {
    let text = result.recognizedText;
    if (!result.errors || result.errors.length === 0) return text;

    const segments: { content: string; errorIdx: number | null; type?: string; correct?: string }[] = [];
    
    // Create a working list of matches to avoid overlapping same-position issues
    const matches: { start: number; end: number; errorIdx: number; type: string; correct: string }[] = [];
    
    result.errors.forEach((err, originalIdx) => {
      let pos = 0;
      // Find all occurrences of the "wrong" text
      while (true) {
        const index = text.toLowerCase().indexOf(err.wrong.toLowerCase(), pos);
        if (index === -1) break;
        
        matches.push({
          start: index,
          end: index + err.wrong.length,
          errorIdx: originalIdx,
          type: err.type,
          correct: err.correct
        });
        pos = index + 1;
      }
    });

    // Sort matches by start position, then by length (longer first)
    matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // Filter out overlapping matches (keep the first/best one)
    const nonOverlappingMatches: typeof matches = [];
    let lastEnd = 0;
    matches.forEach(match => {
      if (match.start >= lastEnd) {
        nonOverlappingMatches.push(match);
        lastEnd = match.end;
      }
    });

    let currentPos = 0;
    nonOverlappingMatches.forEach((match) => {
      if (match.start > currentPos) {
        segments.push({ content: text.substring(currentPos, match.start), errorIdx: null });
      }
      segments.push({ 
        content: text.substring(match.start, match.end), 
        errorIdx: match.errorIdx,
        type: match.type,
        correct: match.correct
      });
      currentPos = match.end;
    });

    if (currentPos < text.length) {
      segments.push({ content: text.substring(currentPos), errorIdx: null });
    }

    return segments.map((seg, i) => {
      if (seg.errorIdx === null) return <span key={i}>{seg.content}</span>;
      
      const isSelected = selectedErrorIdx === seg.errorIdx;
      const isHovered = hoveredErrorIdx === seg.errorIdx;
      const isFilteredOut = filterType !== 'All' && seg.type !== filterType;
      
      return (
        <span 
          key={i} 
          onMouseEnter={() => setHoveredErrorIdx(seg.errorIdx)}
          onMouseLeave={() => setHoveredErrorIdx(null)}
          onClick={() => handleSelectFromText(seg.errorIdx!)}
          className={`
            relative cursor-pointer border-b-2 transition-all duration-200 inline-block px-0.5 mx-0.5
            ${getTypeStyles(seg.type!, isSelected)}
            ${isFilteredOut ? 'opacity-30' : 'opacity-100'}
            ${isSelected ? 'rounded-md shadow-lg scale-110 z-20 font-bold px-1.5' : 'rounded-sm'}
          `}
        >
          {seg.content}
          
          {/* Tooltip on hover */}
          {(isHovered || isSelected) && !isFilteredOut && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap z-30 shadow-xl animate-in fade-in slide-in-from-bottom-2">
              <span className="opacity-60 mr-1">Sửa thành:</span>
              <span className="text-emerald-400">{seg.correct}</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
            </span>
          )}
        </span>
      );
    });
  };

  return (
    <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
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
          
          <div className="grid grid-cols-2 gap-8 flex-grow max-w-xl">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest opacity-40">Tỷ lệ câu đúng</p>
              <p className="text-5xl font-black text-slate-800 flex items-baseline gap-1">
                {result.correctSentences}
                <span className="text-2xl font-normal opacity-30">/{result.totalSentences}</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest opacity-40">Phát hiện lỗi</p>
              <p className={`text-5xl font-black flex items-center gap-3 ${result.errorCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {result.errorCount}
                {result.errorCount > 0 ? <AlertCircle size={32} /> : <Zap size={32} />}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Text Section */}
      <div ref={textSectionRef} className="bg-white p-10 rounded-[3.5rem] text-slate-800 relative overflow-hidden shadow-xl border border-slate-100 transition-all">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-indigo-600">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Search size={20} />
              </div>
              <h4 className="font-black uppercase text-xs tracking-[0.3em]">Văn bản & Vị trí lỗi</h4>
            </div>
            
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              <button 
                onClick={() => setShowRawText(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showRawText ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Highlighter size={14} /> Sửa lỗi
              </button>
              <button 
                onClick={() => setShowRawText(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showRawText ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Eye size={14} /> Bản gốc
              </button>
            </div>
          </div>

          {!showRawText && (
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100 inline-flex items-center gap-2">
                <Sparkles size={12} className="text-amber-500" /> Di chuột qua từ để xem gợi ý
              </div>
              <div className="flex flex-wrap gap-2">
                {['Grammar', 'Spelling', 'Style'].map(t => (
                  <div key={t} className={`w-2 h-2 rounded-full ${getTypeStyles(t, true).split(' ')[0]}`} title={t}></div>
                ))}
              </div>
            </div>
          )}

          <div className={`text-xl md:text-2xl leading-[2.5] font-medium selection:bg-indigo-100 border-l-4 ${showRawText ? 'border-slate-200 text-slate-500 italic' : 'border-indigo-500/20 text-slate-800'} pl-8 py-4 transition-all duration-300`}>
            {showRawText ? result.recognizedText : renderHighlightedText()}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
          <h4 className="font-black text-slate-900 flex items-center gap-4 text-2xl">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
              <X size={24} strokeWidth={3} />
            </div>
            Báo cáo chi tiết {result.errors.length} lỗi sai
          </h4>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <Filter size={16} className="text-slate-400" />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-600 uppercase tracking-widest focus:outline-none cursor-pointer"
              >
                <option value="All">Tất cả loại lỗi</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {availablePages.length > 1 && (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                <FileType size={16} className="text-slate-400" />
                <select 
                  value={filterPage}
                  onChange={(e) => setFilterPage(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                  className="bg-transparent text-xs font-black text-slate-600 uppercase tracking-widest focus:outline-none cursor-pointer"
                >
                  <option value="All">Tất cả trang</option>
                  {availablePages.map(page => (
                    <option key={page} value={page}>Trang {page}</option>
                  ))}
                </select>
              </div>
            )}
            
            {(filterType !== 'All' || filterPage !== 'All') && (
              <button 
                onClick={() => { setFilterType('All'); setFilterPage('All'); }}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 px-3"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
        
        {/* 2. Full Error List (Filtered) */}
        <div className="grid gap-5">
          {filteredErrors.length === 0 ? (
            <div className="p-20 bg-white rounded-[3rem] border border-slate-200 text-center space-y-4">
               <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                 <ListFilter size={32} />
               </div>
               <p className="font-bold text-slate-400">Không tìm thấy lỗi nào phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            filteredErrors.map((error, idx) => (
              <div 
                key={error.originalIdx} 
                ref={el => errorCardsRef.current[error.originalIdx] = el}
                onClick={() => handleSelectError(error.originalIdx)}
                onMouseEnter={() => setHoveredErrorIdx(error.originalIdx)}
                onMouseLeave={() => setHoveredErrorIdx(null)}
                className={`bg-white p-8 rounded-[2.5rem] border transition-all flex flex-col lg:flex-row gap-8 lg:items-center relative group cursor-pointer
                  ${selectedErrorIdx === error.originalIdx ? 'border-indigo-50 shadow-2xl scale-[1.02] ring-4 ring-indigo-50' : 'border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.01]'}
                `}
              >
                <div className={`absolute top-0 left-0 w-2 h-full transition-colors 
                  ${selectedErrorIdx === error.originalIdx ? 'bg-indigo-500' : 'bg-slate-200 group-hover:bg-indigo-500'}
                `}></div>
                <div className="flex-grow space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className={`text-[11px] font-black px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm transition-colors
                        ${selectedErrorIdx === error.originalIdx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}
                      `}>
                        #{error.originalIdx + 1} • {error.type}
                      </span>
                      {error.page && (
                        <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                          <FileType size={10} /> Trang {error.page}
                        </span>
                      )}
                    </div>
                    {(selectedErrorIdx === error.originalIdx || hoveredErrorIdx === error.originalIdx) && (
                      <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 animate-pulse">
                        <Search size={12} /> Đang tập trung
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xl md:text-2xl">
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
            ))
          )}
        </div>
      </div>

      {/* 3. Context Correction (Filtered by Page if applicable) */}
      {filteredSentenceAnalysis.length > 0 && (
        <div className="space-y-6">
          <h4 className="font-black text-slate-900 flex items-center gap-4 text-2xl px-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            Phân tích câu có lỗi {filterPage !== 'All' ? `trên Trang ${filterPage}` : ''}
          </h4>
          <div className="grid gap-6">
            {filteredSentenceAnalysis.map((item, idx) => (
              <div key={idx} className="p-8 rounded-[2.8rem] border border-indigo-50 bg-white shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-400 group-hover:bg-indigo-600 transition-colors"></div>
                {item.page && (
                  <div className="absolute top-4 right-8 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                    Trang {item.page}
                  </div>
                )}
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
      <div className="space-y-6">
        <h4 className="font-black text-slate-900 flex items-center gap-4 text-2xl px-4">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          Đánh giá chuyên môn
        </h4>
        <div className="grid md:grid-cols-3 gap-8">
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
      </div>

      {/* 5. Parent Report Section */}
      <div className="pt-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3.5rem] p-1 shadow-2xl overflow-hidden group">
          <div className="bg-white rounded-[3.3rem] p-10 md:p-14 space-y-10 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-100 pb-10 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <UserRound size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Nhận xét gửi phụ huynh</h3>
                  <p className="text-indigo-600 font-bold text-sm tracking-wide uppercase mt-1">Học viện Anh ngữ Gemini Grader</p>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-3">
                 <Clock size={16} /> {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>

            <div className="relative z-10">
              <div className="text-indigo-400 absolute -top-4 -left-2 opacity-20">
                <MessageSquare size={80} fill="currentColor" />
              </div>
              <div className="prose prose-indigo max-w-none">
                <p className="text-xl leading-[1.8] text-slate-700 font-medium italic whitespace-pre-line">
                  {result.assessment.parentReport}
                </p>
              </div>
            </div>

            <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
               <div className="flex items-center gap-2">
                 {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="text-amber-400" fill="currentColor" />
                 ))}
                 <span className="text-xs font-black text-slate-400 ml-2 uppercase tracking-widest">ĐÁNH GIÁ TỐT</span>
               </div>
               <div className="text-center sm:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Giám khảo phụ trách</p>
                  <p className="font-black text-indigo-600 text-lg">Gemini Senior Academic Team</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraderResults;
