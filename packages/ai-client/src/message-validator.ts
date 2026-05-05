import type {
  ContentBlock,
  Message,
  NormalizedMessage,
  TextBlock,
  ValidationResult,
} from "./types";

/** Returns true only for non-empty, non-whitespace strings. */
export function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Normalizes a single text block.
 * Returns null when the block's text is empty or whitespace-only —
 * which also prevents cache_control from being attached to the block.
 */
export function normalizeTextBlock(block: TextBlock): TextBlock | null {
  if (!isNonEmptyText(block.text)) {
    return null;
  }
  return block;
}

/**
 * Normalizes a content block array, removing any text block whose text is
 * empty, null, undefined, or whitespace-only. Non-text blocks are kept as-is.
 */
export function normalizeContentBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.reduce<ContentBlock[]>((acc, block) => {
    if (block.type === "text") {
      const normalized = normalizeTextBlock(block);
      if (normalized !== null) {
        acc.push(normalized);
      }
      // Empty text block (and its cache_control) is simply dropped.
    } else {
      acc.push(block);
    }
    return acc;
  }, []);
}

/**
 * Normalizes a single message.
 * - If content is a plain string: treats it as a text block.
 * - If content is an array: filters out empty text blocks.
 * Returns null when the message ends up with no content.
 */
export function normalizeMessage(message: Message): NormalizedMessage | null {
  const { role, content } = message;

  if (typeof content === "string") {
    if (!isNonEmptyText(content)) {
      return null;
    }
    return { role, content: [{ type: "text", text: content.trim() }] };
  }

  const normalizedBlocks = normalizeContentBlocks(content);
  if (normalizedBlocks.length === 0) {
    return null;
  }

  return { role, content: normalizedBlocks };
}

/**
 * Validates and normalizes a messages array before it is sent to the Claude API.
 *
 * Rules enforced:
 *  1. Text blocks with empty / whitespace-only / null / undefined text are removed.
 *  2. cache_control is never attached to an empty text block (they are dropped entirely).
 *  3. Messages that become empty after filtering are removed.
 *  4. If the resulting array is empty, validation fails with a clear error string.
 */
export function validateAndNormalizeMessages(messages: Message[]): ValidationResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      valid: false,
      error: "Messages array is empty. Provide at least one non-empty message.",
    };
  }

  const normalized = messages.reduce<NormalizedMessage[]>((acc, message) => {
    const result = normalizeMessage(message);
    if (result !== null) {
      acc.push(result);
    }
    return acc;
  }, []);

  if (normalized.length === 0) {
    return {
      valid: false,
      error:
        "All messages contained empty text blocks. " +
        "Provide at least one message with non-empty text content.",
    };
  }

  return { valid: true, messages: normalized };
}
