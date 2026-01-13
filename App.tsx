
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Award, Check, X, RefreshCw, Sparkles, Loader2, FileText, Trash2, Plus, AlertCircle, CheckCircle2, Clock, ChevronLeft, Zap, Layers, Search } from 'lucide-react';
import GraderResults from './components/GraderResults';
import HistoryList from './components/HistoryList';
import { gradeWriting } from './services/geminiService';
import { GradingResult, HistoryEntry } from './types';

declare global {
  interface Window {
    heic2any: any;
  }
}

interface ImageFile {
  id: string;
  preview: string;
  base64: string;
}

const STORAGE_KEY = 'gemini_grader_history_v1';

const workerCode = `
  self.onmessage = function(e) {
    const { imageData, id } = e.data;
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      const enhanced = gray < 128 ? gray * 0.9 : Math.min(255, gray * 1.1);
      data[i] = data[i+1] = data[i+2] = enhanced;
    }
    self.postMessage({ imageData, id }, [imageData.data.buffer]);
  };
`;

const App: React.FC = () => {
  const [view, setView] = useState<'main' | 'history' | 'result'>('main');
  const [loading, setLoading] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Đang chuẩn bị...");
  const [currentProcessingThumb, setCurrentProcessingThumb] = useState<string | null>(null);
  
  const [result, setResult] = useState<GradingResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (processingFiles) {
      const statuses = [
        "Đang tối ưu hóa điểm ảnh...",
        "Đang nén dữ liệu qua Web Worker...",
        "Tăng cường độ tương phản văn bản...",
        "Đang xử lý định dạng HEIC...",
        "Đang chuẩn bị dữ liệu cho AI..."
      ];
      const interval = setInterval(() => {
        setStatusMsg(statuses[Math.floor(Math.random() * statuses.length)]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [processingFiles]);

  const processImage = async (file: File): Promise<ImageFile> => {
    let blob: Blob = file;
    const isHEIC = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    // Create a quick local URL for the thumbnail while processing
    const quickThumb = URL.createObjectURL(file);
    setCurrentProcessingThumb(quickThumb);

    if (isHEIC && window.heic2any) {
      try {
        const converted = await window.heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.7
        });
        blob = Array.isArray(converted) ? converted[0] : converted;
      } catch (e) {
        console.error("HEIC conversion failed", e);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1600;

          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return reject(new Error("Canvas context failed"));
          
          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          if (workerRef.current) {
            const id = Math.random().toString(36).substr(2, 9);
            const onMessage = (event: MessageEvent) => {
              if (event.data.id === id) {
                workerRef.current?.removeEventListener('message', onMessage);
                ctx.putImageData(event.data.imageData, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                URL.revokeObjectURL(quickThumb); // Clean up
                resolve({
                  id,
                  preview: dataUrl,
                  base64: dataUrl.split(',')[1]
                });
              }
            };
            workerRef.current.addEventListener('message', onMessage);
            workerRef.current.postMessage({ imageData, id }, [imageData.data.buffer]);
          } else {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            URL.revokeObjectURL(quickThumb); // Clean up
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              preview: dataUrl,
              base64: dataUrl.split(',')[1]
            });
          }
        };
        img.onerror = () => reject(new Error("Không thể load hình ảnh."));
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setProcessingFiles(true);
      setProgress(0);
      setTotalFiles(files.length);
      setCurrentFileIdx(0);
      setError(null);
      
      const newImages: ImageFile[] = [];
      try {
        for (let i = 0; i < files.length; i++) {
          setCurrentFileIdx(i + 1);
          const processed = await processImage(files[i]);
          newImages.push(processed);
          setProgress(Math.round(((i + 1) / files.length) * 100));
        }
        setSelectedImages(prev => [...prev, ...newImages]);
        setSuccessMsg(`Đã nhận ${newImages.length} ảnh`);
      } catch (err: any) {
        setError(err.message || "Lỗi xử lý tệp.");
      } finally {
        setProcessingFiles(false);
        setProgress(0);
        setCurrentProcessingThumb(null);
        if (e.target) e.target.value = '';
      }
    }
  };

  const removeImage = (id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  };

  const startGrading = async () => {
    if (selectedImages.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const imagesData = selectedImages.map(img => ({
        base64: img.base64,
        mime: "image/jpeg"
      }));
      const res = await gradeWriting(imagesData);
      if (res.isReadable === false) {
        setError(res.unreadableReason || "AI không thể đọc được nội dung.");
        setResult(null);
      } else {
        setResult(res);
        setView('result');
        
        const newEntry: HistoryEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          result: res,
          title: `Bài làm ${new Date().toLocaleDateString('vi-VN')}`
        };
        setHistory(prev => [newEntry, ...prev]);
      }
    } catch (err: any) {
      setError("Máy chủ gặp sự cố khi phân tích. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setView('main');
    setResult(null);
    setSelectedImages([]);
    setError(null);
    setSuccessMsg(null);
  };

  const selectHistoryItem = (entry: HistoryEntry) => {
    setResult(entry.result);
    setView('result');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử?")) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50 relative selection:bg-indigo-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 cursor-pointer"
              onClick={reset}
            >
              <Award size={24} />
            </div>
            <h1 
              className="font-black text-xl tracking-tight text-slate-800 cursor-pointer"
              onClick={reset}
            >
              Gemini<span className="text-indigo-600">Grader</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setView(view === 'history' ? 'main' : 'history')}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm ${view === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              title="Lịch sử"
            >
              <Clock size={20} />
              <span className="hidden sm:inline">Lịch sử</span>
            </button>
            <button 
              onClick={reset} 
              className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:rotate-180 duration-500"
              title="Làm mới"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </header>

      {successMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border border-white/10">
            <CheckCircle2 size={20} className="text-emerald-400" />
            {successMsg}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {view === 'history' ? (
          <HistoryList 
            history={history}
            onSelect={selectHistoryItem}
            onDelete={deleteHistoryItem}
            onClearAll={clearHistory}
          />
        ) : (
          <>
            {view === 'main' && !loading && !processingFiles && selectedImages.length === 0 && (
              <div className="text-center mb-10 space-y-4 animate-in fade-in duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
                  <Sparkles size={14} />
                  AI Grader v3.6 • Smart Sync
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Chấm bài viết & Lưu kết quả.</h2>
                <p className="text-slate-500 max-w-lg mx-auto text-base">Hệ thống AI chuyên biệt rà soát lỗi và tự động lưu trữ lịch sử chấm bài để bạn xem lại bất cứ lúc nào.</p>
              </div>
            )}

            <div className="space-y-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                      <FileText size={32} className="animate-bounce" />
                    </div>
                  </div>
                  <p className="font-black text-slate-800 text-xl">Đang rà soát chi tiết...</p>
                  <p className="text-slate-400 text-sm mt-3 italic text-center px-12">Chúng tôi đang liệt kê từng lỗi một để đảm bảo không bỏ sót bất kỳ chi tiết nào.</p>
                </div>
              ) : error ? (
                <div className="bg-rose-50 border-2 border-rose-100 p-12 rounded-[3rem] flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shadow-inner">
                    <AlertCircle size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-black text-rose-900 text-2xl">Đã xảy ra lỗi</h3>
                    <p className="text-rose-700 font-medium max-w-md">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="px-12 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl shadow-rose-200 hover:bg-rose-700 hover:-translate-y-1 transition-all active:translate-y-0">THỬ LẠI</button>
                </div>
              ) : view === 'result' && result ? (
                <div className="space-y-6">
                  <button 
                    onClick={() => setView(history.length > 0 ? 'history' : 'main')}
                    className="flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors px-4"
                  >
                    <ChevronLeft size={20} /> Quay lại
                  </button>
                  <GraderResults result={result} />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className={`relative overflow-hidden group border-4 border-dashed rounded-[3rem] p-10 transition-all ${selectedImages.length > 0 || processingFiles ? 'border-indigo-100 bg-white shadow-2xl' : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xl'}`}>
                    
                    {processingFiles && selectedImages.length > 0 && (
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-50 overflow-hidden z-20">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    )}

                    {processingFiles && selectedImages.length === 0 ? (
                      <div className="text-center py-20 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="relative">
                          <svg className="w-48 h-48 transform -rotate-90">
                            <circle
                              cx="96"
                              cy="96"
                              r="88"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              className="text-slate-100"
                            />
                            <circle
                              cx="96"
                              cy="96"
                              r="88"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 88}
                              strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                              className="text-indigo-600 transition-all duration-500 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                            {currentProcessingThumb ? (
                              <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg animate-pulse">
                                <img src={currentProcessingThumb} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                   <Search className="text-white animate-bounce" size={24} />
                                </div>
                                <div className="absolute bottom-4 left-0 w-full text-center">
                                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{progress}%</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-4xl font-black text-slate-800">{progress}%</span>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{currentFileIdx}/{totalFiles} TRANG</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 max-w-sm">
                          <div className="flex items-center justify-center gap-2 mb-2">
                             <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                <Loader2 size={16} className="animate-spin" />
                             </div>
                             <h3 className="text-2xl font-black text-slate-800">{statusMsg}</h3>
                          </div>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Đang phân tích trang {currentFileIdx} trên tổng số {totalFiles} trang tài liệu</p>
                        </div>
                      </div>
                    ) : selectedImages.length === 0 ? (
                      <div className="text-center py-16 relative">
                        <input type="file" accept="image/*" multiple onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                        <div className="w-28 h-28 bg-slate-50 text-slate-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 transition-all group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 shadow-sm">
                          <Upload size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Thêm ảnh bài viết của bạn</h3>
                        <p className="text-base text-slate-500 mb-10">Chọn các trang bài làm (JPG, PNG, HEIC). <br/>Hệ thống sẽ tự động tối ưu hóa để AI đọc tốt nhất.</p>
                        <div className="inline-flex items-center gap-3 px-12 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all">
                          <Plus size={24} /> CHỌN ẢNH NGAY
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                          <div className="space-y-1">
                            <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                              <Layers size={24} className="text-indigo-600" />
                              Tài liệu ({selectedImages.length})
                            </h3>
                            {processingFiles && (
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
                                 <span className="text-xs text-indigo-600 font-black uppercase tracking-tighter">Đang xử lý trang {currentFileIdx}...</span>
                               </div>
                            )}
                          </div>
                          <label className="cursor-pointer bg-slate-50 hover:bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all border border-slate-200 hover:border-indigo-200">
                            <Plus size={18} /> THÊM
                            <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                          </label>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                          {selectedImages.map((img) => (
                            <div key={img.id} className="relative aspect-[3/4] bg-slate-50 rounded-[2rem] overflow-hidden border-2 border-slate-100 group/item shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all animate-in fade-in zoom-in-95">
                              <img src={img.preview} alt="Page" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/item:opacity-100 transition-all flex items-end justify-center pb-6">
                                <button onClick={() => removeImage(img.id)} className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl transform translate-y-4 group-hover/item:translate-y-0 transition-all hover:bg-rose-700">
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {processingFiles && (
                            <div className="aspect-[3/4] bg-indigo-50/30 rounded-[2rem] border-2 border-indigo-100 border-dashed flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                              <div className="relative flex flex-col items-center gap-2 w-full h-full p-2">
                                {currentProcessingThumb ? (
                                   <div className="w-full h-full relative overflow-hidden rounded-[1.5rem]">
                                      <img src={currentProcessingThumb} className="w-full h-full object-cover blur-[2px] opacity-40" />
                                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                                        <div className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100">
                                          Nén {progress}%
                                        </div>
                                      </div>
                                   </div>
                                ) : (
                                  <>
                                    <Loader2 size={32} className="text-indigo-400 animate-spin" />
                                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest text-center px-4">
                                      Đang nén {currentFileIdx}...
                                    </div>
                                    <div className="w-16 h-1 bg-indigo-100 rounded-full overflow-hidden mt-1">
                                      <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={startGrading} 
                          disabled={processingFiles}
                          className="w-full py-6 rounded-[2rem] font-black text-2xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-4 disabled:bg-slate-200 disabled:shadow-none"
                        >
                          {processingFiles ? <Loader2 className="animate-spin" /> : <Zap size={32} fill="currentColor" />} 
                          BẮT ĐẦU PHÂN TÍCH
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex items-start gap-5 shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                      <AlertCircle size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-slate-800 text-sm">Hướng dẫn bài làm đạt kết quả tốt nhất</h4>
                      <p className="text-sm text-slate-500 leading-relaxed italic">
                        Chụp ảnh theo chiều dọc, vuông góc với mặt giấy. Đảm bảo chữ viết tay rõ ràng để AI có thể rà soát đầy đủ danh sách các lỗi ngữ pháp phức tạp.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {(view === 'result' || view === 'history') && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
          <button 
            onClick={reset} 
            className="flex items-center gap-4 px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-105 transition-all hover:bg-black active:scale-95 border border-white/10"
          >
            <RefreshCw size={24} /> LÀM BÀI MỚI
          </button>
        </div>
      )}
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
