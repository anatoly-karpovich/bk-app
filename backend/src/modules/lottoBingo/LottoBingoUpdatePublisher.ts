export interface LottoBingoUpdatedEvent {
  type: "lotto_bingo_updated";
  gameId: string;
  revision: number;
}

export class LottoBingoUpdatePublisher {
  private readonly listenersByGameId = new Map<string, Set<(event: LottoBingoUpdatedEvent) => void>>();

  subscribe(gameId: string, listener: (event: LottoBingoUpdatedEvent) => void): () => void {
    const listeners = this.listenersByGameId.get(gameId) ?? new Set();
    listeners.add(listener);
    this.listenersByGameId.set(gameId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listenersByGameId.delete(gameId);
    };
  }

  publish(gameId: string, revision: number): void {
    this.listenersByGameId.get(gameId)?.forEach((listener) => listener({ type: "lotto_bingo_updated", gameId, revision }));
  }
}
