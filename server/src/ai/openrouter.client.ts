import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_TIMEOUT_MS = 20_000;

export class OpenRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export interface ChatCompletionParams {
  /** Model id, e.g. `google/gemini-2.5-flash-lite`. */
  model: string;
  system: string;
  user: string;
  temperature?: number;
  /** Upper bound on generated tokens (keeps short outputs short + cheap). */
  maxTokens?: number;
}

interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

/**
 * Thin client for the OpenRouter chat-completions API (OpenAI-compatible).
 *
 * Follows the outbound-HTTP pattern used elsewhere on the server (native
 * `fetch` + an abort timeout + start/finish logging + an `isConfigured()`
 * guard). When no API key is configured the caller should short-circuit;
 * {@link chatComplete} throws rather than calling the network.
 */
@Injectable()
export class OpenRouterClient {
  private readonly logger = new Logger(OpenRouterClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('OPENROUTER_API_KEY'));
  }

  private baseUrl(): string {
    return (
      this.config.get<string>('OPENROUTER_BASE_URL') ?? DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
  }

  private timeoutMs(): number {
    return Number(this.config.get('OPENROUTER_TIMEOUT_MS', DEFAULT_TIMEOUT_MS));
  }

  private rankingHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const appUrl = this.config.get<string>('OPENROUTER_APP_URL');
    const appName = this.config.get<string>('OPENROUTER_APP_NAME');
    if (appUrl) headers['HTTP-Referer'] = appUrl;
    if (appName) headers['X-Title'] = appName;
    return headers;
  }

  /**
   * Run a single system+user chat completion and return the assistant text.
   * Throws {@link OpenRouterError} on missing config, timeout, non-2xx, or an
   * empty completion.
   */
  async chatComplete(params: ChatCompletionParams): Promise<string> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new OpenRouterError('OpenRouter is not configured');
    }

    const url = `${this.baseUrl()}/chat/completions`;
    const timeoutMs = this.timeoutMs();
    const startedAt = Date.now();
    this.logger.log(
      `openrouter chat: request start model=${params.model} (timeout=${timeoutMs}ms)`,
    );

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...this.rankingHeaders(),
        },
        body: JSON.stringify({
          model: params.model,
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.user },
          ],
          temperature: params.temperature ?? 0.8,
          max_tokens: params.maxTokens ?? 400,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      const reason =
        (err as Error)?.name === 'TimeoutError'
          ? `timed out after ${timeoutMs}ms`
          : (err as Error)?.message;
      this.logger.warn(`openrouter chat: request failed in ${elapsed}ms — ${reason}`);
      throw new OpenRouterError(`OpenRouter request failed: ${reason}`);
    }

    const elapsed = Date.now() - startedAt;
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(
        `openrouter chat: response ${res.status} in ${elapsed}ms — ${body.slice(0, 300)}`,
      );
      throw new OpenRouterError(`OpenRouter responded ${res.status}`);
    }

    const json = (await res.json().catch(() => null)) as
      | OpenRouterChatResponse
      | null;
    const content = json?.choices?.[0]?.message?.content?.trim();
    this.logger.log(
      `openrouter chat: response 200 in ${elapsed}ms (${content?.length ?? 0} chars)`,
    );
    if (!content) {
      throw new OpenRouterError('OpenRouter returned an empty completion');
    }
    return content;
  }
}
