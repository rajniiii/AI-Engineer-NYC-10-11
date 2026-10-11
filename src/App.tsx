import { lazy, Suspense, useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import ScanScreen from "./ScanScreen";
import { journeys, type JourneyId } from "./journeys";
import usePipVoice from "./usePipVoice";
import PipWelcome from "./PipWelcome";
import type { HelpContext } from "./JourneyPlayer";
import { playArcadeSound } from "./arcadeAudio";
import { pipReactionDuration, type PipReaction, type PipReactionKind } from "./pipBehavior";
const PipCompanion = lazy(() => import("./PipCompanion"));
const JourneyPlayer = lazy(() => import("./JourneyPlayer"));
const Celebration = lazy(() => import("./Celebration"));

type View = "dashboard" | "case" | "analytics" | "join" | "welcome" | "journey" | "scan";

const Icon = ({
  name,
  size = 20,
}: {
  name: "coin" | "brain" | "fire" | "arrow" | "pulse" | "check" | "lock" | "radar";
  size?: number;
}) => {
  const paths = {
    coin: (
      <>
        <ellipse cx="12" cy="7" rx="7" ry="3" />
        <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
      </>
    ),
    brain: (
      <path d="M9.5 5.2A3.2 3.2 0 0 0 4 7.5c0 .5.1 1 .3 1.4A3.7 3.7 0 0 0 5.5 16a3.2 3.2 0 0 0 4 2.8m5-13.6A3.2 3.2 0 0 1 20 7.5c0 .5-.1 1-.3 1.4A3.7 3.7 0 0 1 18.5 16a3.2 3.2 0 0 1-4 2.8M9.5 5.2v13.6m5-13.6v13.6M7 9.5c.6.5 1.4.7 2.5.6m7.5-.6c-.6.5-1.4.7-2.5.6M6.5 15c.8-.5 1.8-.6 3-.3m8-.2c-.8-.5-1.8-.6-3-.3" />
    ),
    fire: <path d="M13.2 3s.5 3.3-2.2 5.3c-1.8 1.4-3.1 3-3.1 5.2A4.2 4.2 0 0 0 12.2 18a4.4 4.4 0 0 0 4.5-4.6c0-2.7-1.6-5.1-3.5-6.6.1 2-1.1 3.4-1.1 3.4" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2" />
      </>
    ),
    radar: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="m14 10 5-5M4 12h3m10 0h3" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
};

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  className?: string;
}) => (
  <button className={`btn btn-${variant} ${className}`} onClick={onClick} type="button">
    {children}
  </button>
);

const Stat = ({ icon, value, label }: { icon: "coin" | "brain"; value: string; label: string }) => (
  <div className="header-stat">
    <span className={`stat-icon ${icon}`}><Icon name={icon} /></span>
    <span><strong>{value}</strong><small>{label}</small></span>
  </div>
);

function Header({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <header className="app-header">
      <button className="brand" onClick={() => setView("dashboard")} type="button">
        <span className="brand-mark"><span /></span>
        <span>UNFOLD</span>
      </button>
      <nav className="view-nav" aria-label="Primary navigation">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")} type="button">Mission hub</button>
        <button className={view === "case" ? "active" : ""} onClick={() => setView("case")} type="button">Case file</button>
        <button className={view === "analytics" ? "active" : ""} onClick={() => setView("analytics")} type="button">Analytics</button>
        <button className={view === "join" ? "active" : ""} onClick={() => setView("join")} type="button">Join</button>
        <button className={view === "scan" ? "active" : ""} onClick={() => setView("scan")} type="button">Scan</button>
      </nav>
      <div className="header-actions">
        <Stat icon="coin" value="12,450" label="XP" />
        <Stat icon="brain" value="85" label="INTEL" />
        <div className="profile">
          <div className="avatar">AD<span /></div>
          <span className="profile-copy"><strong>Alex_Dev</strong><small><Icon name="fire" size={14} /> 14 day streak</small></span>
          <span className="status-dot" />
        </div>
      </div>
    </header>
  );
}

