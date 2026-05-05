import { ClaudeClient, EmptyMessagesError } from "@invest-agent/ai-client";
import { config } from "@invest-agent/config";
import type { MarketAnalysis } from "@invest-agent/strategy-engine";

const client = new ClaudeClient(config.anthropicApiKey || undefined);

function buildPrompt(market: MarketAnalysis, language: string): string {
  const lang = language === "pt" ? "português" : language === "de" ? "alemão" : "inglês";

  return `Você é um analista técnico de mercados financeiros. Analise os dados abaixo e escreva um comentário em ${lang} com 2 a 3 frases, explicando o contexto atual do mercado e por que a decisão é ${market.action}. Seja direto, sem introduções, sem formatações.

Ativo: ${market.symbol}
Preço: $${market.price}
Decisão: ${market.action} (Confiança: ${(market.confidence * 100).toFixed(0)}%)
Tendência 4H: ${market.trend4H} | Força: ${(market.trendStrength * 100).toFixed(1)}%
RSI 5m: ${market.rsi5m.toFixed(1)} | RSI 1h: ${market.rsi1h.toFixed(1)}
EMA50: $${market.ema50?.toFixed(2) ?? "N/A"} | EMA200: $${market.ema200?.toFixed(2) ?? "N/A"}
Volume atual: ${market.volume.toFixed(2)} | Média: ${market.avgVolume.toFixed(2)}
Volume Spike: ${market.reason.metrics.hasVolumeSpike ? "Sim" : "Não"}
Razão técnica: ${market.reason.summary}`;
}

export async function generateMarketCommentary(
  market: MarketAnalysis,
  language = "pt"
): Promise<string> {
  try {
    return await client.chat(
      [{ role: "user", content: buildPrompt(market, language) }],
      {
        model: "claude-haiku-4-5-20251001",
        maxTokens: 300,
        system:
          "You are a concise financial market analyst. Respond only with the analysis text, no preamble.",
      }
    );
  } catch (error) {
    if (error instanceof EmptyMessagesError) {
      throw new Error("Unable to generate commentary: market data is incomplete.");
    }
    throw error;
  }
}
