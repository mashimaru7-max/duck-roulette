import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  Bet,
  BetTarget,
  BetType,
  PlayerRoulette,
  PlayerState,
  SpinResponse,
} from "@duck-holdem/shared";
import "./styles.css";
const API = import.meta.env.VITE_API_URL || "http://localhost:8787",
  session =
    localStorage.duckRouletteSession ??
    (localStorage.duckRouletteSession = crypto.randomUUID()),
  chips = [1e6, 1e7, 1e8, 5e8, "ALL_IN"] as const;
const won = (n: number) => (n === 15 ? "jackpot" : n % 2 ? "red" : "black");
const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
const short = (n: number) =>
  n >= 1e8 ? `${n / 1e8}억` : n >= 1e4 ? `${n / 1e4}만` : fmt(n);
const key = (t: BetType, x: BetTarget) => `${t}:${x}`;
const resultLabel = (number: number) =>
  number === 15 ? "★ JACKPOT" : String(number);
const targetLabel = (target: BetTarget) =>
  target === "STAR" ? "★ JACKPOT" : String(target);
async function api<T>(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-duck-session": session,
        ...init?.headers,
      },
    }),
    body = await res.json();
  if (!res.ok) throw Error(body.error || "서버 요청에 실패했습니다.");
  return body as T;
}
function Wheel({ spin, result }: { spin: boolean; result: number | null }) {
  const ref = useRef<HTMLCanvasElement>(null),
    start = useRef(0),
    raf = useRef(0);
  const clamp = (value: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));
  const smooth = (value: number) => {
    const x = clamp(value);
    return x * x * (3 - 2 * x);
  };
  const spinAngle = (
    seconds: number,
    maxSpeed: number,
    accelerate: number,
    cruise: number,
    stop: number,
  ) => {
    if (seconds <= accelerate)
      return (maxSpeed * seconds * seconds) / (2 * accelerate);
    const accelerated = (maxSpeed * accelerate) / 2;
    if (seconds <= cruise)
      return accelerated + maxSpeed * (seconds - accelerate);
    const duration = stop - cruise;
    const elapsed = Math.min(duration, seconds - cruise);
    const u = elapsed / duration;
    const decelerationDistance =
      maxSpeed * duration * (u - u * u + (u * u * u) / 3);
    return (
      accelerated + maxSpeed * (cruise - accelerate) + decelerationDistance
    );
  };
  const draw = useCallback(
    (time: number) => {
      const canvas = ref.current;
      if (!canvas) return;
      const d = Math.min(devicePixelRatio || 1, 2),
        size = canvas.clientWidth;
      if (canvas.width !== size * d) {
        canvas.width = size * d;
        canvas.height = size * d;
      }
      const c = canvas.getContext("2d")!;
      c.setTransform(d, 0, 0, d, 0, 0);
      c.clearRect(0, 0, size, size);
      const mid = size / 2,
        R = size * 0.46,
        elapsed = spin ? Math.min(6.5, (time - start.current) / 1000) : 6.5,
        progress = elapsed / 6.5,
        wheel = spin ? spinAngle(elapsed, 4.7, 0.55, 3.15, 6.5) : 0,
        sectorAngle = (Math.PI * 2) / 15,
        targetSector = result
          ? -Math.PI / 2 + (result - 1) * sectorAngle + sectorAngle / 2
          : -Math.PI / 2;
      const winningGlow = result
        ? spin
          ? smooth((elapsed - 5.65) / 0.65)
          : 1
        : 0;
      c.save();
      c.translate(mid, mid);
      const wood = c.createRadialGradient(0, 0, R * 0.4, 0, 0, R);
      wood.addColorStop(0, "#8b5027");
      wood.addColorStop(0.72, "#5e2d13");
      wood.addColorStop(1, "#2f160b");
      c.beginPath();
      c.arc(0, 0, R, 0, Math.PI * 2);
      c.fillStyle = wood;
      c.fill();
      c.lineWidth = size * 0.028;
      c.strokeStyle = "#dca128";
      c.stroke();
      c.beginPath();
      c.arc(0, 0, R * 0.9, 0, Math.PI * 2);
      c.lineWidth = size * 0.018;
      c.strokeStyle = "#f5cf68";
      c.stroke();
      c.beginPath();
      c.arc(0, 0, R * 0.86, 0, Math.PI * 2);
      c.lineWidth = size * 0.035;
      c.strokeStyle = "#32180e";
      c.stroke();
      c.rotate(wheel);
      for (let i = 0; i < 15; i++) {
        const a = -Math.PI / 2 + i * sectorAngle;
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, R * 0.82, a, a + sectorAngle);
        c.closePath();
        c.fillStyle = i === 14 ? "#d9a415" : i % 2 ? "#17191f" : "#d92f31";
        c.fill();
        if (result === i + 1 && winningGlow > 0) {
          c.save();
          c.globalAlpha = 0.22 + winningGlow * 0.48;
          c.fillStyle = "#ffe264";
          c.fill();
          c.restore();
        }
        c.strokeStyle = "#f4c65b";
        c.lineWidth = 2;
        c.stroke();
        c.save();
        c.rotate(a + sectorAngle / 2);
        c.translate(R * 0.66, 0);
        c.rotate(Math.PI / 2);
        c.fillStyle = "#fff4c7";
        c.font = `800 ${size * (i === 14 ? 0.065 : 0.044)}px sans-serif`;
        c.textAlign = "center";
        c.fillText(i === 14 ? "★" : String(i + 1), 0, size * 0.018);
        c.restore();
      }
      for (let i = 0; i < 15; i++) {
        const pinAngle = -Math.PI / 2 + i * sectorAngle;
        c.beginPath();
        c.arc(
          Math.cos(pinAngle) * R * 0.87,
          Math.sin(pinAngle) * R * 0.87,
          size * 0.008,
          0,
          Math.PI * 2,
        );
        c.fillStyle = "#ffe18a";
        c.shadowColor = "#8f520d";
        c.shadowBlur = 3;
        c.fill();
        c.shadowBlur = 0;
      }
      c.beginPath();
      c.arc(0, 0, R * 0.35, 0, Math.PI * 2);
      const hub = c.createRadialGradient(
        -R * 0.08,
        -R * 0.1,
        0,
        0,
        0,
        R * 0.35,
      );
      hub.addColorStop(0, "#b67836");
      hub.addColorStop(1, "#54250f");
      c.fillStyle = hub;
      c.fill();
      c.strokeStyle = "#f7c85b";
      c.lineWidth = 5;
      c.stroke();
      c.beginPath();
      c.arc(0, 0, R * 0.13, 0, Math.PI * 2);
      const gold = c.createRadialGradient(
        -R * 0.04,
        -R * 0.05,
        0,
        0,
        0,
        R * 0.13,
      );
      gold.addColorStop(0, "#fff0a4");
      gold.addColorStop(0.45, "#f7bd34");
      gold.addColorStop(1, "#9b5909");
      c.fillStyle = gold;
      c.fill();
      c.restore();
      let ballAngle = targetSector;
      let radius = R * 0.72;
      if (spin) {
        const freeBallAngle = -spinAngle(elapsed, 10.8, 0.38, 3.05, 5.75);
        const absoluteTarget = targetSector + wheel;
        const targetBehind =
          absoluteTarget -
          Math.ceil((absoluteTarget - freeBallAngle) / (Math.PI * 2)) *
            Math.PI *
            2;
        const settle = smooth((elapsed - 5.35) / 1.15);
        ballAngle = freeBallAngle + (targetBehind - freeBallAngle) * settle;
        const drop = smooth((elapsed - 3.15) / 2.15);
        const bounceWindow =
          clamp((elapsed - 4.15) / 1.55) *
          (1 - smooth((elapsed - 5.35) / 0.75));
        const bounce =
          Math.sin((elapsed - 4.15) * 22) * R * 0.018 * bounceWindow;
        radius = R * (0.935 - drop * 0.215) + bounce;
      }
      const ballX = mid + Math.cos(ballAngle) * radius;
      const ballY = mid + Math.sin(ballAngle) * radius;
      c.beginPath();
      c.ellipse(
        ballX + size * 0.008,
        ballY + size * 0.013,
        size * 0.024,
        size * 0.014,
        0,
        0,
        Math.PI * 2,
      );
      c.fillStyle = "#0005";
      c.fill();
      c.beginPath();
      c.arc(ballX, ballY, size * 0.023, 0, Math.PI * 2);
      const pearl = c.createRadialGradient(
        ballX - size * 0.008,
        ballY - size * 0.009,
        1,
        ballX,
        ballY,
        size * 0.023,
      );
      pearl.addColorStop(0, "#ffffff");
      pearl.addColorStop(0.55, "#f4f6f8");
      pearl.addColorStop(1, "#9ca5af");
      c.fillStyle = pearl;
      c.shadowColor = "#0009";
      c.shadowBlur = 5;
      c.fill();
      c.shadowBlur = 0;
      c.save();
      c.translate(mid, mid);
      c.beginPath();
      c.moveTo(0, -R * 1.01);
      c.lineTo(-size * 0.022, -R * 0.94);
      c.lineTo(size * 0.022, -R * 0.94);
      c.closePath();
      c.fillStyle = "#f14646";
      c.shadowColor = "#74202066";
      c.shadowBlur = 5;
      c.fill();
      c.restore();
      if (spin && progress < 1) raf.current = requestAnimationFrame(draw);
    },
    [spin, result],
  );
  useEffect(() => {
    start.current = performance.now();
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [draw]);
  return (
    <canvas
      ref={ref}
      className="wheel"
      aria-label={
        spin
          ? "룰렛 원판과 구슬이 회전 중"
          : result
            ? `룰렛 결과 ${resultLabel(result)}`
            : "1부터 14와 잭팟으로 구성된 룰렛 원판"
      }
    />
  );
}
function App() {
  const [player, setPlayer] = useState<PlayerRoulette>(),
    [bets, setBets] = useState<Bet[]>([]),
    [chip, setChip] = useState<(typeof chips)[number]>(1e6),
    [spinning, setSpinning] = useState(false),
    [result, setResult] = useState<number | null>(null),
    [roundResult, setRoundResult] = useState<SpinResponse | null>(null),
    [notice, setNotice] = useState("베팅 칩과 위치를 선택해 주세요."),
    [allHistory, setAllHistory] = useState(false),
    [sound, setSound] = useState(true);
  useEffect(() => {
    api<PlayerState>("/api/games/roulette/state")
      .then((x) => setPlayer(x.player))
      .catch((e) => setNotice(e.message));
  }, []);
  const available =
    (player?.balance ?? 0) - bets.reduce((s, b) => s + b.amount, 0);
  const betAt = (type: BetType, target: BetTarget) =>
    bets.find(
      (placed) => key(placed.type, placed.target) === key(type, target),
    );
  const betChip = (type: BetType, target: BetTarget) => {
    const placed = betAt(type, target);
    return placed ? (
      <span
        className="placed-chip"
        aria-label={`${String(target)}에 ${fmt(placed.amount)} DC 베팅됨`}
      >
        {short(placed.amount)}
      </span>
    ) : null;
  };
  function bet(type: BetType, target: BetTarget) {
    if (spinning || !player) return;
    const amount = chip === "ALL_IN" ? available : chip;
    if (amount <= 0) return setNotice("보유 포인트가 부족합니다.");
    const i = bets.findIndex(
      (b) => key(b.type, b.target) === key(type, target),
    );
    if (i < 0 && bets.length >= 3)
      return setNotice("한 라운드에는 최대 3곳까지 베팅할 수 있어요.");
    if (amount > available) return setNotice("보유 포인트가 부족합니다.");
    const next = [...bets];
    if (i >= 0) next[i] = { ...next[i], amount: next[i].amount + amount };
    else next.push({ type, target, amount });
    setBets(next);
    setNotice(`${String(target)}에 ${short(amount)} DC 베팅했습니다.`);
  }
  function remove(i: number) {
    if (!spinning) setBets(bets.filter((_, x) => x !== i));
  }
  async function spin() {
    if (spinning || !bets.length)
      return setNotice("베팅을 먼저 선택해 주세요.");
    setSpinning(true);
    setResult(null);
    setRoundResult(null);
    setNotice("룰렛이 돌아가는 중...");
    try {
      const data = await api<SpinResponse>("/api/games/roulette/spin", {
        method: "POST",
        body: JSON.stringify({ requestId: crypto.randomUUID(), bets }),
      });
      setResult(data.result.number);
      await new Promise((r) =>
        setTimeout(
          r,
          matchMedia("(prefers-reduced-motion: reduce)").matches ? 1000 : 6500,
        ),
      );
      const state = await api<PlayerState>("/api/games/roulette/state");
      setPlayer(state.player);
      setBets([]);
      setRoundResult(data);
      setNotice(
        `${resultLabel(data.result.number)} ${data.result.color} · ${data.profit >= 0 ? "+" : ""}${fmt(data.profit)} DC${data.streakBonus ? ` · 연승 보너스 +${fmt(data.streakBonus)}` : ""}`,
      );
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setSpinning(false);
    }
  }
  async function bailout() {
    try {
      const x = await api<{ player: PlayerRoulette }>(
        "/api/games/roulette/bailout",
        { method: "POST" },
      );
      setPlayer(x.player);
      setNotice("재도전 지원금 5억 DC를 받았습니다.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  if (!player)
    return (
      <main className="loading">
        <div>🦆</div>
        <b>DUCK ROULETTE</b>
        <p>{notice}</p>
      </main>
    );
  const history = allHistory ? player.history : player.history.slice(0, 6),
    rate = player.today.plays
      ? Math.round((player.today.wins / player.today.plays) * 1000) / 10
      : 0;
  return (
    <>
      <header className="site-header">
        <div className="brand">
          🦆 <b>Go-Go! Duck</b>
        </div>
        <div className="account">
          🍗 마루 <span>🪙 {fmt(player.balance)} DC</span>
        </div>
      </header>
      <main className="page">
        <aside className="left">
          <section className="card profile">
            <h3>내 정보</h3>
            <div className="avatar">🍗</div>
            <b>마루</b>
            <small>보유 포인트</small>
            <strong>{fmt(player.balance)} DC</strong>
            <button>＋ 충전하기</button>
          </section>
          <section className="card missions">
            <h3>오늘의 미션</h3>
            <p>
              룰렛 3회 플레이 <b>{Math.min(player.today.plays, 3)} / 3</b>
            </p>
            <progress value={Math.min(player.today.plays, 3)} max="3" />
            <p>
              룰렛 1회 적중 <b>{Math.min(player.today.wins, 1)} / 1</b>
            </p>
            <progress value={Math.min(player.today.wins, 1)} max="1" />
          </section>
          <section className="jackpot">
            👑<b>1,000,000,000 DC</b>
            <span>행운의 주인공이 되어보세요!</span>
          </section>
        </aside>
        <div className="center">
          <section className="card game-card">
            <div className="title">
              <div>
                <span>🦆</span>
                <h1>
                  DUCK <em>ROULETTE</em>
                </h1>
                <p>굴러가는 구슬을 보며 결과를 예측해보세요!</p>
              </div>
              <button
                className="sound"
                onClick={() => setSound(!sound)}
                aria-label="효과음 켜기 또는 끄기"
              >
                {sound ? "🔊" : "🔇"}
              </button>
            </div>
            <div className="mobile-balance">
              🪙 {fmt(player.balance)} DC <b>🔥 {player.streak.current}연승</b>
            </div>
            <Wheel spin={spinning && result !== null} result={result} />
            <div className="notice" aria-live="polite">
              {notice}
            </div>
            <h2>
              <i>1</i> 베팅 칩 선택
            </h2>
            <div className="chips">
              {chips.map((c, i) => (
                <button
                  key={String(c)}
                  disabled={spinning || (c === "ALL_IN" && available === 0)}
                  className={`${chip === c ? "active" : ""} c${i}`}
                  onClick={() => setChip(c)}
                >
                  {c === "ALL_IN" ? "올인" : short(c)}
                </button>
              ))}
            </div>
            <button
              className="spin"
              disabled={spinning || !bets.length}
              onClick={spin}
            >
              🦆 {spinning ? "룰렛이 돌아가는 중..." : "SPIN! 룰렛 돌리기"}
            </button>
            <h2>
              <i>2</i> 베팅 위치 선택 <small>최대 3곳</small>
            </h2>
            <div className="numbers">
              {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  disabled={spinning}
                  className={won(n)}
                  onClick={() => bet("NUMBER", n)}
                >
                  <span className="bet-label">{n}</span>
                  {betChip("NUMBER", n)}
                </button>
              ))}
            </div>
            <div className="outside">
              {[
                ["COLOR", "RED", "RED"],
                ["COLOR", "BLACK", "BLACK"],
                ["PARITY", "ODD", "홀수 (ODD)"],
                ["PARITY", "EVEN", "짝수 (EVEN)"],
                ["RANGE", "LOW", "1 ~ 7 (LOW)"],
                ["RANGE", "HIGH", "8 ~ 14 (HIGH)"],
              ].map(([t, x, label]) => (
                <button
                  key={x}
                  disabled={spinning}
                  className={String(x).toLowerCase()}
                  onClick={() => bet(t as BetType, x as BetTarget)}
                >
                  <span className="bet-label">
                    {label}
                    <small>×2</small>
                  </span>
                  {betChip(t as BetType, x as BetTarget)}
                </button>
              ))}
              <button
                disabled={spinning}
                className="jackpot-bet"
                onClick={() => bet("JACKPOT", "STAR")}
              >
                <span className="bet-label">
                  ★ JACKPOT <small>×14</small>
                </span>
                {betChip("JACKPOT", "STAR")}
              </button>
            </div>
            <div className="my-bets">
              <b>내 베팅 {bets.length} / 3</b>
              <button
                disabled={spinning || !bets.length}
                onClick={() => setBets([])}
              >
                선택 초기화
              </button>
              {bets.map((b, i) => (
                <div key={key(b.type, b.target)}>
                  <span>{targetLabel(b.target)}</span>
                  <strong>{fmt(b.amount)} DC</strong>
                  <button
                    onClick={() => remove(i)}
                    aria-label={`${targetLabel(b.target)} 베팅 취소`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section className="card history">
            <h2>
              최근 게임 결과 <small>최근 6개</small>
            </h2>
            {history.length ? (
              <div className="history-list">
                {history.map((h) => (
                  <article key={h.id}>
                    <b className={won(h.result.number)}>
                      {h.result.number === 15 ? "★" : h.result.number}
                    </b>
                    <span>
                      {h.bets.map((b) => targetLabel(b.target)).join(" + ")}
                    </span>
                    <strong className={h.profit >= 0 ? "gain" : "loss"}>
                      {h.profit >= 0 ? "+" : ""}
                      {fmt(h.profit)} DC
                    </strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty">아직 게임 기록이 없습니다.</p>
            )}{" "}
            {player.history.length > 6 && (
              <button
                className="more"
                onClick={() => setAllHistory(!allHistory)}
              >
                {allHistory ? "접기" : "전체 기록 보기"}
              </button>
            )}
          </section>
        </div>
        <aside className="right">
          <section className="card stats">
            <h3>오늘 게임 통계</h3>
            <dl>
              <div>
                <dt>플레이</dt>
                <dd>{player.today.plays}회</dd>
              </div>
              <div>
                <dt>승 / 패 / 무</dt>
                <dd>
                  {player.today.wins} / {player.today.losses} /{" "}
                  {player.today.draws}
                </dd>
              </div>
              <div>
                <dt>승률</dt>
                <dd>{rate}%</dd>
              </div>
              <div>
                <dt>현재 / 최고 연승</dt>
                <dd>
                  {player.streak.current} / {player.streak.best}
                </dd>
              </div>
              <div>
                <dt>오늘 손익</dt>
                <dd className={player.today.profit >= 0 ? "gain" : "loss"}>
                  {fmt(player.today.profit)} DC
                </dd>
              </div>
            </dl>
          </section>
          <section className="card streak">
            <h3>연승 보너스</h3>
            <p>
              🔥 3연승 <b>+100만</b>
            </p>
            <p>
              🥉 5연승 <b>+500만</b>
            </p>
            <p>
              🏆 7연승 <b>+1,000만</b>
            </p>
          </section>
          {player.balance === 0 && !bets.length && (
            <section className="card bailout">
              <h3>포인트가 모두 소진되었습니다.</h3>
              <p>하루 한 번 다시 도전할 수 있어요.</p>
              <button onClick={bailout}>재도전 지원금 5억 받기</button>
            </section>
          )}
          <section className="card rules">
            <h3>게임 안내</h3>
            <p>• 숫자 1~14는 ×13.5</p>
            <p>• 색상·홀짝·구간은 ×2</p>
            <p>• ★ JACKPOT은 ×14</p>
            <p>• 한 라운드 최대 3곳</p>
            <p>• JACKPOT 결과에는 일반 베팅이 적중하지 않습니다.</p>
            <p>• 결과는 서버에서 공정하게 결정됩니다.</p>
          </section>
        </aside>
      </main>
      {roundResult && (
        <div className="result-backdrop" role="presentation">
          <section
            className={`result-modal ${roundResult.outcome.toLowerCase()} ${roundResult.result.number === 15 ? "jackpot-result" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="round-result-title"
          >
            <div className="result-icon" aria-hidden="true">
              {roundResult.result.number === 15
                ? "🌟"
                : roundResult.outcome === "WIN"
                  ? "🎉"
                  : roundResult.outcome === "DRAW"
                    ? "🤝"
                    : "🦆"}
            </div>
            <p className="result-pocket">
              결과 · <b>{resultLabel(roundResult.result.number)}</b>
            </p>
            <h2 id="round-result-title">
              {roundResult.result.number === 15
                ? "JACKPOT!"
                : roundResult.outcome === "WIN"
                  ? "베팅 적중!"
                  : roundResult.outcome === "DRAW"
                    ? "본전이에요"
                    : "다음 행운을 노려보세요"}
            </h2>
            <strong
              className={`result-profit ${roundResult.profit >= 0 ? "gain" : "loss"}`}
            >
              {roundResult.profit >= 0 ? "+" : ""}
              {fmt(roundResult.profit)} <small>DC</small>
            </strong>
            <div className="bet-settlements">
              {roundResult.betResults.map((item) => (
                <article
                  key={key(item.bet.type, item.bet.target)}
                  className={item.hit ? "hit" : "miss"}
                >
                  <div>
                    <b>{targetLabel(item.bet.target)}</b>
                    <small>
                      {fmt(item.bet.amount)} DC · ×{item.multiplier}
                    </small>
                  </div>
                  <span>{item.hit ? "적중" : "미적중"}</span>
                  <strong className={item.profit >= 0 ? "gain" : "loss"}>
                    {item.profit >= 0 ? "+" : ""}
                    {fmt(item.profit)} DC
                  </strong>
                </article>
              ))}
            </div>
            {roundResult.streakBonus > 0 && (
              <p className="result-bonus">
                🔥 연승 보너스 +{fmt(roundResult.streakBonus)} DC
              </p>
            )}
            <button
              className="result-confirm"
              autoFocus
              onClick={() => setRoundResult(null)}
            >
              확인
            </button>
          </section>
        </div>
      )}
      <nav>
        <span>
          ⌂<small>홈</small>
        </span>
        <span>
          📣<small>게시판</small>
        </span>
        <span>
          ♔<small>랭킹</small>
        </span>
        <span>
          ▣<small>상점</small>
        </span>
        <span className="selected">
          ♟<small>게임</small>
        </span>
      </nav>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