const games = [
  {
    id: "case",
    number: "01",
    kind: "case",
    tag: "FORENSIC BIOCHEM",
    title: "CYBER-DETECTIVE",
    subtitle: "CASE: 734",
    description: "Solve the biopharma data leak using logic and biochemistry puzzles.",
    sponsor: "Powered by Gemini API",
    sponsorDetail: "AI scenario generation",
    progress: "New case",
  },
  {
    id: "mars",
    number: "02",
    kind: "mars",
    tag: "SURVIVAL PHYSICS",
    title: "MARS SURVIVAL",
    subtitle: "PHYSICS REACTOR",
    description: "Use calculus and projectile motion physics to restore the power grid.",
    sponsor: "Analytics by Tiger Data",
    sponsorDetail: "Real-time tracking",
    progress: "42% complete",
  },
  {
    id: "reactor",
    number: "03",
    kind: "calculus",
    tag: "RATES & CHANGE",
    title: "REACTOR RUN",
    subtitle: "CALCULUS",
    description: "Read changing signals and stored energy using derivatives and integrals.",
    sponsor: "Powered by Gemini API",
    sponsorDetail: "AI scenario generation",
    progress: "New case",
  },
  {
    id: "scan",
    number: "04",
    kind: "scan",
    tag: "SCAN-TO-LEARN",
    title: "SCAN & LEARN",
    subtitle: "SNAP · LEARN · SAVE",
    description: "Point your camera at anything real-world and Pip turns it into a quick challenge.",
    sponsor: "Gemini + Nimble + Tiger Data",
    sponsorDetail: "Vision · search · history",
    progress: "New · any subject",
  },
  {
    id: "bingo",
    number: "05",
    kind: "bingo",
    tag: "ALGEBRA ARCADE",
    title: "TINY MATH BINGO",
    subtitle: "AGES 14–16",
    description: "Solve 16 algebra, exponent and geometry problems. Stamp four in a row to win.",
    sponsor: "Phone-first mini game",
    sponsorDetail: "Single-file build",
    progress: "New · 4×4 grid",
  },
];

const JOURNEY_FOR_GAME: Record<string, JourneyId> = { case: "biopharma", mars: "physics", reactor: "calculus" };

function GameArt({ kind }: { kind: string }) {
  if (kind === "case") {
    return (
      <div className="game-art detective">
        <div className="dna">
          {[0, 1, 2, 3, 4].map((i) => <i key={i} />)}
        </div>
        <div className="lens"><span>734</span></div>
        <span className="code c1">A_CG</span><span className="code c2">01</span>
      </div>
    );
  }
  if (kind === "mars") {
    return (
      <div className="game-art mars">
        <div className="planet" /><div className="dome d1" /><div className="dome d2" />
        <div className="rocket">▲<i /></div><span className="orbit" />
      </div>
    );
  }
  if (kind === "bingo") {
    const stamped = [0, 5, 10, 15, 3, 6];
    return (
      <div className="game-art bingo">
        <div className="bingo-head">{["T", "I", "N", "Y"].map((l) => <b key={l}>{l}</b>)}</div>
        <div className="bingo-grid">{Array.from({ length: 16 }, (_, i) => <i key={i} className={stamped.includes(i) ? "on" : ""} />)}</div>
      </div>
    );
  }
  if (kind === "scan") {
    return (
      <div className="game-art scan-art">
        <div className="viewfinder">
          <span className="vf tl" /><span className="vf tr" /><span className="vf bl" /><span className="vf br" />
          <span className="vf-box">PLANT</span>
          <span className="vf-line" />
          <Icon name="radar" size={34} />
        </div>
      </div>
    );
  }
  return <div className="game-art calculus"><span className="calculus-glyph">∫</span><svg viewBox="0 0 180 140" aria-hidden="true"><path d="M20 120H170M20 120V10" /><path className="calculus-curve" d="M20 118Q90 118 157 20" /></svg><span className="calculus-note">f′(x) = 2x</span></div>;
}

function GameCard({ game, onStart }: { game: (typeof games)[number]; onStart: () => void }) {
  return (
    <article className={`game-card ${game.kind}`}>
      <div className="card-topline"><span>{game.tag}</span><span>/{game.number}</span></div>
      <GameArt kind={game.kind} />
      <div className="game-copy">
        <div className="progress-label"><span>{game.progress}</span><span className="difficulty-dots"><i /><i /><i /></span></div>
        <div className="game-title">{game.title}</div>
        <div className="game-subtitle">{game.subtitle}</div>
        <p>{game.description}</p>
      </div>
      <Button onClick={onStart} className="game-start">
        <span>START MISSION</span><Icon name="arrow" />
      </Button>
      <div className="sponsor"><span className="sponsor-glyph">✦</span><span><b>{game.sponsor}</b><small>{game.sponsorDetail}</small></span></div>
    </article>
  );
}

