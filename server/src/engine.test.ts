import { describe, expect, it } from "vitest";
import type { Bet } from "@duck-holdem/shared";
import { newPlayer, playRound, settle, validateBets } from "./engine.js";

describe("15-slot roulette", () => {
  it("settles number, color, parity and range for 1 through 14", () => {
    for (let n = 1; n <= 14; n++) {
      const bets: Bet[] = [
        { type: "NUMBER", target: n, amount: 100 },
        { type: "COLOR", target: n % 2 ? "RED" : "BLACK", amount: 100 },
        { type: "PARITY", target: n % 2 ? "ODD" : "EVEN", amount: 100 },
        { type: "RANGE", target: n <= 7 ? "LOW" : "HIGH", amount: 100 },
      ];
      expect(settle(bets, n).payout).toBe(1950);
    }
  });

  it("makes normal bets lose and JACKPOT ×14 win on the star", () => {
    const bets: Bet[] = [
      { type: "COLOR", target: "RED", amount: 1_000_000 },
      { type: "PARITY", target: "ODD", amount: 1_000_000 },
      { type: "JACKPOT", target: "STAR", amount: 1_000_000 },
    ];
    const round = settle(bets, 15);
    expect(round.result.color).toBe("JACKPOT");
    expect(round.payout).toBe(14_000_000);
    expect(round.profit).toBe(11_000_000);
    expect(round.betResults.map((item) => item.hit)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("pays number ×13.5 in a compound winning round", () => {
    const bets: Bet[] = [
      { type: "NUMBER", target: 3, amount: 100_000_000 },
      { type: "COLOR", target: "RED", amount: 100_000_000 },
      { type: "RANGE", target: "LOW", amount: 100_000_000 },
    ];
    expect(settle(bets, 3)).toMatchObject({
      payout: 1_750_000_000,
      profit: 1_450_000_000,
      outcome: "WIN",
    });
  });

  it("targets the agreed RTP", () => {
    expect(13.5 / 15).toBe(0.9);
    expect((7 / 15) * 2).toBeCloseTo(0.9333, 4);
  });

  it("rejects invalid and fourth positions", () => {
    expect(() =>
      validateBets([{ type: "NUMBER", target: 15, amount: 1 }], 100),
    ).toThrow();
    expect(() =>
      validateBets(
        Array.from({ length: 4 }, (_, i) => ({
          type: "NUMBER" as const,
          target: i + 1,
          amount: 1,
        })),
        100,
      ),
    ).toThrow();
  });

  it("writes one history row with per-bet settlement", () => {
    const player = newPlayer();
    playRound(player, [{ type: "COLOR", target: "RED", amount: 1_000_000 }], 3);
    expect(player.history).toHaveLength(1);
    expect(player.history[0].betResults).toHaveLength(1);
    expect(player.balance).toBe(12_351_000_000);
  });
});
