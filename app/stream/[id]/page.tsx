import { requireAuth } from "@/modules/authentication/actions";
import { RoomClient } from "@/modules/music/components/room/room-client";

export default async function StreamRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth(`/stream/${id}`);
  return <RoomClient streamId={id} />;
}
