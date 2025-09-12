import { NextRequest, NextResponse } from 'next/server';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

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

const googleGenerativeAI = createGoogleGenerativeAI({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.GEMINI_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : undefined,
});

const openai = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY,
  baseURL: isUsingAIGateway ? aiGatewayBaseURL : process.env.OPENAI_BASE_URL,
});

// App templates for different types of applications
const APP_TEMPLATES = {
  'note-taking': {
    name: 'Note Taking App',
    description: 'A clean, modern note-taking application with create, edit, delete, and search functionality',
    components: ['NoteList', 'NoteEditor', 'SearchBar', 'NoteCard'],
    features: ['Create notes', 'Edit notes', 'Delete notes', 'Search notes', 'Local storage', 'Rich text editing']
  },
  'todo': {
    name: 'Todo List App',
    description: 'A task management application with priority levels, categories, and completion tracking',
    components: ['TodoList', 'TodoItem', 'AddTodo', 'FilterBar'],
    features: ['Add tasks', 'Mark complete', 'Priority levels', 'Categories', 'Filter tasks', 'Local storage']
  },
  'weather': {
    name: 'Weather App',
    description: 'A weather application showing current conditions and forecasts',
    components: ['WeatherCard', 'SearchLocation', 'ForecastList', 'WeatherDetails'],
    features: ['Current weather', '5-day forecast', 'Location search', 'Weather icons', 'Temperature units']
  },
  'calculator': {
    name: 'Calculator App',
    description: 'A functional calculator with basic arithmetic operations',
    components: ['Calculator', 'Display', 'ButtonGrid', 'CalculatorButton'],
    features: ['Basic operations', 'Clear function', 'Decimal support', 'Keyboard input', 'History']
  },
  'blog': {
    name: 'Blog Platform',
    description: 'A simple blog platform with posts, categories, and reading functionality',
    components: ['PostList', 'PostCard', 'PostDetail', 'CategoryFilter'],
    features: ['View posts', 'Read full articles', 'Filter by category', 'Responsive design', 'Search posts']
  },
  'portfolio': {
    name: 'Portfolio Website',
    description: 'A personal portfolio website showcasing projects and skills',
    components: ['Hero', 'About', 'Projects', 'Skills', 'Contact'],
    features: ['Project showcase', 'Skills display', 'Contact form', 'Responsive design', 'Modern UI']
  },
  'ecommerce': {
    name: 'E-commerce Store',
    description: 'A product catalog with shopping cart functionality',
    components: ['ProductGrid', 'ProductCard', 'ShoppingCart', 'ProductDetail'],
    features: ['Product catalog', 'Shopping cart', 'Product details', 'Add to cart', 'Cart management']
  },
  'dashboard': {
    name: 'Analytics Dashboard',
    description: 'A data visualization dashboard with charts and metrics',
    components: ['Dashboard', 'MetricCard', 'ChartContainer', 'DataTable'],
    features: ['Data visualization', 'Interactive charts', 'Key metrics', 'Responsive layout', 'Real-time updates']
  }
};

function detectAppType(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('note') || desc.includes('journal') || desc.includes('diary')) return 'note-taking';
  if (desc.includes('todo') || desc.includes('task') || desc.includes('checklist')) return 'todo';
  if (desc.includes('weather') || desc.includes('forecast') || desc.includes('temperature')) return 'weather';
  if (desc.includes('calculator') || desc.includes('math') || desc.includes('calculate')) return 'calculator';
  if (desc.includes('blog') || desc.includes('article') || desc.includes('post')) return 'blog';
  if (desc.includes('portfolio') || desc.includes('resume') || desc.includes('showcase')) return 'portfolio';
  if (desc.includes('shop') || desc.includes('store') || desc.includes('ecommerce') || desc.includes('product')) return 'ecommerce';
  if (desc.includes('dashboard') || desc.includes('analytics') || desc.includes('chart') || desc.includes('data')) return 'dashboard';
  
  // Default to a generic web app
  return 'portfolio';
}

