import { describe, expect, it } from "vitest";
import {
  isNonEmptyText,
  normalizeContentBlocks,
  normalizeMessage,
  normalizeTextBlock,
  validateAndNormalizeMessages,
} from "../message-validator";
import type { ContentBlock, Message, TextBlock } from "../types";

// ---------------------------------------------------------------------------
// isNonEmptyText
// ---------------------------------------------------------------------------

describe("isNonEmptyText", () => {
  it("returns true for a normal string", () => {
    expect(isNonEmptyText("hello")).toBe(true);
  });

  it("returns true for a string with leading/trailing spaces", () => {
    expect(isNonEmptyText("  hello  ")).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(isNonEmptyText("")).toBe(false);
  });

  it("returns false for a whitespace-only string", () => {
    expect(isNonEmptyText("   ")).toBe(false);
    expect(isNonEmptyText("\t\n")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isNonEmptyText(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isNonEmptyText(undefined)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isNonEmptyText(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeTextBlock
// ---------------------------------------------------------------------------

describe("normalizeTextBlock", () => {
  it("returns the block unchanged when text is valid", () => {
    const block: TextBlock = { type: "text", text: "Buy signal confirmed." };
    expect(normalizeTextBlock(block)).toEqual(block);
  });

  it("returns null for an empty-string text block", () => {
    const block: TextBlock = { type: "text", text: "" };
    expect(normalizeTextBlock(block)).toBeNull();
  });

  it("returns null for a whitespace-only text block", () => {
    const block: TextBlock = { type: "text", text: "   \t\n" };
    expect(normalizeTextBlock(block)).toBeNull();
  });

  it("drops the block (and its cache_control) when text is empty", () => {
    const block: TextBlock = {
      type: "text",
      text: "",
      cache_control: { type: "ephemeral" },
    };
    expect(normalizeTextBlock(block)).toBeNull();
  });

  it("keeps cache_control on a valid block", () => {
    const block: TextBlock = {
      type: "text",
      text: "Market analysis ready.",
      cache_control: { type: "ephemeral" },
    };
    expect(normalizeTextBlock(block)).toEqual(block);
  });
});

// ---------------------------------------------------------------------------
// normalizeContentBlocks
// ---------------------------------------------------------------------------

describe("normalizeContentBlocks", () => {
  it("keeps valid text blocks", () => {
    const blocks: ContentBlock[] = [{ type: "text", text: "Valid content." }];
    expect(normalizeContentBlocks(blocks)).toEqual(blocks);
  });

  it("removes empty text blocks", () => {
    const blocks: ContentBlock[] = [{ type: "text", text: "" }];
    expect(normalizeContentBlocks(blocks)).toEqual([]);
  });

  it("removes whitespace-only text blocks", () => {
    const blocks: ContentBlock[] = [{ type: "text", text: "   " }];
    expect(normalizeContentBlocks(blocks)).toEqual([]);
  });

  it("keeps non-text blocks regardless of content", () => {
    const imageBlock: ContentBlock = {
      type: "image",
      source: { type: "url", url: "https://example.com/chart.png" },
    };
    expect(normalizeContentBlocks([imageBlock])).toEqual([imageBlock]);
  });

  it("handles mixed valid and empty text blocks", () => {
    const blocks: ContentBlock[] = [
      { type: "text", text: "" },
      { type: "text", text: "RSI indicates oversold." },
      { type: "text", text: "   " },
      { type: "text", text: "EMA50 above EMA200." },
    ];
    expect(normalizeContentBlocks(blocks)).toEqual([
      { type: "text", text: "RSI indicates oversold." },
      { type: "text", text: "EMA50 above EMA200." },
    ]);
  });

  it("drops cache_control together with the empty block", () => {
    const blocks: ContentBlock[] = [
      { type: "text", text: "", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Valid." },
    ];
    expect(normalizeContentBlocks(blocks)).toEqual([
      { type: "text", text: "Valid." },
    ]);
  });
});

// ---------------------------------------------------------------------------
// normalizeMessage
// ---------------------------------------------------------------------------

describe("normalizeMessage", () => {
  it("converts a valid plain-string message to a text block array", () => {
    const msg: Message = { role: "user", content: "Analyze the market." };
    expect(normalizeMessage(msg)).toEqual({
      role: "user",
      content: [{ type: "text", text: "Analyze the market." }],
    });
  });

  it("trims surrounding whitespace from a plain-string message", () => {
    const msg: Message = { role: "user", content: "  hello  " };
    const result = normalizeMessage(msg);
    expect(result?.content[0]).toEqual({ type: "text", text: "hello" });
  });

  it("returns null for an empty-string message", () => {
    const msg: Message = { role: "user", content: "" };
    expect(normalizeMessage(msg)).toBeNull();
  });

  it("returns null for a whitespace-only string message", () => {
    const msg: Message = { role: "user", content: "   " };
    expect(normalizeMessage(msg)).toBeNull();
  });

  it("returns null when all content blocks are empty", () => {
    const msg: Message = {
      role: "user",
      content: [{ type: "text", text: "" }, { type: "text", text: "   " }],
    };
    expect(normalizeMessage(msg)).toBeNull();
  });

  it("returns only the valid blocks from a mixed array", () => {
    const msg: Message = {
      role: "user",
      content: [
        { type: "text", text: "" },
        { type: "text", text: "Strong uptrend confirmed." },
      ],
    };
    expect(normalizeMessage(msg)).toEqual({
      role: "user",
      content: [{ type: "text", text: "Strong uptrend confirmed." }],
    });
  });
});

// ---------------------------------------------------------------------------
// validateAndNormalizeMessages
// ---------------------------------------------------------------------------

describe("validateAndNormalizeMessages", () => {
  it("returns valid: true for a well-formed messages array", () => {
    const messages: Message[] = [
      { role: "user", content: "What is the market trend?" },
    ];
    const result = validateAndNormalizeMessages(messages);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.messages).toHaveLength(1);
    }
  });

  it("returns valid: false for an empty array", () => {
    const result = validateAndNormalizeMessages([]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/empty/i);
    }
  });

  it("returns valid: false when all messages have empty text", () => {
    const messages: Message[] = [
      { role: "user", content: "" },
      { role: "user", content: "   " },
    ];
    const result = validateAndNormalizeMessages(messages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeTruthy();
    }
  });

  it("filters out empty messages and keeps valid ones", () => {
    const messages: Message[] = [
      { role: "user", content: "" },
      { role: "user", content: "RSI dropped below 30." },
      { role: "assistant", content: "   " },
    ];
    const result = validateAndNormalizeMessages(messages);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content[0]).toMatchObject({ text: "RSI dropped below 30." });
    }
  });

  it("preserves multiple valid messages in order", () => {
    const messages: Message[] = [
      { role: "user", content: "Analyze BTC." },
      { role: "assistant", content: "BTC is in an uptrend." },
      { role: "user", content: "Should I buy?" },
    ];
    const result = validateAndNormalizeMessages(messages);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.messages).toHaveLength(3);
    }
  });

  it("removes empty text blocks inside a content array and keeps the message", () => {
    const messages: Message[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "" },
          { type: "text", text: "Valid analysis block." },
        ],
      },
    ];
    const result = validateAndNormalizeMessages(messages);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.messages[0].content).toHaveLength(1);
      expect(result.messages[0].content[0]).toMatchObject({ text: "Valid analysis block." });
    }
  });

  it("does not call the API (no network) — validation happens synchronously", () => {
    // This test documents that validateAndNormalizeMessages is purely synchronous
    // and throws no network errors on its own.
    const messages: Message[] = [{ role: "user", content: "test" }];
    expect(() => validateAndNormalizeMessages(messages)).not.toThrow();
  });
});
