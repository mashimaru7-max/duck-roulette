export type BetType = "NUMBER" | "COLOR" | "PARITY" | "RANGE" | "JACKPOT";
export type BetTarget =
  | number
  | "RED"
  | "BLACK"
  | "ODD"
  | "EVEN"
  | "LOW"
  | "HIGH"
  | "STAR";
export interface Bet {
  type: BetType;
  target: BetTarget;
  amount: number;
}
export interface RouletteResult {
  number: number;
  color: "RED" | "BLACK" | "JACKPOT";
}
export interface BetSettlement {
  bet: Bet;
  hit: boolean;
  multiplier: number;
  payout: number;
  profit: number;
}
export interface GameHistoryItem {
  id: string;
  playedAt: string;
  result: RouletteResult;
  bets: Bet[];
  totalBet: number;
  payout: number;
  profit: number;
  outcome: "WIN" | "DRAW" | "LOSS";
  betResults?: BetSettlement[];
}
export interface RouletteStats {
  plays: number;
  wins: number;
  losses: number;
  draws: number;
  wagered: number;
  payout: number;
  profit: number;
}
export interface PlayerRoulette {
  balance: number;
  today: RouletteStats;
  todayKey: string;
  streak: { current: number; best: number };
  lifetime: { plays: number; wins: number; biggestWin: number };
  bailout: { lastUsedDate: string | null };
  history: GameHistoryItem[];
}
export interface PlayerState {
  player: PlayerRoulette;
  pendingRound: GameHistoryItem | null;
}
export interface SpinRequest {
  requestId: string;
  bets: Bet[];
}
export interface SpinResponse extends GameHistoryItem {
  balance: number;
  streakBonus: number;
  betResults: BetSettlement[];
}
