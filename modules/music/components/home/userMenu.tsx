"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  const router = useRouter();

  async function logout() {
    await signOut({});
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="group rounded-full p-0.5 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
          />
        }
      >
        <Avatar className="size-9 ring-2 ring-border/80 transition-all group-hover:ring-primary/60">
          <AvatarImage src={image ?? ""} alt={name ?? ""} />
          <AvatarFallback className="bg-primary/15 font-semibold text-primary">
            {name?.charAt(0).toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-panel w-56 p-1.5 shadow-2xl">
        <DropdownMenuLabel className="font-normal px-2 py-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-border/60" />
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer gap-2 rounded-lg text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

