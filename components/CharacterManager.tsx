import React, { useState, useRef } from 'react';
import { Character } from '../types';
import * as Icons from './Icons';
import { generateCharacterAvatar } from '../services/geminiService';

interface Props {
  onSave: (char: Character) => void;
  onClose: () => void;
}

export const CharacterManager: React.FC<Props> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarSrc, setAvatarSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenAvatar = async () => {
    if (!description) return;
    setLoading(true);
    const result = await generateCharacterAvatar(name || 'Unknown', description, "Cinematic, Detailed, 3D Render");
    if (result) {
      setAvatarSrc(result);
    }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setAvatarSrc(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!name || !description) return;
    const newChar: Character = {
      id: `char_${Date.now()}`,
      name,
      description,
      avatarSrc
    };
    onSave(newChar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><Icons.X size={20}/></button>
        
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Icons.Plus size={20} className="text-pink-400"/> 创建新角色
        </h2>

        <div className="space-y-4">
            <div className="flex gap-4">
                {/* Avatar Section */}
                <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden relative group">
                        {avatarSrc ? (
                            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <Icons.Image size={24} className="text-slate-600" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-white hover:text-cyan-400 underline">上传</button>
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>
                
                {/* Info Section */}
                <div className="flex-1 space-y-3">
                    <input 
                        placeholder="角色名称"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-pink-500 outline-none"
                    />
                    <button 
                        onClick={handleGenAvatar}
                        disabled={loading || !description}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-pink-300 flex items-center justify-center gap-1"
                    >
                       {loading ? <Icons.Loader2 size={12} className="animate-spin" /> : <Icons.Wand2 size={12}/>} AI 生成头像
                    </button>
                </div>
            </div>

            <div>
                <textarea 
                    placeholder="角色外貌、性格描述 (用于生成头像)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-24 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-pink-500 outline-none resize-none"
                />
            </div>

            <button 
                onClick={handleSubmit}
                disabled={!name}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded font-bold shadow-lg shadow-pink-900/20"
            >
                保存角色资产
            </button>
        </div>
      </div>
    </div>
  );
};