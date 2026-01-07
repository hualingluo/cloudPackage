
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { StoryNode, NodeType } from '../types';

// --- Text / Agent Generation (Gemini 3) ---

export const generateStoryStructure = async (theme: string, style: string, topology: string = 'linear'): Promise<Record<string, StoryNode> | null> => {
  if (!process.env.API_KEY) { console.error("No API Key"); return null; }

  // Always use a fresh instance for calls that might rely on updated environment keys
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let topologyInstruction = "";
  if (topology === 'linear') {
      topologyInstruction = "TOPOLOGY TYPE A (Linear/Survival): Create a main straight line from Start to End. Branches should mostly lead to 'Game Over' (dead ends) or 'Hidden Items'. Main path flows vertically. Dead ends branch horizontally.";
  } else if (topology === 'serial') {
      topologyInstruction = "TOPOLOGY TYPE B (Serial Tasks): Create a sequence of distinct problems/puzzles. Node A must be solved to reach Node B. Strictly linear flow but with detailed task descriptions.";
  } else if (topology === 'web') {
      topologyInstruction = "TOPOLOGY TYPE C (Complex Web): Create a highly interconnected graph. Decisions in Node A affect Node C. Multiple paths cross over. Multiple distinct endings.";
  } else if (topology === 'divergent') {
      topologyInstruction = "TOPOLOGY TYPE D (Divergent): Create a single main stem for the first 3 layers, building context. Then, at the Climax node, split into 3-4 radically different Endings.";
  }

  const prompt = `
    Create an interactive story structure based on the Theme: "${theme}" and Style: "${style}".
    
    ${topologyInstruction}

    IMPORTANT RULES:
    1. Language: Simplified Chinese (简体中文).
    2. Hierarchy: Organize nodes in layers (Top-Down). 
       - Layer 1: Root 'start' node.
       - Layer 2: Max 4 sub-nodes connected to start.
       - Layer 3+: Continue flow.
    3. Layout Coordinates (x, y):
       - 'start' node at x: 400, y: 100.
       - Increase 'y' by 250 for each subsequent layer.
       - Spread 'x' values in each layer so they don't overlap (e.g., 200, 400, 600, 800).
    4. Max 4 options per node.
    
    Return a JSON object where keys are node IDs.
    
    Schema needed for each node:
    {
      "id": string,
      "title": string,
      "type": "scene" | "decision" | "ending",
      "content": string,
      "x": number,
      "y": number,
      "options": [{ "id": string, "label": string, "targetId": string }]
    }
  `;

  // Define Schema using the SDK Type enum
  const nodeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['scene', 'decision', 'ending'] },
      content: { type: Type.STRING },
      x: { type: Type.NUMBER },
      y: { type: Type.NUMBER },
      options: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            targetId: { type: Type.STRING }
          }
        }
      }
    },
    required: ['id', 'title', 'type', 'content', 'options']
  };

  const arraySchema: Schema = {
      type: Type.ARRAY,
      items: nodeSchema
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: arraySchema,
        thinkingConfig: { thinkingBudget: 2048 } // Increased budget for complex topology calculation
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const nodeList = JSON.parse(text) as StoryNode[];
    const nodeMap: Record<string, StoryNode> = {};
    
    nodeList.forEach(node => {
        node.mediaType = 'none';
        node.mediaSrc = '';
        node.audioSrc = '';
        nodeMap[node.id] = node;
    });
    
    return nodeMap;
  } catch (error) {
    console.error("Story Gen Error:", error);
    return null;
  }
};

export const polishNodeText = async (text: string, style: string): Promise<string> => {
    if (!process.env.API_KEY) return text;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Rewrite the following story segment to match the style "${style}". Make it immersive and cinematic. Ensure the output is in Simplified Chinese (简体中文). \n\nOriginal Text: "${text}"`,
        });
        return response.text || text;
    } catch (e) {
        console.error(e);
        return text;
    }
}

export const generatePlotChoices = async (currentContent: string, style: string): Promise<Array<{label: string, content: string}> | null> => {
    if (!process.env.API_KEY) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const prompt = `
            Based on the current story scene: "${currentContent}"
            Style: "${style}"
            
            Generate 2 to 3 logical and distinct plot branches (next steps) for the user to choose from.
            For each branch, provide:
            1. 'label': The short text on the choice button (Simplified Chinese).
            2. 'content': A brief description of the next scene that follows this choice (Simplified Chinese).
            
            Return JSON array.
        `;

        const schema: Schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING },
                    content: { type: Type.STRING }
                },
                required: ['label', 'content']
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;
    } catch (e) {
        console.error("Plot Branch Gen Error", e);
        return null;
    }
}

// --- Image Generation (Gemini Flash Image) ---

export const generateSceneImage = async (description: string, style: string): Promise<string | null> => {
    if (!process.env.API_KEY) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: `Generate a high-quality, cinematic image for a video game or movie scene. Style: ${style}. \n\nThe scene description is in Chinese: "${description}". \n\nVisualize this scene accurately based on the text.`,
            // DO NOT set responseMimeType for nano banana series models
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                // Find the image part, do not assume it is the first part.
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (e) {
        console.error("Image Gen Error", e);
        return null;
    }
}

export const generateCharacterAvatar = async (name: string, description: string, style: string): Promise<string | null> => {
    if (!process.env.API_KEY) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: `Generate a character portrait. Close up or mid-shot. Style: ${style}. Character Name: ${name}. Character Description (Chinese): "${description}". High quality, detailed character design.`,
            // DO NOT set responseMimeType for nano banana series models
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (e) {
        console.error("Character Gen Error", e);
        return null;
    }
}

// --- Video Generation (Veo 3.1) ---

export const generateSceneVideo = async (description: string, style: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
        }
    }

    // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `Cinematic movie shot, ${style}. Context (Chinese): "${description}".`,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
            const blob = await videoRes.blob();
            return URL.createObjectURL(blob);
        }
        return null;

    } catch (e: any) {
        console.error("Veo Gen Error", e);
        // If the request fails with an error message containing "Requested entity was not found.", reset the key selection state
        if (e?.message?.includes("Requested entity was not found.") && typeof window !== 'undefined' && window.aistudio) {
            window.aistudio.openSelectKey();
        }
        return null;
    }
}

// --- Audio Generation ---

export const generateSceneAudio = async (description: string, type: 'bgm' | 'sfx'): Promise<string | null> => {
    if (!process.env.API_KEY) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const prompt = type === 'bgm' 
            ? `Generate a short atmospheric background music loop for this scene (Chinese description): "${description}"`
            : `Generate a sound effect for: "${description}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            contents: prompt,
            config: {
                // Fix: responseModalities MUST contain exactly one modality: Modality.AUDIO
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        if (base64Audio) {
            return `data:audio/pcm;base64,${base64Audio}`; 
        }
        return null;
    } catch (e) {
        console.error("Audio Gen Error", e);
        return null;
    }
}

export const decodePCM = async (base64: string, audioContext: AudioContext): Promise<AudioBuffer> => {
    // Correctly decode raw PCM data as per guidelines
    const base64Content = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
    const binaryString = atob(base64Content);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const numChannels = 1;
    const sampleRate = 24000;
    const frameCount = dataInt16.length / numChannels;
    const buffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}