const feed = [
  { time: "02m", category: "FDA APPROVAL", title: "New gene therapy clears final review", action: "GENERATE MODULE", tone: "mint" },
  { time: "18m", category: "CYBERSECURITY BREAK", title: "Big data network reports breach", action: "SOLVE CASE", tone: "orange" },
  { time: "41m", category: "SPACE X", title: "Mars Starship launch window confirmed", action: "PHYSICS CHALLENGE", tone: "blue" },
];

function MiniChart({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "chart chart-large" : "chart"}>
      <div className="y-labels"><span>900</span><span>600</span><span>300</span><span>0</span></div>
      <svg viewBox="0 0 620 180" preserveAspectRatio="none" aria-label="XP gain trend chart">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3ce8c5" stopOpacity=".28" />
            <stop offset="1" stopColor="#3ce8c5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="grid"><path d="M0 20H620M0 67H620M0 114H620M0 160H620" /></g>
        <path className="area" d="M0 150 C50 147 58 134 105 136 S164 122 207 126 S264 92 310 105 S368 76 408 83 S470 43 505 58 S566 17 620 12 V180H0Z" />
        <path className="line-shadow" d="M0 150 C50 147 58 134 105 136 S164 122 207 126 S264 92 310 105 S368 76 408 83 S470 43 505 58 S566 17 620 12" />
        <path className="line" d="M0 150 C50 147 58 134 105 136 S164 122 207 126 S264 92 310 105 S368 76 408 83 S470 43 505 58 S566 17 620 12" />
        <g className="points"><circle cx="207" cy="126" r="4" /><circle cx="408" cy="83" r="4" /><circle cx="505" cy="58" r="4" /><circle cx="620" cy="12" r="5" /></g>
      </svg>
      <div className="x-labels"><span>8AM</span><span>10AM</span><span>12PM</span><span>2PM</span><span>NOW</span></div>
      {!large && <div className="chart-tooltip"><b>+185 XP</b><span>1:42 PM</span></div>}
    </div>
  );
}

function QrCode() {
  const cells = [0,1,2,3,4,6,8,9,10,11,12,14,16,18,20,21,22,23,24,26,28,30,32,34,35,36,37,38,39,41,43,44,46,48,49,50,52,54,55,56,58,60,62,64,66,67,68,70,72,74,76,78,80];
  return <div className="qr" aria-label="QR code placeholder">{cells.map((cell) => <i key={cell} style={{ gridArea: `${Math.floor(cell / 9) + 1} / ${(cell % 9) + 1}` }} />)}</div>;
}

function Dashboard({ openCase, openAnalytics, openJoin, openJourney, openScan }: { openCase: () => void; openAnalytics: () => void; openJoin: () => void; openJourney: (id: JourneyId) => void; openScan: () => void }) {
  return (
    <main className="dashboard page-enter">
      <section className="hero-row">
        <div>
          <span className="eyebrow"><i /> LEARNING OPS / ACTIVE</span>
          <div className="hero-title">Choose your next <em>mission.</em></div>
          <p>Real-world knowledge. High-stakes simulations. Built around you.</p>
        </div>
        <div className="daily-target">
          <span className="target-ring"><b>72%</b></span>
          <span><small>DAILY TARGET</small><strong>1,840 / 2,500 XP</strong><i><b /></i></span>
        </div>
      </section>
      <section className="games-grid">
        {games.map((game) => <GameCard key={game.id} game={game} onStart={game.id === "bingo" ? () => window.location.assign("/bingo/index.html") : game.id === "scan" ? openScan : () => openJourney(JOURNEY_FOR_GAME[game.id])} />)}
      </section>
      <section className="lower-grid">
        <article className="panel feed-panel">
          <div className="panel-heading">
            <span><small>POWERED BY NIMBLEWAY SEARCH CRAWLS</small><strong>Live Learning Intel</strong></span>
            <span className="live-badge"><i /> LIVE</span>
          </div>
          <div className="feed-list">
            {feed.map((item) => (
              <div className="feed-item" key={item.category}>
                <span className="feed-time">{item.time}</span>
                <span className={`feed-marker ${item.tone}`} />
                <span className="feed-copy"><small>{item.category}</small><strong>{item.title}</strong></span>
                <Button variant="ghost">{item.action}<Icon name="arrow" size={16} /></Button>
              </div>
            ))}
          </div>
        </article>
        <article className="panel analytics-panel">
          <div className="panel-heading">
            <span><small>POSTGRESQL TIME-SERIES DATA</small><strong>Performance Dashboard</strong></span>
            <Button variant="ghost" onClick={openAnalytics}>FULL REPORT <Icon name="arrow" size={16} /></Button>
          </div>
          <div className="chart-meta"><span><small>XP GAIN / HOUR</small><b>+28.4%</b></span><strong>1,840 <small>XP TODAY</small></strong></div>
          <MiniChart />
          <div className="tiger-tag"><Icon name="pulse" size={15} /> STREAMING VIA TIGER DATA <span>12ms</span></div>
        </article>
        <article className="panel demo-panel">
          <div className="demo-label">WIN THE HACKATHON DEMO</div>
          <div className="qr-row" onClick={openJoin} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openJoin()}><QrCode /><span><small>SCAN TO UNLOCK</small><strong>AI ENGINEER NYC</strong><p>Sponsor demo · Email required</p></span></div>
          <div className="monitor-head"><span><Icon name="radar" size={16} /> AGENT MONITOR</span><small>SENTRY SDK TRACE</small></div>
          <div className="monitor-list">
            <span><i className="ok" /><b>Gemini Call Trace</b><em>1.2s</em></span>
            <span><i className="ok" /><b>Nimble Crawl</b><em>Successful</em></span>
            <span><i className="error" /><b>Agent Error</b><em>Recovered ↗</em></span>
          </div>
        </article>
      </section>
    </main>
  );
}

