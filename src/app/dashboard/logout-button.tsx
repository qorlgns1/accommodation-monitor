"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-gray-500 hover:text-gray-700"
    >
      로그아웃
    </button>
  );
}
