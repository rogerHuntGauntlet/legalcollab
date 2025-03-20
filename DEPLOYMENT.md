# Deployment Guide: Resolving Timeout Issues

This document provides guidance for resolving 504 Gateway Timeout errors when deploying the Legal Collaboration application to Vercel.

## Common Timeout Issues

The main cause of 504 Gateway Timeout errors is that the OpenAI API calls in the `/api/generate-document` endpoint take too long to complete, exceeding Vercel's default function timeout limits.

## Solutions Implemented

1. **Increased Vercel Function Resources**:
   - Memory: 3008MB (maximum allowed)
   - Duration: 90 seconds (increased from default)

2. **Faster Model Selection**:
   - Using `gpt-3.5-turbo` instead of `gpt-4-turbo` for faster responses
   - Reduced token generation limits

3. **Shortened Prompts**:
   - More concise system prompts
   - Truncated user input to avoid processing excessive text

4. **Client-side Timeout Handling**:
   - AbortController with shorter timeouts (20-30 seconds)
   - Graceful fallbacks to template-based content

5. **Optimized Middleware**:
   - Custom timeout headers
   - Improved caching for static assets

## Deployment Steps

1. **Build the application locally first**:
   ```
   npm run build
   ```

2. **Deploy to Vercel with optimized settings**:
   ```
   ./deploy.sh
   ```
   
   Or manually:
   ```
   npx vercel env add OPENAI_MODEL production gpt-3.5-turbo
   npx vercel env add NEXT_PUBLIC_VERCEL_MAX_FUNCTION_TIMEOUT production 90000
   npx vercel deploy --prod
   ```

## Additional Troubleshooting

If you continue to experience timeout issues:

1. **Further reduce the complexity of requests**:
   - Edit `app/api/generate-document/route.ts` to reduce `max_tokens` further
   - Consider using even shorter prompts

2. **Implement a queue system** (more advanced):
   - Process document generation as background jobs
   - Notify users when processing is complete

3. **Use serverless database for fallback storage**:
   - Store partially generated content in a database
   - Allow resuming generation from where it left off

4. **Monitor function execution times**:
   - Use Vercel's analytics to identify slow functions
   - Optimize the slowest parts of the application

## Environment Variables

Ensure these environment variables are set in your Vercel project:

- `OPENAI_MODEL`: Set to `gpt-3.5-turbo` (faster) instead of `gpt-4-turbo`
- `NEXT_PUBLIC_VERCEL_MAX_FUNCTION_TIMEOUT`: Set to `90000` (90 seconds)

## Contact Support

If you continue to experience issues after implementing these solutions, contact Vercel support to inquire about:

1. Enterprise plan with higher function timeouts
2. Custom domain with increased timeout settings
3. Alternative deployment strategies for long-running processes 