export type CacheControl = { type: "ephemeral" };

export type TextBlock = {
  type: "text";
  text: string;
  cache_control?: CacheControl;
};

export type ImageSource =
  | { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string }
  | { type: "url"; url: string };

export type ImageBlock = {
  type: "image";
  source: ImageSource;
  cache_control?: CacheControl;
};

export type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
  cache_control?: CacheControl;
};

export type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content?: string | ContentBlock[];
  is_error?: boolean;
  cache_control?: CacheControl;
};

export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

export type MessageRole = "user" | "assistant";

export type Message = {
  role: MessageRole;
  content: string | ContentBlock[];
};

export type NormalizedMessage = {
  role: MessageRole;
  content: ContentBlock[];
};

export type ValidationResult =
  | { valid: true; messages: NormalizedMessage[] }
  | { valid: false; error: string };

export type ClaudeClientOptions = {
  model?: string;
  maxTokens?: number;
  system?: string;
};
