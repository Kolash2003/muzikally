/**
 * Single source of truth for the realtime event contract.
 * Shared by the socket server (lib/socket.ts) and the browser client
 * (lib/socket-client.ts).
 */

export const SocketEvents = {
  /** client → server */
  StreamJoin: "stream:join",
  StreamLeave: "stream:leave",
  UpvoteToggle: "upvote:toggle",
  PlaybackControl: "playback:control",
  /** server → room */
  QueueUpdated: "queue:updated",
  PlaybackState: "playback:state",
  /** server → socket */
  Error: "error",
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

export const roomName = (streamId: string) => `stream:${streamId}`;

/* ---------- client → server payloads ---------- */

export interface StreamScopePayload {
  streamId: string;
}

export interface UpvoteTogglePayload {
  streamId: string;
  musicId: string;
}

export type PlaybackAction = "play" | "pause" | "next";

export interface PlaybackControlPayload {
  streamId: string;
  action: PlaybackAction;
}

/* ---------- server → client payloads ---------- */

export interface QueueEntry {
  musicId: string;
  votes: number;
}

export interface QueueUpdatedPayload {
  streamId: string;
  queue: QueueEntry[];
}

export type PlaybackStatus = "playing" | "paused";

export interface PlaybackStatePayload {
  streamId: string;
  status: PlaybackStatus;
  musicId?: string;
  /** Reserved for future position sync; server does not fill this today. */
  positionSeconds?: number;
}

export interface ErrorPayload {
  event?: SocketEvent;
  message: string;
}

/* ---------- ack envelope for client → server emits ---------- */

export interface Ack<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}
