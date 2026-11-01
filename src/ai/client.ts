import type { z } from 'zod';
import type { AiSettings } from '../types';
import { extractJsonObject } from './schema';

export type AiErrorCode =
  | 'not_configured'
  | 'invalid_key'
  | 'rate_limit'
  | 'model'
  | 'blocked'
  | 'invalid_response'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'server';

export class AiError extends Error {
  code: AiErrorCode;
  retryable: boolean;

  constructor(code: AiErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface AiRequest {
  settings: AiSettings;
  apiKey: string;
  system: string;
  user: string;
  json?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface ProviderRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

function buildRequest(request: AiRequest): ProviderRequest {
  const model = request.settings.model.trim().replace(/^models\//, '');
  if (!model) {
    throw new AiError('model', 'Add a model name in AI settings.');
  }

  if (request.settings.provider === 'gemini') {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': request.apiKey,
      },
      body: {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: 'user', parts: [{ text: request.user }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: request.json ? 2200 : 1100,
          ...(request.json ? { responseMimeType: 'application/json' } : {}),
        },
      },
    };
  }

  if (request.settings.provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: {
        model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        temperature: 0.7,
        max_tokens: request.json ? 1800 : 900,
        ...(request.json ? { response_format: { type: 'json_object' } } : {}),
      },
    };
  }

  throw new AiError('not_configured', 'The local plan engine does not make network requests.');
}

function statusError(status: number): AiError {
  if (status === 400) {
    return new AiError(
      'invalid_key',
      'The provider rejected the request. Check that your API key and model name are correct.',
    );
  }
  if (status === 401 || status === 403) {
    return new AiError(
      'invalid_key',
      'That API key was not accepted. Check it has access to the selected model.',
    );
  }
  if (status === 404) {
    return new AiError('model', 'That model is not available for this key. Try the default model.');
  }
  if (status === 429) {
    return new AiError(
      'rate_limit',
      'The provider is rate-limiting requests. Wait a minute and try again.',
      true,
    );
  }
  if (status >= 500) {
    return new AiError('server', 'The AI provider had a temporary problem. Try again shortly.', true);
  }
  return new AiError('server', 'The AI request could not be completed.');
}

function readGeminiText(data: unknown): string {
  const payload = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  if (payload.promptFeedback?.blockReason) {
    throw new AiError(
      'blocked',
      'The provider blocked that request. Try rephrasing without sensitive personal details.',
    );
  }
  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'BLOCKLIST') {
    throw new AiError('blocked', 'The provider blocked that response. Try a different question.');
  }
  const text =
    candidate?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? '';
  if (!text) throw new AiError('invalid_response', 'The AI returned an empty response.');
  return text;
}

function readOpenAiText(data: unknown): string {
  const payload = data as {
    choices?: Array<{
      message?: { content?: string };
      finish_reason?: string;
    }>;
  };
  const choice = payload.choices?.[0];
  if (choice?.finish_reason === 'content_filter') {
    throw new AiError('blocked', 'The provider blocked that response. Try a different question.');
  }
  const text = choice?.message?.content?.trim() ?? '';
  if (!text) throw new AiError('invalid_response', 'The AI returned an empty response.');
  return text;
}

/** Calls the selected provider with a timeout and friendly, non-leaky errors. */
export async function generateText(request: AiRequest): Promise<string> {
  if (request.settings.provider === 'local') {
    throw new AiError('not_configured', 'Connect an AI provider to use this feature.');
  }
  const key = request.apiKey.trim();
  if (!key) {
    throw new AiError('not_configured', 'Add an API key in AI settings first.');
  }

  const providerRequest = buildRequest(request);
  const controller = new AbortController();
  const timeoutMs = request.timeoutMs ?? 45_000;
  let timedOut = false;
  const onAbort = () => controller.abort();
  request.signal?.addEventListener('abort', onAbort);
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetch(providerRequest.url, {
      method: 'POST',
      headers: providerRequest.headers,
      body: JSON.stringify(providerRequest.body),
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch {
    if (request.signal?.aborted) {
      throw new AiError('aborted', 'The request was cancelled.');
    }
    if (timedOut) {
      throw new AiError('timeout', 'The AI provider took too long to respond. Try again.', true);
    }
    throw new AiError(
      'network',
      'Could not reach the AI provider. Check your connection, key, and browser restrictions.',
      true,
    );
  } finally {
    clearTimeout(timeout);
    request.signal?.removeEventListener('abort', onAbort);
  }

  if (!response.ok) throw statusError(response.status);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AiError('invalid_response', 'The AI provider returned an unreadable response.');
  }

  return request.settings.provider === 'gemini' ? readGeminiText(data) : readOpenAiText(data);
}

export async function generateJson<T>(
  request: AiRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  const text = await generateText({ ...request, json: true });
  let parsed: unknown;
  try {
    parsed = extractJsonObject(text);
  } catch {
    throw new AiError(
      'invalid_response',
      'The AI returned a response we could not read. Try generating again.',
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AiError(
      'invalid_response',
      'The AI returned a plan in an unexpected shape. Try generating again.',
    );
  }
  return result.data;
}

export async function testConnection(
  settings: AiSettings,
  apiKey: string,
): Promise<void> {
  const text = await generateText({
    settings,
    apiKey,
    system: 'You are a connection test. Reply with exactly one word: ready.',
    user: 'Reply with exactly: ready',
    timeoutMs: 20_000,
  });
  if (!text.toLowerCase().includes('ready')) {
    throw new AiError('invalid_response', 'The provider responded, but not as expected.');
  }
}
