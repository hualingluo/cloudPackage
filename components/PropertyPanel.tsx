import React, { useState, useRef } from 'react';
import { StoryNode, StoryOption, NodeType, MediaType } from '../types';
import * as Icons from './Icons';
import { generateSceneImage, generateSceneVideo, generateSceneAudio, polishNodeText, generatePlotChoices } from '../services/geminiService';

interface Props {
  node: StoryNode;
  allNodes: Record<string, StoryNode>;
  onUpdate: (id: string, updates: Partial<StoryNode>) => void;
  onCreateNodes?: (newNodes: StoryNode[]) => void;
  onEditLayout?: (nodeId: string) => void;
  onClose: () => void;
  stylePrompt: string;
}

export const PropertyPanel: React.FC<Props> = ({ node, allNodes, onUpdate, onCreateNodes, onEditLayout, onClose, stylePrompt }) => {
  const [loading, setLoading] = useState<string | null>(null);
  
  // File Refs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleGenMedia = async (type: MediaType) => {
    if (type === 'none') return;
    setLoading(type);
    
    let result = null;
    if (type === 'image') {
      result = await generateSceneImage(node.content, stylePrompt);
    } else if (type === 'video') {
      result = await generateSceneVideo(node.content, stylePrompt);
    }

    if (result) {
      onUpdate(node.id, { mediaType: type, mediaSrc: result });
    }
    setLoading(null);
  };

  const handleGenAudio = async () => {
      setLoading('audio');
      const result = await generateSceneAudio(node.content, 'bgm');
      if (result) {
        onUpdate(node.id, { audioSrc: result });
      }
      setLoading(null);
  }

  const handlePolish = async () => {
      setLoading('text');
      const polished = await polishNodeText(node.content, stylePrompt);
      onUpdate(node.id, { content: polished });
      setLoading(null);
  }

  const handleAutoBranch = async () => {
      if (!onCreateNodes) return;
      setLoading('branch');
      const choices = await generatePlotChoices(node.content, stylePrompt);
      
      if (choices && choices.length > 0) {
          const newNodes: StoryNode[] = [];
          const newOptions: StoryOption[] = [...node.options];

          const startY = node.y - ((choices.length - 1) * 200) / 2;
          
          choices.forEach((choice, index) => {
              const newNodeId = `node_${Date.now()}_${index}`;
              
              // Create new node
              const newNode: StoryNode = {
                  id: newNodeId,
                  title: choice.label, // Use choice label as temporary title
                  type: 'scene',
                  content: choice.content,
                  mediaType: 'none',
                  mediaSrc: '',
                  audioSrc: '',
                  x: node.x + 350,
                  y: startY + (index * 200),
                  options: []
              };
              newNodes.push(newNode);

              // Link option
              newOptions.push({
                  id: `opt_${Date.now()}_${index}`,
                  label: choice.label,
                  targetId: newNodeId
              });
          });

          // Batch create nodes
          onCreateNodes(newNodes);
          // Update current node options
          onUpdate(node.id, { options: newOptions });
      }
      setLoading(null);
  }

  const addOption = () => {
    const newOpt: StoryOption = {
      id: `opt_${Date.now()}`,
      label: '新选项',
      targetId: ''
    };
    onUpdate(node.id, { options: [...node.options, newOpt] });
  };

  const updateOption = (idx: number, field: keyof StoryOption, value: string) => {
    const newOpts = [...node.options];
    newOpts[idx] = { ...newOpts[idx], [field]: value };
    onUpdate(node.id, { options: newOpts });
  };

  const removeOption = (idx: number) => {
    const newOpts = node.options.filter((_, i) => i !== idx);
    onUpdate(node.id, { options: newOpts });
  };

  // Manual File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'media' | 'audio') => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const result = evt.target?.result as string;
          if (type === 'media') {
              const isVideo = file.type.startsWith('video');
              onUpdate(node.id, { 
                  mediaType: isVideo ? 'video' : 'image',
                  mediaSrc: result 
              });
          } else {
              onUpdate(node.id, { audioSrc: result });
          }
      };
      reader.readAsDataURL(file);
  };

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl overflow-y-auto z-20">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 backdrop-blur">
        <h2 className="font-bold text-cyan-400 flex items-center gap-2">
          <Icons.Film size={18} /> 节点属性
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><Icons.X size={18} /></button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase font-semibold">标题</label>
          <input 
            value={node.title} 
            onChange={(e) => onUpdate(node.id, { title: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
            <label className="text-xs text-slate-400 uppercase font-semibold">类型</label>
            <div className="flex gap-2">
                {(['scene', 'decision', 'ending'] as NodeType[]).map(t => (
                    <button 
                        key={t}
                        onClick={() => onUpdate(node.id, { type: t })}
                        className={`px-3 py-1 rounded text-xs border ${node.type === t ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-slate-950 border-slate-700 text-slate-500'}`}
                    >
                        {t === 'scene' ? '剧情' : t === 'decision' ? '选项' : '结局'}
                    </button>
                ))}
            </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                 <label className="text-xs text-slate-400 uppercase font-semibold">剧情内容</label>
                 <button onClick={handlePolish} disabled={!!loading} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                    {loading === 'text' ? <Icons.Loader2 size={12} /> : <Icons.Wand2 size={12} />} AI 润色
                 </button>
            </div>
          <textarea 
            value={node.content} 
            onChange={(e) => onUpdate(node.id, { content: e.target.value })}
            className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-cyan-500 outline-none resize-none"
          />
        </div>

        {/* Visual Layout Editor Button */}
        {onEditLayout && (
            <button 
                onClick={() => onEditLayout(node.id)}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
                <Icons.LayoutDashboard size={14} /> 可视化布局编辑 (UI Editor)
            </button>
        )}

        {/* Media Generation / Upload */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
           <div className="flex justify-between items-center">
               <label className="text-xs text-slate-400 uppercase font-semibold flex items-center gap-2">
                   <Icons.Image size={14} /> 画面 (AI / 本地)
               </label>
               <input 
                   type="file" 
                   ref={videoInputRef} 
                   className="hidden" 
                   accept="image/*,video/*"
                   onChange={(e) => handleFileUpload(e, 'media')}
               />
               <button onClick={() => videoInputRef.current?.click()} className="text-[10px] text-slate-400 hover:text-cyan-400 underline decoration-dotted">
                   本地上传
               </button>
           </div>
           
           <div className="grid grid-cols-2 gap-2">
               <button 
                onClick={() => handleGenMedia('image')}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-xs text-cyan-300 transition-colors"
               >
                   {loading === 'image' ? <Icons.Loader2 size={14}/> : <Icons.Image size={14}/>} 生成图片
               </button>
               <button 
                onClick={() => handleGenMedia('video')}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-xs text-pink-300 transition-colors"
               >
                   {loading === 'video' ? <Icons.Loader2 size={14}/> : <Icons.Video size={14}/>} 生成视频 (Veo)
               </button>
           </div>

           {node.mediaSrc && (
               <div className="relative group rounded overflow-hidden border border-slate-700 mt-2 bg-black aspect-video flex items-center justify-center">
                   {node.mediaType === 'video' ? (
                       <video src={node.mediaSrc} controls className="w-full h-full object-contain" />
                   ) : (
                       <img src={node.mediaSrc} alt="Scene" className="w-full h-full object-contain" />
                   )}
                   <button 
                    onClick={() => onUpdate(node.id, { mediaSrc: '', mediaType: 'none' })}
                    className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                       <Icons.Trash2 size={12} />
                   </button>
               </div>
           )}
        </div>

        {/* Audio Generation / Upload */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
             <div className="flex justify-between items-center">
                 <label className="text-xs text-slate-400 uppercase font-semibold flex items-center gap-2">
                   <Icons.Music size={14} /> 音乐音效
                 </label>
                 <input 
                   type="file" 
                   ref={audioInputRef} 
                   className="hidden" 
                   accept="audio/*"
                   onChange={(e) => handleFileUpload(e, 'audio')}
                 />
                 <button onClick={() => audioInputRef.current?.click()} className="text-[10px] text-slate-400 hover:text-cyan-400 underline decoration-dotted">
                   本地上传
                 </button>
             </div>
           <button 
                onClick={handleGenAudio}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-xs text-emerald-300 transition-colors"
               >
                   {loading === 'audio' ? <Icons.Loader2 size={14}/> : <Icons.Music size={14}/>} 生成氛围音效
            </button>
            {node.audioSrc && (
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-emerald-900/30">
                    <Icons.Music size={14} className="text-emerald-500" />
                    <span className="text-xs text-slate-400 flex-1 truncate">音频资源已加载</span>
                    <button onClick={() => onUpdate(node.id, { audioSrc: '' })} className="text-slate-600 hover:text-red-400"><Icons.Trash2 size={12}/></button>
                </div>
            )}
        </div>

        {/* Options */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center">
            <label className="text-xs text-slate-400 uppercase font-semibold flex items-center gap-2"><Icons.GitBranch size={14}/> 分支选项</label>
            <div className="flex gap-2">
                <button 
                    onClick={handleAutoBranch} 
                    disabled={!!loading}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-500/20"
                >
                    {loading === 'branch' ? <Icons.Loader2 size={10} /> : <Icons.Wand2 size={10} />} AI 生成分支
                </button>
                <button onClick={addOption} className="text-xs text-cyan-400 hover:text-cyan-300"><Icons.Plus size={14} /></button>
            </div>
          </div>
          
          <div className="space-y-2">
            {node.options.map((opt, idx) => (
              <div key={opt.id} className="bg-slate-950 p-2 rounded border border-slate-800 space-y-2">
                 <div className="flex justify-between">
                     <span className="text-[10px] text-slate-600">选项 {idx+1}</span>
                     <button onClick={() => removeOption(idx)} className="text-slate-600 hover:text-red-400"><Icons.X size={12}/></button>
                 </div>
                 <input 
                    value={opt.label}
                    onChange={(e) => updateOption(idx, 'label', e.target.value)}
                    placeholder="选项描述"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                 />
                 <select 
                    value={opt.targetId}
                    onChange={(e) => updateOption(idx, 'targetId', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400"
                 >
                     <option value="">跳转至...</option>
                     {Object.values(allNodes).map((n: StoryNode) => (
                         <option key={n.id} value={n.id}>{n.title}</option>
                     ))}
                 </select>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};