import { SignalHistoryItem } from "@invest-agent/shared-types";

const signalHistory: SignalHistoryItem[] = [];

export function addSignalToHistory(item: SignalHistoryItem) {
  signalHistory.unshift(item);

  if (signalHistory.length > 100) {
    signalHistory.pop();
  }
}

export function getSignalHistory() {
  return signalHistory;
}