import React from "react";

interface TrainVisualProps {
  speed: number;        // Speed in km/h for wheel rotation
  isBraking?: boolean;   // Active braking lights
  isPlayer?: boolean;    // Custom badge or tint for distinguishing
  derailed?: boolean;    // Shaking / smoke effect if derailed
  isAI?: boolean;        // CPU opponent styling
  line?: 'yamanote' | 'chuo' | 'shonan'; // Target line styling
}

export const TrainVisual: React.FC<TrainVisualProps> = ({
  speed,
  isBraking = false,
  isPlayer = true,
  derailed = false,
  isAI = false,
  line = 'shonan',
}) => {
  // Calculate wheel rotation translation
  // If static, duration is 0 (no animation); otherwise scale based on speed
  const spinDuration = speed > 5 ? Math.max(0.1, 10 / speed) : 0;
  
  // Style for wheel spin
  const wheelSpinStyle = spinDuration > 0 ? {
    animation: `spin ${spinDuration}s linear infinite`,
  } : undefined;

  // Configure colors and metadata based on line
  let primaryStripe = "url(#shonan-green)";
  let secondaryStripe = "url(#shonan-orange)";
  let stripeStyle: "double" | "single" = "double";
  let seriesLabel = "クハE231-8012";
  let jrLogoColor = "#006c35";
  let jrLogoStroke = "#004d26";
  let destTitle = "特別快速";

  if (line === "yamanote") {
    primaryStripe = "url(#yamanote-green)";
    stripeStyle = "single";
    seriesLabel = "クハE235-503";
    jrLogoColor = "#006c35";
    jrLogoStroke = "#004d26";
    destTitle = "山手線";
  } else if (line === "chuo") {
    primaryStripe = "url(#chuo-orange)";
    stripeStyle = "single";
    seriesLabel = "クハE233-3012";
    jrLogoColor = "#006c35"; // JR East is standard green
    jrLogoStroke = "#004d26";
    destTitle = "中央特快";
  }

  return (
    <div className={`relative ${derailed ? "animate-bounce" : ""}`} style={{ width: "100%", height: "100%" }}>
      {/* CSS Animation for spinning wheels and derail spark particles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .wheel-spin {
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes spark {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(15px) translateX(-15px) scale(0.3); opacity: 0; }
        }
        .spark-particle {
          animation: spark 0.4s ease-out infinite;
        }
      `}</style>

      {/* Sparks if derailed */}
      {derailed && (
        <div className="absolute left-1/4 bottom-2 flex gap-12 z-0">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full spark-particle" style={{ animationDelay: "0.1s" }}></span>
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full spark-particle" style={{ animationDelay: "0.2s" }}></span>
          <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full spark-particle" style={{ animationDelay: "0.0s" }}></span>
          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full spark-particle" style={{ animationDelay: "0.3s" }}></span>
        </div>
      )}

      {/* SVG Train Component (Facing RIGHT) */}
      <svg
        id="train-svg"
        viewBox="0 0 600 130"
        className="w-full h-full drop-shadow-md select-none"
      >
        <defs>
          {/* Stainless steel body gradient */}
          <linearGradient id="metal-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f3f4f6" />
            <stop offset="45%" stopColor="#d1d5db" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="70%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>

          {/* Front mask white metallic gradient */}
          <linearGradient id="front-mask" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e1e8ed" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Underfloor utilities dark gradient */}
          <linearGradient id="dark-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Shonan Green Color definition */}
          <linearGradient id="shonan-green" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#006c35" />
            <stop offset="100%" stopColor="#004d26" />
          </linearGradient>

          {/* Shonan Orange Color definition */}
          <linearGradient id="shonan-orange" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f77f00" />
            <stop offset="100%" stopColor="#d65108" />
          </linearGradient>

          {/* Yamanote Line Green Gradient */}
          <linearGradient id="yamanote-green" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8cc63f" />
            <stop offset="100%" stopColor="#6ea328" />
          </linearGradient>

          {/* Chuo Line Orange Gradient */}
          <linearGradient id="chuo-orange" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff5f00" />
            <stop offset="100%" stopColor="#d84b00" />
          </linearGradient>

          {/* Window Glass Gradient */}
          <linearGradient id="window-glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="40%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Inner Passenger Light highlight (subtle glow) */}
          <radialGradient id="passenger-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. ROOF STRUCTURES */}
        {/* Grey Base Roof */}
        <path d="M 15 25 L 535 25 L 530 22 L 20 22 Z" fill="#6b7280" />

        {/* Pantograph (Power collector) - standard diamond type on the rear */}
        <g stroke="#9ca3af" strokeWidth="2.5" fill="none">
          {/* Base */}
          <rect x="65" y="18" width="20" height="4" fill="#374151" stroke="none" />
          {/* Frame linkage */}
          <line x1="75" y1="18" x2="60" y2="4" />
          <line x1="60" y1="4" x2="85" y2="4" />
          <line x1="75" y1="18" x2="90" y2="4" />
          {/* Upper Stage collection bar */}
          <line x1="60" y1="4" x2="75" y2="-8" strokeWidth="2" />
          <line x1="85" y1="4" x2="75" y2="-8" strokeWidth="2" />
          <line x1="68" y1="-8" x2="82" y2="-8" stroke="#1f2937" strokeWidth="3" />
        </g>

        {/* Huge Air Conditioner (Cooling Unit) AU725 in the center */}
        <g>
          <rect x="230" y="14" width="105" height="8" rx="3" fill="#9ca3af" stroke="#4b5563" strokeWidth="1" />
          <rect x="245" y="11" width="75" height="3" fill="#d1d5db" />
          {/* Grille details */}
          <line x1="255" y1="14" x2="255" y2="22" stroke="#4b5563" strokeWidth="1.5" />
          <line x1="265" y1="14" x2="265" y2="22" stroke="#4b5563" strokeWidth="1.5" />
          <line x1="275" y1="14" x2="275" y2="22" stroke="#4b5563" strokeWidth="1.5" />
          <line x1="285" y1="14" x2="285" y2="22" stroke="#4b5563" strokeWidth="1.5" />
          <line x1="295" y1="14" x2="295" y2="22" stroke="#4b5563" strokeWidth="1.5" />
          <line x1="305" y1="14" x2="305" y2="22" stroke="#4b5563" strokeWidth="1.5" />
          <line x1="315" y1="14" x2="315" y2="22" stroke="#4b5563" strokeWidth="1.5" />
        </g>

        {/* Small fans and exhaust covers */}
        <rect x="140" y="19" width="12" height="3" fill="#4b5563" />
        <rect x="420" y="19" width="12" height="3" fill="#4b5563" />

        {/* 2. MAIN VEHICLE BODY */}
        {/* Main Stainless panel */}
        <rect x="10" y="25" width="530" height="71" rx="4" fill="url(#metal-grad)" stroke="#111827" strokeWidth="2" />

        {/* Right side straight vertical commuter driver compartment front (Kiritzuma Cabin Mask) */}
        <path d="M 533 25 L 552 25 C 555 25, 557 27, 557 30 L 557 91 C 557 94, 555 96, 552 96 L 533 96 Z" fill="url(#front-mask)" stroke="#111827" strokeWidth="2" />
        {/* Front facial identifier accent color block under windscreen */}
        <rect x="533" y="58" width="24" height="8" fill={primaryStripe} opacity="0.85" />
        
        {/* Front windscreens / dark flat visor window */}
        <path d="M 536 28 L 553 28 C 554 28, 555 29, 555 31 L 555 56 L 536 56 Z" fill="#0f172a" stroke="#1f2937" strokeWidth="1" />
        {/* LED direction indicator */}
        <rect x="540" y="29" width="12" height="4" rx="0.5" fill="#000" />
        <text x="546" y="32" fill="#22c55e" fontSize="3.2" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          {destTitle}
        </text>
        {/* Front lights slot */}
        {line === "yamanote" || line === "chuo" ? (
          <>
            {/* E233/E235 Top Headlights / Taillights (Placed above windscreen center) */}
            <rect x="541" y="36" width="10" height="5" rx="1.5" fill="#1f2937" />
            {isBraking ? (
              <circle cx="546" cy="38.5" r="2.2" fill="#ef4444" className="animate-pulse" />
            ) : (
              <circle cx="546" cy="38.5" r="2.2" fill={speed > 0 ? "#fef08a" : "#9ca3af"} />
            )}
          </>
        ) : (
          <>
            {/* E231 (Shonan) Bottom Headlights / Taillights */}
            <rect x="543" y="70" width="10" height="6" rx="2" fill="#1f2937" />
            {isBraking ? (
              <circle cx="548" cy="73" r="3" fill="#ef4444" className="animate-pulse" />
            ) : (
              <circle cx="548" cy="73" r="3" fill={speed > 0 ? "#fef08a" : "#9ca3af"} />
            )}
          </>
        )}

        {/* Leftmost corner tail edge coupling structure */}
        <rect x="5" y="45" width="6" height="30" fill="#374151" />
        <rect x="2" y="58" width="4" height="4" fill="#111827" />

        {/* 3. LINE ACCENT STRIPES */}
        {/* Upper narrow stripe (Just under roof, above windows) */}
        <rect x="10" y="31" width="525" height="3.5" fill={primaryStripe} />

        {/* Lower stripe (Below window line) */}
        {stripeStyle === "double" ? (
          <>
            <rect x="10" y="76" width="528" height="6" fill={primaryStripe} />
            <rect x="10" y="82" width="528" height="4" fill={secondaryStripe} />
            <rect x="532" y="76" width="24" height="6" fill={primaryStripe} />
            <rect x="532" y="82" width="23" height="4" fill={secondaryStripe} />
          </>
        ) : (
          <>
            <rect x="10" y="76" width="528" height="10" fill={primaryStripe} />
            <rect x="532" y="76" width="24" height="10" fill={primaryStripe} />
          </>
        )}

        {/* 4. CAB DOOR (Crew entry) */}
        {/* InTokai line model, there is a green band door or painted door near driving cab */}
        <g stroke="#111827" strokeWidth="1">
          <rect x="502" y="38" width="22" height="58" fill="#d1d5db" />
          {/* Cab Window on the side */}
          <rect x="506" y="44" width="14" height="15" fill="url(#window-glass)" />
          {/* Vertical door handle */}
          <line x1="504" y1="67" x2="504" y2="73" strokeWidth="2.5" />
        </g>

        {/* 5. PASSENGER WINDOWS WITH GLASSED TINTS */}
        {/* Between Door 1 and 2 */}
        <g>
          <rect x="55" y="40" width="60" height="23" rx="2" fill="url(#window-glass)" stroke="#111827" strokeWidth="1" />
          <rect x="55" y="40" width="60" height="23" rx="2" fill="url(#passenger-glow)" />
          <line x1="85" y1="40" x2="85" y2="63" stroke="#475569" strokeWidth="1.5" /> {/* center split */}
        </g>

        {/* Between Door 2 and 3 */}
        <g>
          <rect x="160" y="40" width="60" height="23" rx="2" fill="url(#window-glass)" stroke="#111827" strokeWidth="1" />
          <rect x="160" y="40" width="60" height="23" rx="2" fill="url(#passenger-glow)" />
          <line x1="190" y1="40" x2="190" y2="63" stroke="#475569" strokeWidth="1.5" />
        </g>

        {/* Between Door 3 and 4 */}
        <g>
          <rect x="265" y="40" width="60" height="23" rx="2" fill="url(#window-glass)" stroke="#111827" strokeWidth="1" />
          <rect x="265" y="40" width="60" height="23" rx="2" fill="url(#passenger-glow)" />
          <line x1="295" y1="40" x2="295" y2="63" stroke="#475569" strokeWidth="1.5" />
        </g>

        {/* Between Door 4 and Cab */}
        <g>
          <rect x="370" y="40" width="60" height="23" rx="2" fill="url(#window-glass)" stroke="#111827" strokeWidth="1" />
          <rect x="370" y="40" width="60" height="23" rx="2" fill="url(#passenger-glow)" />
          <line x1="400" y1="40" x2="400" y2="63" stroke="#475569" strokeWidth="1.5" />
        </g>

        {/* Leftmost corner window */}
        <g>
          <rect x="18" y="43" width="22" height="20" rx="1" fill="url(#window-glass)" stroke="#111827" strokeWidth="1" />
        </g>

        {/* 6. FOUR PASSENGER SWING/SLIDING DOUBLE DOORS */}
        {/* Door 1 */}
        <g stroke="#111827" strokeWidth="1.5" fill="#e5e7eb">
          <rect x="123" y="38" width="28" height="58" />
          {/* Door glass windows */}
          <rect x="127" y="43" width="8" height="15" fill="url(#window-glass)" />
          <rect x="137" y="43" width="8" height="15" fill="url(#window-glass)" />
          {/* Vertical separation gap line */}
          <line x1="137" y1="38" x2="137" y2="96" stroke="#4b5563" strokeWidth="1" />
          {/* Small silver door handles */}
          <rect x="134" y="66" width="1.5" height="6" fill="#4b5563" />
          <rect x="138.5" y="66" width="1.5" height="6" fill="#4b5563" />
        </g>

        {/* Door 2 */}
        <g stroke="#111827" strokeWidth="1.5" fill="#e5e7eb">
          <rect x="228" y="38" width="28" height="58" />
          <rect x="232" y="43" width="8" height="15" fill="url(#window-glass)" />
          <rect x="242" y="43" width="8" height="15" fill="url(#window-glass)" />
          <line x1="242" y1="38" x2="242" y2="96" stroke="#4b5563" strokeWidth="1" />
          <rect x="239" y="66" width="1.5" height="6" fill="#4b5563" />
          <rect x="243.5" y="66" width="1.5" height="6" fill="#4b5563" />
        </g>

        {/* Door 3 */}
        <g stroke="#111827" strokeWidth="1.5" fill="#e5e7eb">
          <rect x="333" y="38" width="28" height="58" />
          <rect x="337" y="43" width="8" height="15" fill="url(#window-glass)" />
          <rect x="347" y="43" width="8" height="15" fill="url(#window-glass)" />
          <line x1="347" y1="38" x2="347" y2="96" stroke="#4b5563" strokeWidth="1" />
          <rect x="344" y="66" width="1.5" height="6" fill="#4b5563" />
          <rect x="348.5" y="66" width="1.5" height="6" fill="#4b5563" />
        </g>

        {/* Door 4 */}
        <g stroke="#111827" strokeWidth="1.5" fill="#e5e7eb">
          <rect x="438" y="38" width="28" height="58" />
          <rect x="442" y="43" width="8" height="15" fill="url(#window-glass)" />
          <rect x="452" y="43" width="8" height="15" fill="url(#window-glass)" />
          <line x1="452" y1="38" x2="452" y2="96" stroke="#4b5563" strokeWidth="1" />
          <rect x="449" y="66" width="1.5" height="6" fill="#4b5563" />
          <rect x="453.5" y="66" width="1.5" height="6" fill="#4b5563" />
        </g>

        {/* 7. LEGENDARY "JR" GREEN LOGO */}
        <g transform="translate(23, 70) scale(0.65)" opacity="0.95">
          {/* Elegant JR logo paths */}
          <path d="M4 1 H11 V3 H8 V12 H4 V1 C4 1, 1 1, 4 1 Z" fill={jrLogoColor} stroke={jrLogoStroke} strokeWidth="0.5" />
          <path d="M12 1 C16 1, 18 3, 18 5.5 C18 7.5, 16.5 9, 14 9 L12 9 V1 C12 1, 13 1, 12 1" fill={jrLogoColor} stroke={jrLogoStroke} strokeWidth="0.5" />
          <path d="M15 9 L19 13 H23 L18.5 8.5 Z" fill={jrLogoColor} stroke={jrLogoStroke} strokeWidth="0.5" />
          <text x="25" y="11" fill={jrLogoColor} fontSize="11" fontFamily="sans-serif" fontWeight="bold" stroke="none">EAST</text>
        </g>

        {/* Series label number under center window */}
        <text x="175" y="73" fill="#1f2937" fontSize="5.5" fontFamily="monospace" opacity="0.75" fontWeight="bold">
          {seriesLabel}
        </text>

        {/* 8. UNDERFLOOR ELECTRICAL EQUIPMENTS */}
        {/* Dark boxes, resistors, pipes, brakes */}
        <g fill="url(#dark-grad)" stroke="#111827" strokeWidth="1">
          {/* Main battery/inverter box */}
          <rect x="155" y="96" width="80" height="15" rx="1" />
          <rect x="170" y="111" width="50" height="3" fill="#374151" />
          {/* Alternator and auxiliary box */}
          <rect x="245" y="96" width="60" height="13" rx="1" />
          <rect x="250" y="105" width="20" height="6" fill="#1f2937" />
          {/* Compressor / Air container */}
          <rect x="310" y="96" width="50" height="11" rx="1" />
          <circle cx="325" cy="101" r="4" fill="#6b7280" />
          <circle cx="345" cy="101" r="3" fill="#4b5563" />
          {/* Leftside and Rightside general dark gear elements */}
          <rect x="42" y="96" width="28" height="12" />
          <rect x="375" y="96" width="45" height="11" />
        </g>

        {/* 9. WHEEL SETS / BOGIES (TR246/DT61 Models) */}
        {/* Rear Bogie (Leftside) */}
        <g transform="translate(95, 106)">
          {/* Bogie dark gray heavy steel frame */}
          <rect x="-35" y="-3" width="70" height="6" rx="2" fill="#374151" stroke="#111827" strokeWidth="1" />
          <line x1="-30" y1="0" x2="30" y2="0" stroke="#1f2937" strokeWidth="3" />
          <rect x="-10" y="-8" width="20" height="6" fill="#111827" /> {/* damper center */}

          {/* Left Wheel */}
          <g transform="translate(-20, 2)">
            <g style={wheelSpinStyle} className={spinDuration > 0 ? "wheel-spin" : ""}>
              {/* Outer Rim */}
              <circle cx="0" cy="0" r="10.5" fill="#4b5563" stroke="#e5e7eb" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="7" fill="#111827" />
              {/* Spokes (for visual rotation indicators) */}
              <line x1="0" y1="-10" x2="0" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#9ca3af" strokeWidth="1.5" />
              {/* Hub cap */}
              <circle cx="0" cy="0" r="3" fill="#6b7280" />
            </g>
          </g>

          {/* Right Wheel */}
          <g transform="translate(20, 2)">
            <g style={wheelSpinStyle} className={spinDuration > 0 ? "wheel-spin" : ""}>
              <circle cx="0" cy="0" r="10.5" fill="#4b5563" stroke="#e5e7eb" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="7" fill="#111827" />
              <line x1="0" y1="-10" x2="0" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#9ca3af" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#6b7280" />
            </g>
          </g>
        </g>

        {/* Front Bogie (Rightside) */}
        <g transform="translate(485, 106)">
          <rect x="-35" y="-3" width="70" height="6" rx="2" fill="#374151" stroke="#111827" strokeWidth="1" />
          <line x1="-30" y1="0" x2="30" y2="0" stroke="#1f2937" strokeWidth="3" />
          <rect x="-10" y="-8" width="20" height="6" fill="#111827" />

          {/* Left Wheel */}
          <g transform="translate(-20, 2)">
            <g style={wheelSpinStyle} className={spinDuration > 0 ? "wheel-spin" : ""}>
              <circle cx="0" cy="0" r="10.5" fill="#4b5563" stroke="#e5e7eb" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="7" fill="#111827" />
              <line x1="0" y1="-10" x2="0" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#9ca3af" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#6b7280" />
            </g>
          </g>

          {/* Right Wheel */}
          <g transform="translate(20, 2)">
            <g style={wheelSpinStyle} className={spinDuration > 0 ? "wheel-spin" : ""}>
              <circle cx="0" cy="0" r="10.5" fill="#4b5563" stroke="#e5e7eb" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="7" fill="#111827" />
              <line x1="0" y1="-10" x2="0" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#9ca3af" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#6b7280" />
            </g>
          </g>
        </g>

        {/* Safety Cowl / Obstacle Deflector (Skirt) at the very front */}
        <path d="M 533 96 L 556 96 L 553 111 L 540 112 Z" fill="#374151" stroke="#111827" strokeWidth="1.5" />
      </svg>

      {/* Decorative tag overhead */}
      <div className="absolute top-1 left-2 flex items-center gap-1.5 pointer-events-none">
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase text-white shadow-sm ${
          isPlayer 
            ? "bg-indigo-600 border border-indigo-400" 
            : isAI 
              ? "bg-amber-600 border border-amber-400" 
              : "bg-red-600 border border-red-400"
        }`}>
          {isPlayer ? "YOU" : isAI ? "CPU" : "PLAYER 2"}
        </span>
      </div>
    </div>
  );
};
export default TrainVisual;
