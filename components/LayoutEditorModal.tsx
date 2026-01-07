import React, { useState, useRef, useEffect } from 'react';
import { StoryNode, ElementPosition } from '../types';
import * as Icons from './Icons';

interface Props {
  node: StoryNode;
  onSave: (nodeId: string, layout: { textPos: ElementPosition, optionsPos: ElementPosition }) => void;
  onClose: () => void;
}

export const LayoutEditorModal: React.FC<Props> = ({ node, onSave, onClose }) => {
    // Default positions if undefined
    const [textPos, setTextPos] = useState<ElementPosition>(node.textPos || { x: 5, y: 60 });
    const [optionsPos, setOptionsPos] = useState<ElementPosition>(node.optionsPos || { x: 5, y: 80 });
    
    const [dragging, setDragging] = useState<'text' | 'options' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent, type: 'text' | 'options') => {
        e.stopPropagation();
        setDragging(type);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Clamp values 0-100
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        if (dragging === 'text') {
            setTextPos({ x: clampedX, y: clampedY });
        } else {
            setOptionsPos({ x: clampedX, y: clampedY });
        }
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    const handleSave = () => {
        onSave(node.id, { textPos, optionsPos });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-6xl flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Icons.LayoutDashboard /> 界面布局编辑器
                </h2>
                <div className="flex gap-4">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">取消</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-lg">保存布局</button>
                </div>
            </div>

            {/* Editor Canvas */}
            <div 
                ref={containerRef}
                className="relative w-full aspect-video bg-slate-900 border border-slate-700 rounded-lg overflow-hidden select-none shadow-2xl"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Background Preview */}
                <div className="absolute inset-0 pointer-events-none">
                     {node.mediaType === 'video' && node.mediaSrc ? (
                        <video src={node.mediaSrc} className="w-full h-full object-cover opacity-60" />
                    ) : node.mediaType === 'image' && node.mediaSrc ? (
                        <img src={node.mediaSrc} alt="bg" className="w-full h-full object-cover opacity-60" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black" />
                    )}
                    {/* Grid Lines for reference */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '10% 10%' }}></div>
                </div>

                {/* Draggable Text Area */}
                <div 
                    onMouseDown={(e) => handleMouseDown(e, 'text')}
                    style={{ left: `${textPos.x}%`, top: `${textPos.y}%` }}
                    className="absolute w-[40%] cursor-move group border-2 border-dashed border-yellow-500/50 hover:border-yellow-400 bg-black/40 backdrop-blur-sm p-4 rounded text-white"
                >
                    <div className="absolute -top-3 left-0 bg-yellow-500 text-black text-[10px] px-1 rounded font-bold flex items-center gap-1">
                        <Icons.Move size={10} /> 剧情文本区
                    </div>
                    <h3 className="font-bold text-lg mb-1">{node.title}</h3>
                    <p className="text-sm opacity-80 line-clamp-2">{node.content}</p>
                </div>

                {/* Draggable Options Area */}
                <div 
                    onMouseDown={(e) => handleMouseDown(e, 'options')}
                    style={{ left: `${optionsPos.x}%`, top: `${optionsPos.y}%` }}
                    className="absolute w-[30%] cursor-move group border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-black/20 p-2 rounded space-y-2"
                >
                     <div className="absolute -top-3 left-0 bg-cyan-500 text-black text-[10px] px-1 rounded font-bold flex items-center gap-1">
                        <Icons.Move size={10} /> 选项区
                    </div>
                    {(node.options.length > 0 ? node.options : [{id:'demo', label:'示例选项 1'}, {id:'demo2', label:'示例选项 2'}]).map(opt => (
                        <div key={opt.id} className="bg-slate-800/80 border border-slate-600 p-2 rounded text-sm text-center text-cyan-200 pointer-events-none">
                            {opt.label}
                        </div>
                    ))}
                </div>
            </div>
            
            <p className="mt-4 text-slate-500 text-sm">拖拽黄色和蓝色边框区域以调整其在画面中的位置。按 "保存布局" 应用更改。</p>
        </div>
    );
};