function AnalyticsScreen({ goBack }: { goBack: () => void }) {
  return (
    <main className="subpage analytics-page page-enter">
      <div className="subpage-top">
        <Button variant="outline" onClick={goBack}>← MISSION HUB</Button>
        <span className="case-live"><i /> DATA STREAM CONNECTED</span>
        <span className="case-id">TIGER DATA / 12ms latency</span>
      </div>
      <section className="report-heading">
        <div><span className="eyebrow"><i /> PERSONAL LEARNING TELEMETRY</span><div className="case-title">Performance <em>signal.</em></div><p>Live skill velocity, focus patterns, and knowledge retention across every mission.</p></div>
        <div className="range-control"><button type="button">24H</button><button className="active" type="button">7D</button><button type="button">30D</button></div>
      </section>
      <section className="kpi-grid">
        <div><small>TOTAL XP</small><strong>12,450</strong><span>↗ 28.4%</span></div>
        <div><small>SKILL VELOCITY</small><strong>+185 <em>xp/h</em></strong><span>Personal best</span></div>
        <div><small>FOCUS TIME</small><strong>18.6 <em>hrs</em></strong><span>↗ 3.2h</span></div>
        <div><small>GLOBAL RANK</small><strong>#184</strong><span>Top 4%</span></div>
      </section>
      <section className="report-grid">
        <article className="panel report-chart">
          <div className="panel-heading"><span><small>REAL-TIME LEARNING OUTPUT</small><strong>XP Gain per Hour</strong></span><span className="legend"><i /> XP velocity</span></div>
          <MiniChart large />
        </article>
        <article className="panel skill-panel">
          <div className="panel-heading"><span><small>MASTERY INDEX</small><strong>Skill Matrix</strong></span><b>78%</b></div>
          {[
            ["Biochemistry", 86], ["Applied physics", 72], ["Cryptography", 64], ["Pattern logic", 91],
          ].map(([skill, score]) => <div className="skill-row" key={skill}><span><b>{skill}</b><em>{score}%</em></span><i><b style={{ width: `${score}%` }} /></i></div>)}
          <div className="next-signal"><Icon name="pulse" /><span><small>NEXT BEST ACTION</small><b>Continue Cryptic Shield</b></span><Icon name="arrow" /></div>
        </article>
      </section>
    </main>
  );
}


const joinUrl = () => `${window.location.origin}${window.location.pathname}?view=join`;

const skyline: [number, number, number][] = [
  [0, 18, 46], [16, 14, 62], [28, 20, 38], [46, 12, 70], [56, 18, 50], [72, 10, 34], [80, 16, 58], [94, 14, 44],
  [106, 20, 66], [124, 12, 40], [134, 18, 54], [150, 10, 74], [158, 16, 48], [172, 14, 60], [184, 16, 42],
];

