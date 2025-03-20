import { NextRequest, NextResponse } from 'next/server';

// Configure your preferred LLM provider here
const LLM_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const LLM_API_KEY = process.env.OPENAI_API_KEY || '';
const LLM_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo';

// System prompts
const SYSTEM_PROMPTS = {
  default: 'You are a legal document expert specialized in drafting professional, accurate legal agreements. Format your response as a complete legal document with numbered sections, proper legal language, and standard clauses. Do not include any explanations or notes - output only the legal document text that would be ready for review by a lawyer.',
  
  rewrite: 'You are a legal document expert specialized in rewriting and reformulating legal agreements. Your task is to create a completely new version of a document while preserving its legal purpose. Use a different structure, wording, and approach than the original. Focus on clarity, precision, and stronger legal protection. Format your response as a complete legal document with numbered sections, proper legal language, and standard clauses. Do not include any explanations or notes - output only the legal document text that would be ready for review by a lawyer.',

  partialRewrite: 'You are a legal document expert specializing in improving specific sections of legal text. Your task is to rewrite only the provided text segment, making it clearer, more precise, and legally stronger while preserving its original meaning and intent. Do not add additional sections or change the scope. Maintain proper legal language and formatting consistent with the context. Return only the improved version of the provided text without any explanations, introductions or additional notes.'
};

