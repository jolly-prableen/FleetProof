import { withAuth } from "next-auth/middleware";

const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim();
if (!nextAuthSecret) {
  throw new Error("NEXTAUTH_SECRET must be configured for NextAuth middleware.");
}

export default withAuth({ secret: nextAuthSecret });

// Anything under these paths needs a signed-in user. Role checks happen in each page via requireRole().
export const config = { matcher: ["/driver/:path*", "/billing/:path*"] };