function PixelCity() {
  return (
    <svg className="pixel-city" viewBox="0 0 200 112" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2a33c" /><stop offset=".55" stopColor="#e8673a" /><stop offset="1" stopColor="#5b2c4a" />
        </linearGradient>
      </defs>
      <rect width="200" height="112" fill="url(#sunset)" />
      <g className="pixel-clouds"><rect x="22" y="12" width="14" height="4" fill="#f7b765" /><rect x="128" y="20" width="18" height="4" fill="#f7b765" /><rect x="150" y="8" width="10" height="3" fill="#f7b765" /></g>
      <rect x="97" y="10" width="6" height="74" fill="#c9b9a8" /><rect x="98" y="6" width="4" height="4" fill="#c9b9a8" />
      {skyline.map(([x, w, h]) => (
        <g key={x}>
          <rect x={x} y={84 - h} width={w} height={h} fill="#1b1d2e" />
          {Array.from({ length: Math.floor(h / 8) }, (_, row) => (
            <rect key={row} x={x + 3} y={84 - h + 4 + row * 8} width={w - 6} height="2" fill={row % 3 === 1 ? "#2b2d40" : "#f2b54a"} opacity=".85" />
          ))}
        </g>
      ))}
      {[18, 58, 98, 138, 178].map((x) => <g key={x}><rect x={x} y="70" width="2" height="16" fill="#2b2d40" /><rect x={x - 1} y="68" width="4" height="3" fill="#ffcf5a" /></g>)}
      <rect y="84" width="200" height="28" fill="#2a2633" />
      <rect y="84" width="200" height="2" fill="#4a4152" />
      {[6, 34, 62, 90, 118, 146, 174].map((x) => <rect key={x} x={x} y="96" width="16" height="4" fill="#e0b56a" opacity=".8" />)}
    </svg>
  );
}

function JoinScreen({ onJoined, muted, toggleMute }: { onJoined: () => void; muted: boolean; toggleMute: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [player, setPlayer] = useState<string | null>(null);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (player) {
      if (!muted) playArcadeSound("start");
      return onJoined();
    }
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      if (!muted) playArcadeSound("error");
      setError("ENTER A VALID EMAIL");
      return;
    }
    setError("");
    setPlayer(value);
    if (!muted) playArcadeSound("ready");
  };

  const reset = () => { if (!muted) playArcadeSound("select"); setPlayer(null); setEmail(""); setError(""); };

  return (
    <main className="join page-enter">
      <div className="join-stage">
        <div className="join-sparkles" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
      <form className="handheld" onSubmit={submit} noValidate>
        <div className="hh-bezel">
          <div className="hh-progress">
            <span className="hh-title"><Icon name="check" size={14} /> {player ? "PLAYER READY" : "PRESS START"}</span>
            <strong>{player ? "1 / 1" : "0 / 1"}</strong>
            <small>LV.1 &bull; {player ? "100%" : "SCAN OR SIGN IN"}</small>
            <span className="hh-pips"><i className="on" /><i className={player ? "on" : ""} /><i /><i /></span>
          </div>
          <div className="hh-screen">
            <PixelCity />
            {player ? (
              <div className="hh-card hh-success" role="status">
                <small>PLAYER SPAWNED</small>
                <strong>{player}</strong>
                <span>Press A to meet Pip</span>
              </div>
            ) : (
              <div className="hh-card hh-qr">
                <QRCodeSVG value={joinUrl()} size={128} bgColor="#ffffff" fgColor="#11141c" level="M" marginSize={1} />
                <span>SCAN TO JOIN</span>
              </div>
            )}
          </div>
        </div>

        <div className="hh-entry">
          {!player && (
            <>
              <label htmlFor="join-email">OR SIGN IN WITH EMAIL</label>
              <input
                id="join-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "join-error" : undefined}
              />
              {error && <span id="join-error" className="join-error">{error}</span>}
            </>
          )}
        </div>

        <div className="hh-controls">
          <div className="dpad" aria-hidden="true"><i className="up" /><i className="left" /><i className="mid" /><i className="right" /><i className="down" /></div>
          <div className="hh-label">
            <strong>UNFOLD</strong>
            <small>AI ENGINEER NYC</small>
            <i className="hh-stripe" />
          </div>
          <div className="ab">
            <button type="button" className="ab-b" onClick={reset} aria-label="B: reset">B</button>
            <button type="submit" className="ab-a" aria-label={player ? "A: meet Pip" : "A: sign in"}>A</button>
          </div>
        </div>
        <div className="hh-bottom">
          <span aria-hidden="true">SELECT</span>
          <span aria-hidden="true">START</span>
          <button type="button" className="hh-sound" onClick={() => { if (muted) playArcadeSound("select"); toggleMute(); }} aria-pressed={!muted}>
            SOUND {muted ? "OFF" : "ON"}
          </button>
        </div>
        <div className="hh-grill" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      </form>
      </div>
    </main>
  );
}

