import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "wealth_user_id";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(COOKIE_NAME)?.value;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }

  return prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function requireUserId() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("No user found. Run `npm run db:seed` first.");
  }
  return user.id;
}

export async function setUserSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}
