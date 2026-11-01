import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AiSettings } from '../types';
import { AiError, generateJson, generateText, testConnection } from './client';

const geminiSettings: AiSettings = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  rememberKey: false,
};

const openAiSettings: AiSettings = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  rememberKey: false,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function geminiText(text: string): Response {
  return jsonResponse({ candidates: [{ content: { parts: [{ text }] } }] });
}

function openAiText(text: string): Response {
  return jsonResponse({ choices: [{ message: { content: text } }] });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('generateText', () => {
  it('sends a Gemini request without leaking the key into the body', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(geminiText('Hello there'));
    vi.stubGlobal('fetch', fetchMock);

    const text = await generateText({
      settings: { ...geminiSettings, model: 'models/gemini-2.5-flash' },
      apiKey: 'gemini-secret',
      system: 'System rules',
      user: 'User request',
    });

    expect(text).toBe('Hello there');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/v1beta/models/gemini-2.5-flash:generateContent');
    expect(url).not.toContain('gemini-secret');
    expect(init?.credentials).toBe('omit');
    expect(init?.cache).toBe('no-store');
    const headers = init?.headers as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe('gemini-secret');
    const body = JSON.parse(String(init?.body)) as {
      systemInstruction: { parts: Array<{ text: string }> };
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: { responseMimeType?: string };
    };
    expect(body.systemInstruction.parts[0].text).toBe('System rules');
    expect(body.contents[0].parts[0].text).toBe('User request');
    expect(body.generationConfig.responseMimeType).toBeUndefined();
  });

  it('sends an OpenAI request with the model and JSON mode when requested', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(openAiText('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);

    const text = await generateText({
      settings: openAiSettings,
      apiKey: 'openai-secret',
      system: 'System rules',
      user: 'User request',
      json: true,
    });

    expect(text).toBe('{"ok":true}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer openai-secret');
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      response_format: { type: string };
    };
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages[1]).toEqual({ role: 'user', content: 'User request' });
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('requires a provider, key, and model', async () => {
    await expect(
      generateText({
        settings: { ...geminiSettings, provider: 'local', model: '' },
        apiKey: 'key',
        system: 's',
        user: 'u',
      }),
    ).rejects.toMatchObject({ code: 'not_configured' });

    await expect(
      generateText({
        settings: geminiSettings,
        apiKey: '   ',
        system: 's',
        user: 'u',
      }),
    ).rejects.toMatchObject({ code: 'not_configured' });

    await expect(
      generateText({
        settings: { ...geminiSettings, model: '   ' },
        apiKey: 'key',
        system: 's',
        user: 'u',
      }),
    ).rejects.toMatchObject({ code: 'model' });
  });

  it.each([
    [400, 'invalid_key', false],
    [401, 'invalid_key', false],
    [403, 'invalid_key', false],
    [404, 'model', false],
    [429, 'rate_limit', true],
    [500, 'server', true],
    [418, 'server', false],
  ] as const)('maps HTTP %i to a friendly %s error', async (status, code, retryable) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, status)));
    const secretKey = 'secret-api-key-999';
    const error = await generateText({
      settings: geminiSettings,
      apiKey: secretKey,
      system: 's',
      user: 'u',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AiError);
    expect(error).toMatchObject({ code, retryable });
    expect((error as Error).message).not.toContain(secretKey);
  });

  it('handles blocks, empty responses, and unreadable response bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ promptFeedback: { blockReason: 'SAFETY' } }),
      ),
    );
    await expect(
      generateText({ settings: geminiSettings, apiKey: 'k', system: 's', user: 'u' }),
    ).rejects.toMatchObject({ code: 'blocked' });

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }] }),
      ),
    );
    await expect(
      generateText({ settings: geminiSettings, apiKey: 'k', system: 's', user: 'u' }),
    ).rejects.toMatchObject({ code: 'blocked' });

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response('not json', { status: 200 })),
    );
    await expect(
      generateText({ settings: openAiSettings, apiKey: 'k', system: 's', user: 'u' }),
    ).rejects.toMatchObject({ code: 'invalid_response' });

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(openAiText('   ')),
    );
    await expect(
      generateText({ settings: openAiSettings, apiKey: 'k', system: 's', user: 'u' }),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('reports network failures, timeouts, and caller cancellations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    await expect(
      generateText({ settings: geminiSettings, apiKey: 'k', system: 's', user: 'u' }),
    ).rejects.toMatchObject({ code: 'network', retryable: true });

    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        });
      }),
    );
    const timedOut = generateText({
      settings: geminiSettings,
      apiKey: 'k',
      system: 's',
      user: 'u',
      timeoutMs: 50,
    }).catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(60);
    expect(await timedOut).toMatchObject({ code: 'timeout', retryable: true });
    vi.useRealTimers();

    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        });
      }),
    );
    const aborted = generateText({
      settings: geminiSettings,
      apiKey: 'k',
      system: 's',
      user: 'u',
      signal: controller.signal,
      timeoutMs: 10_000,
    }).catch((caught: unknown) => caught);
    controller.abort();
    expect(await aborted).toMatchObject({ code: 'aborted' });
  });
});

describe('generateJson', () => {
  it('parses a JSON response and validates it with Zod', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        geminiText('```json\n{"ok":true,"count":2}\n```'),
      ),
    );
    const result = await generateJson(
      {
        settings: geminiSettings,
        apiKey: 'k',
        system: 's',
        user: 'u',
      },
      z.object({ ok: z.boolean(), count: z.number().int() }),
    );
    expect(result).toEqual({ ok: true, count: 2 });
  });

  it('rejects unreadable or schema-invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(geminiText('not json')));
    await expect(
      generateJson(
        { settings: geminiSettings, apiKey: 'k', system: 's', user: 'u' },
        z.object({ ok: z.boolean() }),
      ),
    ).rejects.toMatchObject({ code: 'invalid_response' });

    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(geminiText('{"ok":"yes"}')));
    await expect(
      generateJson(
        { settings: geminiSettings, apiKey: 'k', system: 's', user: 'u' },
        z.object({ ok: z.boolean() }),
      ),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });
});

describe('testConnection', () => {
  it('accepts the expected provider response', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(geminiText('ready')));
    await expect(testConnection(geminiSettings, 'key')).resolves.toBeUndefined();
  });

  it('rejects a response that is not the expected handshake', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(geminiText('nope')));
    await expect(testConnection(geminiSettings, 'key')).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });
});
