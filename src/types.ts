export type MasconState = 'P4' | 'P3' | 'P2' | 'P1' | 'N' | 'B1' | 'B2' | 'B3' | 'EB';

export interface PlayerStats {
  id: string;
  name: string;
  position: number;      // distance along track in meters
  speed: number;         // speed in km/h
  mascon: MasconState;   // current handle position
  overheat: number;      // motor heat (0 to 100)
  derailed: boolean;     // whether currently derailed
  derailTimeLeft: number; // time left to re-rail (seconds)
  finished: boolean;     // has crossed finish line
  finishTime?: number;   // race completion time (ms)
}

export interface TrackFeature {
  id: string;
  type: 'speed_limit' | 'curve' | 'signal' | 'station';
  position: number;      // start position in meters
  length: number;        // length of zone in meters (for speed limit/curve/station)
  value: number;         // speed limit value in km/h (optional for station/signal)
  label: string;         // name or descriptive text
  signalColor?: 'GREEN' | 'YELLOW' | 'RED'; // for signals
  signalTimer?: number;  // time remaining for signal state in ms
}

export interface GameRoom {
  id: string;
  status: 'waiting' | 'countdown' | 'racing' | 'completed';
  players: { [id: string]: PlayerStats };
  trackFeatures: TrackFeature[];
  startTime?: number;     // timestamp when race officially starts (or count down ends)
  countdownSec?: number;  // remaining seconds during countdown
  winnerId?: string;
  trackLength: number;    // total track length in meters
  line: 'yamanote' | 'chuo' | 'shonan';
}

export interface LeaderboardEntry {
  id?: string;
  name: string;
  time: number;          // total finish time in ms
  date: string;          // ISO date string
  isCpu?: boolean;       // whether this was a CPU player
}
