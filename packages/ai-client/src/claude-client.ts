import Anthropic from "@anthropic-ai/sdk";
import { validateAndNormalizeMessages } from "./message-validator";
import type { ClaudeClientOptions, Message, NormalizedMessage } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 1024;

export class EmptyMessagesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmptyMessagesError";
  }
}

export class ClaudeClient {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });
  }

  /**
   * Sends a message to the Claude API after validating and normalizing the
   * messages array. Throws EmptyMessagesError instead of letting the API
   * return a 400 "text content blocks must be non-empty" error.
   */
  async chat(
    messages: Message[],
    options: ClaudeClientOptions = {}
  ): Promise<string> {
    const validation = validateAndNormalizeMessages(messages);

    if (!validation.valid) {
      throw new EmptyMessagesError(validation.error);
    }

    const response = await this.client.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: options.system,
      messages: this.toApiMessages(validation.messages),
    });

    const firstContent = response.content[0];
    if (firstContent?.type !== "text") {
      throw new Error("Unexpected response format from Claude API.");
    }

    return firstContent.text;
  }

  private toApiMessages(
    messages: NormalizedMessage[]
  ): Anthropic.MessageParam[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content as Anthropic.ContentBlock[],
    }));
  }
}
