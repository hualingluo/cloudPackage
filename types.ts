
export type MediaType = 'none' | 'image' | 'video';
export type NodeType = 'scene' | 'decision' | 'ending';

export interface StoryOption {
  id: string;
  label: string;
  targetId: string;
}

export interface ElementPosition {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
}

export interface Character {
  id: string;
  name: string;
  description: string;
  avatarSrc: string; // URL or Base64
}

export interface StoryNode {
  id: string;
  title: string;
  type: NodeType;
  content: string; // The prompt/story text
  mediaType: MediaType;
  mediaSrc: string; // URL or Base64
  audioSrc: string; // URL or Base64
  x: number;
  y: number;
  options: StoryOption[];
  
  // Visual Layout Properties
  textPos?: ElementPosition;
  optionsPos?: ElementPosition;
}

export interface ProjectData {
  nodes: Record<string, StoryNode>;
  characters: Record<string, Character>;
  viewport: { x: number; y: number; zoom: number };
}

export enum GeneratorType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO'
}
