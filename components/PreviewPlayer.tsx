
import React, { useState, useEffect, useRef } from 'react';
import { StoryNode, StoryOption } from '../types';
import * as Icons from './Icons';
import { decodePCM } from '../services/geminiService';

interface Props {
  nodes: Record<string, StoryNode>;
  startId: string;
  onClose: () => void;
}

export const PreviewPlayer: React.FC<Props> = ({ nodes, startId, onClose }) => {
  const [currentId, setCurrentId] = useState(startId);
  const node = nodes[currentId];
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentAudioElRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  // Initialize Audio Context on mount/interaction
  useEffect(() => {
     if (!audioCtxRef.current) {
         audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
     }
  }, []);

  const handleInteraction = async () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
          setIsAudioInitialized(true);
      }
  };

  useEffect(() => {
    // Cleanup previous audio
    if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch (e) {}
        currentSourceRef.current = null;
    }
    if (currentAudioElRef.current) {
        currentAudioElRef.current.pause();
        currentAudioElRef.current = null;
    }

    // Audio Handling
    if (node && node.audioSrc) {
        // Attempt to resume context if needed
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume().catch(console.error);
        }

        const playAudio = async () => {
            if (!audioCtxRef.current) return;
            
            try {
                // If it's a data URI representing PCM (from our generator)
                if (node.audioSrc.startsWith('data:audio/pcm')) {
                    const buffer = await decodePCM(node.audioSrc, audioCtxRef.current);
                    const source = audioCtxRef.current.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioCtxRef.current.destination);
                    source.loop = true; // BGM loops
                    source.start();
                    currentSourceRef.current = source;
                } else {
                   // Standard audio handling (MP3/WAV/etc)
                   const audio = new Audio(node.audioSrc);
                   audio.loop = true;
                   
                   // Handle autoplay policy
                   const playPromise = audio.play();
                   if (playPromise !== undefined) {
                       playPromise.catch(error => {
                           console.warn("Autoplay blocked, waiting for interaction", error);
                       });
                   }
                   currentAudioElRef.current = audio;
                }
            } catch (e) {
                console.error("Audio playback error", e);
            }
        };
        playAudio();
    }
  }, [currentId, node]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
        if (currentSourceRef.current) {
            try { currentSourceRef.current.stop(); } catch(e){}
        }
        if (currentAudioElRef.current) {
            currentAudioElRef.current.pause();
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
        }
      };
  }, []);

  if (!node) return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white z-50">
          <div className="text-center animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold mb-4 tracking-widest text-slate-200">全剧终</h2>
            <p className="text-slate-500 mb-8">感谢体验</p>
            <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors">关闭预览</button>
          </div>
      </div>
  );

  // Fix: Access textPos and optionsPos directly from node as defined in StoryNode interface
  // Default positions if not set
  const textStyle = node.textPos 
    ? { left: `${node.textPos.x}%`, top: `${node.textPos.y}%`, width: '40%' }
    : { bottom: '10%', left: '10%', width: '60%' }; // Default fallback

  const optionsStyle = node.optionsPos
    ? { left: `${node.optionsPos.x}%`, top: `${node.optionsPos.y}%`, width: '30%' }
    : { bottom: '10%', right: '10%', width: '30%' }; // Default fallback
    
  const hasCustomLayout = !!node.textPos;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans" onClick={handleInteraction}>
      {/* Background Layer */}
      <div className="absolute inset-0 overflow-hidden">
        {node.mediaType === 'video' && node.mediaSrc ? (
            <video 
                key={node.mediaSrc} // Force re-render on source change to ensure autoplay works
                src={node.mediaSrc} 
                autoPlay 
                loop 
                // muted attribute removed to enable sound
                className="w-full h-full object-cover opacity-80" 
            />
        ) : node.mediaType === 'image' && node.mediaSrc ? (
            <img src={node.mediaSrc} alt="bg" className="w-full h-full object-cover opacity-60 animate-in fade-in zoom-in duration-1000" />
        ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Close Button */}
      <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-red-600 rounded-full z-50 transition-colors border border-white/20">
        <Icons.X size={24} />
      </button>

      {/* Content Layer - Conditional Layout */}
      {!hasCustomLayout ? (
          // Original Flex Layout
          <div className="relative z-10 flex flex-col justify-end h-full p-12 max-w-6xl mx-auto pb-24">
            <div className="mb-10 animate-[fadeIn_0.5s_ease-out]">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm">{node.title}</h1>
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10 max-w-3xl shadow-2xl">
                    <p className="text-lg md:text-xl leading-relaxed text-slate-100 font-light tracking-wide">{node.content}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                {node.options.map((opt, idx) => (
                    <button 
                        key={opt.id}
                        onClick={(e) => { e.stopPropagation(); opt.targetId && setCurrentId(opt.targetId); }}
                        className="group relative bg-slate-900/60 hover:bg-cyan-950/80 border border-slate-600 hover:border-cyan-400 p-6 text-left rounded-lg transition-all backdrop-blur-sm overflow-hidden"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 text-lg font-medium group-hover:text-cyan-100 transition-colors">{opt.label}</span>
                    </button>
                ))}
                {node.options.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-slate-500 uppercase tracking-widest text-sm bg-black/20 rounded border border-white/5">
                        剧情结束
                    </div>
                )}
            </div>
          </div>
      ) : (
          // Custom Absolute Layout
          <div className="relative z-10 w-full h-full">
               <div 
                 className="absolute bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-2xl animate-[fadeIn_0.5s_ease-out]"
                 style={{ ...textStyle, position: 'absolute' }}
               >
                    <h1 className="text-3xl font-bold mb-3 text-white drop-shadow-md">{node.title}</h1>
                    <p className="text-lg leading-relaxed text-slate-100 font-light">{node.content}</p>
               </div>

               <div 
                 className="absolute flex flex-col gap-3"
                 style={{ ...optionsStyle, position: 'absolute' }}
               >
                   {node.options.map((opt, idx) => (
                    <button 
                        key={opt.id}
                        onClick={(e) => { e.stopPropagation(); opt.targetId && setCurrentId(opt.targetId); }}
                        className="w-full bg-slate-900/60 hover:bg-cyan-950/80 border border-slate-600 hover:border-cyan-400 p-4 text-left rounded-lg transition-all backdrop-blur-sm text-white font-medium shadow-lg"
                    >
                        {opt.label}
                    </button>
                   ))}
                   {node.options.length === 0 && (
                        <div className="text-center py-2 text-slate-500 text-sm bg-black/40 rounded">
                            剧情结束
                        </div>
                    )}
               </div>
          </div>
      )}
    </div>
  );
};
