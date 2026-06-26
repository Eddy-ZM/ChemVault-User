import type { User } from "../lib/types";

export function UserAvatar({ user, size = "md" }: { user: Pick<User, "name" | "avatarUrl" | "email">; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (user.avatarUrl) {
    return <img className={`${sizeClass} rounded-lg object-cover ring-1 ring-slate-200`} src={user.avatarUrl} alt="" />;
  }

  return (
    <div className={`${sizeClass} grid place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 font-bold text-white`}>
      {initials || user.email[0]?.toUpperCase() || "CV"}
    </div>
  );
}
