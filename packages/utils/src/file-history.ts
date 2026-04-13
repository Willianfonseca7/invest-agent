import fs from "node:fs/promises";
import path from "node:path";
import { SignalHistoryItem } from "@invest-agent/shared-types";

const HISTORY_FILE_PATH = path.resolve(__dirname, "../../../data/history.json");

export async function readHistoryFile(): Promise<SignalHistoryItem[]> {
  try {
    console.log("[readHistoryFile] lendo:", HISTORY_FILE_PATH);
    const content = await fs.readFile(HISTORY_FILE_PATH, "utf-8");
    return JSON.parse(content) as SignalHistoryItem[];
  } catch (error) {
    console.log("[readHistoryFile] erro, retornando []");
    return [];
  }
}

export async function writeHistoryFile(items: SignalHistoryItem[]): Promise<void> {
  console.log("[writeHistoryFile] escrevendo:", HISTORY_FILE_PATH);
  await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export async function appendHistoryItem(item: SignalHistoryItem): Promise<void> {
  console.log("[appendHistoryItem] adicionando item:", item.symbol);

  const history = await readHistoryFile();

  history.unshift(item);

  if (history.length > 100) {
    history.pop();
  }

  await writeHistoryFile(history);
}