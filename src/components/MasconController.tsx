import React, { useEffect, useCallback } from "react";
import { MasconState } from "../types.js";
import { Zap, Gauge, Flame, Keyboard } from "lucide-react";

interface MasconControllerProps {
  currentNotch: MasconState;
  setNotch: (notch: MasconState) => void;
  speed: number;
  overheat: number;
  acceleration: number; // m/s2 or positive/negative rate
}

const NOTCH_LIST: MasconState[] = ["P4", "P3", "P2", "P1", "N", "B1", "B2", "B3", "EB"];

export const MasconController: React.FC<MasconControllerProps> = ({
  currentNotch,
  setNotch,
  speed,
  overheat,
  acceleration
}) => {
  // Listen for keyboard controls: W / Up Arrow (Increase Power), S / Down Arrow (Increase Braking)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      // Safeguard if user is typing in chat or nickname input
      if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
        return;
      }

      const currentIndex = NOTCH_LIST.indexOf(currentNotch);
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") {
        e.preventDefault();
        // Go UP (towards P4, index decreasing)
        if (currentIndex > 0) {
          setNotch(NOTCH_LIST[currentIndex - 1]);
        }
      } else if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") {
        e.preventDefault();
        // Go DOWN (towards EB, index increasing)
        if (currentIndex < NOTCH_LIST.length - 1) {
          setNotch(NOTCH_LIST[currentIndex + 1]);
        }
      } else if (e.key === " ") {
        // Spacebar is instant emergency brake
        e.preventDefault();
        setNotch("EB");
      }
    },
    [currentNotch, setNotch]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Color mapping per notch category
  const getNotchColor = (notch: MasconState) => {
    if (notch.startsWith("P")) return "bg-emerald-500 border-emerald-400 text-emerald-950 shadow-emerald-500/50";
    if (notch === "N") return "bg-amber-500 border-amber-400 text-amber-950 shadow-amber-500/50";
    if (notch.startsWith("B")) return "bg-amber-600 border-amber-500 text-amber-100 shadow-amber-600/50";
    return "bg-rose-600 border-rose-500 text-rose-500 shadow-rose-600/50"; // EB
  };

  return (
    <div className="bg-slate-900 border-4 border-slate-700 rounded-2xl p-8 shadow-2xl flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto text-slate-100">
      
      {/* 1. Left Side: Dynamic Cab Instrument Cluster */}
      <div className="flex-1 grid grid-cols-2 gap-5">
        {/* Speedometer (Analog digital combo) */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-center z-10">
            <span className="text-sm font-mono text-cyan-400 flex items-center gap-1.5 font-bold">
              <Gauge className="w-4 h-4" /> SPEEDOMETER
            </span>
            <span className="text-xs bg-cyan-900/40 text-cyan-300 font-mono px-2 py-0.5 rounded font-black">ATC ACTIVE</span>
          </div>
          <div className="py-4 text-center z-10">
            <div className="text-7xl font-mono font-black text-cyan-400 tracking-tight">
              {Math.round(speed)}
            </div>
            <div className="text-xs font-mono text-cyan-500/70 font-black mt-1">KM/H</div>
          </div>
          <div className="w-full bg-slate-850 h-3 rounded overflow-hidden mt-1">
            <div 
              className="bg-cyan-400 h-full transition-all duration-100"
              style={{ width: `${Math.min(100, (speed / 130) * 100)}%` }}
            ></div>
          </div>
          {/* Subtle neon grid background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
        </div>

        {/* Current & Acceleration power force */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center w-full">
            <span className="text-sm font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
              <Zap className="w-4 h-4" /> MOTOR LOAD
            </span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
              acceleration > 0 ? "bg-emerald-950 text-emerald-400 font-bold animate-pulse" : acceleration < 0 ? "bg-amber-950 text-amber-500 font-bold" : "bg-slate-800 text-slate-400"
            }`}>
              {acceleration > 0 ? "+ ACCEL" : acceleration < 0 ? "- BRAKE" : "COAST"}
            </span>
          </div>
          <div className="py-4 text-center">
            <div className={`text-5xl font-mono font-black tracking-tight ${acceleration > 0 ? "text-emerald-400" : acceleration < 0 ? "text-amber-500" : "text-slate-400"}`}>
              {acceleration > 0 ? `+${(acceleration * 3.6).toFixed(1)}` : `${(acceleration * 3.6).toFixed(1)}`}
            </div>
            <div className="text-xs font-mono text-slate-500 mt-1 font-bold">(KM/H)/S</div>
          </div>
          <div className="w-full bg-slate-850 h-3 rounded overflow-hidden">
            <div 
              className={`h-full transition-all duration-150 ${acceleration > 0 ? "bg-emerald-400" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, Math.abs(acceleration * 40))}%` }}
            ></div>
          </div>
        </div>

        {/* Motor Temp / Overheat safety core */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-xl p-5 flex flex-col justify-between col-span-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-mono text-rose-400 flex items-center gap-1.5 font-bold">
              <Flame className="w-4 h-4" /> MOTOR TEMP
            </span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
              overheat > 80 ? "bg-rose-950 text-rose-400 font-bold animate-ping" : overheat > 50 ? "bg-amber-900/40 text-amber-400" : "bg-slate-800 text-slate-400"
            }`}>
              {overheat >= 100 ? "⚠️ CIRCUIT BLOWN" : overheat > 80 ? "⚠️ HOT" : "STABLE"}
            </span>
          </div>
          <div className="flex items-center gap-5 py-2">
            <div className="text-5xl font-mono font-black text-rose-400 tracking-tight w-28 shrink-0">
              {Math.round(overheat)}°C
            </div>
            <div className="flex-1 bg-slate-800 h-4 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-200 ${
                  overheat > 85 ? "bg-rose-600 animate-pulse" : overheat > 50 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${overheat}%` }}
              ></div>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400 leading-relaxed mt-1">
            * 100°Cで過負荷保護装置(ヒューズ)が作動し、数秒間加速不能になります。P4ノッチを継続すると急上昇します。
          </div>
        </div>
      </div>

      {/* 2. Right Side: Interactive Mascon Lever HUD */}
      <div className="flex-1 bg-slate-950 border-2 border-slate-800 rounded-xl p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center text-sm font-mono text-indigo-400 border-b border-slate-800 pb-3 mb-4">
          <span className="flex items-center gap-1.5 text-slate-200 font-bold">
            <Keyboard className="w-5 h-5 text-indigo-400" /> CONTROLLER MASCON
          </span>
          <span className="text-slate-400 text-xs font-medium">W: 加速 / S: ブレーキ / Space: 非常</span>
        </div>

        {/* Master mechanical slider notches or direct-click buttons */}
        <div className="flex flex-col gap-2.5">
          {NOTCH_LIST.map((notch) => {
            const isSelected = currentNotch === notch;
            return (
              <button
                key={notch}
                id={`mascon-notch-${notch}`}
                onClick={() => setNotch(notch)}
                className={`flex items-center justify-between px-6 py-3.5 rounded-lg font-mono text-base border-2 transition-all cursor-pointer ${
                  isSelected 
                    ? `${getNotchColor(notch)} border-white font-black scale-102 ring-2 ring-white/30 shadow-xl`
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full ${
                    isSelected 
                      ? "bg-white animate-pulse" 
                      : notch.startsWith("P") ? "bg-emerald-950" : notch === "N" ? "bg-amber-950" : "bg-rose-950"
                  }`} />
                  <span className="font-bold text-lg">{notch}</span>
                </div>
                <span className="text-xs md:text-sm font-semibold tracking-wider opacity-90">
                  {notch === "P4" && "力行4速 (最大加速)"}
                  {notch === "P3" && "力行3速"}
                  {notch === "P2" && "力行2速"}
                  {notch === "P1" && "力行1速"}
                  {notch === "N"  && "惰行 (ニュートラル)"}
                  {notch === "B1" && "常用ブレーキ1"}
                  {notch === "B2" && "常用ブレーキ2"}
                  {notch === "B3" && "最大常用ブレーキ"}
                  {notch === "EB" && "🚨 非常ブレーキ"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tactical advice */}
        <div className="mt-4 bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-3 text-xs text-indigo-300 font-mono leading-relaxed">
          💡 **省エネ・高速運転のコツ**：
          <br />
          最高速まで達したら**力行(P4)**を切り、**惰行(N)**にしてモーター過熱を防止してください。カーブの制限速度標識が見えたら早めに常用ブレーキ(B1-B3)で減速！
        </div>
      </div>

    </div>
  );
};
export default MasconController;
