import { CreateCreatorEventDto } from './create-creator-event.dto';

/**
 * Same shape as create: a post is one field, so an edit replaces it whole.
 * Kept as its own class so the Swagger operation reads correctly and the two
 * can diverge later without touching call sites.
 */
export class UpdateCreatorEventDto extends CreateCreatorEventDto {}
