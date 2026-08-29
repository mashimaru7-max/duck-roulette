import { randomInt, randomUUID } from "node:crypto";
import type {
  Bet,
  BetSettlement,
  GameHistoryItem,
  PlayerRoulette,
  RouletteResult,
  SpinResponse,
} from "@duck-holdem/shared";
export const STARTING_BALANCE = 12_350_000_000,
  BAILOUT_AMOUNT = 500_000_000;
export function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    date,
  );
}
export const emptyStats = () => ({
  plays: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  wagered: 0,
  payout: 0,
  profit: 0,
});
export function newPlayer(): PlayerRoulette {
  return {
    balance: STARTING_BALANCE,
    today: emptyStats(),
    todayKey: dateKey(),
    streak: { current: 0, best: 0 },
    lifetime: { plays: 0, wins: 0, biggestWin: 0 },
    bailout: { lastUsedDate: null },
    history: [],
  };
}
export const colorOf = (n: number): "RED" | "BLACK" | "JACKPOT" =>
  n === 15 ? "JACKPOT" : n % 2 ? "RED" : "BLACK";
export function validateBets(bets: Bet[], balance: number) {
  if (!Array.isArray(bets) || bets.length < 1 || bets.length > 3)
    throw Error("베팅은 1곳 이상, 최대 3곳까지 가능합니다.");
  const seen = new Set<string>();
  let total = 0;
  for (const bet of bets) {
    if (!Number.isSafeInteger(bet.amount) || bet.amount <= 0)
      throw Error("베팅 금액이 올바르지 않습니다.");
    const valid =
      bet.type === "NUMBER"
        ? Number.isInteger(bet.target) &&
          Number(bet.target) >= 1 &&
          Number(bet.target) <= 14
        : bet.type === "COLOR"
          ? ["RED", "BLACK"].includes(String(bet.target))
          : bet.type === "PARITY"
            ? ["ODD", "EVEN"].includes(String(bet.target))
            : bet.type === "RANGE"
              ? ["LOW", "HIGH"].includes(String(bet.target))
              : bet.type === "JACKPOT"
                ? bet.target === "STAR"
                : false;
    if (!valid) throw Error("허용되지 않은 베팅입니다.");
    const key = `${bet.type}:${bet.target}`;
    if (seen.has(key)) throw Error("동일 위치 베팅은 합산해서 보내주세요.");
    seen.add(key);
    total += bet.amount;
    if (!Number.isSafeInteger(total) || total > balance)
      throw Error("보유 포인트가 부족합니다.");
  }
  return total;
}
export function isHit(bet: Bet, r: RouletteResult) {
  if (bet.type === "JACKPOT") return r.number === 15;
  if (r.number === 15) return false;
  if (bet.type === "NUMBER") return bet.target === r.number;
  if (bet.type === "COLOR") return bet.target === r.color;
  if (bet.type === "PARITY")
    return bet.target === (r.number % 2 ? "ODD" : "EVEN");
  return bet.target === (r.number <= 7 ? "LOW" : "HIGH");
}
export function settle(bets: Bet[], number: number) {
  const result: RouletteResult = { number, color: colorOf(number) },
    totalBet = bets.reduce((s, b) => s + b.amount, 0),
    betResults: BetSettlement[] = bets.map((bet) => {
      const hit = isHit(bet, result);
      const multiplier =
        bet.type === "NUMBER" ? 13.5 : bet.type === "JACKPOT" ? 14 : 2;
      const payout = hit ? bet.amount * multiplier : 0;
      return { bet, hit, multiplier, payout, profit: payout - bet.amount };
    }),
    payout = betResults.reduce((sum, item) => sum + item.payout, 0),
    profit = payout - totalBet;
  return {
    result,
    betResults,
    totalBet,
    payout,
    profit,
    outcome:
      payout > totalBet
        ? ("WIN" as const)
        : payout === totalBet
          ? ("DRAW" as const)
          : ("LOSS" as const),
  };
}
export function resetToday(p: PlayerRoulette) {
  const key = dateKey();
  if (p.todayKey !== key) {
    p.todayKey = key;
    p.today = emptyStats();
  }
}
export function playRound(
  p: PlayerRoulette,
  bets: Bet[],
  forcedNumber?: number,
): SpinResponse {
  resetToday(p);
  const totalBet = validateBets(bets, p.balance),
    settled = settle(bets, forcedNumber ?? randomInt(1, 16));
  p.balance = p.balance - totalBet + settled.payout;
  const item: GameHistoryItem = {
    id: randomUUID(),
    playedAt: new Date().toISOString(),
    bets,
    ...settled,
  };
  p.today.plays++;
  p.today.wagered += totalBet;
  p.today.payout += settled.payout;
  p.today.profit += settled.profit;
  p.lifetime.plays++;
  let streakBonus = 0;
  if (settled.outcome === "WIN") {
    p.today.wins++;
    p.lifetime.wins++;
    p.streak.current++;
    p.streak.best = Math.max(p.streak.best, p.streak.current);
    p.lifetime.biggestWin = Math.max(p.lifetime.biggestWin, settled.profit);
    streakBonus =
      ({ 3: 1e6, 5: 5e6, 7: 1e7 } as Record<number, number>)[
        p.streak.current
      ] ?? 0;
  } else if (settled.outcome === "DRAW") p.today.draws++;
  else {
    p.today.losses++;
    p.streak.current = 0;
  }
  p.balance += streakBonus;
  p.history.unshift(item);
  p.history = p.history.slice(0, 100);
  return {
    ...item,
    betResults: settled.betResults,
    balance: p.balance,
    streakBonus,
  };
}