export default function App() {
  const requested = new URLSearchParams(window.location.search);
  const initialMission = journeys.find((item) => item.id === requested.get("mission"))?.id || "physics";
  const [journeyId, setJourneyId] = useState<JourneyId>(initialMission);
  const [view, setViewState] = useState<View>(() => requested.get("view") === "join" ? "join" : requested.get("view") === "journey" ? "journey" : "dashboard");
  const [pipUnlocked, setPipUnlocked] = useState(view === "journey");
  const [context, setContext] = useState<HelpContext | null>(null);
  const [celebration, setCelebration] = useState<{ kind: "answer" | "complete"; serial: number } | null>(null);
  const [reaction, setReaction] = useState<PipReaction | null>(null);
  const audio = usePipVoice();
  const setView = useCallback((next: View) => {
    audio.stop();
    setCelebration(null);
    setReaction(null);
    setViewState(next);
    const url = new URL(window.location.href);
    url.searchParams.delete("mission");
    if (next === "join" || next === "welcome") url.searchParams.set("view", "join");
    else if (next === "case") { url.searchParams.set("view", "journey"); url.searchParams.set("mission", "biopharma"); }
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [audio.stop]);
  const openJourney = useCallback((id: JourneyId) => {
    setJourneyId(id); setPipUnlocked(true); setView("journey");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "journey"); url.searchParams.set("mission", id);
    window.history.replaceState(null, "", url);
  }, [setView]);
  const reactToAnswer = useCallback((kind: PipReactionKind, questionId: string) => {
    setReaction((previous) => ({ kind, questionId, serial: (previous?.serial || 0) + 1 }));
    if (kind === "retry") setCelebration(null);
    else setCelebration((previous) => ({ kind: kind === "complete" ? "complete" : "answer", serial: (previous?.serial || 0) + 1 }));
  }, []);
  useEffect(() => {
    if (!reaction) return;
    const timer = window.setTimeout(() => setReaction(null), pipReactionDuration[reaction.kind]);
    return () => clearTimeout(timer);
  }, [reaction]);
  const clearCelebration = useCallback(() => setCelebration(null), []);
  useEffect(() => {
    if (view === "join") {
      void import("./PipAvatar");
      void import("./pipAssets").then((assets) => assets.preloadPipModels()).catch(() => {});
      const poster = new Image(); poster.src = "/images/pip-loading.png";
      audio.preload();
    }
  }, [view, audio.preload]);
  const activeJourney = view === "case" ? "biopharma" : journeyId;
  return (
    <div className="app-shell">
      {view !== "welcome" && <Header view={view} setView={setView} />}
      <Suspense fallback={<main className="pip-screen-loading" role="status">Pip is getting ready…</main>}>
        {view === "welcome" && <PipWelcome audio={audio} onChoose={openJourney} />}
        {view === "dashboard" && <Dashboard openCase={() => setView("case")} openAnalytics={() => setView("analytics")} openJoin={() => setView("join")} openJourney={openJourney} openScan={() => setView("scan")} />}
        {(view === "journey" || view === "case") && <JourneyPlayer key={activeJourney} id={activeJourney} onBack={() => setView("dashboard")} onContext={setContext} onReaction={reactToAnswer} />}
        {view === "analytics" && <AnalyticsScreen goBack={() => setView("dashboard")} />}
        {view === "join" && <JoinScreen muted={audio.muted} toggleMute={audio.toggleMute} onJoined={() => { setView("welcome"); setPipUnlocked(true); audio.prepare(); }} />}
        {view === "scan" && <ScanScreen goBack={() => setView("dashboard")} />}
      </Suspense>
      {(pipUnlocked || view === "case") && view !== "welcome" && view !== "join" && view !== "scan" && <Suspense fallback={null}><PipCompanion context={context} audio={audio} reaction={reaction} /></Suspense>}
      {celebration && <Suspense fallback={null}><Celebration key={celebration.serial} kind={celebration.kind} onDone={clearCelebration} /></Suspense>}
    </div>
  );
}
