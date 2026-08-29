export type BetType = "NUMBER" | "COLOR" | "PARITY" | "RANGE";
export type BetTarget = number | "RED" | "BLACK" | "ODD" | "EVEN" | "LOW" | "HIGH";
export interface Bet { type: BetType; target: BetTarget; amount: number }
export interface RouletteResult { number: number; color: "RED" | "BLACK" }
export interface GameHistoryItem { id:string; playedAt:string; result:RouletteResult; bets:Bet[]; totalBet:number; payout:number; profit:number; outcome:"WIN"|"DRAW"|"LOSS" }
export interface RouletteStats { plays:number; wins:number; losses:number; draws:number; wagered:number; payout:number; profit:number }
export interface PlayerRoulette { balance:number; today:RouletteStats; todayKey:string; streak:{current:number;best:number}; lifetime:{plays:number;wins:number;biggestWin:number}; bailout:{lastUsedDate:string|null}; history:GameHistoryItem[] }
export interface PlayerState { player:PlayerRoulette; pendingRound:GameHistoryItem|null }
export interface SpinRequest { requestId:string; bets:Bet[] }
export interface SpinResponse extends GameHistoryItem { balance:number; streakBonus:number }
