import React, { useState } from 'react';
import * as Icons from './Icons';
import { generateStoryStructure } from '../services/geminiService';
import { StoryNode } from '../types';

interface Props {
  onConfirm: (nodes: Record<string, StoryNode>) => void;
  onClose: () => void;
}

const CATEGORIES = [
  "电影 (Movie)", "电视剧 (TV Series)", "动漫 (Anime)", "短剧 (Short Drama)", "美漫 (Comics)", "互动游戏 (Interactive Game)"
];

const GENRES = [
  "科幻惊悚 (Sci-Fi Thriller)", "赛博朋克 (Cyberpunk)", "恐怖悬疑 (Horror Suspense)", 
  "古装仙侠 (Xianxia)", "现代都市 (Urban)", "浪漫喜剧 (RomCom)", 
  "末日生存 (Post-Apocalyptic)", "犯罪侦探 (Crime/Detective)", "奇幻冒险 (Fantasy Adventure)"
];

// Topology definitions based on user request
const TOPOLOGIES = [
  { 
    id: 'linear', 
    name: '直线求生型 (Linear)', 
    desc: '主线从头到底，分叉均为死亡结局或隐藏要素。适合逃生、惊悚题材。',
    icon: Icons.GitBranch // Using generic branch icon, conceptually a line
  },
  { 
    id: 'serial', 
    name: '连续任务型 (Serial Tasks)', 
    desc: '多项任务需逐一单项解决，层层递进。适合侦探、解谜题材。',
    icon: Icons.FileText
  },
  { 
    id: 'web', 
    name: '交叉网状型 (Complex Web)', 
    desc: '交叉多任务多结局，节点间高度互联。适合复杂的群像剧或战争题材。',
    icon: Icons.Share2 // Assuming Share2 looks like a web/network, or similar
  },
  { 
    id: 'divergent', 
    name: '单线多结局型 (Divergent)', 
    desc: '前期单线铺垫，后期根据积累的参数走向不同结局。适合恋爱、成长题材。',
    icon: Icons.GitBranch
  }
];

export const NewProjectModal: React.FC<Props> = ({ onConfirm, onClose }) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'import' | 'empty'>('agent');
  
  // Agent State
  const [theme, setTheme] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [genre, setGenre] = useState(GENRES[0]);
  const [topology, setTopology] = useState(TOPOLOGIES[0].id);
  const [loading, setLoading] = useState(false);

  // Import State
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Agent Logic
  const handleAgentSubmit = async () => {
    if (!theme) return;
    setLoading(true);
    const fullStyle = `${category} - ${genre}`;
    // Pass topology to service
    const nodes = await generateStoryStructure(theme, fullStyle, topology);
    if (nodes) {
      onConfirm(nodes);
      onClose();
    }
    setLoading(false);
  };

  // 2. Import Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const imported = JSON.parse(ev.target?.result as string);
              if (imported && typeof imported === 'object') {
                   onConfirm(imported);
                   onClose();
              } else {
                  setErrorMsg("文件格式错误：必须是合法的 JSON 对象");
              }
          } catch(err) {
              setErrorMsg("无法解析 JSON 文件");
          }
      }
      reader.readAsText(file);
  };

  // 3. Empty Logic
  const handleEmptySubmit = () => {
      const emptyNode: StoryNode = {
          id: "start",
          title: "开始",
          type: "scene",
          content: "故事从这里开始...",
          mediaType: "none",
          mediaSrc: "",
          audioSrc: "",
          x: 100,
          y: 300,
          options: []
      };
      onConfirm({ "start": emptyNode });
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[700px] rounded-2xl shadow-2xl flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col gap-2">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Icons.Plus size={20} className="text-cyan-400" /> 新建剧本
            </h2>
            
            <button 
                onClick={() => setActiveTab('agent')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'agent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
                <Icons.Wand2 size={18} /> AI 智能创作
            </button>
            
            <button 
                onClick={() => setActiveTab('import')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
                <Icons.Upload size={18} /> 导入本地剧本
            </button>

            <button 
                onClick={() => setActiveTab('empty')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'empty' ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
                <Icons.FileText size={18} /> 空白工程
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 relative overflow-y-auto bg-slate-900 custom-scrollbar">
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white"><Icons.X size={20} /></button>

            {activeTab === 'agent' && (
                <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-2">Gemini 3 故事特工</h3>
                        <p className="text-slate-400">选择一种叙事结构，AI 将自动为您生成拓扑网络。</p>
                    </div>

                    <div className="space-y-6">
                        {/* Topology Selection */}
                        <div>
                           <label className="block text-sm text-slate-300 mb-3 font-semibold">1. 选择剧本结构 (Narrative Topology)</label>
                           <div className="grid grid-cols-2 gap-3">
                              {TOPOLOGIES.map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => setTopology(t.id)}
                                  className={`text-left p-3 rounded-lg border transition-all flex flex-col gap-1 ${topology === t.id ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-950 border-slate-700 hover:border-slate-500'}`}
                                >
                                  <span className={`text-sm font-bold ${topology === t.id ? 'text-emerald-400' : 'text-slate-200'}`}>{t.name}</span>
                                  <span className="text-xs text-slate-500 leading-relaxed">{t.desc}</span>
                                </button>
                              ))}
                           </div>
                        </div>

                        {/* Theme Input */}
                        <div>
                            <label className="block text-sm text-slate-300 mb-3 font-semibold">2. 故事主题 / 核心梗概</label>
                            <textarea 
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                placeholder="例如：一群宇航员在废弃的空间站发现了一个神秘的信号..."
                                className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none resize-none"
                            />
                        </div>

                        {/* Style Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2 font-semibold">3. 作品类型</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-2 font-semibold">4. 风格流派</label>
                                <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none">
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={handleAgentSubmit}
                            disabled={loading || !theme}
                            className={`w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20 font-bold text-lg mt-4 ${loading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {loading ? <><Icons.Loader2 className="animate-spin" /> 正在构建世界观 (Gemini 3 Thinking)...</> : '立即生成剧本结构'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'import' && (
                 <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                         <Icons.Upload size={40} />
                     </div>
                     <div className="text-center">
                         <h3 className="text-xl font-bold text-white">导入本地剧本</h3>
                         <p className="text-slate-400 mt-2">支持 .json 格式的工程文件</p>
                     </div>
                     
                     <label className="cursor-pointer px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium">
                         选择文件
                         <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                     </label>
                     
                     {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
                 </div>
            )}

            {activeTab === 'empty' && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                         <Icons.FileText size={40} />
                     </div>
                     <div className="text-center">
                         <h3 className="text-xl font-bold text-white">创建空白剧本</h3>
                         <p className="text-slate-400 mt-2">从零开始构建您的互动故事</p>
                     </div>
                     
                     <button onClick={handleEmptySubmit} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
                         确认创建
                     </button>
                 </div>
            )}

        </div>
      </div>
    </div>
  );
};