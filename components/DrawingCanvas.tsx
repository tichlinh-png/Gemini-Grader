
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { Point } from '../types';

interface DrawingCanvasProps {
  onCapture: (base64: string) => void;
  onScribble: () => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onCapture, onScribble }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [allStrokes, setAllStrokes] = useState<Point[][]>([]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const container = containerRef.current;
    canvas.width = container.offsetWidth;
    canvas.height = Math.min(window.innerHeight * 0.5, 400);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0f172a';
    }
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

  const detectScribble = (strokePoints: Point[]) => {
    if (strokePoints.length < 15) return false;
    
    const xs = strokePoints.map(p => p.x);
    const ys = strokePoints.map(p => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const area = width * height;
    
    let pathLength = 0;
    for (let i = 1; i < strokePoints.length; i++) {
      pathLength += Math.hypot(strokePoints[i].x - strokePoints[i-1].x, strokePoints[i].y - strokePoints[i-1].y);
    }
    
    const density = pathLength / Math.max(area, 1);
    return density > 0.8 && area < 5000; // Small area, high density = scribble/erasure
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const pos = { x: clientX - rect.left, y: clientY - rect.top };
    setIsDrawing(true);
    setPoints([pos]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const pos = { x: clientX - rect.left, y: clientY - rect.top };
    setPoints(prev => [...prev, pos]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (points.length > 0) {
      if (detectScribble(points)) {
        onScribble();
        clearCanvas();
      } else {
        setAllStrokes(prev => [...prev, points]);
      }
    }
    setPoints([]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setAllStrokes([]);
      setPoints([]);
    }
  };

  const handleManualClear = () => {
    if (allStrokes.length > 0) {
      onScribble();
    }
    clearCanvas();
  };

  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Basic thresholding/preprocessing can happen here if needed
    onCapture(canvas.toDataURL('image/png').split(',')[1]);
  };

  // Expose capture via ref-like behavior or just a button inside
  useEffect(() => {
    (window as any).captureDrawing = capture;
  }, [allStrokes]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div ref={containerRef} className="relative w-full border-2 border-slate-200 rounded-xl overflow-hidden shadow-inner bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair"
        />
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={handleManualClear}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shadow-sm"
            title="Clear canvas"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={capture}
          disabled={allStrokes.length === 0}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-full font-bold transition-all shadow-lg active:scale-95"
        >
          Analyze Handwriting
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
