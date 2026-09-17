import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import HomePage from "@/modules/music/components/homePage";
import LandingPage from "@/modules/music/components/landing/landing-page";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Signed-in users go straight to their dashboard; visitors get the pitch.
  if (session?.user) {
    return <HomePage />;
  }

  return <LandingPage />;
}
