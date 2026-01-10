
import React from 'react';
import { Clock, Trash2, ChevronRight, Calendar, FileText, Award, AlertCircle } from 'lucide-react';
import { HistoryEntry } from '../types';

interface HistoryListProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onDelete, onClearAll }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
          <Clock size={40} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-800">Chưa có lịch sử</h3>
          <p className="text-slate-500 max-w-xs">Các bài chấm của bạn sẽ được lưu tự động tại đây để xem lại sau.</p>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-600 bg-emerald-50';
    if (score >= 7) return 'text-blue-600 bg-blue-50';
    if (score >= 5) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <Clock className="text-indigo-600" />
          Lịch sử chấm bài
        </h2>
        <button 
          onClick={onClearAll}
          className="text-xs font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
        >
          <Trash2 size={14} /> Xóa tất cả
        </button>
      </div>

      <div className="grid gap-4">
        {history.map((entry) => (
          <div 
            key={entry.id}
            className="group relative bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer flex items-center gap-6"
            onClick={() => onSelect(entry)}
          >
            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm font-black ${getScoreColor(entry.result.score)}`}>
              <span className="text-xl">{entry.result.score.toFixed(1)}</span>
              <span className="text-[8px] uppercase tracking-tighter opacity-60">Điểm</span>
            </div>

            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{formatDate(entry.timestamp)}</span>
              </div>
              <h3 className="font-black text-slate-800 truncate text-lg pr-10">{entry.title}</h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <FileText size={14} className="text-indigo-400" />
                  {entry.result.recognizedText.split(/\s+/).filter(Boolean).length} từ
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <AlertCircle size={14} className="text-rose-400" />
                  {entry.result.errorCount} lỗi
                </div>
              </div>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry.id);
              }}
              className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={18} />
            </button>

            <div className="text-slate-300 group-hover:text-indigo-600 transition-colors">
              <ChevronRight size={24} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
