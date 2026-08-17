import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OpenRouterClient,
  OpenRouterError,
} from '../ai/openrouter.client';
import { computeAgeYears } from './creator-age.util';
import type { GenerateCreatorBioDto } from './dto/generate-creator-bio.dto';

const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';
/** Hard ceiling below the DB/UI max of 500, so a stray long output still fits. */
const BIO_HARD_MAX = 480;

const SYSTEM_PROMPT = `You're ghostwriting a short first-person bio for a creator on a UGC (user-generated content) marketplace, in their own voice — like they wrote it themselves in two minutes, not like marketing copy.

Your goal: make a brand read it and want to book this creator.

Write like an actual person talking about what they do: natural rhythm, contractions where they'd fit, a little personality. Vary your sentence lengths instead of defaulting to the same clause structure every time. Nothing stiff, nothing that sounds AI-generated or templated.

Rules:
- Write in FIRST PERSON ("I ...").
- Never include the creator's name — it is shown separately.
- 2 to 3 sentences, roughly 300-450 characters. Never exceed 460 characters.
- Lead with their niche and the value a brand gets from working with them.
- Be specific and concrete — real details read as human, vague enthusiasm doesn't.
- BANNED clichés — never use: "passionate content creator", "storyteller at heart", "I love creating content", "content is my passion", "bringing stories to life".
- No links, phone numbers, emails, social handles, hashtags, emojis, or pricing.
- Use ONLY the details provided. Do not invent facts. Omit anything not given.
- Output ONLY the bio text — no preamble, no quotes, no labels.`;

/**
 * Generates a short, brand-facing creator bio from wizard signals via
 * OpenRouter (Gemini 2.5 Flash Lite by default). Owns the prompt design and the
 * post-processing that enforces the platform's bio rules (length, no
 * links/handles/contact info) as a safety net over the model's own compliance.
 */
@Injectable()
export class CreatorBioGeneratorService {
  private readonly logger = new Logger(CreatorBioGeneratorService.name);

  constructor(
    private readonly openRouter: OpenRouterClient,
    private readonly config: ConfigService,
  ) {}

  async generateBio(input: GenerateCreatorBioDto): Promise<string> {
    if (!this.openRouter.isConfigured()) {
      throw new ServiceUnavailableException(
        'AI bio generation is not available right now.',
      );
    }

    const niches = this.cleanList(input.niches);
    if (niches.length === 0) {
      // Niche is the core signal; without it the bio would be generic filler.
      throw new BadRequestException(
        'Add your niche (content category) before generating a bio.',
      );
    }

    const userPrompt = this.buildUserPrompt(input, niches);
    const model = this.config.get<string>('OPENROUTER_BIO_MODEL', DEFAULT_MODEL);

    let raw: string;
    try {
      raw = await this.openRouter.chatComplete({
        model,
        system: SYSTEM_PROMPT,
        user: userPrompt,
        temperature: 0.85,
        maxTokens: 300,
      });
    } catch (err) {
      if (err instanceof OpenRouterError) {
        this.logger.warn(`bio generation failed: ${err.message}`);
        throw new ServiceUnavailableException(
          'Could not generate a bio right now. Please try again.',
        );
      }
      throw err;
    }

    return this.sanitize(raw);
  }

  private buildUserPrompt(
    input: GenerateCreatorBioDto,
    niches: string[],
  ): string {
    const lines: string[] = [];
    lines.push(`Niche: ${niches.join(', ')}`);

    const creatorTypes = this.cleanList(input.creatorTypes);
    if (creatorTypes.length) lines.push(`Creator type: ${creatorTypes.join(', ')}`);

    const occupations = this.cleanList(input.occupations);
    if (occupations.length) lines.push(`Occupation: ${occupations.join(', ')}`);

    const languages = this.cleanList(input.languages);
    if (languages.length) lines.push(`Speaks: ${languages.join(', ')}`);

    const location = [input.city?.trim(), input.country?.trim()]
      .filter(Boolean)
      .join(', ');
    if (location) lines.push(`Based in: ${location}`);

    if (input.gender?.trim()) lines.push(`Gender: ${input.gender.trim()}`);

    const age = this.ageFrom(input.dateOfBirth);
    if (age !== null) lines.push(`Age: ${age}`);

    lines.push('');
    lines.push(
      'Write the bio now. Weave age and gender in only if it reads naturally; otherwise omit them.',
    );
    return lines.join('\n');
  }

  private ageFrom(dateOfBirth?: string): number | null {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    const age = computeAgeYears(dob);
    return age >= 13 && age <= 100 ? age : null;
  }

  private cleanList(values?: string[]): string[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of values) {
      const t = typeof v === 'string' ? v.trim() : '';
      if (t && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase());
        out.push(t);
      }
    }
    return out;
  }

  /**
   * Enforce the platform's bio rules over whatever the model returned: strip
   * surrounding quotes, remove links / emails / phone numbers / @handles /
   * #hashtags / emojis, collapse whitespace, and clamp the length at a sentence
   * boundary under the hard max.
   */
  private sanitize(text: string): string {
    let out = text.trim();

    // Drop a leading/trailing wrapping quote the model sometimes adds.
    out = out.replace(/^["'“”]+/, '').replace(/["'“”]+$/, '');

    out = out
      .replace(/https?:\/\/\S+/gi, '') // URLs
      .replace(/\bwww\.\S+/gi, '')
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, '') // emails
      .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '') // phone numbers
      .replace(/(^|\s)[@#][\w.]+/g, '$1') // @handles / #hashtags
      .replace(
        /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu,
        '',
      ) // emojis / symbols
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([,.!?])/g, '$1')
      .replace(/\n{2,}/g, '\n')
      .trim();

    if (out.length > BIO_HARD_MAX) {
      out = this.trimToSentence(out, BIO_HARD_MAX);
    }
    return out;
  }

  private trimToSentence(text: string, max: number): string {
    const slice = text.slice(0, max);
    const lastStop = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
    );
    if (lastStop > max * 0.5) {
      return slice.slice(0, lastStop + 1).trim();
    }
    const lastSpace = slice.lastIndexOf(' ');
    return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim();
  }
}
