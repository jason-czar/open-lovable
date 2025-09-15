import { NextRequest, NextResponse } from 'next/server';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { AIModelConfig } from '@/types/ai-config';
import { getModelCapabilities } from '@/lib/ai-config/model-capabilities';

// Force dynamic route to enable streaming
export const dynamic = 'force-dynamic';

// Check if we're using Vercel AI Gateway
const isUsingAIGateway = !!process.env.AI_GATEWAY_API_KEY;
const aiGatewayBaseURL = 'https://ai-gateway.vercel.sh/v1';

const groq = createGroq({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.GROQ_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : undefined,
});

const anthropic = createAnthropic({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.ANTHROPIC_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1'),
});

const openai = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : process.env.OPENAI_BASE_URL,
});

const googleGenerativeAI = createGoogleGenerativeAI({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.GEMINI_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : undefined,
});

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt, 
      model = 'openai/gpt-5', 
      aiConfig,
      systemPrompt,
      context 
    } = await request.json();
    
    console.log('[generate-ai-code-stream] Request received');
    console.log('[generate-ai-code-stream] Model:', model);
    console.log('[generate-ai-code-stream] AI Config:', aiConfig);
    
    if (!prompt) {
      return NextResponse.json({
        error: 'prompt is required'
      }, { status: 400 });
    }
    
    // Get model capabilities and apply config
    const capabilities = getModelCapabilities(model);
    const config: AIModelConfig = {
      ...capabilities.defaultConfig,
      ...aiConfig
    };
    
    console.log('[generate-ai-code-stream] Final config:', config);
    
    // Select the appropriate AI model
    let aiModel;
    if (model.startsWith('anthropic/')) {
      aiModel = anthropic(model.replace('anthropic/', ''));
    } else if (model.startsWith('openai/')) {
      if (model.includes('gpt-oss')) {
        aiModel = groq(model);
      } else {
        aiModel = openai(model.replace('openai/', ''));
      }
    } else if (model.startsWith('google/')) {
      aiModel = googleGenerativeAI(model.replace('google/', ''));
    } else {
      // Default to groq if model format is unclear
      aiModel = groq(model);
    }
    
    console.log('[generate-ai-code-stream] Using AI model:', model);
    
    // Build messages array
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system' as const,
        content: systemPrompt
      });
    }
    
    if (context) {
      messages.push({
        role: 'user' as const,
        content: `Context: ${context}`
      });
    }
    
    messages.push({
      role: 'user' as const,
      content: prompt
    });
    
    // Generate the code with streaming
    const result = await streamText({
      model: aiModel,
      messages,
      temperature: config.temperature,
      topP: config.topP,
      maxTokens: config.maxTokens,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      stop: config.stopSequences?.length ? config.stopSequences : undefined,
    });
    
    // Create a response stream
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Stream the generated code
    (async () => {
      try {
        let generatedCode = '';
        
        for await (const chunk of result.textStream) {
          generatedCode += chunk;
          
          // Send chunk to client
          const message = `data: ${JSON.stringify({
            type: 'chunk',
            content: chunk,
            fullContent: generatedCode
          })}\n\n`;
          
          await writer.write(encoder.encode(message));
        }
        
        // Send completion message
        const completeMessage = `data: ${JSON.stringify({
          type: 'complete',
          content: generatedCode,
          usage: result.usage,
          finishReason: result.finishReason
        })}\n\n`;
        
        await writer.write(encoder.encode(completeMessage));
        
      } catch (error) {
        console.error('[generate-ai-code-stream] Error:', error);
        const errorMessage = `data: ${JSON.stringify({
          type: 'error',
          error: (error as Error).message
        })}\n\n`;
        
        await writer.write(encoder.encode(errorMessage));
      } finally {
        await writer.close();
      }
    })();
    
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('[generate-ai-code-stream] Error:', error);
    return NextResponse.json({
      error: (error as Error).message
    }, { status: 500 });
  }
}