export async function POST(request: NextRequest) {
  try {
    const { description, model = 'openai/gpt-4o-mini', style = 'modern' } = await request.json();
    
    console.log('[generate-app-from-description] Received request:', { description, model, style });
    
    if (!description) {
      return NextResponse.json({ 
        success: false, 
        error: 'App description is required' 
      }, { status: 400 });
    }
    
    // Detect app type and get template
    const appType = detectAppType(description);
    const template = APP_TEMPLATES[appType as keyof typeof APP_TEMPLATES];
    
    console.log('[generate-app-from-description] Detected app type:', appType, 'Template:', template.name);
    
    // Create a stream for real-time updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Function to send progress updates
    const sendProgress = async (data: any) => {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      try {
        await writer.write(encoder.encode(message));
      } catch (error) {
        console.error('[generate-app-from-description] Error writing to stream:', error);
      }
    };
    
    // Start processing in background
    (async () => {
      try {
        await sendProgress({ type: 'status', message: `Analyzing your request: "${description}"` });
        await sendProgress({ type: 'status', message: `Detected app type: ${template.name}` });
        await sendProgress({ type: 'status', message: 'Planning component architecture...' });
        
        // Build enhanced system prompt for app generation
        const systemPrompt = `You are an expert React developer creating a complete, functional application from a user description.

USER REQUEST: "${description}"
DETECTED APP TYPE: ${template.name}
STYLE PREFERENCE: ${style}

TEMPLATE GUIDANCE:
- App Name: ${template.name}
- Description: ${template.description}
- Suggested Components: ${template.components.join(', ')}
- Key Features: ${template.features.join(', ')}

🚨 CRITICAL REQUIREMENTS:

1. **COMPLETE APPLICATION**: Generate a fully functional React app with ALL necessary components
2. **MODERN STACK**: Use React with Vite, Tailwind CSS, and modern JavaScript features
3. **RESPONSIVE DESIGN**: Ensure the app works on desktop, tablet, and mobile
4. **FUNCTIONAL FEATURES**: All core features must actually work, not just be placeholders
5. **CLEAN CODE**: Use modern React patterns (hooks, functional components)

REQUIRED FILES TO GENERATE:
1. **App.jsx** - Main application component that ties everything together
2. **Component files** - All necessary components for the app functionality
3. **index.css** - Global styles and Tailwind imports (if needed)

STYLE GUIDELINES:
- ${style === 'modern' ? 'Clean, minimalist design with subtle shadows and rounded corners' : ''}
- ${style === 'playful' ? 'Bright colors, fun animations, and engaging interactions' : ''}
- ${style === 'professional' ? 'Corporate look with blues, grays, and clean typography' : ''}
- ${style === 'artistic' ? 'Creative design with unique layouts and bold visual elements' : ''}

TECHNICAL REQUIREMENTS:
- Use only standard Tailwind CSS classes (no custom CSS variables)
- Implement proper state management with React hooks
- Add proper error handling and loading states
- Include responsive breakpoints (sm:, md:, lg:)
- Use semantic HTML elements
- Add proper accessibility attributes

FUNCTIONALITY REQUIREMENTS:
- All buttons and interactions must work
- Forms must handle input and validation
- Data should persist in localStorage where appropriate
- Include proper loading and error states
- Add smooth transitions and animations

DO NOT:
- Use external APIs unless specifically requested
- Create placeholder/dummy components that don't work
- Use custom CSS classes not in Tailwind
- Generate incomplete or broken functionality
- Create overly complex architectures for simple apps

REMEMBER: The user wants a working application they can immediately use and interact with!`;

        await sendProgress({ type: 'status', message: 'Generating application code...' });
        
        // Select the appropriate AI model
        let aiModel;
        if (model.startsWith('groq/')) {
          aiModel = groq(model.replace('groq/', ''));
        } else if (model.startsWith('anthropic/')) {
          aiModel = anthropic(model.replace('anthropic/', ''));
        } else if (model.startsWith('google/')) {
          aiModel = googleGenerativeAI(model.replace('google/', ''));
        } else {
          aiModel = openai(model.replace('openai/', ''));
        }
        
        // Generate the application code
        const result = await streamText({
          model: aiModel,
          system: systemPrompt,
          prompt: `Create a complete ${template.name.toLowerCase()} based on this description: "${description}"

Generate all necessary React components and make sure the application is fully functional. Focus on creating a great user experience with the ${style} design style.`,
          temperature: 0.7,
          maxTokens: 4000,
        });
        
        let generatedCode = '';
        
        // Stream the generated code
        for await (const chunk of result.textStream) {
          generatedCode += chunk;
          await sendProgress({ 
            type: 'stream', 
            content: chunk,
            fullContent: generatedCode
          });
        }
        
        await sendProgress({ 
          type: 'complete', 
          content: generatedCode,
          appType: appType,
          template: template,
          message: `Successfully generated ${template.name}!`
        });
        
      } catch (error: any) {
        console.error('[generate-app-from-description] Error:', error);
        await sendProgress({ 
          type: 'error', 
          message: `Failed to generate app: ${error.message}` 
        });
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
    
  } catch (error: any) {
    console.error('[generate-app-from-description] Request error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
