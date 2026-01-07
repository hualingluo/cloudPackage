import React, { useState } from 'react';
import * as Icons from './Icons';
import { generateStoryStructure } from '../services/geminiService';
import { StoryNode } from '../types';

interface Props {
  onGenerate: (nodes: Record<string, StoryNode>) => void;
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

export const AgentModal: React.FC<Props> = ({ onGenerate, onClose }) => {
  const [theme, setTheme] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [genre, setGenre] = useState(GENRES[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!theme) return;
    setLoading(true);
    const fullStyle = `${category} - ${genre}`;
    const nodes = await generateStoryStructure(theme, fullStyle);
    if (nodes) {
      onGenerate(nodes);
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-lg"><Icons.Wand2 size={24} className="text-emerald-400" /></div>
          <div>
            <h2 className="text-xl font-bold text-white">Gemini 3 故事特工</h2>
            <p className="text-slate-400 text-sm">AIGC 智能生成交互式故事拓扑树</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">故事主题 / 核心梗概</label>
            <textarea 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例如：一群陌生人在荒岛醒来，发现自己在参加一场生存游戏，只有一个人能活着离开..."
              className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                 <label className="block text-sm text-slate-300 mb-1">作品类型</label>
                 <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none"
                 >
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
             </div>
             <div>
                 <label className="block text-sm text-slate-300 mb-1">风格流派</label>
                 <select 
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none"
                 >
                     {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                 </select>
             </div>
          </div>

          <div className="bg-emerald-900/20 border border-emerald-900/50 p-3 rounded text-xs text-emerald-300/80 leading-relaxed">
             <span className="font-bold text-emerald-400">AI 提示:</span> 系统将根据您的设定自动创建 5-8 个关键剧情节点，并生成分支选项。生成后您可以继续手动编辑或使用 AI 润色细节。
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">取消</button>
            <button 
              onClick={handleSubmit}
              disabled={loading || !theme}
              className={`px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 ${loading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {loading ? <><Icons.Loader2 className="animate-spin" /> 正在构建世界观...</> : '立即生成故事线'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
