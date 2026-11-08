import "next-auth";
import "next-auth/jwt";

type AppRole = "DRIVER" | "BILLING";

declare module "next-auth" {
  interface User {
    role: AppRole;
    branch: string;
    language: string;
  }
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; role: AppRole; branch: string; language: string };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: AppRole;
    branch: string;
    language: string;
  }
}
