
/**
 * THIS IS A BACKEND REFERENCE FILE
 * Run this with: node backend_node_example.js
 */
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const UNI_PROJECT_PATH = './uni_interactive_template'; // The path to your Uni-app project

app.post('/api/build', async (req, res) => {
  const { config, platform } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendLog = (message, isError = false) => {
    res.write(JSON.stringify({ 
      timestamp: new Date().toISOString(), 
      message, 
      isError 
    }) + "\n");
  };

  try {
    sendLog(`Initializing build process for platform: ${platform}`);
    
    // 1. Inject JSON into Uni-app static folder
    const staticPath = path.join(UNI_PROJECT_PATH, 'src/static/movie_config.json');
    fs.writeFileSync(staticPath, JSON.stringify(config, null, 2));
    sendLog(`Injected script config to ${staticPath}`);

    // 2. Run build command based on platform
    let buildCommand = 'npm';
    let args = [];
    
    if (platform === 'h5') {
      args = ['run', 'build:h5'];
    } else if (platform === 'desktop') {
      // Assuming you have an electron-builder script in your uni-app package.json
      args = ['run', 'build:electron']; 
    } else if (platform === 'mp-weixin') {
      args = ['run', 'build:mp-weixin'];
    }

    sendLog(`Executing command: ${buildCommand} ${args.join(' ')}`);
    
    const buildProcess = spawn(buildCommand, args, { cwd: UNI_PROJECT_PATH, shell: true });

    buildProcess.stdout.on('data', (data) => sendLog(data.toString()));
    buildProcess.stderr.on('data', (data) => sendLog(data.toString(), true));

    buildProcess.on('close', (code) => {
      if (code === 0) {
        sendLog(`Build SUCCESS with code ${code}`, false);
        res.write(JSON.stringify({ success: true, path: path.join(UNI_PROJECT_PATH, 'dist') }) + "\n");
      } else {
        sendLog(`Build FAILED with code ${code}`, true);
        res.write(JSON.stringify({ success: false }) + "\n");
      }
      res.end();
    });

  } catch (error) {
    sendLog(`Critical Error: ${error.message}`, true);
    res.end();
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Build Server active on port ${PORT}`));
