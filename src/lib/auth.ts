import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth-config";
import NextAuth from "next-auth";

const { auth } = NextAuth(authConfig);

/**
 * Get the current authenticated user's ID.
 *
 * Falls back to a demo user in development when no session exists,
 * so that the app remains usable before full auth wiring.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();

  if (session?.user?.email) {
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {
        name: session.user.name ?? undefined
      },
      create: {
        email: session.user.email,
        name: session.user.name ?? null
      }
    });

    return user.id;
  }

  if (process.env.NODE_ENV === "development") {
    const demo = await prisma.user.upsert({
      where: { email: "demo@curiosity.local" },
      update: {},
      create: {
        email: "demo@curiosity.local",
        name: "Demo User"
      }
    });
    return demo.id;
  }

  throw new Error("Unauthenticated");
}