// Function to call LLM API
async function callLLMAPI(prompt: string, isRewrite: boolean = false, isPartialRewrite: boolean = false) {
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

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(LLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            {
              role: 'system', 
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: isPartialRewrite ? 0.3 : isRewrite ? 0.7 : 0.2, // Different temperature for different tasks
          max_tokens: isPartialRewrite ? 1000 : 4000
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId); // Clear timeout if request completes

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
        throw new Error(`LLM API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error('LLM API request timed out after 30 seconds');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId); // Ensure timeout is cleared
    }
  } catch (error) {
    console.error('Error calling LLM API:', error);
    throw error;
  }
}

// Sample template responses for fallback if LLM API fails
const sampleTemplates: Record<string, string> = {
  nda: `CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT

This Confidentiality and Non-Disclosure Agreement (the "Agreement") is entered into as of [DATE], by and between:

Party A: [PARTY A NAME], with its principal place of business at [ADDRESS] ("Disclosing Party"), and
Party B: [PARTY B NAME], with its principal place of business at [ADDRESS] ("Receiving Party").

1. PURPOSE
   The parties wish to explore a potential business relationship. In connection with this opportunity, the Disclosing Party may share certain confidential and proprietary information with the Receiving Party.

2. DEFINITION OF CONFIDENTIAL INFORMATION
   "Confidential Information" means any information disclosed by the Disclosing Party to the Receiving Party, either directly or indirectly, in writing, orally or by inspection of tangible objects, that is designated as "Confidential," "Proprietary," or some similar designation, or that should reasonably be understood to be confidential given the nature of the information and the circumstances of disclosure.

3. OBLIGATIONS OF RECEIVING PARTY
   The Receiving Party shall:
   (a) Hold the Confidential Information in strict confidence;
   (b) Use the Confidential Information solely for the purpose of evaluating the potential business relationship;
   (c) Not disclose such Confidential Information to any third party;
   (d) Take reasonable measures to protect the secrecy of the Confidential Information;
   (e) Limit access to the Confidential Information to employees, agents, and representatives who need to know such information and who are bound by confidentiality obligations at least as restrictive as those contained herein.

4. EXCLUSIONS
   The obligations and restrictions set forth herein shall not apply to information that:
   (a) Is or becomes generally known to the public through no fault of the Receiving Party;
   (b) Was known to the Receiving Party prior to its disclosure by the Disclosing Party;
   (c) Is received from a third party without restriction and without breach of any agreement;
   (d) Is independently developed by the Receiving Party without use of or reference to the Confidential Information;
   (e) Is required to be disclosed by law or court order, provided that the Receiving Party gives the Disclosing Party prompt written notice of such requirement.

5. TERM
   The obligations contained in this Agreement shall remain in effect for a period of [DURATION] years from the date of disclosure.

6. RETURN OF MATERIALS
   Upon the Disclosing Party's request or upon termination of the relationship between the parties, the Receiving Party will promptly return or destroy all copies of Confidential Information in its possession.

7. NO LICENSE
   Nothing in this Agreement is intended to grant any rights to either party under any patent, copyright, or other intellectual property right.

8. REMEDIES
   The Receiving Party acknowledges that monetary damages may not be a sufficient remedy for unauthorized disclosure of Confidential Information and that the Disclosing Party shall be entitled, without waiving any other rights or remedies, to seek injunctive or equitable relief.

9. GOVERNING LAW
   This Agreement shall be governed by and construed in accordance with the laws of [JURISDICTION] without reference to conflict of laws principles.

10. ENTIRE AGREEMENT
    This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, both oral and written. Any amendment must be in writing and signed by both parties.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

DISCLOSING PARTY:
[COMPANY NAME]

By: ______________________________
Name: ___________________________
Title: ____________________________

RECEIVING PARTY:
[COMPANY NAME]

By: ______________________________
Name: ___________________________
Title: ____________________________`,

  contract: `SERVICE AGREEMENT

This Service Agreement (the "Agreement") is made and entered into as of [DATE] (the "Effective Date"), by and between:

[SERVICE PROVIDER NAME], a [STATE OF INCORPORATION] [TYPE OF ENTITY] with its principal place of business at [ADDRESS] ("Service Provider"), and

[CLIENT NAME], a [STATE OF INCORPORATION] [TYPE OF ENTITY] with its principal place of business at [ADDRESS] ("Client").

1. SERVICES
   1.1 Service Provider shall provide to Client the services described in Exhibit A attached hereto (the "Services").
   1.2 Service Provider shall perform the Services in a professional and workmanlike manner and in accordance with industry standards.

2. COMPENSATION AND PAYMENT
   2.1 Fees. In consideration for the Services, Client shall pay Service Provider the fees set forth in Exhibit B ("Fees").
   2.2 Expenses. Client shall reimburse Service Provider for all reasonable expenses incurred in connection with the Services, provided that such expenses are approved in advance by Client.
   2.3 Invoicing. Service Provider shall invoice Client [PAYMENT FREQUENCY]. All invoices are due and payable within [NUMBER] days of receipt.
   2.4 Late Payments. Payments not received within [NUMBER] days of the due date shall bear interest at the rate of [PERCENTAGE]% per month or the maximum rate permitted by law, whichever is less.

3. TERM AND TERMINATION
   3.1 Term. This Agreement shall commence on the Effective Date and shall continue until [END DATE] or until terminated as provided herein.
   3.2 Termination for Convenience. Either party may terminate this Agreement upon [NUMBER] days' written notice to the other party.
   3.3 Termination for Cause. Either party may terminate this Agreement immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within [NUMBER] days of receiving written notice thereof.
   3.4 Effect of Termination. Upon termination, Client shall pay Service Provider for all Services performed up to the date of termination.

4. INTELLECTUAL PROPERTY
   4.1 Client Materials. All materials provided by Client to Service Provider shall remain the property of Client.
   4.2 Deliverables. Upon full payment of all amounts due under this Agreement, Service Provider assigns to Client all right, title, and interest in and to the deliverables specified in Exhibit A.
   4.3 Service Provider Materials. Service Provider retains all right, title, and interest in and to any materials developed or used by Service Provider that are of general application and do not contain Client's Confidential Information.

5. CONFIDENTIALITY
   5.1 Definition. "Confidential Information" means any non-public information that relates to the actual or anticipated business, research, or development of either party and any proprietary information, trade secrets, and know-how disclosed by either party to the other.
   5.2 Obligations. Each party agrees to (a) hold the other party's Confidential Information in strict confidence, (b) use the Confidential Information solely in connection with this Agreement, and (c) not disclose such Confidential Information to any third party.

6. REPRESENTATIONS AND WARRANTIES
   6.1 Service Provider represents and warrants that (a) it has the right to enter into this Agreement, (b) the Services will be performed in a professional manner, and (c) the Services and deliverables will not infringe upon or violate any intellectual property rights of any third party.
   6.2 Client represents and warrants that it has the right to enter into this Agreement and to provide any materials furnished to Service Provider hereunder.

7. LIMITATION OF LIABILITY
   7.1 NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO THIS AGREEMENT.
   7.2 IN NO EVENT SHALL SERVICE PROVIDER'S TOTAL LIABILITY UNDER THIS AGREEMENT EXCEED THE TOTAL AMOUNT PAID BY CLIENT TO SERVICE PROVIDER DURING THE [NUMBER] MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY.

8. MISCELLANEOUS
   8.1 Independent Contractor. Service Provider is an independent contractor. Nothing in this Agreement shall be construed as creating an employer-employee relationship.
   8.2 Assignment. Neither party may assign this Agreement without the prior written consent of the other party.
   8.3 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of [STATE/COUNTRY], without regard to its conflict of laws principles.
   8.4 Dispute Resolution. Any dispute arising out of or relating to this Agreement shall be resolved through binding arbitration conducted in [CITY, STATE/COUNTRY].
   8.5 Entire Agreement. This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements or communications.
   8.6 Amendments. This Agreement may only be modified by a written amendment signed by both parties.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

SERVICE PROVIDER:
[SERVICE PROVIDER NAME]

By: ______________________________
Name: ___________________________
Title: ____________________________

CLIENT:
[CLIENT NAME]

By: ______________________________
Name: ___________________________
Title: ____________________________

EXHIBIT A: SERVICES

[DESCRIPTION OF SERVICES]

EXHIBIT B: FEES

[FEE SCHEDULE]`
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
    
    // Try to call the LLM API
    try {
      content = await callLLMAPI(prompt, isRewrite, isPartialRewrite);
    } catch (error: any) {
      diagnostic = {
        message: error.message || 'Unknown error',
        isTimeout: error.message?.includes('timed out') || false
      };
      console.error('Error generating document with LLM:', error);
      
      // Fallback to template if LLM fails (only for full documents)
      if (!isPartialRewrite) {
        const docType = documentType || 'nda';
        content = sampleTemplates[docType] || sampleTemplates.nda;
        
        // Insert title into the template
        if (title) {
          content = content.replace(/\[TITLE\]/g, title);
        }
        
        // Add warning about fallback template
        content = `[USING FALLBACK TEMPLATE - LLM GENERATION FAILED: ${diagnostic.message}]\n\n${content}`;
      } else {
        // For partial rewrites, return original text with error note
        content = `[AI REWRITE FAILED: ${diagnostic.message}] ${prompt.substring(0, 100)}...`;
      }
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