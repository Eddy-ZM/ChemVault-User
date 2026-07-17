import type { User } from "../lib/types";

export function UserAvatar({ user, size = "md" }: { user: Pick<User, "name" | "avatarUrl" | "email">; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  const imagePaddingClass = size === "sm" ? "p-0.5" : "p-1";
  const frameClass = `${sizeClass} aspect-square shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200`;
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (user.avatarUrl) {
    return (
      <span className={`${frameClass} ${imagePaddingClass} grid place-items-center bg-white`}>
        <img className="max-h-full max-w-full object-contain object-center" src={user.avatarUrl} alt="" />
      </span>
    );
  }

  return (
    <div className={`${frameClass} grid place-items-center bg-gradient-to-br from-blue-600 to-cyan-600 font-bold text-white`}>
      {initials || user.email[0]?.toUpperCase() || "CV"}
    </div>
  );
}
