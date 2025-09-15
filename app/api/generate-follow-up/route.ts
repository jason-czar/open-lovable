import { NextRequest, NextResponse } from 'next/server';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { ConversationManager } from '@/lib/conversation-manager';

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
      followUpInstruction,
      parentMessageId,
      conversationId,
      model = 'moonshotai/kimi-k2-instruct-0905',
      aiConfig = {},
      sandboxId
    } = await request.json();
    
    console.log('[generate-follow-up] Processing follow-up instruction');
    console.log('[generate-follow-up] Parent message:', parentMessageId);
    console.log('[generate-follow-up] Instruction:', followUpInstruction);
    
    if (!followUpInstruction || !conversationId) {
      return NextResponse.json({
        error: 'followUpInstruction and conversationId are required'
      }, { status: 400 });
    }

    // Get conversation context
    const conversationManager = ConversationManager.getInstance();
    const contextPrompt = conversationManager.buildContextPrompt(conversationId);
    
    // Get current sandbox files for context
    let currentFiles = '';
    try {
      const filesResponse = await fetch(`${request.nextUrl.origin}/api/get-sandbox-files`);
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        if (filesData.success && filesData.files) {
          // Build a summary of current files
          const fileList = Object.keys(filesData.files)
            .filter(path => path.endsWith('.jsx') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.ts'))
            .slice(0, 10); // Limit to prevent token overflow
          
          currentFiles = `\n## Current Project Files\n${fileList.join('\n')}`;
        }
      }
    } catch (error) {
      console.error('[generate-follow-up] Error fetching files:', error);
    }

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
      aiModel = groq(model);
    }

    // Build enhanced system prompt for follow-up
    const systemPrompt = `You are an expert React developer helping users iteratively improve their applications.

CONTEXT: This is a follow-up request to modify existing code. The user wants to make specific changes to their current application.

${contextPrompt}${currentFiles}

CRITICAL INSTRUCTIONS FOR FOLLOW-UP EDITS:

1. **SURGICAL PRECISION**: Make ONLY the specific changes requested. Do not rewrite entire components unless explicitly asked.

2. **PRESERVE EXISTING CODE**: Keep all existing functionality, imports, exports, and structure intact unless specifically asked to change them.

3. **MINIMAL CHANGES**: If the user says "make the header blue", change ONLY the background color class. Don't refactor, reorganize, or "improve" other aspects.

4. **COMPLETE FILES**: Always return the COMPLETE file content, never truncate with "..." or skip sections.

5. **PACKAGE DETECTION**: If you need new packages, specify them with <package>package-name</package> tags.

6. **FILE TARGETING**: Only modify files that are directly related to the requested change.

EXAMPLES OF GOOD FOLLOW-UP RESPONSES:

User: "make the header background blue"
✅ GOOD: Change only the bg-gray-900 class to bg-blue-500 in Header.jsx
❌ BAD: Rewrite the entire Header component or modify multiple files

User: "add a search bar"
✅ GOOD: Add search input to the existing navigation structure
❌ BAD: Recreate the entire navigation system

Remember: You're making targeted improvements to existing code, not rebuilding from scratch.`;

    // Generate the follow-up response
    const result = await streamText({
      model: aiModel,
      system: systemPrompt,
      prompt: `The user wants to make this change to their current application:

"${followUpInstruction}"

Please make the minimal, targeted changes needed to implement this request. Focus on surgical precision - modify only what's necessary to fulfill the user's request.`,
      temperature: aiConfig.temperature || 0.3, // Lower temperature for more precise follow-ups
      topP: aiConfig.topP || 0.8,
      maxTokens: aiConfig.maxTokens || 6000,
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

        // Add message to conversation
        conversationManager.addMessage(conversationId, {
          role: 'assistant',
          content: generatedCode,
          metadata: {
            isFollowUp: true,
            parentMessageId,
            editType: 'follow-up-refinement',
            codeSnapshot: generatedCode.substring(0, 1000) // Store snippet for reference
          }
        });
        
        // Send completion message
        const completeMessage = `data: ${JSON.stringify({
          type: 'complete',
          content: generatedCode,
          usage: result.usage,
          finishReason: result.finishReason,
          conversationId,
          parentMessageId
        })}\n\n`;
        
        await writer.write(encoder.encode(completeMessage));
        
      } catch (error) {
        console.error('[generate-follow-up] Error:', error);
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
    console.error('[generate-follow-up] Error:', error);
    return NextResponse.json({
      error: (error as Error).message
    }, { status: 500 });
  }
}