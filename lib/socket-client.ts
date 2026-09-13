import { io, type Socket } from "socket.io-client";
import type { Ack } from "./socket-events";

let socket: Socket | null = null;

/**
 * Browser-side singleton socket. Lazily connects on first use.
 * Must only be called from client components / the browser.
 */
export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("getSocket() must be called in the browser");
  }
  if (!socket) {
    socket = io({ withCredentials: true });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * Emit with a typed ack. Times out after 5s with a soft failure ack
 * instead of rejecting.
 */
export async function emitWithAck<T = unknown>(
  event: string,
  payload: unknown,
): Promise<Ack<T>> {
  try {
    return (await getSocket()
      .timeout(5000)
      .emitWithAck(event, payload)) as Ack<T>;
  } catch {
    return { success: false, message: `${event}: socket timeout` };
  }
}
