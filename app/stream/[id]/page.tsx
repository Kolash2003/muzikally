import { requireAuth } from "@/modules/authentication/actions";
import { RoomClient } from "@/modules/music/components/room/room-client";

export default async function StreamRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  return <RoomClient streamId={id} />;
}
