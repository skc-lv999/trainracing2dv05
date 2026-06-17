import { useEffect, useState, useRef, useCallback } from "react";
import { TrainVisual } from "./components/TrainVisual.js";
import { MasconController } from "./components/MasconController.js";
import { MasconState, PlayerStats, GameRoom, TrackFeature, LeaderboardEntry } from "./types.js";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Compass, ShieldAlert, Zap, Flame, Award, Train, Users, ShieldAlert as AlertIcon, RotateCcw, Volume2, VolumeX, Landmark } from "lucide-react";
// @ts-ignore
import titleLogoImg from "./assets/images/title_logo_1781676307212.jpg";
// @ts-ignore
import cleanTrainLobbyImg from "./assets/images/clean_train_lobby_1781676082510.jpg";
// @ts-ignore
import lobbyBackgroundImg from "./assets/images/lobby_background_1781675340165.jpg";

// Support multiple lines configurations
export const getLineConfig = (lineName: 'yamanote' | 'chuo' | 'shonan') => {
  if (lineName === 'yamanote') {
    return {
      trackLength: 2100,
      stationStart: 670,
      stationStop: 700,
      stationEnd: 730,
      signal1: 1300,
      signal2: 1700,
      stationLabel: "恵比寿駅"
    };
  } else if (lineName === 'chuo') {
    return {
      trackLength: 2800,
      stationStart: 970,
      stationStop: 1000,
      stationEnd: 1030,
      signal1: 1600,
      signal2: 2200,
      stationLabel: "三鷹駅"
    };
  } else {
    // shonan
    return {
      trackLength: 2700,
      stationStart: 800,
      stationStop: 830,
      stationEnd: 860,
      signal1: 1700,
      signal2: 2300,
      stationLabel: "湘南大磯駅"
    };
  }
};

