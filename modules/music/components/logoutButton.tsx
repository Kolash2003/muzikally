"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

type LogoutButtonProps = {
  userName: string | null | undefined;
};

const LogoutButton = ({ userName }: LogoutButtonProps) => {
  const router = useRouter();
  return (
    <div>
      {userName && <p className="m-2 p-2">{userName}</p>}
      <Button
        className="m-2 p-2 bg-blue-400"
        onClick={async () => {
          await signOut({});
          router.push("/sign-in");
          router.refresh();
        }}
      >
        Logout
      </Button>
    </div>
  );
};

export default LogoutButton;
