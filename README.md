# DUCK ROULETTE

Go-Go! Duck 스타일의 1인용 1~12 카지노 룰렛입니다. 기존 `duck-holdem`의 React/Vite + Fastify 모노레포와 GitHub Pages/Render 배포 구조를 기반으로 만들었습니다.

## 주요 기능

- Canvas 2D 원판과 반대 방향 구슬 회전, 감속·낙하·결과 포켓 수렴
- 숫자 ×10, RED/BLACK·ODD/EVEN·LOW/HIGH ×2
- 100만/1,000만/1억/5억/ALL IN, 최대 3곳, 동일 위치 합산
- 서버 권한형 결과·정산, `requestId` 멱등 처리, SPIN 연타 방지
- 잔액·오늘 통계·연승·최근 기록 서버 저장, KST 기준 하루 1회 재도전 지원금
- 단일 게임 히스토리 UI, 최근 6개와 전체 기록 확장
- 320px 이상 모바일 및 PC 반응형, reduced-motion 지원

## 로컬 실행

Node.js 22+와 pnpm 11이 필요합니다.

```bash
pnpm install
pnpm dev
```

- 클라이언트: http://localhost:5173
- API: http://localhost:8787
- 상태 확인: http://localhost:8787/health

## 테스트

```bash
pnpm test
pnpm typecheck
pnpm build
```

정산 엔진 테스트는 1~12의 숫자·색상·홀짝·구간 판정, 복합 배당, 비정상 입력, 히스토리 단일 저장을 검증합니다.

## 배포

### 서버 (Render)

루트의 `render.yaml` Blueprint를 연결하면 무료 웹 서비스로 실행할 수 있습니다. 무료 Render 인스턴스의 파일 시스템은 재배포·재시작 때 초기화되므로, 영구 운영에서는 유료 영속 디스크와 `DATA_FILE=/var/data/roulette.json`을 설정하거나 인증 + PostgreSQL/Redis로 저장소를 교체해야 합니다.

### 클라이언트 (GitHub Pages)

1. Render 서버 URL을 저장소 변수 `VITE_API_URL`에 등록합니다.
2. GitHub Pages의 Source를 **GitHub Actions**로 설정합니다.
3. `main` 푸시 시 `.github/workflows/pages.yml`이 배포합니다.

## API

- `GET /api/games/roulette/state`
- `POST /api/games/roulette/spin`
- `POST /api/games/roulette/bailout`

요청은 브라우저가 만든 `x-duck-session` 헤더를 사용합니다. 클라이언트가 보낸 결과·지급액·잔액은 신뢰하지 않습니다.