// Hook to dynamically remove white background from a JPG logo using border-seeded BFS flood-fill and edge anti-aliasing
const useTransparentImage = (src: string) => {
  const [transparentSrc, setTransparentSrc] = useState<string>(src);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Detect if a pixel is near white
      const isNearWhite = (idx: number) => {
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        return a > 0 && r > 230 && g > 230 && b > 230;
      };

      const visited = new Uint8Array(width * height);
      const queue: number[] = [];

      // Add all boundary pixels that are near-white to the queue
      for (let x = 0; x < width; x++) {
        const idxTop = x * 4;
        if (isNearWhite(idxTop)) {
          queue.push(x, 0);
          visited[x] = 1;
        }
        const yBot = height - 1;
        const idxBot = (yBot * width + x) * 4;
        if (isNearWhite(idxBot)) {
          queue.push(x, yBot);
          visited[yBot * width + x] = 1;
        }
      }
      for (let y = 1; y < height - 1; y++) {
        const idxLeft = (y * width) * 4;
        if (isNearWhite(idxLeft)) {
          queue.push(0, y);
          visited[y * width] = 1;
        }
        const xRight = width - 1;
        const idxRight = (y * width + xRight) * 4;
        if (isNearWhite(idxRight)) {
          queue.push(xRight, y);
          visited[y * width + xRight] = 1;
        }
      }

      // BFS to flood fill external white background (making it fully transparent)
      let head = 0;
      const neighbors = [
        [0, 1], [0, -1], [1, 0], [-1, 0]
      ];

      while (head < queue.length) {
        const cx = queue[head++];
        const cy = queue[head++];
        
        const idx = (cy * width + cx) * 4;
        data[idx + 3] = 0; // Make transparent

        for (let j = 0; j < neighbors.length; j++) {
          const nx = cx + neighbors[j][0];
          const ny = cy + neighbors[j][1];

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nPos = ny * width + nx;
            if (visited[nPos] === 0) {
              const nIdx = nPos * 4;
              if (isNearWhite(nIdx)) {
                visited[nPos] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }
      }

      // Smooth anti-aliasing / feathering edge pass for borders
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const pos = y * width + x;
          if (visited[pos] === 0) {
            const idx = pos * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const avg = (r + g + b) / 3;
            if (avg > 180) {
              const n1 = visited[pos + 1];
              const n2 = visited[pos - 1];
              const n3 = visited[pos + width];
              const n4 = visited[pos - width];
              if (n1 || n2 || n3 || n4) {
                // Map brightness 180-255 smoothly to alpha fade
                const alpha = Math.max(0, Math.min(255, (255 - avg) * (255 / (255 - 180))));
                data[idx + 3] = Math.min(data[idx + 3], alpha);
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setTransparentSrc(canvas.toDataURL("image/png"));
    };
  }, [src]);

  return transparentSrc;
};

export default function App() {
  // Navigation / App State
  const [activeScreen, setActiveScreen] = useState<"lobby" | "matchmaking" | "racing" | "completed">("lobby");
  const [activeModal, setActiveModal] = useState<"none" | "game_start" | "stage_select" | "train_select" | "ranking" | "options" | "news" | "how_to_play" | "zukan">("none");
  const [nickname, setNickname] = useState("");
  const [zukanTab, setZukanTab] = useState<'train' | 'stage'>('train');
  const [selectedLine, setSelectedLine] = useState<'yamanote' | 'chuo' | 'shonan'>('shonan');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isLobbyStarted, setIsLobbyStarted] = useState(false);
  const transparentLogo = useTransparentImage(titleLogoImg);

  // Global space key listener to start the lobby
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (activeScreen === "lobby" && !isLobbyStarted) {
        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          setIsLobbyStarted(true);
          playSynthSound("chime");
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [activeScreen, isLobbyStarted]);

  // Network Multi-player states
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const roomRef = useRef<GameRoom | null>(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  const [isCpuMatch, setIsCpuMatch] = useState(false);

  // Audio elements (retro chimes via synthesizers to bypass external asset limits)
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound Synth Helper
  const playSynthSound = (type: "beep" | "chime" | "derail" | "buzzer" | "boost") => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === "beep") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "chime") {
        // Tokaido Line door chime simulator
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === "derail") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.6);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      } else if (type === "buzzer") {
        osc.type = "square";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "boost") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn("Synth failed", e);
    }
  };

  // State values for active live UI rendering
  const [renderStats, setRenderStats] = useState({
    myPosition: 0,
    mySpeed: 0,
    myOverheat: 0,
    myDerailed: false,
    myDerailTimeLeft: 0,
    myFinished: false,
    myFinishTime: undefined as number | undefined,
    opponentPosition: 0,
    opponentSpeed: 0,
    opponentFinished: false,
    opponentDerailed: false,
    opponentName: "対戦相手 (Driver 2)",
    opponentMascon: "N" as MasconState,
  });

  // Station stop challenges specific state
  const [stationStopped, setStationStopped] = useState(false);
  const [stationGrade, setStationGrade] = useState("");
  const [stationMsg, setStationMsg] = useState("");
  const [boardingTimeLeft, setBoardingTimeLeft] = useState(0);
  const [speedBoostActive, setSpeedBoostActive] = useState(false);
  const [boostTimer, setBoostTimer] = useState(0);

  // Warnings displayed in HUD
  const [atcWarning, setAtcWarning] = useState("");
  const [derailRisk, setDerailRisk] = useState(0); // 0 to 100

  // Standard Local Refs for ultra-precise, high-frequency physical 60fps simulation loops
  const myPositionRef = useRef(0);
  const mySpeedRef = useRef(0);
  const myMasconRef = useRef<MasconState>("N");
  const myOverheatRef = useRef(0);
  const myDerailedRef = useRef(false);
  const myDerailTimeLeftRef = useRef(0);
  const myFinishedRef = useRef(false);
  const myFinishTimeRef = useRef<number | undefined>(undefined);

  const opponentPositionRef = useRef(0);
  const opponentSpeedRef = useRef(0);
  const opponentFinishedRef = useRef(false);
  const opponentDerailedRef = useRef(false);
  const opponentMasconRef = useRef<MasconState>("N");
  const opponentNameRef = useRef("対戦相手 (Driver 2)");

  // Timer trackers
  const raceStartTimeRef = useRef<number | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const syncIntervalIdRef = useRef<any | null>(null);
  const countdownIntervalIdRef = useRef<any | null>(null);
  const lobbyPollIdRef = useRef<any | null>(null);

  // CPU intelligence simulation states (run inside player's client)
  const cpuPositionRef = useRef(0);
  const cpuSpeedRef = useRef(0);
  const cpuMasconRef = useRef<MasconState>("N");
  const cpuOverheatRef = useRef(0);
  const cpuDerailedRef = useRef(false);
  const cpuDerailTimeLeftRef = useRef(0);
  const cpuFinishedRef = useRef(false);
  const cpuStationTimerRef = useRef(0); // boarding at station stop
  const cpuPlayerIdRef = useRef<string | null>(null);

  // Load Leaderboards on mount
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const list = await res.json();
      setLeaderboard(list);
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
    }
  };

  // Reset local train values before starting a new race
  const resetLocalPhysics = () => {
    myPositionRef.current = 0;
    mySpeedRef.current = 0;
    myMasconRef.current = "N";
    myOverheatRef.current = 0;
    myDerailedRef.current = false;
    myDerailTimeLeftRef.current = 0;
    myFinishedRef.current = false;
    myFinishTimeRef.current = undefined;

    opponentPositionRef.current = 0;
    opponentSpeedRef.current = 0;
    opponentFinishedRef.current = false;
    opponentDerailedRef.current = false;
    opponentMasconRef.current = "N";
    opponentNameRef.current = "対戦相手 (Driver 2)";

    cpuPositionRef.current = 0;
    cpuSpeedRef.current = 0;
    cpuMasconRef.current = "N";
    cpuOverheatRef.current = 0;
    cpuDerailedRef.current = false;
    cpuDerailTimeLeftRef.current = 0;
    cpuFinishedRef.current = false;
    cpuStationTimerRef.current = 0;
    cpuPlayerIdRef.current = null;

    setStationStopped(false);
    setStationGrade("");
    setStationMsg("");
    setBoardingTimeLeft(0);
    setSpeedBoostActive(false);
    setBoostTimer(0);
    setAtcWarning("");
    setDerailRisk(0);
  };

  // Matchmaking action
  const handleJoinQueue = async (cpuOnly = false) => {
    if (!nickname.trim()) {
      alert("運転士のニックネームを入力してください。");
      return;
    }
    resetLocalPhysics();
    setIsCpuMatch(cpuOnly);

    // Initial audio context initiation to prevent browser blocking
    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (_) {}

    try {
      const res = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickname, line: selectedLine }),
      });
      const data = await res.json();

      const configLength = getLineConfig(selectedLine).trackLength;

      setPlayerId(data.playerId);
      setRoomId(data.roomId);
      setRoom({
        id: data.roomId,
        status: data.status,
        players: data.players,
        trackFeatures: [],
        trackLength: configLength,
        line: selectedLine,
      });

      if (cpuOnly) {
        // Instantly force CPU opponent match conversion on server
        const cpuRes = await fetch(`/api/rooms/${data.roomId}/cpu`, {
          method: "POST",
        });
        const cpuData = await cpuRes.json();
        setRoom(cpuData);
        // Find CPU player key
        const foundCpuKey = Object.keys(cpuData.players).find((id) => id.startsWith("cpu_"));
        if (foundCpuKey) {
          cpuPlayerIdRef.current = foundCpuKey;
        }
        setActiveScreen("matchmaking");
        startMatchPolling(data.roomId, data.playerId);
      } else {
        setActiveScreen("matchmaking");
        startMatchPolling(data.roomId, data.playerId);
      }
    } catch (e) {
      console.error("Matchmaking error:", e);
      alert("サーバーとの通信に失敗しました。");
    }
  };

  // Start matchmaking and game state sync polling
  const startMatchPolling = (rId: string, pId: string) => {
    if (lobbyPollIdRef.current) clearInterval(lobbyPollIdRef.current);

    lobbyPollIdRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${rId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: pId }),
        });
        const data = await res.json();

        if (data.expired) {
          clearInterval(lobbyPollIdRef.current);
          setActiveScreen("lobby");
          alert("ルームがタイムアウトしました。");
          return;
        }

        setRoom(data);

        // Transition from matchmaking to countdown
        if (data.status === "countdown" || data.status === "racing") {
          clearInterval(lobbyPollIdRef.current);
          setActiveScreen("racing");
          raceStartTimeRef.current = data.startTime;
          startPhysicsSimulation();
          startStateSynchronization(rId, pId);
        }
      } catch (e) {
        console.error("Lobby polling error:", e);
      }
    }, 1000);
  };

  // Start server synchronization during active gameplay (runs every 300ms)
  const startStateSynchronization = (rId: string, pId: string) => {
    if (syncIntervalIdRef.current) clearInterval(syncIntervalIdRef.current);

    syncIntervalIdRef.current = setInterval(async () => {
      // Find CPU key if playing against CPU
      let cpuKey = cpuPlayerIdRef.current;
      const currentRoom = roomRef.current;
      if (!cpuKey && currentRoom && currentRoom.players) {
        cpuKey = Object.keys(currentRoom.players).find((k) => k.startsWith("cpu_")) || null;
        if (cpuKey) {
          cpuPlayerIdRef.current = cpuKey;
        }
      }

      let cpuStatsToSend: PlayerStats | undefined = undefined;
      // Host simulates the CPU and uploads its position to server
      if (cpuKey) {
        cpuStatsToSend = {
          id: cpuKey,
          name: currentRoom?.players?.[cpuKey]?.name || "AI特急ライナー",
          position: cpuPositionRef.current,
          speed: cpuSpeedRef.current,
          mascon: cpuMasconRef.current,
          overheat: cpuOverheatRef.current,
          derailed: cpuDerailedRef.current,
          derailTimeLeft: cpuDerailTimeLeftRef.current,
          finished: cpuFinishedRef.current,
        };
      }

      const clientStats: PlayerStats = {
        id: pId,
        name: nickname,
        position: myPositionRef.current,
        speed: mySpeedRef.current,
        mascon: myMasconRef.current,
        overheat: myOverheatRef.current,
        derailed: myDerailedRef.current,
        derailTimeLeft: myDerailTimeLeftRef.current,
        finished: myFinishedRef.current,
        finishTime: myFinishTimeRef.current,
      };

      try {
        const res = await fetch(`/api/rooms/${rId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: pId,
            stats: clientStats,
            cpuStats: cpuStatsToSend,
          }),
        });
        const updatedRoom: GameRoom = await res.json();

        if (updatedRoom && updatedRoom.players) {
          setRoom(updatedRoom);

          // Back up dynamic search for CPU key in case it was missing
          if (!cpuPlayerIdRef.current) {
            const foundCpuKey = Object.keys(updatedRoom.players).find((id) => id.startsWith("cpu_"));
            if (foundCpuKey) {
              cpuPlayerIdRef.current = foundCpuKey;
            }
          }

          // Extract opponent information
          const oppKey = Object.keys(updatedRoom.players).find((id) => id !== pId);
          if (oppKey) {
            const opp = updatedRoom.players[oppKey];
            opponentPositionRef.current = opp.position;
            opponentSpeedRef.current = opp.speed;
            opponentFinishedRef.current = opp.finished;
            opponentDerailedRef.current = opp.derailed;
            opponentMasconRef.current = opp.mascon;
            opponentNameRef.current = opp.name;

            setRenderStats((prev) => ({
              ...prev,
              opponentPosition: opp.position,
              opponentSpeed: opp.speed,
              opponentFinished: opp.finished,
              opponentDerailed: opp.derailed,
              opponentName: opp.name,
              opponentMascon: opp.mascon,
            }));
          }

          // If race completed
          if (updatedRoom.status === "completed") {
            clearInterval(syncIntervalIdRef.current);
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            setActiveScreen("completed");
            fetchLeaderboard();

            // Submit finish record automatically if finished safely
            if (myFinishedRef.current && myFinishTimeRef.current) {
              submitLeaderboardRecord(nickname, myFinishTimeRef.current);
            }
          }
        }
      } catch (e) {
        console.error("API sync error:", e);
      }
    }, 300);
  };

  // Submit record to global leaderboard database
  const submitLeaderboardRecord = async (name: string, time: number) => {
    try {
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, time }),
      });
      fetchLeaderboard();
    } catch (e) {
      console.error("Failed to submit score:", e);
    }
  };

  // Leave active room / reset back to lobby
  const handleLeaveRace = async () => {
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    if (syncIntervalIdRef.current) clearInterval(syncIntervalIdRef.current);
    if (lobbyPollIdRef.current) clearInterval(lobbyPollIdRef.current);

    if (roomId && playerId) {
      try {
        await fetch(`/api/rooms/${roomId}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        });
      } catch (_) {}
    }

    setPlayerId(null);
    setRoomId(null);
    setRoom(null);
    resetLocalPhysics();
    setActiveScreen("lobby");
  };

  // CPU Drive Strategy Brain
  const updateCpuDriverSim = (dt: number, trackFeatures: TrackFeature[]) => {
    if (cpuFinishedRef.current) return;

    const activeLine = room?.line || 'shonan';
    const cfg = getLineConfig(activeLine);

    // Finish check
    if (cpuPositionRef.current >= cfg.trackLength) {
      cpuPositionRef.current = cfg.trackLength;
      cpuSpeedRef.current = 0;
      cpuFinishedRef.current = true;
      return;
    }

    // Handles Station Stops
    if (cpuPositionRef.current >= cfg.stationStart && cpuPositionRef.current <= cfg.stationEnd && cpuStationTimerRef.current === 0) {
      // slow down to stop at stationStop
      const distToStop = cfg.stationStop - cpuPositionRef.current;
      if (distToStop > 5) {
        cpuMasconRef.current = "B2";
        // smooth deceleration
        if (cpuSpeedRef.current < distToStop * 1.5) {
          cpuMasconRef.current = "N";
        }
      } else {
        cpuMasconRef.current = "EB";
        if (cpuSpeedRef.current === 0) {
          // stopped completely! start boarding timer
          cpuStationTimerRef.current = 3.0; // 3 seconds boarding
          playSynthSound("chime");
        }
      }
    }

    // Tick down boarding timer at station
    if (cpuStationTimerRef.current > 0) {
      cpuStationTimerRef.current -= dt;
      cpuMasconRef.current = "N";
      cpuSpeedRef.current = 0;
      if (cpuStationTimerRef.current <= 0) {
        cpuStationTimerRef.current = 0;
        cpuPositionRef.current = cfg.stationStop + 1; // slightly push past stop trigger
      }
      // Return early because train is currently loading passengers
      animateCpuPhysics(dt, 0);
      return;
    }

    // General driving logic (accelerating vs curve speed limits vs red lights)
    let targetSpeed = activeLine === 'yamanote' ? 85 : activeLine === 'chuo' ? 115 : 110; 

    // Calculate signals state from room start time
    const elapsedSec = raceStartTimeRef.current ? (Date.now() - raceStartTimeRef.current) / 1000 : 0;
    
    // Check signals
    const firstSignalRed = elapsedSec < 12;
    const secondSignalRed = elapsedSec < 24;

    if (cpuPositionRef.current < cfg.signal1 && cpuPositionRef.current > cfg.signal1 - 200 && firstSignalRed) {
      // Decelerate early for Signal 1 Red light
      const dist = cfg.signal1 - cpuPositionRef.current;
      targetSpeed = Math.min(targetSpeed, dist * 0.4);
    }
    if (cpuPositionRef.current < cfg.signal2 && cpuPositionRef.current > cfg.signal2 - 200 && secondSignalRed) {
      // Decelerate early for Signal 2 Red light
      const dist = cfg.signal2 - cpuPositionRef.current;
      targetSpeed = Math.min(targetSpeed, dist * 0.4);
    }

    // Check speed limit zones curves
    trackFeatures.forEach((f) => {
      if (f.type === "speed_limit") {
        // approaching limit zone, brake early!
        if (cpuPositionRef.current < f.position && cpuPositionRef.current > f.position - 150) {
          targetSpeed = Math.min(targetSpeed, f.value);
        }
        // inside limit zone
        if (cpuPositionRef.current >= f.position && cpuPositionRef.current <= f.position + f.length) {
          targetSpeed = Math.min(targetSpeed, f.value);
        }
      }
    });

    // Translate target speed into physical Mascon selection
    if (cpuSpeedRef.current < targetSpeed - 10) {
      // Accelerate safely
      if (cpuOverheatRef.current > 85) {
        cpuMasconRef.current = "P1"; // drop notch to cool down
      } else {
        cpuMasconRef.current = "P4";
      }
    } else if (cpuSpeedRef.current < targetSpeed - 1) {
      cpuMasconRef.current = "P2";
    } else if (cpuSpeedRef.current > targetSpeed + 10) {
      cpuMasconRef.current = "B3";
    } else if (cpuSpeedRef.current > targetSpeed + 2) {
      cpuMasconRef.current = "B1";
    } else {
      cpuMasconRef.current = "N"; // coast
    }

    // Apply CPU Physics
    animateCpuPhysics(dt, targetSpeed);
  };

  const animateCpuPhysics = (dt: number, limitSpeed: number) => {
    // Overheat simulation disabled
    cpuOverheatRef.current = 0;

    // Calculate applied acceleration
    let a = 0;
    if (cpuCrashedRefCurrent()) {
      a = -12.0; // severe force deceleration
    } else {
      const m = cpuMasconRef.current;
      if (m === "P4") a = 2.8;
      else if (m === "P3") a = 2.0;
      else if (m === "P2") a = 1.1;
      else if (m === "P1") a = 0.5;
      else if (m === "B1") a = -1.5;
      else if (m === "B2") a = -3.2;
      else if (m === "B3") a = -5.5;
      else if (m === "EB") a = -9.0;
    }

    // Aerodynamic Drag
    const drag = 0.005 * cpuSpeedRef.current + 0.00015 * cpuSpeedRef.current * cpuSpeedRef.current;
    const netA = a - (cpuSpeedRef.current > 0 ? drag : 0);

    cpuSpeedRef.current = Math.min(125, Math.max(0, cpuSpeedRef.current + netA * dt));
    cpuPositionRef.current += (cpuSpeedRef.current / 3.6) * dt;
  };

  const cpuCrashedRefCurrent = () => {
    // Simple block if CPU crosses RED light (extremely rare but keeps parity)
    const elapsedSec = raceStartTimeRef.current ? (Date.now() - raceStartTimeRef.current) / 1000 : 0;
    if (cpuPositionRef.current >= 1700 && cpuPositionRef.current <= 1715 && elapsedSec < 12) {
      return true;
    }
    if (cpuPositionRef.current >= 2300 && cpuPositionRef.current <= 2315 && elapsedSec < 24) {
      return true;
    }
    return false;
  };

  // --- CORE GAME LOOP (RUNS 60FPS AT VELOCITY SCALE) ---
  const startPhysicsSimulation = () => {
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000); // capped slice
      lastTime = time;

      const now = Date.now();
      const elapsedSec = raceStartTimeRef.current ? (now - raceStartTimeRef.current) / 1000 : 0;

      // Only simulate physics once countdown has resolved
      if (raceStartTimeRef.current && now >= raceStartTimeRef.current) {
        
        // 1. UPDATE CPU IF CPU OPPONENT ACTIVE
        const features = roomRef.current?.trackFeatures || [];
        updateCpuDriverSim(dt, features);

        // Replication of simulated CPU values or remote player dead reckoning extrapolation
        if (isCpuMatch) {
          opponentPositionRef.current = cpuPositionRef.current;
          opponentSpeedRef.current = cpuSpeedRef.current;
          opponentFinishedRef.current = cpuFinishedRef.current;
          opponentDerailedRef.current = cpuDerailedRef.current;
          opponentMasconRef.current = cpuMasconRef.current;
        } else {
          // If remote player match, smooth move opponent between server polls
          if (!opponentFinishedRef.current) {
            const lineType_ = roomRef.current?.line || 'shonan';
            const oppCfg = getLineConfig(lineType_);
            opponentPositionRef.current = Math.min(
              oppCfg.trackLength,
              opponentPositionRef.current + (opponentSpeedRef.current / 3.6) * dt
            );
          }
        }

        // 2. TIMERS & BUFFS
        if (speedBoostActive) {
          setBoostTimer((prev) => {
            if (prev - dt <= 0) {
              setSpeedBoostActive(false);
              return 0;
            }
            return prev - dt;
          });
        }

        let positionGain = 0;

        // Inside Station Stop Boarding period
        if (boardingTimeLeft > 0) {
          setBoardingTimeLeft((prev) => {
            const left = prev - dt;
            if (left <= 0) {
              setStationStopped(false);
              setStationGrade("");
              // push slightly past station block so it doesn't trigger stop immediately again
              const activeLine_ = roomRef.current?.line || 'shonan';
              const cfg_ = getLineConfig(activeLine_);
              myPositionRef.current = cfg_.stationStop + 1;
              playSynthSound("beep");
              return 0;
            }
            return left;
          });
          // Stop physics updates during passenger exchange
          mySpeedRef.current = 0;
          myMasconRef.current = "N";
        } else {
          // 3. APPLY PLAYER VEHICLE PHYSICS
          let accelForce = 0;

          if (myDerailedRef.current) {
            accelForce = 0;
            myDerailTimeLeftRef.current -= dt;
            if (myDerailTimeLeftRef.current <= 0) {
              myDerailedRef.current = false;
              myDerailTimeLeftRef.current = 0;
            }
          } else {
            // Overheat disabled
            myOverheatRef.current = 0;

            // Active acceleration power based on current mascon handle selection
            const notch = myMasconRef.current;
            // Apply acceleration multiplier if perfect stop speed boost is active
            const boostMultiplier = speedBoostActive ? 1.6 : 1.0;

            if (notch === "P4") {
              accelForce = 2.8 * boostMultiplier;
            } else if (notch === "P3") {
              accelForce = 2.0 * boostMultiplier;
            } else if (notch === "P2") {
              accelForce = 1.1 * boostMultiplier;
            } else if (notch === "P1") {
              accelForce = 0.5 * boostMultiplier;
            } else if (notch === "N") {
              accelForce = 0.0;
            } else if (notch === "B1") {
              accelForce = -1.6;
            } else if (notch === "B2") {
              accelForce = -3.5;
            } else if (notch === "B3") {
              accelForce = -5.8;
            } else if (notch === "EB") {
              accelForce = -9.2;
            }
          }

          // Aerodynamic resistance and friction
          const speedDrag = 0.0055 * mySpeedRef.current + 0.00012 * mySpeedRef.current * mySpeedRef.current;
          const netAcceleration = accelForce - (mySpeedRef.current > 0 ? speedDrag : 0);

          // Update speed calculations
          mySpeedRef.current = Math.min(130, Math.max(0, mySpeedRef.current + netAcceleration * dt));
          
          // Update physical side scrolling positions
          positionGain = (mySpeedRef.current / 3.6) * dt;
          myPositionRef.current += positionGain;
        }

        // 4. SIGNAL BLOCKS & SPEED LIMIT CROSS-CHECKS
        let currentAtcLimit = 130;
        let warningText = "";
        let riskValue = 0;

        const activeLine = roomRef.current?.line || 'shonan';
        const cfg = getLineConfig(activeLine);

        // Check active curves & speed limits
        features.forEach((feat) => {
          if (feat.type === "speed_limit") {
            const insideLimit = myPositionRef.current >= feat.position && myPositionRef.current <= feat.position + feat.length;
            if (insideLimit) {
              currentAtcLimit = feat.value;
              if (mySpeedRef.current > feat.value) {
                warningText = `⚠️ 速度超過！ 制限速度 ${feat.value}km/h`;
                // Scale derail risk between go-over limit speed boundaries (+0km/h is 0 risk, +20km/h is 100 risk)
                riskValue = Math.min(100, Math.max(0, ((mySpeedRef.current - feat.value) / 18) * 100));

                // Derailment triggers if exceeding limit safety limit for more than 1.4 seconds continuously
                if (riskValue >= 90) {
                  if (Math.random() < 0.03) { // 3% random derailment risk ticks at dangerous curve speeds
                    triggerDerailment();
                  }
                }
              }
            }
          }
        });

        // Dynamic Signal colors calculations based on elapsed milliseconds
        const sig1Red = elapsedSec < 12;
        const sig1Yellow = elapsedSec >= 12 && elapsedSec < 18;

        const sig2Red = elapsedSec < 24;
        const sig2Yellow = elapsedSec >= 24 && elapsedSec < 30;

        // Signal 1 check
        if (myPositionRef.current >= cfg.signal1 && myPositionRef.current <= cfg.signal1 + 15) {
          if (sig1Red) {
            triggerEmergencyAtpStop("信号赤！信号冒涜によりATC非常緊急停止");
          } else if (sig1Yellow && mySpeedRef.current > 60) {
            triggerEmergencyAtpStop("警戒！黄色信号の速度制限(60km/h以下)超過");
          }
        }

        // Signal 2 check
        if (myPositionRef.current >= cfg.signal2 && myPositionRef.current <= cfg.signal2 + 15) {
          if (sig2Red) {
            triggerEmergencyAtpStop("信号赤！信号冒涜によりATC非常緊急停止");
          } else if (sig2Yellow && mySpeedRef.current > 60) {
            triggerEmergencyAtpStop("警戒！黄色信号の速度制限(60km/h以下)超過");
          }
        }

        // 5. JAPANESE STATION STOP CHALLENGE
        if (myPositionRef.current >= cfg.stationStart && myPositionRef.current <= cfg.stationEnd && !stationStopped) {
          const deltaStopM = cfg.stationStop - myPositionRef.current;
          
          if (mySpeedRef.current === 0) {
            setStationStopped(true);
            playHTMLStationStop(deltaStopM);
          } else {
            warningText = `🚉 ${cfg.stationLabel}：次駅停車！ 【残り: ${Math.round(deltaStopM)}m】`;
          }
        }

        // Overrun check if passenger completely rolls past station end without stopping
        if (myPositionRef.current > cfg.stationEnd && myPositionRef.current < cfg.stationEnd + 40 && !stationStopped && myPositionRef.current - positionGain <= cfg.stationEnd) {
          setStationStopped(true);
          setStationGrade("🚨 オーバーラン！ 🚨");
          setStationMsg("停車位置を大幅に超過しました。乗客苦情のため 5.0秒間加速・出力ペナルティ！");
          setAtcWarning("ペナルティ！出力制限中");
          myOverheatRef.current = 80;
          setBoardingTimeLeft(5.0);
          playSynthSound("buzzer");
        }

        // 6. FINISH LINE DETECTOR
        if (myPositionRef.current >= cfg.trackLength && !myFinishedRef.current) {
          myPositionRef.current = cfg.trackLength;
          mySpeedRef.current = 0;
          myFinishedRef.current = true;
          const finalTimeMs = raceStartTimeRef.current ? (Date.now() - raceStartTimeRef.current) : 0;
          myFinishTimeRef.current = finalTimeMs;
          playSynthSound("chime");
        }

        // Render warnings inside status bar HUD
        setAtcWarning(warningText);
        setDerailRisk(riskValue);

        // Copy physics calculations inside Refs directly into React render state
        setRenderStats({
          myPosition: myPositionRef.current,
          mySpeed: mySpeedRef.current,
          myOverheat: myOverheatRef.current,
          myDerailed: myDerailedRef.current,
          myDerailTimeLeft: myDerailTimeLeftRef.current,
          myFinished: myFinishedRef.current,
          myFinishTime: myFinishTimeRef.current,
          opponentPosition: opponentPositionRef.current,
          opponentSpeed: opponentSpeedRef.current,
          opponentFinished: opponentFinishedRef.current,
          opponentDerailed: opponentDerailedRef.current,
          opponentName: opponentNameRef.current,
          opponentMascon: opponentMasconRef.current,
        });
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);
  };

  // Trigger severe derailment action
  const triggerDerailment = () => {
    myDerailedRef.current = true;
    mySpeedRef.current = 0;
    myPositionRef.current = Math.max(0, myPositionRef.current - 15); // bounce backward a bit
    myDerailTimeLeftRef.current = 4.0; // 4 seconds downtime
    playSynthSound("derail");
  };

  // Trigger ATP safety system lock stops
  const triggerEmergencyAtpStop = (reason: string) => {
    mySpeedRef.current = 0;
    myMasconRef.current = "EB";
    myDerailTimeLeftRef.current = 3.5; // lock controls for 3.5 seconds
    myDerailedRef.current = true; // reusing derail visual shake
    setAtcWarning(`🚨 ATP非常緊急停止：${reason}`);
    playSynthSound("buzzer");
  };

  // Analyze station stopped accuracy and give buffs/penalties
  const playHTMLStationStop = (delta: number) => {
    const accuracy = Math.abs(delta); // offset in meters

    if (accuracy <= 1.5) {
      setStationGrade("💮 停車エクセレント！ (+0.0m) 💮");
      setStationMsg("完璧な位置に停車しました！ モーター排熱完了＆加速ブースト15秒間獲得！");
      myOverheatRef.current = 0; // reset heat
      setSpeedBoostActive(true);
      setBoostTimer(15.0); // 15s speed buff!
      setBoardingTimeLeft(3.0); // standard boarding wait
      playSynthSound("chime");
      playSynthSound("boost");
    } else if (accuracy <= 4.0) {
      setStationGrade("👍 停車グッド！ 👍");
      setStationMsg("良好な位置です。安全に乗客扱中（待ち時間3.5秒）");
      setBoardingTimeLeft(3.5);
      playSynthSound("chime");
    } else {
      setStationGrade("⚠️ 停車バッド (ズレ大) ⚠️ ");
      setStationMsg("位置がずれています。乗降に時間がかかります。（待ち時間5.0秒）");
      setBoardingTimeLeft(5.0);
      playSynthSound("buzzer");
    }
  };

  // Safely stop all simulation routines on unmount
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (syncIntervalIdRef.current) clearInterval(syncIntervalIdRef.current);
      if (lobbyPollIdRef.current) clearInterval(lobbyPollIdRef.current);
    };
  }, []);

  // Set local mascon ref on user changes
  const handleSetNotch = (notch: MasconState) => {
    myMasconRef.current = notch;
    playSynthSound("beep");
  };

  // Calculate parallax offsets based on current train position
  const skyOffset = -(renderStats.myPosition * 0.08) % 100;
  const mtOffset = -(renderStats.myPosition * 0.4) % 100;
  const trackOffset = -(renderStats.myPosition * 4.0) % 100;

  // Render elapsed running time
  const getElapsedTimeStr = () => {
    if (!raceStartTimeRef.current) return "00:00.00";
    const delta = Date.now() - raceStartTimeRef.current;
    if (delta < 0) return "00:00.00";
    const m = Math.floor(delta / 60000);
    const s = Math.floor((delta % 60000) / 1000);
    const ms = Math.floor((delta % 1000) / 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const getLeaderboardTimeStr = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const mils = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${mils.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-150 flex flex-col items-center justify-center antialiased selection:bg-indigo-500 selection:text-white font-sans p-1 sm:p-4 overflow-hidden">
      
      {/* 16:9 Aspect Ratio Arcade Console Frame Container */}
      <div 
        id="widescreen-frame"
        className="w-full max-w-[1440px] aspect-video bg-slate-900 border-2 sm:border-4 border-slate-800 rounded-xl sm:rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col relative shrink-0"
        style={{
          width: 'min(100%, calc((100vh - 24px) * 16 / 9))',
          aspectRatio: '16/9',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.95), 0 0 60px rgba(99,102,241,0.06)'
        }}
      >
        
        {/* GLOBAL HUD STATUS HEADER */}
        {activeScreen !== "lobby" && (
          <header className="bg-slate-900 border-b-2 border-slate-800 px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-between shadow-md z-10 shrink-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-emerald-500 rounded-lg p-2 sm:p-2.5 shadow-md shadow-emerald-500/25">
                <Train className="w-6 h-6 sm:w-8 sm:h-8 text-slate-950" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold font-mono text-emerald-400 tracking-wider leading-none">
                  トレインレーシング ２Ｄ
                </h1>
                <p className="text-[9px] sm:text-xs text-slate-400 font-mono mt-1 blur-[0.1px]">
                  E231 Tokaido Line Commuter Sim • Retro Edition
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {activeScreen === "racing" && (
                <button
                  onClick={handleLeaveRace}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 rounded-lg sm:rounded-xl text-rose-400 text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  🏳️ 途中棄権
                </button>
              )}
              
              {/* Audio Mute toggle button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 sm:p-2.5 border-1.5 sm:border-2 border-slate-700 rounded-lg sm:rounded-xl hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
              </button>
            </div>
          </header>
        )}

      {/* --- SCREEN 1: LOBBY & LEADERBOARD MAIN TAB --- */}
      {activeScreen === "lobby" && (
        <main 
          onClick={() => {
            if (!isLobbyStarted) {
              setIsLobbyStarted(true);
              playSynthSound("chime");
            }
          }}
          className={`flex-1 relative overflow-hidden flex flex-col justify-between p-6 md:p-12 transition-all duration-700 ${!isLobbyStarted ? 'cursor-pointer' : ''}`}
        >
          {/* Background Image Container with advanced brightness styling */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 brightness-120"
            style={{
              backgroundImage: `url(${cleanTrainLobbyImg})`,
            }}
          />

          {/* Minimal overlay backdrop to maintain rich colors while ensuring UI legibility */}
          <div className="absolute inset-0 bg-slate-950/15 pointer-events-none" />

          {!isLobbyStarted ? (
            /* --- SPLASH PRE-START STATE --- */
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-center select-none space-y-10 my-auto">
              
              {/* Logo & Prompt Wrapper (Moves slightly higher and holds them closely) */}
              <div className="flex flex-col items-center transform -translate-y-6 select-none w-full">
                {/* Official Game Title Logo with pixel-perfect transparent white keying */}
                <motion.div 
                  initial={{ x: -250, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 60, damping: 15 }}
                  className="max-w-[650px] md:max-w-[900px] mx-auto transition-transform duration-300 transform hover:scale-102 flex justify-center drop-shadow-[0_25px_50px_rgba(0,0,0,0.7)] w-[95%]"
                >
                  <img 
                    src={transparentLogo} 
                    alt="トレインレーシング TRAIN RACING" 
                    className="w-full h-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>

                {/* Start request text */}
                <div id="start-click-prompt" className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-pulse mt-4">
                  スペースキーかクリックでスタート
                </div>
              </div>

              {/* Meter and checkerflag stylized header logo */}
              <div className="flex items-center gap-4 bg-slate-900/95 border-2 border-yellow-500 rounded-xl px-5 py-3 shadow-2xl animate-bounce">
                <div className="flex -space-x-1">
                  <div className="w-4 h-8 bg-slate-100 transform -skew-x-12"></div>
                  <div className="w-4 h-8 bg-slate-950 transform -skew-x-12"></div>
                  <div className="w-4 h-8 bg-slate-100 transform -skew-x-12"></div>
                  <div className="w-4 h-8 bg-slate-950 transform -skew-x-12"></div>
                </div>
                <div className="text-sm md:text-lg font-mono font-black text-yellow-400 tracking-widest uppercase">
                  ⚡ HIGH VELOCITY 2D SIMULATOR ⚡
                </div>
              </div>

              {/* Blink trigger text */}
              <div className="space-y-6 flex flex-col items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLobbyStarted(true);
                    playSynthSound("chime");
                  }}
                  className="group relative h-16 w-80 sm:w-96 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-yellow-350 text-slate-950 font-sans font-extrabold text-2xl rounded-2xl shadow-[0_12px_40px_rgba(234,179,8,0.5)] flex items-center justify-center gap-4 cursor-pointer transform -skew-x-6 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 shadow-yellow-500/25 z-20"
                >
                  <div className="transform skew-x-6 flex items-center gap-3">
                    <span className="text-3xl animate-bounce">🎮</span>
                    <span className="tracking-widest text-slate-950 font-black">ゲームスタート / START</span>
                  </div>
                </button>
                
                <div className="text-xs md:text-sm text-slate-400 font-bold tracking-widest bg-slate-950/85 px-4 py-2 rounded-xl border border-slate-800 shadow-md">
                  スペースキー または 画面をタップしてシステム起動
                </div>
              </div>

              {/* Version indicator */}
              <div className="absolute bottom-0 text-xs font-mono text-slate-500">
                VER 1.0.0 • PRO-GRADE 2D RAIL RETRO ENGINE
              </div>
            </div>
          ) : (
            /* --- ACTIVE STARTED LOBBY STATE (SLID FROM LEFT TO RIGHT) --- */
            <motion.div 
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 16 }}
              className="flex-1 relative z-10 flex flex-col justify-between h-full"
            >
              {/* Core Layout: Controls middle left, metadata top left (No title text "トレインレーシング" display matches the spec) */}
              <div className="flex flex-col items-start gap-8 max-w-4xl select-none md:mt-4">
                
                {/* Accent Indicators */}
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-4 bg-slate-900/90 border-2 border-yellow-500 rounded-xl px-5 py-3 shadow-2xl">
                    <div className="flex -space-x-1">
                      <div className="w-4 h-8 bg-slate-100 transform -skew-x-12"></div>
                      <div className="w-4 h-8 bg-slate-950 transform -skew-x-12"></div>
                      <div className="w-4 h-8 bg-slate-100 transform -skew-x-12"></div>
                      <div className="w-4 h-8 bg-slate-950 transform -skew-x-12"></div>
                    </div>
                    <div className="text-xs md:text-sm font-mono font-black text-yellow-400 tracking-widest uppercase">
                      ⚡ HIGH VELOCITY 2D SIMULATOR ⚡
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 border-2 border-yellow-400 py-2.5 px-8 transform -skew-x-12 shadow-xl hover:brightness-110 transition-all pl-6">
                    <div className="transform skew-x-12 text-slate-950 font-black text-base md:text-lg italic tracking-widest leading-none drop-shadow-sm flex items-center gap-2.5">
                      <span>最速で目的地を目指せ！</span>
                    </div>
                  </div>
                </div>

                {/* Main Menu Button List - Scaled Up for visibility */}
                <div className="flex flex-col gap-2.5 w-80 sm:w-96 md:w-[420px]">
                  
                  {/* 1. Game Start Button */}
                  <button 
                    onClick={() => { playSynthSound('chime'); setActiveModal('game_start'); }}
                    className="group relative h-14 sm:h-16 md:h-18 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-yellow-350 text-slate-950 font-sans font-extrabold text-xl sm:text-2xl rounded-xl shadow-[0_8px_25px_rgba(234,179,8,0.45)] flex items-center justify-between px-6 cursor-pointer transform -skew-x-12 transition-all duration-200 hover:scale-103 hover:brightness-105 active:scale-97 active:translate-y-0.5"
                  >
                    <div className="transform skew-x-12 flex items-center gap-3 sm:gap-4">
                      <span className="text-2xl sm:text-3xl">🏁</span>
                      <span className="tracking-wide text-slate-950 font-black">ゲームスタート</span>
                    </div>
                    <div className="transform skew-x-12 text-xl font-black text-slate-950">▶</div>
                  </button>

                  {/* 2. New UI: Encyclopedia (図鑑) Button */}
                  <button 
                    onClick={() => { playSynthSound('beep'); setActiveModal('zukan'); }}
                    className="group relative h-11 sm:h-12 bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-900 border-2 border-emerald-500 hover:border-emerald-400 text-slate-100 font-sans font-bold text-sm sm:text-base rounded-xl shadow-lg flex items-center justify-between px-6 cursor-pointer transform -skew-x-12 transition-all duration-200 hover:scale-102 active:scale-98"
                  >
                    <div className="transform skew-x-12 flex items-center gap-3 sm:gap-4">
                      <span className="text-xl sm:text-2xl">📖</span>
                      <span className="font-extrabold">運行図鑑（ステージ・車両）</span>
                    </div>
                    <div className="transform skew-x-12 text-base font-black text-emerald-300">▶</div>
                  </button>

                  {/* 3. Ranking Button */}
                  <button 
                    onClick={() => { playSynthSound('beep'); setActiveModal('ranking'); }}
                    className="group relative h-11 sm:h-12 bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900 border-2 border-blue-500 hover:border-blue-400 text-slate-100 font-sans font-bold text-sm sm:text-base rounded-xl shadow-lg flex items-center justify-between px-6 cursor-pointer transform -skew-x-12 transition-all duration-200 hover:scale-102 active:scale-98"
                  >
                    <div className="transform skew-x-12 flex items-center gap-3 sm:gap-4">
                      <span className="text-xl sm:text-2xl">🏆</span>
                      <span className="font-extrabold">ランキング</span>
                    </div>
                    <div className="transform skew-x-12 text-base font-black text-blue-300">▶</div>
                  </button>

                  {/* 4. Options Button */}
                  <button 
                    onClick={() => { playSynthSound('beep'); setActiveModal('options'); }}
                    className="group relative h-11 sm:h-12 bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-900 border-2 border-blue-500 hover:border-blue-400 text-slate-100 font-sans font-bold text-sm sm:text-base rounded-xl shadow-lg flex items-center justify-between px-6 cursor-pointer transform -skew-x-12 transition-all duration-200 hover:scale-102 active:scale-98"
                  >
                    <div className="transform skew-x-12 flex items-center gap-3 sm:gap-4">
                      <span className="text-xl sm:text-2xl">⚙️</span>
                      <span className="font-extrabold">オプション</span>
                    </div>
                    <div className="transform skew-x-12 text-base font-black text-blue-300">▶</div>
                  </button>

                </div>

              </div>

              {/* Bottom Indicators (Left: Ver, Right: News/Howto) */}
              <div className="w-full flex items-end justify-between select-none mt-8">
                
                {/* Version Ticker */}
                <div className="bg-slate-950/80 px-4 py-2 rounded-lg border border-slate-800 text-slate-350 font-mono font-bold text-sm tracking-wide">
                  Ver.1.0.0
                </div>

                {/* Announcement & Play Guide Small buttons - Scaled Up for better touch targeting */}
                <div className="flex gap-5">
                  {/* News / Notice */}
                  <button 
                    onClick={() => { playSynthSound('beep'); setActiveModal('news'); }}
                    className="bg-gradient-to-b from-blue-950 to-indigo-950 hover:brightness-110 border-2 border-indigo-500 rounded-xl px-5 py-4 shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer w-28 h-28 transition-all font-sans animate-none"
                  >
                    <span className="text-4xl animate-pulse">📢</span>
                    <span className="text-xs md:text-sm text-slate-200 font-black tracking-widest mt-1">お知らせ</span>
                  </button>

                  {/* Instructions Guide */}
                  <button 
                    onClick={() => { playSynthSound('beep'); setActiveModal('how_to_play'); }}
                    className="bg-gradient-to-b from-blue-950 to-indigo-950 hover:brightness-110 border-2 border-indigo-500 rounded-xl px-5 py-4 shadow-lg flex flex-col items-center justify-center gap-2 cursor-pointer w-28 h-28 transition-all font-sans"
                  >
                    <span className="text-4xl font-extrabold text-indigo-400 leading-none">❓</span>
                    <span className="text-xs md:text-sm text-slate-200 font-black tracking-widest mt-1">遊び方</span>
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {/* AnimatePresence for beautiful overlay system dialog modals */}
          <AnimatePresence>
            {activeModal !== "none" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex items-center justify-center p-4 md:p-8"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 15, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-slate-700/85 shadow-[0_10px_35px_rgba(0,0,0,0.9)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative flex flex-col"
                >
                  {/* Decorative Metal Window Header */}
                  <div className="bg-gradient-to-r from-indigo-900 to-blue-900 border-b-4 border-slate-700 px-8 py-5 flex items-center justify-between text-slate-100">
                    <h3 className="font-sans font-black text-xl md:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-indigo-100">
                      {activeModal === "game_start" && "🏁 運転開始・ダイヤ＆車両選択"}
                      {activeModal === "zukan" && "📖 湘南・中央・山手 運行路線＆車両大図鑑"}
                      {activeModal === "ranking" && "🏆 全国運転士 ハイスコア・ランキング"}
                      {activeModal === "options" && "⚙️ システム指令・オプション設定"}
                      {activeModal === "news" && "📢 運行指令・トピックス"}
                      {activeModal === "how_to_play" && "❓ 新任運転士 養成実習マニュアル"}
                    </h3>
                    <button 
                      onClick={() => { playSynthSound('buzzer'); setActiveModal('none'); }}
                      className="text-slate-400 hover:text-slate-100 font-mono font-bold text-2xl cursor-pointer p-1"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Body Containers */}
                  <div className="p-8 md:p-10 space-y-8">

                    {/* MODAL: GAME START & DRIVER REGISTRATION */}
                    {activeModal === "game_start" && (
                      <div className="space-y-6">
                        <div className="space-y-2 text-center">
                          <p className="text-sm text-slate-300 font-sans leading-relaxed">
                            全ダイヤを管理する運行システムに対戦運転士名をエントリーし、乗務する路線と車両を選択してください。
                          </p>
                        </div>

                        {/* Driver nick form entry */}
                        <div className="space-y-3">
                          <label className="block text-sm font-mono font-black text-amber-400 tracking-wider">
                            DRIVER NICKNAME / 運転士登録名
                          </label>
                          <input
                            type="text"
                            maxLength={16}
                            placeholder="例：湘南快速マスター"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-6 py-4 text-slate-200 font-mono font-bold placeholder-slate-700 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all text-center text-xl"
                          />
                        </div>

                        {/* Integrated Route and Vehicle Select */}
                        <div className="space-y-3">
                          <label className="block text-sm font-mono font-black text-cyan-400 tracking-wider">
                            ROUTE & VEHICLE / 運行路線＆乗務車両の選択
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Shonan */}
                            <button
                              type="button"
                              onClick={() => { setSelectedLine('shonan'); playSynthSound('chime'); }}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left flex flex-col justify-between ${
                                selectedLine === 'shonan'
                                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                  : 'bg-slate-950/80 border-slate-850 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono block">JR TRUNK LINE</span>
                                <span className="text-base font-black text-slate-100 block mt-0.5">湘南新宿ライン</span>
                              </div>
                              <div className="mt-4">
                                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded font-mono">E231系 快速</span>
                                <span className="text-[10px] text-slate-400 block mt-2">直線特化・快速ダイヤ・2700m</span>
                              </div>
                            </button>

                            {/* Yamanote */}
                            <button
                              type="button"
                              onClick={() => { setSelectedLine('yamanote'); playSynthSound('chime'); }}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left flex flex-col justify-between ${
                                selectedLine === 'yamanote'
                                  ? 'bg-lime-950/40 border-lime-500 text-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.25)]'
                                  : 'bg-slate-950/80 border-slate-850 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div>
                                <span className="text-[10px] font-bold text-lime-500 uppercase font-mono block">DENSE METRO</span>
                                <span className="text-base font-black text-slate-100 block mt-0.5">山手線 各駅停車</span>
                              </div>
                              <div className="mt-4">
                                <span className="text-xs bg-lime-500/20 text-lime-300 font-bold px-2 py-0.5 rounded font-mono">E235系 各停</span>
                                <span className="text-[10px] text-slate-400 block mt-2">こまめな加減速・急制動・2100m</span>
                              </div>
                            </button>

                            {/* Chuo */}
                            <button
                              type="button"
                              onClick={() => { setSelectedLine('chuo'); playSynthSound('chime'); }}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left flex flex-col justify-between ${
                                selectedLine === 'chuo'
                                  ? 'bg-red-950/40 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                                  : 'bg-slate-950/80 border-slate-850 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div>
                                <span className="text-[10px] font-bold text-orange-500 uppercase font-mono block">URBAN CO-STEEL</span>
                                <span className="text-base font-black text-slate-100 block mt-0.5">中央快速線</span>
                              </div>
                              <div className="mt-4">
                                <span className="text-xs bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded font-mono">E233系 特快</span>
                                <span className="text-[10px] text-slate-400 block mt-2">最高出力・高速ラン・2800m</span>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Interactive rolling preview */}
                        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3 text-center">
                          <span className="text-[11px] font-mono text-indigo-400 block font-bold">
                            🚈 選択車両 2Dリアルタイム・シミュレータ模型
                          </span>
                          <div className="h-18 flex items-center justify-center overflow-hidden bg-slate-900/60 rounded-lg px-4 border border-slate-800">
                            <TrainVisual speed={45} isPlayer={true} line={selectedLine} />
                          </div>
                          <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                            {selectedLine === 'shonan' && "【E231系 湘南新宿ライン】 直線加速が持ち味。湘南大磯駅の停止ポイント直前の、車重を意識したブレーキワークが高得点の鍵。"}
                            {selectedLine === 'yamanote' && "【E235系 山手線】 駅間が短く、信号システムを考慮した迅速な加減速が必要。恵比寿駅で精密な定位置停車を実証せよ！"}
                            {selectedLine === 'chuo' && "【E233系 中央快速線】 加速性能に優れ、最高時速110km/hに到達。三鷹駅手前の制限信号を完璧にかわし高得点を目指せ。"}
                          </p>
                        </div>

                        {/* Selected configuration summary banner */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between font-mono text-xs text-slate-400">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Dial Route / Vehicle</span>
                            <span className="font-bold text-slate-200">
                              {selectedLine === 'yamanote' ? "山手線 E235系 各停" : selectedLine === 'chuo' ? "中央快速 E233系 特快" : "湘南新宿 E231系 快速"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block uppercase">Target Length</span>
                            <span className="font-bold text-indigo-400">
                              {getLineConfig(selectedLine).trackLength}メートル / 駅名: {getLineConfig(selectedLine).stationLabel}
                            </span>
                          </div>
                        </div>

                        {/* Start action launchers */}
                        <div className="space-y-3 pt-4 border-t border-slate-800/80">
                          <button
                            onClick={() => {
                              if (!nickname.trim()) {
                                alert("運転士のニックネームを入力してください。");
                                return;
                              }
                              setActiveModal('none');
                              handleJoinQueue(false);
                            }}
                            className="w-full bg-gradient-to-r from-indigo-700 to-indigo-650 hover:from-indigo-600 hover:to-indigo-550 text-white font-sans font-black text-lg py-4 px-8 rounded-2xl shadow-xl cursor-pointer transform transition-all active:scale-98 flex items-center justify-center gap-2"
                          >
                            <span>⚔️</span> オンライン全国対戦 運転開始
                          </button>

                          <button
                            onClick={() => {
                              if (!nickname.trim()) {
                                alert("運転士のニックネームを入力してください。");
                                return;
                              }
                              setActiveModal('none');
                              handleJoinQueue(true);
                            }}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-sans font-black text-base py-3 px-8 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2"
                          >
                            <span>🤖</span> 練習用のAIと対戦 (すぐ開始)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* NEW MODAL: ENCYCLOPEDIA (運行図鑑) */}
                    {activeModal === "zukan" && (
                      <div className="space-y-6">
                        <p className="text-sm text-slate-300 text-center leading-relaxed">
                          JR東日本の誇る主要路線と、そこを走る高性能2D通勤電車の精密技術スペック、及び運行ダイヤの専門データ図鑑です。
                        </p>

                        {/* Tab Selectors */}
                        <div className="flex border-b-2 border-slate-800">
                          <button
                            onClick={() => { playSynthSound('beep'); setZukanTab('train'); }}
                            className={`flex-1 py-3 font-sans font-black text-sm tracking-widest text-center transition-all border-b-4 -mb-[4px] cursor-pointer ${
                              zukanTab === 'train'
                                ? 'border-amber-500 text-amber-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            🚄 鉄道車両・精密形式データ
                          </button>
                          <button
                            onClick={() => { playSynthSound('beep'); setZukanTab('stage'); }}
                            className={`flex-1 py-3 font-sans font-black text-sm tracking-widest text-center transition-all border-b-4 -mb-[4px] cursor-pointer ${
                              zukanTab === 'stage'
                                ? 'border-amber-500 text-amber-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            🗺️ 運行路線・ステージダイヤ
                          </button>
                        </div>

                        {/* Quick Interactive Vehicle Selector (Changes local state to display chosen specs) */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedLine('shonan'); playSynthSound('beep'); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all text-center cursor-pointer ${
                              selectedLine === 'shonan'
                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                                : 'bg-slate-950 border-slate-850 text-slate-500'
                            }`}
                          >
                            E231系 湘南新宿
                          </button>
                          <button
                            onClick={() => { setSelectedLine('yamanote'); playSynthSound('beep'); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all text-center cursor-pointer ${
                              selectedLine === 'yamanote'
                                ? 'bg-lime-950/40 border-lime-500 text-lime-400'
                                : 'bg-slate-950 border-slate-850 text-slate-500'
                            }`}
                          >
                            E235系 山手線
                          </button>
                          <button
                            onClick={() => { setSelectedLine('chuo'); playSynthSound('beep'); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all text-center cursor-pointer ${
                              selectedLine === 'chuo'
                                ? 'bg-red-950/40 border-red-500 text-red-400'
                                : 'bg-slate-950 border-slate-850 text-slate-500'
                            }`}
                          >
                            E233系 中央快速
                          </button>
                        </div>

                        {/* Interactive Running model based on selected vehicle/line in zukan */}
                        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-center">
                          <span className="text-[10px] font-mono text-cyan-400 block pb-2 font-bold uppercase tracking-wider">
                            Realtime modeling preview / 2Dシミュレート車両稼働中
                          </span>
                          <div className="h-16 flex items-center justify-center overflow-hidden bg-slate-900/40 rounded-lg px-2 border border-slate-900">
                            <TrainVisual speed={60} isPlayer={true} line={selectedLine} />
                          </div>
                        </div>

                        {/* Tab Content 1: Trains Tech specs */}
                        {zukanTab === 'train' && (
                          <div className="space-y-4">
                            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl font-sans text-xs text-slate-300 leading-relaxed">
                              {selectedLine === 'shonan' && (
                                <>
                                  <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1.5 mb-2 flex items-center gap-1.5">
                                    <span className="text-emerald-500">■</span> JR東日本 E231系近郊形直流電車（国府津車両センター所属等）
                                  </h4>
                                  2000年に営業運転を開始し、首都圏のネットワーク拡大を支え続けるJR東日本の標準型車両。ステンレス軽量ボディ、VVVF自己インバータ（IGBT素子）を採用。最高時速120km/h、長い直線を得意とした加速設計が施されており、モーターから響く豪快な起動音が特徴です。
                                </>
                              )}
                              {selectedLine === 'yamanote' && (
                                <>
                                  <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1.5 mb-2 flex items-center gap-1.5">
                                    <span className="text-lime-500">■</span> JR東日本 E235系通勤形直流電車（東京総合車両センター所属）
                                  </h4>
                                  2015年に山手線に投入された最新鋭ハイテクコミューター。スマートフォンを想起させる前面窓など先鋭的デザイン。次世代情報管理装置「INTEROS」による高密度デジタル制御を誇り、高効率SiC素子VVVF制御により駅間が短い山手線に合わせた敏捷な加減速・緻密な純電気式ブレーキを行います。
                                </>
                              )}
                              {selectedLine === 'chuo' && (
                                <>
                                  <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1.5 mb-2 flex items-center gap-1.5">
                                    <span className="text-bold text-orange-500">■</span> JR東日本 E233系通勤形直流電車（豊田車両センター所属）
                                  </h4>
                                  主要機器（VVVF・電動ファン等）を二重化し驚異の運行信頼設計を確保した、JR東日本の大主力近郊・通勤形電車。2006年より中央快速線に登場。高い加速度（3.0km/h/s）を有し、オレンジのシンボル色を纏い、三鷹までの高規格な直線上を高音かつ心地よい高性能ダブルモーターを唸らせて駆け抜けます。
                                </>
                              )}
                            </div>

                            <table className="w-full text-left font-mono text-xs border border-slate-800 rounded-xl overflow-hidden shadow-md">
                              <thead>
                                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                                  <th className="p-3">技術項目</th>
                                  <th className="p-3">実車エンジニアリングスペック</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-slate-900 bg-slate-900/20">
                                  <td className="p-3 text-slate-400 font-bold">最高設計速度</td>
                                  <td className="p-3 text-slate-100">
                                    {selectedLine === 'shonan' ? "120 km/h （ゲーム最高速: 120km/h）" : selectedLine === 'yamanote' ? "110 km/h （ゲーム最高速: 90km/h）" : "120 km/h （ゲーム最高速: 110km/h）"}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-900 bg-slate-900/50">
                                  <td className="p-3 text-slate-400 font-bold">定格加速性能</td>
                                  <td className="p-3 text-slate-100">
                                    {selectedLine === 'shonan' ? "2.3 km/h/s （強力な慣性高速維持）" : selectedLine === 'yamanote' ? "3.0 km/h/s （高周波SiC超高速加減速）" : "3.0 km/h/s （二重系高出力システム）"}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-900 bg-slate-900/20">
                                  <td className="p-3 text-slate-400 font-bold">素子・制御方式</td>
                                  <td className="p-3 text-slate-100">
                                    {selectedLine === 'shonan' ? "IGBT-VVVF インバータ制御" : selectedLine === 'yamanote' ? "フルSiC（炭化ケイ素）MOSFET-VVVF 2重化" : "新世代 2重系3レベルIGBT-VVVF"}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-900 bg-slate-900/50">
                                  <td className="p-3 text-slate-400 font-bold">常用最大ブレーキ</td>
                                  <td className="p-3 text-indigo-300">
                                    {selectedLine === 'shonan' ? "電気指令式（増圧ブレーキ付き）" : selectedLine === 'yamanote' ? "純電気式回生ブレーキ （INTEROS協調高敏捷性）" : "回生ブレーキ併用電気指令式空気ブレーキ"}
                                  </td>
                                </tr>
                                <tr className="bg-slate-900/20">
                                  <td className="p-3 text-slate-400 font-bold">実車車体構成</td>
                                  <td className="p-3 text-slate-100">軽量ステンレス（sustina構造含む）車体・20m級4扉</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Tab Content 2: Stages Tech Specs */}
                        {zukanTab === 'stage' && (
                          <div className="space-y-4">
                            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl font-sans text-xs text-slate-300 leading-relaxed">
                              {selectedLine === 'shonan' && (
                                <>
                                  <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1.5 mb-2">
                                    🗺️ ステージ大形区間：湘南新宿ライン（東海道本線直通区間）
                                  </h4>
                                  大都市圏を跨ぐJR最長の快速系統。ゲームでは
                                  <span className="font-bold text-emerald-400"> 2700m </span> のロングストレートダイヤを模し、大磯付近を並走します。最高速度を高め、信号指示を遵守しながら、
                                  <span className="font-bold text-emerald-400">「湘南大磯駅」</span>にどれだけ正確に、短い時間で制動停止できるかを検証するハイスピードステージです。
                                </>
                              )}
                              {selectedLine === 'yamanote' && (
                                <>
                                  <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1.5 mb-2">
                                    🗺️ ステージ大形区間：山手線（恵比寿～渋谷周辺デジタル環状）
                                  </h4>
                                  東京の大心臓を30両/毎時でつなぐメガ密度の環状線。
                                  <span className="font-bold text-lime-400"> 2100m </span>の比較的短いステージ距離。中間でのATC信号切り替えスパンが短く、素早い対応と無駄のないノッチコントロールが求められます。最後に滑り込む
                                  <span className="font-bold text-lime-400">「恵比寿駅」</span>は停止猶予レンジが極めてシビア！
                                </>
                              )}
                              {selectedLine === 'chuo' && (
                                <>
                                  <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1.5 mb-2">
                                    🗺️ ステージ大形区間：中央線快速電鉄ダイヤ（三鷹～国分寺ロングダッシュ）
                                  </h4>
                                  どこまでもまっすぐに伸びるオレンジの急行高架複々線。
                                  <span className="font-bold text-orange-400"> 2800m </span>最長区間。時速100キロを突破する急激な立ち上がりがあり高出力G-Masterモーターが唸りを上げます。三鷹手前での特殊閉塞信号に素早く反応し、
                                  <span className="font-bold text-orange-400">「三鷹駅」</span>にピタドメの刹那の定規運転が勝利への切符です。
                                </>
                              )}
                            </div>

                            <table className="w-full text-left font-mono text-xs border border-slate-800 rounded-xl overflow-hidden shadow-md">
                              <thead>
                                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                                  <th className="p-3">運行・路警指標</th>
                                  <th className="p-3">ゲーム内路線スペック</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-slate-900 bg-slate-900/20">
                                  <td className="p-3 text-slate-400 font-bold">全線路線長</td>
                                  <td className="p-3 text-slate-100 font-bold">{getLineConfig(selectedLine).trackLength} m</td>
                                </tr>
                                <tr className="border-b border-slate-900 bg-slate-900/50">
                                  <td className="p-3 text-slate-400 font-bold">営業停止駅名</td>
                                  <td className="p-3 text-yellow-400 font-bold">{getLineConfig(selectedLine).stationLabel}</td>
                                </tr>
                                <tr className="border-b border-slate-900 bg-slate-900/20">
                                  <td className="p-3 text-slate-400 font-bold">第一減速信号（注意）位置</td>
                                  <td className="p-3 text-slate-100">{getLineConfig(selectedLine).signal1} m地点 (速度制限 55km/h)</td>
                                </tr>
                                <tr className="border-b border-slate-900 bg-slate-900/50">
                                  <td className="p-3 text-slate-400 font-bold">第二減速信号（警戒）位置</td>
                                  <td className="p-3 text-slate-100">{getLineConfig(selectedLine).signal2} m地点 (速度制限 30km/h)</td>
                                </tr>
                                <tr className="bg-slate-900/20">
                                  <td className="p-3 text-slate-400 font-bold">第零ホーム進入駅停止限界</td>
                                  <td className="p-3 text-slate-100">{getLineConfig(selectedLine).stationStart} m ～ {getLineConfig(selectedLine).stationEnd} m (完全停止位置目標: {getLineConfig(selectedLine).stationStop} m)</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* MODAL: RANKING */}
                    {activeModal === "ranking" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <p className="text-xs text-slate-400 font-sans">
                            安全と正確、最速タイムを極めた全国の上位運転士たちです。
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">TOP 10 DRIVERS</span>
                        </div>

                        {/* Leaderboard Rendering */}
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {leaderboard.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-600 font-mono">
                              ランキング記録がまだありません。
                            </div>
                          ) : (
                            leaderboard.slice(0, 10).map((entry, index) => (
                              <div
                                key={entry.id || idx(index, entry.name)}
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono transition-all ${
                                  index === 0 
                                    ? "bg-amber-950/30 border-amber-500/60 text-amber-200 shadow-md" 
                                    : index === 1 
                                      ? "bg-slate-800/60 border-slate-700 text-slate-200" 
                                      : "bg-slate-950 border-slate-900 text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                    index === 0 
                                      ? "bg-amber-500 text-slate-950 shadow-sm" 
                                      : index === 1 
                                        ? "bg-slate-400 text-slate-950" 
                                        : index === 2 
                                          ? "bg-amber-700 text-slate-100" 
                                          : "bg-slate-800 text-slate-400"
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <span className="truncate max-w-[140px] font-bold text-sm">{entry.name}</span>
                                </div>
                                <span className="font-extrabold text-sm text-emerald-400">
                                  {getLeaderboardTimeStr(entry.time)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[9.5px] text-slate-400 font-sans leading-relaxed">
                          🏆 **安全運行指針**: 信号冒涜（赤走中）やカーブ制限速度の危険超過は即時「脱線」または「ATC自動緊急停止ペナルティ」を起こし、大きなタイムロスになります。
                        </div>
                      </div>
                    )}

                    {/* MODAL: OPTIONS */}
                    {activeModal === "options" && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-xs font-sans font-black text-indigo-400 uppercase tracking-widest">
                            音量オーディオ・シグナル
                          </h4>
                          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-4">
                            <span className="text-sm text-slate-300 font-sans">
                              マスターシステム・チャイム音
                            </span>
                            <button
                              onClick={() => { setIsMuted(!isMuted); playSynthSound('beep'); }}
                              className="px-4 py-2 rounded-lg font-mono font-bold text-xs cursor-pointer transition-all border flex items-center gap-2"
                              style={{
                                backgroundColor: isMuted ? '#4c0519' : '#064e3b',
                                borderColor: isMuted ? '#f43f5e' : '#10b981',
                                color: isMuted ? '#fda4af' : '#a7f3d0'
                              }}
                            >
                              {isMuted ? '🔇 消音中 (MUTED)' : '🔊 鳴動中 (ACTIVE)'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-sans font-black text-indigo-400 uppercase tracking-widest">
                            公式走行競路規約 (Rules)
                          </h4>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 font-sans space-y-2 leading-relaxed">
                            <p>
                              1. **中間駅停車**: 本シミュレータには運行上の重要チェックポイントとして、中間に旅客扱い駅が存在します。
                            </p>
                            <p>
                              2. 停車指定範囲（±1.5m以内）に完全に停止すると、乗客扱い待機が最速で終了し、さらに15秒間の**1.6倍加速ブースト**を獲得できます！
                            </p>
                            <p>
                              3. オーバーラン（超過）すると、苦情処理ペナルティとして5.0秒間強制加速出力ゼロの重い足枷が課せられます。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MODAL: NEWS */}
                    {activeModal === "news" && (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-xs text-slate-300 space-y-4 font-sans leading-relaxed">
                        <div className="border-b border-slate-800 pb-3">
                          <span className="text-indigo-400 font-mono font-bold block">[UPDATE 2026-06-16]</span>
                          <span className="text-slate-100 font-black text-sm mt-1 block">トレインレーシング ２Ｄ 運行全面開始！</span>
                        </div>
                        <p>
                          ・**JR東日本主力車両の乗り入れ対応完了！** 湘南色E231系を筆頭に、最新山手線E235系、中央高速仕様のE233系がフルパワー運転できるようになりました。
                        </p>
                        <p>
                          ・**中駅「完璧制動ボーナス」実装！** 停車精度±1.5m以下の「エクセレント」を記録すると、加速が飛躍的にアップする限定ブーストと、排熱瞬間冷却が発動します。
                        </p>
                        <p>
                          ・**信号保安設備(ATC)アップデート！** 路線進行上で「警戒制限(黄色: 60km/h以下)」および「赤（即停止）」シグナルをシミュレート。スピード構造に細心の注意を払いましょう。
                        </p>
                      </div>
                    )}

                    {/* MODAL: HOW TO PLAY */}
                    {activeModal === "how_to_play" && (
                      <div className="space-y-6">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3 font-sans">
                          <span className="text-[11px] font-black text-indigo-400 block border-b border-slate-800 pb-2 uppercase tracking-wider">
                            🎮 司令室・マスコン(マニュアル)操作方法
                          </span>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col items-center text-center">
                              <span className="px-2 py-1 bg-amber-500 rounded text-slate-950 font-bold font-mono">W キー</span>
                              <span className="text-[10px] text-slate-400 mt-1">または ↑矢印キー</span>
                              <span className="text-slate-200 mt-2 font-bold">マスコン投入 (加速)</span>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col items-center text-center">
                              <span className="px-2 py-1 bg-blue-500 rounded text-slate-950 font-bold font-mono">S キー</span>
                              <span className="text-[10px] text-slate-400 mt-1">または ↓矢印キー</span>
                              <span className="text-slate-200 mt-2 font-bold">ブレーキ制動 (減速)</span>
                            </div>
                          </div>

                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center text-xs">
                            <span className="px-2 py-1 bg-red-600 rounded text-white font-bold font-mono">Space キー</span>
                            <span className="text-slate-200 ml-2 font-bold">EB 非常ブレーキ始動！</span>
                          </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 font-sans space-y-2 leading-relaxed">
                          <span className="text-amber-400 font-bold block">💡 快速ランの裏ワザ・プロ技：</span>
                          <p>
                            ・【過熱に注意】：加速「P4」を連続投入し続けるとモーターが過熱、100%に達すると保護システムが作動して、完全に冷却(25%以下)されるまで一切加速できなくなります。駅への進入や減速時(B1〜B3)に効率よく冷却しましょう！
                          </p>
                          <p>
                            ・【信号機を注視】：走行中にある「🚦1」と「🚦2」の信号。時間が経過すると自動的に赤から黄色、そして青へ変わります。赤信号のまま突入すると即ATC自動緊急停止により数秒間コントロール不能になります！
                          </p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Modal Footer Decorative */}
                  <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex items-center justify-end">
                    <button
                      onClick={() => { playSynthSound('buzzer'); setActiveModal('none'); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold text-xs py-2 px-5 rounded-lg shadow cursor-pointer"
                    >
                      閉じる
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      )}

      {/* --- SCREEN 2: ACTIVE MATCHMAKING LOBBY --- */}
      {activeScreen === "matchmaking" && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 my-auto text-center">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-t-indigo-500 border-slate-800 rounded-full animate-spin"></div>
              <Train className="w-10 h-10 text-indigo-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-mono font-bold text-slate-100 animate-pulse">
                対戦相手をお探ししています...
              </h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                全国の稼働中ダイヤのなかから、直行競争が行える他線区の運転士をマッチング中。
              </p>
            </div>

            <div className="border border-slate-800/80 bg-slate-950 rounded-xl p-4.5">
              <span className="text-[10px] text-indigo-400 font-mono block mb-1">YOUR PROFILE</span>
              <span className="font-mono text-sm font-bold text-slate-200">{nickname}</span>
              <div className="text-[10px] text-slate-500 mt-2 font-mono">
                ※ 数十秒経ってもマッチしない場合は、下のボタンから待機リスト内で自動CPUを追加して起動できます。
              </div>
            </div>

            {/* Cancel/Force CPU controllers */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <button
                onClick={async () => {
                  try {
                    const cpuRes = await fetch(`/api/rooms/${roomId}/cpu`, {
                      method: "POST",
                    });
                    const cpuData = await cpuRes.json();
                    setRoom(cpuData);
                    setIsCpuMatch(true);
                    const foundCpuKey = Object.keys(cpuData.players).find((id) => id.startsWith("cpu_"));
                    if (foundCpuKey) {
                      cpuPlayerIdRef.current = foundCpuKey;
                    }
                    playSynthSound("chime");
                  } catch (_) {}
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold py-2.5 px-4 rounded-xl cursor-pointer text-xs"
              >
                すぐにCPUを呼んでプレイする 🤖
              </button>

              <button
                onClick={handleLeaveRace}
                className="w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-mono py-2 px-4 rounded-xl cursor-pointer text-xs"
              >
                マッチングをキャンセルして戻る
              </button>
            </div>
          </div>
        </main>
      )}

      {/* --- SCREEN 3: ACTIVE GAMEBOARD RACING --- */}
      {activeScreen === "racing" && room && (
        <main className="flex-1 flex flex-col p-3 sm:p-4 gap-3 md:gap-4 relative select-none overflow-hidden justify-between h-full">
          
          {/* TRACK HUD BAR PANEL */}
          {(() => {
            const lineType = room?.line || 'shonan';
            const cfg = getLineConfig(lineType);
            const dynamicTrackLength = cfg.trackLength;
            
            return (
              <section className="bg-slate-900 border-2 border-slate-800 rounded-xl p-2 sm:p-3 shadow-lg flex flex-wrap gap-2 sm:gap-4 items-center justify-between">
                {/* Left Section: Progress track layout overview */}
                <div className="flex-1 min-w-[280px]">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>始発駅 (0m)</span>
                    <span className="text-emerald-400 font-bold">🚉 {cfg.stationLabel}停車 ( {cfg.stationStart}〜{cfg.stationEnd}m )</span>
                    <span>終点駅 ({dynamicTrackLength}m)</span>
                  </div>
                  <div className="relative bg-slate-950 h-5 border-2 border-slate-800 rounded-lg overflow-hidden flex items-center">
                    {/* Station Zone anchor on physical map bar */}
                    <div 
                      className="absolute bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)] border-x border-emerald-500/50 h-full text-[9px] text-emerald-300/80 font-mono font-bold flex items-center justify-center animate-pulse"
                      style={{
                        left: `${(cfg.stationStart / dynamicTrackLength) * 100}%`,
                        width: `${((cfg.stationEnd - cfg.stationStart) / dynamicTrackLength) * 100}%`
                      }}
                    >
                      STATION
                    </div>

                    {/* Signals markers on bar */}
                    <div 
                      className="absolute w-2 h-full border-x border-amber-500/30 font-mono bg-amber-500/10 flex items-center justify-center font-bold text-[8px] text-amber-400"
                      style={{ left: `${(cfg.signal1 / dynamicTrackLength) * 100}%` }}
                    >
                      🚦1
                    </div>
                    {cfg.signal2 && (
                      <div 
                        className="absolute w-2 h-full border-x border-amber-500/30 font-mono bg-amber-500/10 flex items-center justify-center font-bold text-[8px] text-amber-400"
                        style={{ left: `${(cfg.signal2 / dynamicTrackLength) * 100}%` }}
                      >
                        🚦2
                      </div>
                    )}

                    {/* Speed limit zones warnings blocks */}
                    <div 
                      className="absolute border-x border-rose-500/30 font-mono bg-rose-500/5 flex items-center justify-center text-[7px]"
                      style={{ 
                        left: `${(lineType === 'yamanote' ? 200 : lineType === 'chuo' ? 1600 : 1200) / dynamicTrackLength * 100}%`, 
                        width: `${(lineType === 'yamanote' ? 250 : lineType === 'chuo' ? 300 : 300) / dynamicTrackLength * 100}%` 
                      }}
                    >
                      {lineType === 'yamanote' ? 'CURVE' : 'BRIDGE'}
                    </div>

                    {/* PLAYER 1 POSITION ICON */}
                    <div 
                      className="absolute w-4 h-4 bg-indigo-500 border border-white rounded-full z-10 transition-all duration-300 flex items-center justify-center -translate-x-1/2 shadow-md shadow-indigo-600/50"
                      style={{ left: `${Math.min(100, (renderStats.myPosition / dynamicTrackLength) * 100)}%` }}
                    >
                      <span className="text-[8px] text-white font-extrabold">▼</span>
                    </div>

                    {/* OPPONENT POSITION ICON */}
                    <div 
                      className="absolute w-4.5 h-4.5 bg-amber-600 border border-white rounded z-10 transition-all duration-300 flex items-center justify-center -translate-x-1/2"
                      style={{ left: `${Math.min(100, (renderStats.opponentPosition / dynamicTrackLength) * 100)}%` }}
                    >
                      <span className="text-[7px] text-white">C</span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Time ticker, remaining distance progress details */}
                <div className="flex gap-4 items-center">
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-500">ELAPSED TIME</div>
                    <div className="text-2xl font-mono font-bold text-slate-200 tracking-wider">
                      {getElapsedTimeStr()}
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-right">
                    <div className="text-[9px] font-mono text-indigo-400">NEXT GOAL DIST</div>
                    <div className="text-sm font-mono font-bold text-indigo-200">
                      {Math.round(dynamicTrackLength - renderStats.myPosition)}m
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ACTIVE 2D PARALLAX RAILWAY RACING STAGE */}
          <section className="relative h-28 sm:h-32 md:h-36 lg:h-40 bg-gradient-to-b from-sky-950 to-indigo-950 border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-end shrink-0">
            
            {/* Background Parallax: Sky & Stars */}
            <div 
              className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none transition-all duration-100"
              style={{ backgroundPosition: `${skyOffset}px 0` }}
            ></div>

            {/* Parallax Mountains layer (Outline look) */}
            <div 
              className="absolute bottom-6 left-0 right-0 h-16 bg-no-repeat bg-bottom pointer-events-none opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 100'%3E%3Cpolygon points='0,100 80,40 160,100 240,30 320,100 400,50' fill='%23475569'/%3E%3C/svg%3E")`,
                backgroundSize: '400px 60px',
                backgroundPosition: `${mtOffset}px bottom`
              }}
            ></div>

            {/* Signals structures physically visible on the track side scrolling! */}
            {(() => {
              const elapsedSec = raceStartTimeRef.current ? (Date.now() - raceStartTimeRef.current) / 1000 : 0;
              const lineType = room?.line || 'shonan';
              const cfg = getLineConfig(lineType);

              const s1Red = elapsedSec < 12;
              const s1Yellow = elapsedSec >= 12 && elapsedSec < 18;

              const s2Red = elapsedSec < 24;
              const s2Yellow = elapsedSec >= 24 && elapsedSec < 30;

              // Compute physical scrolling offsets of signals relative to player train position
              const signal1ScrollX = ((cfg.signal1 - renderStats.myPosition) * 4.0) + 120; // centered screen offset
              const signal2ScrollX = (cfg.signal2 ? ((cfg.signal2 - renderStats.myPosition) * 4.0) + 120 : -999);

              const stationScrollX = ((cfg.stationStop - renderStats.myPosition) * 4.0) + 120;

              return (
                <>
                  {/* Station building visible */}
                  {stationScrollX > -200 && stationScrollX < 1200 && (
                    <div 
                      className="absolute bottom-[22px] h-10 bg-slate-800 border-x border-t border-slate-700 px-3 py-0.5 flex flex-col justify-between z-0 shadow-lg text-slate-300 pointer-events-none w-[150px]"
                      style={{ left: `${stationScrollX}px` }}
                    >
                      <div className="text-[7px] font-mono bg-emerald-950 text-emerald-400 px-1 font-bold truncate">
                        {cfg.stationLabel.toUpperCase()}
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 border border-slate-700 text-[6px] px-1 font-mono">
                        <span>■ Stop Marker</span>
                        <span className="text-amber-500 animate-pulse">0km/h</span>
                      </div>
                    </div>
                  )}

                  {/* Signal 1 structure */}
                  {signal1ScrollX > -50 && signal1ScrollX < 1200 && (
                    <div 
                      className="absolute bottom-[22px] w-8 h-15 flex flex-col items-center justify-end z-0 pointer-events-none"
                      style={{ left: `${signal1ScrollX}px` }}
                    >
                      {/* Signal post frame */}
                      <div className="w-4 h-5 bg-slate-900 border border-slate-700 rounded-md p-0.5 flex flex-col justify-around items-center">
                        <circle cx="0" cy="0" r="1.5" className={`w-1.5 h-1.5 rounded-full ${s1Red ? "bg-red-500 animate-pulse shadow-[0_0_8px_red]" : "bg-red-950"}`} />
                        <circle cx="0" cy="0" r="1.5" className={`w-1.5 h-1.5 rounded-full ${s1Yellow ? "bg-amber-500 shadow-[0_0_8px_yellow]" : "bg-amber-950"}`} />
                        <circle cx="0" cy="0" r="1.5" className={`w-1.5 h-1.5 rounded-full ${(!s1Red && !s1Yellow) ? "bg-emerald-500 shadow-[0_0_8px_green]" : "bg-emerald-950"}`} />
                      </div>
                      <div className="w-1.5 h-10 bg-slate-700"></div>
                      <div className="text-[6px] font-mono text-slate-500">{cfg.signal1}m</div>
                    </div>
                  )}

                  {/* Signal 2 structure */}
                  {cfg.signal2 && signal2ScrollX > -50 && signal2ScrollX < 1200 && (
                    <div 
                      className="absolute bottom-[22px] w-8 h-15 flex flex-col items-center justify-end z-0 pointer-events-none"
                      style={{ left: `${signal2ScrollX}px` }}
                    >
                      <div className="w-4 h-5 bg-slate-900 border border-slate-700 rounded-md p-0.5 flex flex-col justify-around items-center">
                        <circle cx="0" cy="0" r="1.5" className={`w-1.5 h-1.5 rounded-full ${s2Red ? "bg-red-500 animate-pulse shadow-[0_0_8px_red]" : "bg-red-950"}`} />
                        <circle cx="0" cy="0" r="1.5" className={`w-1.5 h-1.5 rounded-full ${s2Yellow ? "bg-amber-500 shadow-[0_0_8px_yellow]" : "bg-amber-950"}`} />
                        <circle cx="0" cy="0" r="1.5" className={`w-1.5 h-1.5 rounded-full ${(!s2Red && !s2Yellow) ? "bg-emerald-500 shadow-[0_0_8px_green]" : "bg-emerald-950"}`} />
                      </div>
                      <div className="w-1.5 h-10 bg-slate-700"></div>
                      <div className="text-[6px] font-mono text-slate-500">{cfg.signal2}m</div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* TRACK 1: Player's Train (Track layout) */}
            <div className="h-11 relative bg-slate-900/60 border-b border-indigo-900/40 z-10 flex items-center pr-12">
              {/* Rails moving background */}
              <div 
                className="absolute inset-0 bg-repeat-x opacity-25"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2500/svg' viewBox='0 0 40 8'%3E%3Cline x1='0' y1='4' x2='40' y2='4' stroke='%23ffffff' stroke-width='1.5'/%3E%3Cline x1='10' y1='0' x2='10' y2='8' stroke='%23ffffff' stroke-width='1.5'/%3E%3Cline x1='30' y1='0' x2='30' y2='8' stroke='%23ffffff' stroke-width='1.5'/%3E%3C/svg%3E")`,
                  backgroundSize: '40px 8px',
                  backgroundPosition: `${trackOffset}px bottom`
                }}
              ></div>

              {/* Player train wrapper fixed at viewport 120px offset */}
              <div className="absolute left-[120px]" style={{ width: '320px', height: '62px' }}>
                <TrainVisual 
                  speed={renderStats.mySpeed} 
                  isBraking={myMasconRef.current.startsWith("B") || myMasconRef.current === "EB"}
                  isPlayer={true}
                  derailed={renderStats.myDerailed}
                  line={room?.line || 'shonan'}
                />
              </div>
            </div>

            {/* TRACK 2: Opponent's Train (Parallel track below yours) */}
            <div className="h-9 relative bg-slate-950/70 z-10 flex items-center pr-12">
              <div 
                className="absolute inset-0 bg-repeat-x opacity-15"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 8'%3E%3Cline x1='0' y1='4' x2='40' y2='4' stroke='%23ffffff' stroke-width='1.5'/%3E%3Cline x1='5' y1='0' x2='5' y2='8' stroke='%23ffffff' stroke-width='1.5'/%3E%3Cline x1='25' y1='0' x2='25' y2='8' stroke='%23ffffff' stroke-width='1.5'/%3E%3C/svg%3E")`,
                  backgroundSize: '40px 8px',
                  backgroundPosition: `${trackOffset}px bottom`
                }}
              ></div>

              {/* Opponent train relative offset position */}
              {(() => {
                // Determine scrolling coordinate translation based on distance difference (1 meter difference is 4.0 physical pixels offset)
                const relativeDist = renderStats.opponentPosition - renderStats.myPosition;
                const opponentX = 120 + (relativeDist * 4.0);

                if (opponentX > -500 && opponentX < 1200) {
                  return (
                    <div className="absolute transition-all duration-300" style={{ left: `${opponentX}px`, width: '320px', height: '62px', bottom: '0px' }}>
                      <TrainVisual 
                        speed={renderStats.opponentSpeed} 
                        isBraking={renderStats.opponentMascon.startsWith("B") || renderStats.opponentMascon === "EB"}
                        isPlayer={false}
                        isAI={isCpuMatch}
                        derailed={renderStats.opponentDerailed}
                        line={room?.line || 'shonan'}
                      />
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Start Countdown Chime / Semaphore Banner Overlay */}
            {room.status === "countdown" && room.countdownSec !== undefined && room.countdownSec > 0 && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center font-mono z-20">
                <div className="text-[10px] text-emerald-400 tracking-widest uppercase mb-1">AUTOMATIC ATC INITIATING</div>
                <div className="text-4xl font-extrabold text-slate-100 animate-pulse tracking-tight">
                  信号変化まで あと {room.countdownSec} 秒
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  画面のマスコンハンドル［P4 / Wキー］に指をかけて発車待機！
                </div>
              </div>
            )}

            {/* Station stopped boarding indicator timer */}
            {boardingTimeLeft > 0 && (
              <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center font-mono z-20">
                <span className="text-xs text-emerald-400 font-bold">{stationGrade}</span>
                <span className="text-[10.5px] text-slate-300 max-w-sm mt-1">{stationMsg}</span>
                <div className="mt-4 flex items-center gap-2 bg-emerald-950 border border-emerald-800 px-4 py-1.5 rounded-full text-emerald-300 animate-pulse font-bold text-sm">
                  乗客乗降中 ドア閉まで：{boardingTimeLeft.toFixed(1)}s
                </div>
              </div>
            )}

            {/* Active derailment emergency overlay */}
            {renderStats.myDerailed && boardingTimeLeft === 0 && (
              <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center font-mono z-20 animate-pulse">
                <ShieldAlert className="w-12 h-12 text-red-500 animate-bounce mb-2" />
                <div className="text-lg font-bold text-red-200">🚨 脱線転覆事故 発生 🚨</div>
                <div className="text-xs text-red-400 mt-1 max-w-xs text-center leading-normal">
                  制限速度を過大に超過、もしくは赤信号通過により脱線。非常保線車両にて復旧中です...
                </div>
                <div className="font-bold text-sm text-slate-200 mt-3 bg-red-800/60 px-4 py-1 rounded-full">
                  復旧完了まで あと {renderStats.myDerailTimeLeft.toFixed(1)} 秒
                </div>
              </div>
            )}

            {/* ATC safety limit Warning alerts overlay */}
            {atcWarning && !renderStats.myDerailed && boardingTimeLeft === 0 && (
              <div className="absolute left-4 top-4 bg-amber-950/85 border border-amber-600/50 rounded-lg px-3 py-1.5 font-mono text-[10px] text-amber-300 z-10 animate-pulse flex items-center gap-2">
                <AlertIcon className="w-3.5 h-3.5 animate-bounce" />
                <span>{atcWarning}</span>
              </div>
            )}

            {/* Speed Boost notifier indicator */}
            {speedBoostActive && (
              <div className="absolute right-4 top-4 bg-emerald-950/85 border border-emerald-600/50 rounded-lg px-3 py-1 text-[10px] font-mono text-emerald-300 z-10 flex items-center gap-1.5 animate-pulse">
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>⚡️ 大磯停車ブースト（残: {Math.round(boostTimer)}s） x1.6 加速!</span>
              </div>
            )}

          </section>

          {/* ACTIVE CAB MASCON INTERACTIVE CONTROLLER PANEL */}
          <section className="mt-auto">
            <MasconController 
              currentNotch={renderStats.myMascon}
              setNotch={handleSetNotch}
              speed={renderStats.mySpeed}
              overheat={renderStats.myOverheat}
              acceleration={
                renderStats.myDerailed 
                  ? 0 
                  : (renderStats.myMascon === "P4" ? 2.8 : renderStats.myMascon === "P3" ? 2.0 : renderStats.myMascon === "P2" ? 1.1 : renderStats.myMascon === "P1" ? 0.5 : renderStats.myMascon === "N" ? 0 : renderStats.myMascon === "B1" ? -1.6 : renderStats.myMascon === "B2" ? -3.5 : renderStats.myMascon === "B3" ? -5.8 : -9.2)
              }
            />
          </section>
        </main>
      )}

      {/* --- SCREEN 4: GAME OVER / RACE COMPLETE PODIUM --- */}
      {activeScreen === "completed" && room && (
        <main className="flex-1 max-w-lg w-full mx-auto p-6 md:p-8 flex flex-col justify-center items-center my-auto text-slate-100">
          <div className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            
            <div className="space-y-2 border-b border-slate-800 pb-5">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-md shadow-amber-500/25">
                <Award className="w-10 h-10 text-slate-950 animate-bounce" />
              </div>
              <h2 className="text-2xl font-mono font-bold text-slate-100">
                競路勝負ダイヤ 終了！
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                終端 2700m 付近。全列車が走行区間を完走しました。
              </p>
            </div>

            {/* Race Summary Statistics and Winner declaration */}
            <div className="space-y-4 bg-slate-950 border border-slate-800/80 rounded-xl p-5 text-left font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <span className="text-xs text-slate-500">🏆 WINNER 運転士名</span>
                <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
                  {room.winnerId === playerId ? nickname : (room.players[room.winnerId || ""]?.name || "対戦相手")}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-[10px] text-slate-500 uppercase tracking-widest">レース記録詳細</h4>
                
                {/* Your stats */}
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" /> {nickname} (あなた)
                  </span>
                  <span className="font-bold text-emerald-400">
                    {renderStats.myFinishTime ? getLeaderboardTimeStr(renderStats.myFinishTime) : "リタイア / 記録なし"}
                  </span>
                </div>

                {/* Opponent's stats */}
                {(() => {
                  const oppKey = Object.keys(room.players).find((id) => id !== playerId);
                  if (oppKey) {
                    const opp = room.players[oppKey];
                    return (
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded bg-amber-500" /> {opp.name}
                        </span>
                        <span className="font-bold text-slate-400">
                          {opp.finishTime ? getLeaderboardTimeStr(opp.finishTime) : "リタイア / 記録なし"}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {room.winnerId === playerId ? (
                <div className="mt-4 p-3 bg-indigo-950/30 border border-indigo-900/60 rounded-lg text-[10.5px] text-indigo-300 text-center leading-relaxed">
                  🎉 おめでとうございます！他線のライバルを僅差で抑え、名誉ある安全神速レコードを獲得しました！
                </div>
              ) : (
                <div className="mt-4 p-3 bg-amber-950/20 border border-amber-900/50 rounded-lg text-[10.5px] text-amber-300 text-center leading-relaxed">
                  🏁 惜しい！対戦相手の精妙な制動停車が光りました。次回は大磯駅完美停止ボーナスで逆転を狙いましょう！
                </div>
              )}
            </div>

            {/* Back action */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleLeaveRace}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <RotateCcw className="w-4 h-4" /> 
                競路乗務員ロビーへ戻る
              </button>
            </div>

          </div>
        </main>
      )}

      {/* Close 16:9 Aspect Ratio Arcade Console Frame Container */}
      </div>

      {/* FOOTER GENERAL INFO */}
      <footer className="bg-slate-950 py-3 border-t border-slate-900/60 px-6 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-600 font-mono z-10 w-full max-w-[1440px] mt-2 shrink-0">
        <span>© 2026 JR Shonan Sim Co. Ltd. • All Rights Reserved.</span>
        <span className="flex items-center gap-4 mt-2 md:mt-0">
          <span>サーバーポート: 3000 (Ingress)</span>
          <span>開発ビルド検証済み</span>
        </span>
      </footer>

    </div>
  );
}

// Simple fallback id generation if duplicates are detected
function idx(index: number, name: string): string {
  return `${index}_${name.substring(0, 31)}`;
}
