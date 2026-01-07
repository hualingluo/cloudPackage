
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { StoryNode, Character, ProjectData } from './types';
import { NewProjectModal } from './components/NewProjectModal';
import { PropertyPanel } from './components/PropertyPanel';
import { PreviewPlayer } from './components/PreviewPlayer';
import { LayoutEditorModal } from './components/LayoutEditorModal';
import { StorySidebar } from './components/StorySidebar';
import { CharacterManager } from './components/CharacterManager';
import * as Icons from './components/Icons';

const INITIAL_NODES: Record<string, StoryNode> = {
  "start": {
    id: "start",
    title: "序章：苏醒",
    type: "scene",
    content: "你在一个冷冻舱中醒来。警报声在耳边回荡，空气中弥漫着臭氧和铁锈的味道。控制台闪烁着微弱的红光，你什么都想不起来。",
    mediaType: "none",
    mediaSrc: "",
    audioSrc: "",
    x: 100,
    y: 300,
    options: [
      { id: "o1", label: "检查控制台", targetId: "n2" },
      { id: "o2", label: "强行打开舱门", targetId: "n3" }
    ]
  },
  "n2": {
    id: "n2",
    title: "系统日志",
    type: "decision",
    content: "控制台屏幕闪烁不定。上面显示着 '致命错误：船体破损'。你发现了一段未发送的求救信号。",
    mediaType: "none",
    mediaSrc: "",
    audioSrc: "",
    x: 500,
    y: 200,
    options: []
  },
  "n3": {
    id: "n3",
    title: "黑暗走廊",
    type: "scene",
    content: "舱门在火花中滑开。走廊一片漆黑，远处的应急灯忽明忽暗，仿佛有什么东西在阴影中移动。",
    mediaType: "none",
    mediaSrc: "",
    audioSrc: "",
    x: 500,
    y: 400,
    options: []
  }
};

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Record<string, StoryNode>>(INITIAL_NODES);
  const [characters, setCharacters] = useState<Record<string, Character>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCharManagerOpen, setIsCharManagerOpen] = useState(false);
  const [layoutEditorNodeId, setLayoutEditorNodeId] = useState<string | null>(null);
  const [showBuildSuccess, setShowBuildSuccess] = useState(false);
  const [showFlutterNote, setShowFlutterNote] = useState(false);
  
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connections = useMemo(() => {
    const lines: React.ReactElement[] = [];
    Object.values(nodes).forEach((node: StoryNode) => {
      node.options.forEach(opt => {
        const target = nodes[opt.targetId];
        if (target) {
          const sx = node.x + 240; 
          const sy = node.y + 60;  
          const tx = target.x;
          const ty = target.y + 60;
          const path = `M ${sx} ${sy} C ${sx + 100} ${sy}, ${tx - 100} ${ty}, ${tx} ${ty}`;
          lines.push(
            <g key={`${node.id}-${opt.id}`}>
                <path d={path} fill="none" stroke="#0891b2" strokeWidth="2" className="opacity-40" />
                <circle cx={tx} cy={ty} r="3" fill="#0891b2" />
            </g>
          );
        }
      });
    });
    return lines;
  }, [nodes]);

  const exportProject = () => {
    const data: ProjectData = { nodes, characters, viewport: { x: pan.x, y: pan.y, zoom } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'douju-project.json';
    a.click();
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data: ProjectData = JSON.parse(ev.target?.result as string);
        if (data.nodes) {
          setNodes(data.nodes);
          setCharacters(data.characters || {});
          if (data.viewport) {
            setPan(data.viewport);
            setZoom(data.viewport.zoom || 1);
          }
          setSelectedId(null);
        }
      } catch (err) { alert("解析工程文件失败。"); }
    };
    reader.readAsText(file);
  };

  const buildFlutterProject = () => {
    // 逻辑保留，用于下载本地 Dart 源码
    const projectData = JSON.stringify({ nodes, startId: "start" }, null, 2);
    const dartCode = `
import 'dart:convert';
import 'package:flutter/material.dart';

void main() => runApp(const MovieApp());

class MovieApp extends StatelessWidget {
  const MovieApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData.dark(),
      home: const MoviePlayer(),
    );
  }
}

class MoviePlayer extends StatefulWidget {
  const MoviePlayer({super.key});
  @override
  State<MoviePlayer> createState() => _MoviePlayerState();
}

class _MoviePlayerState extends State<MoviePlayer> {
  final Map<String, dynamic> project = jsonDecode('''${projectData}''');
  late String currentId;

  @override
  void initState() {
    super.initState();
    currentId = project['startId'];
  }

  void nextNode(String id) {
    setState(() => currentId = id);
  }

  @override
  Widget build(BuildContext context) {
    final node = project['nodes'][currentId];
    if (node == null) return const Center(child: Text('剧终'));

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: node['mediaSrc'] != "" 
              ? Image.network(node['mediaSrc'], fit: BoxFit.cover)
              : Container(color: Colors.grey[900]),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.6),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(node['title'], style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.cyan)),
                  const SizedBox(height: 12),
                  Text(node['content'], style: const TextStyle(fontSize: 16, height: 1.5)),
                  const SizedBox(height: 24),
                  ...node['options'].map((opt) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
                      onPressed: () => nextNode(opt['targetId']),
                      child: Text(opt['label']),
                    ),
                  )).toList(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
    `;

    const blob = new Blob([dartCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.dart';
    a.click();
    setShowFlutterNote(true);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-40 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <Icons.Film className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white">DOUJU EDITOR</h1>
            <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">GitHub Actions Build Enabled</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button onClick={() => setIsNewProjectOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors border border-slate-700">
                <Icons.Plus size={14} /> 新建
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={importProject} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 border border-slate-700" title="导入工程">
                <Icons.Upload size={16} />
            </button>
            <button onClick={exportProject} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 border border-slate-700" title="保存剧本到本地">
                <Icons.Save size={16} />
            </button>
            
            <div className="flex items-center gap-2 ml-4">
                <button 
                  onClick={buildFlutterProject} 
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold shadow-lg shadow-indigo-900/40 group overflow-hidden"
                >
                    <Icons.LayoutDashboard size={14} className="group-hover:rotate-12 transition-transform" />
                    Flutter 打包 (EXE)
                </button>
                <div className="group relative">
                    <Icons.Wand2 className="text-slate-500 cursor-help" size={16} />
                    <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        提示：将代码推送到 GitHub 后，Actions 会自动为您生成 Windows 便携版 EXE。
                    </div>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setIsPreviewOpen(true)} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white font-medium shadow-lg transition-transform hover:scale-105 active:scale-95">
            <Icons.Play size={16} fill="currentColor" /> 试玩预览
          </button>
        </div>
      </div>

      {/* Flutter Note Modal */}
      {showFlutterNote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-2xl max-w-md shadow-2xl animate-fade-in text-center">
            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icons.LayoutDashboard size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">CI 打包环境已就绪</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              除了本地下载 `main.dart`，您现在可以直接利用 GitHub Actions：
              <br/><br/>
              1. 确保您的项目已关联 GitHub 仓库。<br/>
              2. 推送代码到 `main` 分支。<br/>
              3. 在 GitHub 仓库的 <b>Actions</b> 页面下载打包好的 <b>Douju-Flutter-EXE</b>。
            </p>
            <button onClick={() => setShowFlutterNote(false)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors">知道了</button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex w-full h-full pt-16">
          <StorySidebar nodes={nodes} characters={characters} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} onAddCharacter={() => setIsCharManagerOpen(true)} />
          <div className="relative flex-1 bg-slate-950 overflow-hidden grid-bg" 
            onMouseDown={(e) => { 
              if ((e.target as HTMLElement).tagName === 'DIV' || (e.target as HTMLElement).tagName === 'svg') { 
                setIsDraggingCanvas(true); 
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); 
                setSelectedId(null); 
              }
            }} 
            onMouseMove={(e) => { 
              if (isDraggingCanvas) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); 
              else if (dragNodeId) setNodes(prev => ({ ...prev, [dragNodeId]: { ...prev[dragNodeId], x: prev[dragNodeId].x + e.movementX / zoom, y: prev[dragNodeId].y + e.movementY / zoom } })); 
            }} 
            onMouseUp={() => { 
              setIsDraggingCanvas(false); 
              setDragNodeId(null); 
            }}>
            <div className="absolute transform-gpu origin-top-left transition-transform duration-75" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: '100%', height: '100%' }}>
                <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">{connections}</svg>
                {Object.values(nodes).map((node: StoryNode) => (
                    <div key={node.id} onMouseDown={(e) => { e.stopPropagation(); setDragNodeId(node.id); setSelectedId(node.id); }} style={{ left: node.x, top: node.y }} className={`absolute w-60 rounded-xl backdrop-blur-md transition-all cursor-grab active:cursor-grabbing ${selectedId === node.id ? 'bg-slate-900/90 border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)] z-30' : 'bg-slate-900/60 border border-slate-700 z-10'}`}>
                        <div className={`h-1.5 w-full rounded-t-xl ${node.type === 'scene' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                        <div className="p-4">
                            <h3 className="text-sm font-bold text-slate-100 truncate mb-1">{node.title}</h3>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{node.content}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Zoom Controls */}
            <div className="absolute bottom-6 left-6 flex flex-col gap-2 bg-slate-800/80 backdrop-blur p-1 rounded-lg border border-slate-700 shadow-xl z-50">
                <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors"><Icons.ZoomIn size={18}/></button>
                <div className="h-px bg-slate-700 mx-2"></div>
                <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors"><Icons.ZoomOut size={18}/></button>
            </div>
          </div>
          
          {/* Right Panel */}
          {selectedId && nodes[selectedId] && (
            <PropertyPanel 
                node={nodes[selectedId]} 
                allNodes={nodes} 
                onUpdate={(id, up) => setNodes(p => ({ ...p, [id]: { ...p[id], ...up } }))} 
                onCreateNodes={(nn) => setNodes(p => { const u = { ...p }; nn.forEach(n => u[n.id] = n); return u; })} 
                onEditLayout={setLayoutEditorNodeId} 
                onClose={() => setSelectedId(null)} 
                stylePrompt="Cinematic high-end movie" 
            />
          )}
      </div>

      {isNewProjectOpen && <NewProjectModal onConfirm={(n) => { setNodes(n); setCharacters({}); setPan({ x: 0, y: 0 }); setSelectedId(null); setIsNewProjectOpen(false); }} onClose={() => setIsNewProjectOpen(false)} />}
      {isPreviewOpen && <PreviewPlayer nodes={nodes} startId="start" onClose={() => setIsPreviewOpen(false)} />}
      {layoutEditorNodeId && nodes[layoutEditorNodeId] && <LayoutEditorModal node={nodes[layoutEditorNodeId]} onSave={(id, l) => setNodes(p => ({ ...p, [id]: { ...p[id], ...l } }))} onClose={() => setLayoutEditorNodeId(null)} />}
      {isCharManagerOpen && <CharacterManager onSave={(c) => setCharacters(p => ({ ...p, [c.id]: c }))} onClose={() => setIsCharManagerOpen(false)} />}
    </div>
  );
};

export default App;
