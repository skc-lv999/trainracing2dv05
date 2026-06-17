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
    <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-4 shadow-2xl flex flex-col md:flex-row gap-4 max-w-5xl mx-auto text-slate-100 w-full">
      
      {/* 1. Left Side: Dynamic Cab Instrument Cluster */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {/* Speedometer (Analog digital combo) */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden h-28">
          <div className="flex justify-between items-center z-10">
            <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1 font-bold">
              <Gauge className="w-3.5 h-3.5" /> SPEEDOMETER
            </span>
            <span className="text-[9px] bg-cyan-900/40 text-cyan-300 font-mono px-1 py-0.5 rounded font-black">ATC ACTIVE</span>
          </div>
          <div className="py-1 text-center z-10 flex items-baseline justify-center gap-1">
            <div className="text-4xl font-mono font-black text-cyan-400 tracking-tight">
              {Math.round(speed)}
            </div>
            <div className="text-[10px] font-mono text-cyan-500/70 font-black">KM/H</div>
          </div>
          <div className="w-full bg-slate-850 h-2 rounded overflow-hidden mt-1">
            <div 
              className="bg-cyan-400 h-full transition-all duration-100"
              style={{ width: `${Math.min(100, (speed / 130) * 100)}%` }}
            ></div>
          </div>
          {/* Subtle neon grid background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
        </div>

        {/* Current & Acceleration power force */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-xl p-3 flex flex-col justify-between h-28">
          <div className="flex justify-between items-center w-full">
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
              <Zap className="w-3.5 h-3.5" /> MOTOR LOAD
            </span>
            <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${
              acceleration > 0 ? "bg-emerald-950 text-emerald-400 font-bold animate-pulse" : acceleration < 0 ? "bg-amber-950 text-amber-500 font-bold" : "bg-slate-800 text-slate-400"
            }`}>
              {acceleration > 0 ? "+ ACCEL" : acceleration < 0 ? "- BRAKE" : "COAST"}
            </span>
          </div>
          <div className="py-1 text-center flex items-baseline justify-center gap-1">
            <div className={`text-3xl font-mono font-black tracking-tight ${acceleration > 0 ? "text-emerald-400" : acceleration < 0 ? "text-amber-500" : "text-slate-400"}`}>
              {acceleration > 0 ? `+${(acceleration * 3.6).toFixed(1)}` : `${(acceleration * 3.6).toFixed(1)}`}
            </div>
            <div className="text-[9px] font-mono text-slate-500 font-bold">(KM/H)/S</div>
          </div>
          <div className="w-full bg-slate-850 h-2 rounded overflow-hidden">
            <div 
              className={`h-full transition-all duration-150 ${acceleration > 0 ? "bg-emerald-400" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, Math.abs(acceleration * 40))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Right Side: Interactive Mascon Lever HUD */}
      <div className="flex-[1.5] bg-slate-950 border-2 border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex justify-between items-center text-xs font-mono text-indigo-400 border-b border-slate-800 pb-2 mb-3">
          <span className="flex items-center gap-1.5 text-slate-200 font-bold">
            <Keyboard className="w-4 h-4 text-indigo-400" /> CONTROLLER MASCON
          </span>
          <span className="text-slate-400 text-[10px] font-medium hidden sm:inline">W: 加速 / S: ブレーキ / Space: 非常</span>
        </div>

        {/* Selected Notch Banner */}
        <div className="mb-2 text-center py-1 bg-slate-900 rounded-lg border border-slate-800">
          <span className="text-[11px] font-mono font-bold text-slate-300">
            選択中のノッチ: <span className={`text-xs font-black underline decoration-2 ${currentNotch.startsWith("P") ? "text-emerald-400" : currentNotch === "N" ? "text-amber-400" : "text-rose-400"}`}>{currentNotch}</span>
            {" - "}
            <span className="text-slate-400 text-[10.5px]">
              {currentNotch === "P4" && "力行4速 (最大加速)"}
              {currentNotch === "P3" && "力行3速"}
              {currentNotch === "P2" && "力行2速"}
              {currentNotch === "P1" && "力行1速"}
              {currentNotch === "N"  && "惰行 (ニュートラル)"}
              {currentNotch === "B1" && "常用ブレーキ1"}
              {currentNotch === "B2" && "常用ブレーキ2"}
              {currentNotch === "B3" && "最大常用ブレーキ"}
              {currentNotch === "EB" && "🚨 非常ブレーキ"}
            </span>
          </span>
        </div>

        {/* Master mechanical slider notches or direct-click buttons (Horizontal Layout) */}
        <div className="flex items-stretch justify-between gap-1.5 h-14">
          {NOTCH_LIST.map((notch) => {
            const isSelected = currentNotch === notch;
            return (
              <button
                key={notch}
                id={`mascon-notch-${notch}`}
                onClick={() => setNotch(notch)}
                className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected 
                    ? `${getNotchColor(notch)} border-white font-black scale-102 ring-2 ring-white/30 shadow-md`
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span className="font-mono font-black text-sm">{notch}</span>
                <span className="text-[8px] mt-0.5 scale-90 opacity-80 hidden md:inline">
                  {notch.startsWith("P") ? "力行" : notch === "N" ? "惰行" : notch === "EB" ? "非常" : "制動"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tactical advice */}
        <div className="mt-2.5 bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-2 text-[10px] text-indigo-300 font-mono leading-tight flex justify-between items-center w-full">
          <span>💡 【キーボード操作】Wキー: 推進(P1-P4) / Sキー: 制動(B1-B3) / Space: 非常(EB)</span>
          <span className="text-slate-500 text-[9px] hidden lg:inline">※非入力時に有効</span>
        </div>
      </div>

    </div>
  );
};
export default MasconController;
