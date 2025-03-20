import { NextRequest, NextResponse } from 'next/server';

// Configure your preferred LLM provider here
const LLM_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const LLM_API_KEY = process.env.OPENAI_API_KEY || '';
const LLM_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'; // Use faster model by default

// System prompts - made more concise
const SYSTEM_PROMPTS = {
  default: 'Create a concise legal document with standard sections and legal language. No explanations - output only the document text.',
  
  rewrite: 'Rewrite this legal document with a different structure while preserving legal purpose. Focus on clarity and stronger protections. No explanations.',

  partialRewrite: 'Rewrite only this text segment, making it clearer, more precise, and legally stronger. Maintain proper legal language. Return only the improved text.'
};

// Function to call LLM API
async function callLLMAPI(prompt: string, isRewrite: boolean = false, isPartialRewrite: boolean = false, useGpt4: boolean = false) {
  try {
    // Ensure API key is available
    if (!LLM_API_KEY) {
      throw new Error('LLM API key not configured');
    }

    let systemPrompt;
    if (isPartialRewrite) {
      systemPrompt = SYSTEM_PROMPTS.partialRewrite;
    } else if (isRewrite) {
      systemPrompt = SYSTEM_PROMPTS.rewrite;
    } else {
      systemPrompt = SYSTEM_PROMPTS.default;
    }

    // Shorten prompt if it's too long
    const maxPromptLength = 4000;
    let processedPrompt = prompt;
    if (prompt.length > maxPromptLength) {
      processedPrompt = prompt.substring(0, maxPromptLength) + "... [truncated for brevity]";
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout - fail faster

    try {
      const response = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`
        },
        body: JSON.stringify({
          model: useGpt4 ? 'gpt-4-turbo' : 'gpt-3.5-turbo', // Try with faster model first 
          messages: [
            {
              role: 'system', 
              content: systemPrompt
            },
            {
              role: 'user',
              content: processedPrompt
            }
          ],
          temperature: isPartialRewrite ? 0.3 : isRewrite ? 0.7 : 0.2,
          max_tokens: isPartialRewrite ? 500 : 2000, // Reduced max tokens
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
        throw new Error(`LLM API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error('LLM API request timed out after 20 seconds');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Error calling LLM API:', error);
    throw error;
  }
}

// Shorter fallback templates
const templateIntros: Record<string, string> = {
  nda: `CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT

This Agreement is entered into as of [DATE], between:
[PARTY A NAME] ("Disclosing Party") and [PARTY B NAME] ("Receiving Party").

1. PURPOSE: The parties are exploring a business relationship where confidential information may be shared.

2. CONFIDENTIAL INFORMATION: Information designated as "Confidential" or reasonably understood to be confidential.`,

  contract: `SERVICE AGREEMENT

This Agreement is made as of [DATE], between:
[SERVICE PROVIDER NAME] ("Service Provider") and [CLIENT NAME] ("Client").

1. SERVICES: Service Provider shall provide services as described in Exhibit A.

2. COMPENSATION: Client shall pay the fees set forth in Exhibit B.`
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { prompt, documentType, title, isRewrite, isPartialRewrite } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    let content;
    let diagnostic = null;
    
    // Check if this is just a fallback template request
    if (prompt === "Use fallback template") {
      const docType = documentType || 'nda';
      const intro = templateIntros[docType] || templateIntros.nda;
      // Just return the template intro for faster response
      return NextResponse.json({ 
        content: intro,
        diagnostic: { 
          message: "Using fallback template",
          isTemplate: true
        }
      });
    }
    
    // Try to call the LLM API with faster model first
    try {
      content = await callLLMAPI(prompt, isRewrite, isPartialRewrite, false); // Use GPT-3.5 first
    } catch (error: any) {
      diagnostic = {
        message: error.message || 'Unknown error',
        isTimeout: error.message?.includes('timed out') || false,
        model: 'gpt-3.5-turbo'
      };
      console.error('Error generating with GPT-3.5:', error);
      
      // Immediately use fallback if we needed GPT-3.5
      const docType = documentType || 'nda';
      const intro = templateIntros[docType] || templateIntros.nda;
      
      // For partial rewrites, just return the original text with error note
      if (isPartialRewrite) {
        content = `[AI REWRITE FAILED: ${diagnostic.message}] ${prompt.substring(0, 100)}...`;
      } else {
        // Insert title into the template
        let templateContent = intro;
        if (title) {
          templateContent = templateContent.replace(/\[TITLE\]/g, title);
        }
        
        // Add warning about fallback template
        content = `[USING FALLBACK TEMPLATE - LLM GENERATION FAILED: ${diagnostic.message}]\n\n${templateContent}`;
      }
      
      return NextResponse.json({ 
        content,
        diagnostic
      });
    }
    
    return NextResponse.json({ 
      content,
      diagnostic
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate document', 
        message: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 