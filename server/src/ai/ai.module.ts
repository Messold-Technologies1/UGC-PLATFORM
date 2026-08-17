import { Module } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';

/**
 * Shared AI provider access (OpenRouter). Exports a thin chat-completions
 * client that feature modules inject for AI-backed features (e.g. creator bio
 * generation). ConfigModule is global, so no imports are needed here.
 */
@Module({
  providers: [OpenRouterClient],
  exports: [OpenRouterClient],
})
export class AiModule {}
