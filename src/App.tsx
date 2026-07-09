import React, { useState, useEffect } from 'react';
import { parseCobolLog } from './components/LogParser';
import { PRESET_SAMPLES, PresetSample } from './components/SampleLogs';
import { SampleLoader } from './components/SampleLoader';
import { TreeView } from './components/TreeView';
import { AnalysisPanel } from './components/AnalysisPanel';
import { MainframeConsole } from './components/MainframeConsole';
import { PipelineView } from './components/PipelineView';
import { LogNode, AIAnalysisReport } from './types';
import { 
  Terminal, 
  Upload, 
  Cpu, 
  FileText, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  Eye,
  Settings,
  Flame,
  Info,
  Database,
  Activity
} from 'lucide-react';

export default function App() {
  // Core states
  const [rawLog, setRawLog] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [parsedTree, setParsedTree] = useState<LogNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<LogNode | null>(null);
  
  // Tab within the trace workspace (Pipeline vs Visual Tree vs Raw IBM Console)
  const [workspaceTab, setWorkspaceTab] = useState<'tree' | 'pipeline' | 'console'>('pipeline');
  
  // AI analysis states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisReport, setAnalysisReport] = useState<AIAnalysisReport | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // File upload drag & drop states
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Load a preset sample initially so the user immediately sees a working app
  useEffect(() => {
    const defaultPreset = PRESET_SAMPLES[0];
    handleLoadSample(defaultPreset);
  }, []);

  // Handle loading a preset sample
  const handleLoadSample = (sample: PresetSample) => {
    setSelectedPresetId(sample.id);
    setRawLog(sample.content);
    
    // Parse the log locally
    const tree = parseCobolLog(sample.content);
    setParsedTree(tree);
    
    // Select the first top-level child if available
    if (tree.children && tree.children.length > 0) {
      setSelectedNode(tree.children[0]);
    } else {
      setSelectedNode(tree);
    }

    // Reset old AI analysis to prevent state confusion
    setAnalysisReport(null);
    setAnalysisError(null);
  };

  // Handle manual log paste/change
  const handleLogChange = (content: string) => {
    setRawLog(content);
    setSelectedPresetId(null); // Clear preset ID since it's custom
    
    const tree = parseCobolLog(content);
    setParsedTree(tree);
    
    if (tree.children && tree.children.length > 0) {
      setSelectedNode(tree.children[0]);
    } else {
      setSelectedNode(tree);
    }

    setAnalysisReport(null);
    setAnalysisError(null);
  };

  // Run server-side Gemini AI analysis
  const runAiAnalysis = async () => {
    if (!rawLog.trim()) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisReport(null);

    try {
      const response = await fetch('/api/analyze-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rawLog })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Server returned an error status during log analysis.');
      }

      setAnalysisReport(data);
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setAnalysisError(err.message || 'An unexpected error occurred while communicating with the server-side analysis engine.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // File upload drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          handleLogChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          handleLogChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFilterAndSelectNode = (nodeName: string) => {
    if (!parsedTree) return;
    const findNode = (node: LogNode): LogNode | null => {
      if (node.name.toUpperCase().includes(nodeName.toUpperCase())) {
        return node;
      }
      for (const child of node.children) {
        const found = findNode(child);
        if (found) return found;
      }
      return null;
    };
    const found = findNode(parsedTree);
    if (found) {
      setSelectedNode(found);
      setWorkspaceTab('tree');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-gray-200 flex flex-col font-sans">
      {/* Header navbar */}
      <header className="sticky top-0 z-40 bg-[#1A1D23] border-b border-gray-800 py-3 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shadow-md">
              <Cpu className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-100 tracking-tight flex items-center gap-2 font-mono">
                EXECUTION TRACE ANALYZER
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">COBOL batch diagnostics powered by server-side Gemini</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-[#14171C] border border-gray-800 rounded px-2.5 py-1 text-gray-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-gray-500" /> ENV: SERVER_SIDE_API
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        
        {/* Row 1: Load sample log presets */}
        <SampleLoader 
          onLoadSample={handleLoadSample} 
          selectedId={selectedPresetId} 
        />

        {/* Row 2: File Upload, Manual Paste and Drag & Drop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Paste & Drop section */}
          <div className="lg:col-span-2 bg-[#1A1D23] border border-gray-800 rounded-lg p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Paste Trace Logs</span>
                <span className="text-xs text-blue-400 font-semibold font-mono">
                  {rawLog ? `${rawLog.split('\n').length} LINES LOADED` : 'EMPTY'}
                </span>
              </div>
              <textarea
                value={rawLog}
                onChange={(e) => handleLogChange(e.target.value)}
                placeholder="Paste raw COBOL, UT8500, or DBIO trace logs here..."
                className="w-full h-32 p-3 font-mono text-xs border border-gray-800 rounded-md bg-[#0A0C10] focus:outline-hidden focus:border-blue-500 text-gray-200 placeholder:text-gray-600 resize-none"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
              {/* Drag and drop input */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 w-full border border-dashed rounded p-4 flex flex-col items-center justify-center text-center transition-all relative cursor-pointer ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <input
                  type="file"
                  id="log-file-upload"
                  accept=".log,.txt"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-5 h-5 text-gray-500 mb-1" />
                <span className="text-xs font-bold text-gray-300">Drag & Drop Log File</span>
                <span className="text-[10px] text-gray-500 mt-0.5">Supports .log, .txt files</span>
              </div>

              {/* Reset logs */}
              <button
                onClick={() => handleLogChange('')}
                className="w-full sm:w-auto px-4 py-3 bg-[#14171C] hover:bg-gray-800 text-gray-300 text-xs font-semibold border border-gray-800 rounded transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" /> Clear Editor
              </button>
            </div>
          </div>

          {/* Log metrics / Quick Stats Info */}
          <div className="bg-gradient-to-br from-[#1A1D23] to-[#14171C] border border-gray-800 text-gray-200 rounded-lg p-5 flex flex-col justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase font-mono">System Intelligence</span>
              <h2 className="text-sm font-bold text-gray-100 mt-1 mb-2">AUTOMATED DIAGNOSTIC ANALYZER</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Using our specialized server-side Gemini system modeling, this visualizer maps COBOL batch logs, decodes SQLCODE database indicators, and formats Area-B ready code snippets to patch programs.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-mono">Local Call-Stack Parser</span>
                <span className="text-green-400 font-bold font-mono">ACTIVE (Deterministic)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-mono">DBIO & Commit Analyzer</span>
                <span className="text-green-400 font-bold font-mono">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-mono">AI Model Core</span>
                <span className="text-blue-400 font-bold font-mono">gemini-3.5-flash</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Split Interactive visualizer Panel & AI Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Left Block: Trace workspace (Visual Call Tree vs Raw Glowing IBM Console) */}
          <div className="flex flex-col space-y-4">
            {/* Tab Controller */}
            <div className="flex bg-[#1A1D23] rounded p-1 self-start border border-gray-800/60 gap-1">
              <button
                onClick={() => setWorkspaceTab('pipeline')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  workspaceTab === 'pipeline'
                    ? 'bg-blue-500/15 border border-blue-500/25 text-blue-300 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Execution Pipeline
              </button>
              <button
                onClick={() => setWorkspaceTab('tree')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  workspaceTab === 'tree'
                    ? 'bg-blue-500/15 border border-blue-500/25 text-blue-300 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Visual Call Tree
              </button>
              <button
                onClick={() => setWorkspaceTab('console')}
                className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  workspaceTab === 'console'
                    ? 'bg-blue-500/15 border border-blue-500/25 text-blue-300 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Raw Terminal View
              </button>
            </div>

            {/* Active workspace rendering */}
            {workspaceTab === 'pipeline' ? (
              <PipelineView 
                rawLog={rawLog} 
                parsedTree={parsedTree} 
                onFilterLog={handleFilterAndSelectNode} 
              />
            ) : workspaceTab === 'tree' ? (
              parsedTree ? (
                <TreeView 
                  rootNode={parsedTree} 
                  onSelectNode={setSelectedNode} 
                  selectedNodeId={selectedNode ? selectedNode.id : null} 
                />
              ) : (
                <div className="bg-[#1A1D23] border border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center h-[650px] text-center">
                  <Cpu className="w-10 h-10 text-gray-600 mb-3" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">No Log Loaded to Parse</h4>
                  <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">Please paste or load a COBOL trace log to view the structural call-tree hierarchy.</p>
                </div>
              )
            ) : (
              <MainframeConsole rawLog={rawLog} />
            )}
          </div>

          {/* Right Block: Gemini AI Diagnostics Panel */}
          <div className="flex flex-col space-y-4">
            {/* Section spacing buffer matching the tree header */}
            <div className="h-10.5"></div> 
            
            <AnalysisPanel 
              report={analysisReport}
              isLoading={isAnalyzing}
              onRunAnalysis={runAiAnalysis}
              errorMsg={analysisError}
            />
          </div>
        </div>

        {/* Selected block inspect detail drawer / banner */}
        {selectedNode && (
          <div className="bg-[#1A1D23] border border-gray-800 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                  selectedNode.isError
                    ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                    : selectedNode.type === 'program'
                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                    : selectedNode.type === 'utility'
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                }`}>
                  {selectedNode.type}
                </span>
                <h3 className="font-bold text-gray-200 text-sm font-mono">{selectedNode.name}</h3>
              </div>

              {selectedNode.timestamp && (
                <span className="text-xs text-gray-500 font-mono">
                  Captured at: <strong>{selectedNode.timestamp}</strong>
                </span>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Raw Trace Stream (Lines in block)</span>
              <div className="bg-[#0A0C10] p-4 rounded border border-gray-800 overflow-x-auto text-xs font-mono text-blue-400 space-y-1 max-h-40 select-text">
                {selectedNode.rawLines && selectedNode.rawLines.length > 0 ? (
                  selectedNode.rawLines.map((line, idx) => (
                    <div key={idx} className="whitespace-pre">{line}</div>
                  ))
                ) : (
                  <div className="text-gray-600 italic">No raw log lines captured in this specific node container</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1D23] border-t border-gray-800 mt-12 py-5 px-6 text-center select-none">
        <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">
          COBOL Trace Visualizer • Designed for batch diagnostic acceleration • Powered by server-side Gemini 3.5
        </p>
      </footer>
    </div>
  );
}
