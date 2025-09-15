"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Play, Square, RefreshCw, Download, ExternalLink } from "lucide-react";

// Import components
import HeroInput from "@/components/HeroInput";
import SandboxPreview from "@/components/SandboxPreview";
import CodeApplicationProgress, { CodeApplicationState } from "@/components/CodeApplicationProgress";
import HMRErrorDetector from "@/components/HMRErrorDetector";
import { AIConfigPanel } from "@/components/ai-config/AIConfigPanel";
import { AIModelSelector } from "@/components/ai-config/AIModelSelector";
import Button from "@/components/ui/shadcn/button";
import { appConfig } from "@/config/app.config";

interface GenerationMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'command';
  content: string;
  timestamp: number;
  metadata?: any;
}

export default function GenerationPage() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Core state
  const [messages, setMessages] = useState<GenerationMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sandboxUrl, setSandboxUrl] = useState<string>("");
  const [sandboxId, setSandboxId] = useState<string>("");
  const [codeApplicationState, setCodeApplicationState] = useState<CodeApplicationState>({ stage: null });
  
  // AI Configuration state
  const [selectedModel, setSelectedModel] = useState(appConfig.ai.defaultModel);
  const [aiConfig, setAiConfig] = useState<any>({});
  const [showAIConfig, setShowAIConfig] = useState(false);
  
  // Input state
  const [inputValue, setInputValue] = useState("");
  const [generationType, setGenerationType] = useState<'url' | 'description'>('description');
  
  // UI state
  const [errors, setErrors] = useState<Array<{ type: string; message: string; package?: string }>>([]);

  // Initialize from session storage
  useEffect(() => {
    const targetUrl = sessionStorage.getItem('targetUrl');
    const appDescription = sessionStorage.getItem('appDescription');
    const storedGenerationType = sessionStorage.getItem('generationType');
    const autoStart = sessionStorage.getItem('autoStart');
    
    if (storedGenerationType) {
      setGenerationType(storedGenerationType as 'url' | 'description');
    }
    
    if (targetUrl) {
      setInputValue(targetUrl);
      setGenerationType('url');
    } else if (appDescription) {
      setInputValue(appDescription);
      setGenerationType('description');
    }
    
    if (autoStart === 'true') {
      sessionStorage.removeItem('autoStart');
      if (targetUrl || appDescription) {
        handleGenerate(targetUrl || appDescription || '');
      }
    }
  }, []);

  // Create sandbox on mount
  useEffect(() => {
    createSandbox();
  }, []);

  const createSandbox = async () => {
    try {
      const response = await fetch('/api/create-ai-sandbox-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSandboxUrl(data.url);
        setSandboxId(data.sandboxId);
        
        addMessage({
          type: 'system',
          content: `Sandbox created successfully! You can now start building.`,
          metadata: { sandboxUrl: data.url }
        });
      } else {
        throw new Error(data.error || 'Failed to create sandbox');
      }
    } catch (error) {
      console.error('Failed to create sandbox:', error);
      toast.error('Failed to create development environment');
    }
  };

  const addMessage = (message: Omit<GenerationMessage, 'id' | 'timestamp'>) => {
    const newMessage: GenerationMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleGenerate = async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setCodeApplicationState({ stage: 'analyzing' });
    
    addMessage({
      type: 'user',
      content: prompt
    });

    try {
      let endpoint = '';
      let requestBody: any = {
        model: selectedModel,
        aiConfig: aiConfig
      };

      if (generationType === 'description') {
        endpoint = '/api/generate-app-from-description';
        requestBody.description = prompt;
      } else {
        endpoint = '/api/generate-ai-code-stream';
        requestBody.prompt = `Create a React application that reimagines this website: ${prompt}`;
        
        // Add additional context if available
        const additionalInstructions = sessionStorage.getItem('additionalInstructions');
        if (additionalInstructions) {
          requestBody.prompt += `\n\nAdditional instructions: ${additionalInstructions}`;
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let generatedCode = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk' || data.type === 'stream') {
                  generatedCode += data.content || '';
                } else if (data.type === 'complete') {
                  generatedCode = data.content || generatedCode;
                  
                  addMessage({
                    type: 'assistant',
                    content: generatedCode,
                    metadata: { 
                      usage: data.usage,
                      finishReason: data.finishReason,
                      aiConfig: aiConfig
                    }
                  });
                  
                  // Apply the generated code
                  await applyGeneratedCode(generatedCode);
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Generation failed');
                }
              } catch (parseError) {
                console.debug('Error parsing stream data:', parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      addMessage({
        type: 'system',
        content: `Error: ${(error as Error).message}`
      });
      toast.error('Failed to generate code');
    } finally {
      setIsGenerating(false);
      setCodeApplicationState({ stage: null });
    }
  };

  const applyGeneratedCode = async (code: string) => {
    try {
      setCodeApplicationState({ stage: 'applying' });
      
      const response = await fetch('/api/apply-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: code,
          sandboxId: sandboxId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply code');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'complete') {
                  setCodeApplicationState({ stage: 'complete' });
                  
                  addMessage({
                    type: 'system',
                    content: `Code applied successfully! ${data.results?.filesCreated?.length || 0} files created.`,
                    metadata: data.results
                  });
                  
                  toast.success('Code applied successfully!');
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Failed to apply code');
                }
              } catch (parseError) {
                console.debug('Error parsing application stream:', parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Code application error:', error);
      setCodeApplicationState({ stage: null });
      toast.error('Failed to apply generated code');
    }
  };

  const handleErrorDetected = (detectedErrors: Array<{ type: string; message: string; package?: string }>) => {
    setErrors(detectedErrors);
    
    if (detectedErrors.length > 0) {
      addMessage({
        type: 'system',
        content: `Detected ${detectedErrors.length} error(s) in the application. Installing missing packages...`,
        metadata: { errors: detectedErrors }
      });
      
      // Auto-install missing packages
      const missingPackages = detectedErrors
        .filter(e => e.type === 'npm-missing' && e.package)
        .map(e => e.package!);
      
      if (missingPackages.length > 0) {
        installPackages(missingPackages);
      }
    }
  };

  const installPackages = async (packages: string[]) => {
    try {
      const response = await fetch('/api/install-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages })
      });

      if (response.ok) {
        toast.success(`Installed ${packages.length} package(s)`);
        setErrors([]);
      }
    } catch (error) {
      console.error('Package installation error:', error);
      toast.error('Failed to install packages');
    }
  };

  const downloadProject = async () => {
    try {
      const response = await fetch('/api/create-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const link = document.createElement('a');
        link.href = data.dataUrl;
        link.download = data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Project downloaded successfully!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download project');
    }
  };

  return (
    <div className="min-h-screen bg-background-base">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-96 bg-white border-r border-border-faint flex flex-col">
          {/* Header */}
          <div className="p-24 border-b border-border-faint">
            <div className="flex items-center justify-between mb-16">
              <h1 className="text-title-h4 text-accent-black">AI Builder</h1>
              <Button
                variant="tertiary"
                size="default"
                onClick={() => setShowAIConfig(!showAIConfig)}
                className="gap-6"
              >
                <Settings className="w-16 h-16" />
                {showAIConfig ? 'Hide' : 'Show'} Config
              </Button>
            </div>
            
            {/* Model Selector */}
            <AIModelSelector
              selectedModel={selectedModel}
              onModelChange={(model) => {
                setSelectedModel(model);
                // Reset AI config when model changes
                setAiConfig({});
              }}
              className="mb-16"
            />
          </div>

          {/* AI Configuration Panel */}
          <AnimatePresence>
            {showAIConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-b border-border-faint overflow-hidden"
              >
                <div className="p-24">
                  <AIConfigPanel
                    modelId={selectedModel}
                    onModelChange={setSelectedModel}
                    onConfigChange={setAiConfig}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-24 space-y-16">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "p-12 rounded-8 text-body-small",
                  message.type === 'user' && "bg-heat-4 text-accent-black ml-16",
                  message.type === 'assistant' && "bg-black-alpha-4 text-accent-black mr-16",
                  message.type === 'system' && "bg-blue-50 text-blue-800 text-center",
                  message.type === 'command' && "bg-gray-100 text-gray-600 font-mono"
                )}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                {message.metadata?.usage && (
                  <div className="mt-8 pt-8 border-t border-black-alpha-8 text-body-small text-black-alpha-56">
                    Tokens: {message.metadata.usage.totalTokens} • Model: {selectedModel}
                  </div>
                )}
              </div>
            ))}
            
            <CodeApplicationProgress state={codeApplicationState} />
          </div>

          {/* Input Area */}
          <div className="p-24 border-t border-border-faint">
            <HeroInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={() => handleGenerate(inputValue)}
              placeholder={
                generationType === 'description' 
                  ? "Describe the app you want to build..."
                  : "Enter URL to reimagine..."
              }
              showSearchFeatures={false}
              className="mb-12"
            />
            
            {/* Generation Controls */}
            <div className="flex items-center gap-8">
              <Button
                variant={isGenerating ? "secondary" : "primary"}
                size="default"
                onClick={() => isGenerating ? setIsGenerating(false) : handleGenerate(inputValue)}
                disabled={!inputValue.trim()}
                className="flex-1 gap-6"
              >
                {isGenerating ? (
                  <>
                    <Square className="w-16 h-16" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-16 h-16" />
                    Generate
                  </>
                )}
              </Button>
              
              <Button
                variant="tertiary"
                size="default"
                onClick={createSandbox}
                className="gap-6"
              >
                <RefreshCw className="w-16 h-16" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="h-64 bg-white border-b border-border-faint flex items-center justify-between px-24">
            <div className="flex items-center gap-12">
              <div className="text-label-medium text-accent-black">
                {sandboxUrl ? 'Preview' : 'Setting up environment...'}
              </div>
              {sandboxUrl && (
                <div className="text-body-small text-black-alpha-56 font-mono">
                  {sandboxUrl}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-8">
              {sandboxUrl && (
                <>
                  <Button
                    variant="tertiary"
                    size="default"
                    onClick={downloadProject}
                    className="gap-6"
                  >
                    <Download className="w-16 h-16" />
                    Download
                  </Button>
                  
                  <Button
                    variant="tertiary"
                    size="default"
                    onClick={() => window.open(sandboxUrl, '_blank')}
                    className="gap-6"
                  >
                    <ExternalLink className="w-16 h-16" />
                    Open
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 bg-gray-50">
            <SandboxPreview
              type="vite"
              sandboxUrl={sandboxUrl}
              isLoading={!sandboxUrl}
            />
            
            <HMRErrorDetector
              iframeRef={iframeRef}
              onErrorDetected={handleErrorDetected}
            />
          </div>
        </div>
      </div>
    </div>
  );
}