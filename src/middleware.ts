export { default } from "next-auth/middleware";

// Anything under these paths needs a signed-in user. Role checks happen in each page via requireRole().
export const config = { matcher: ["/driver/:path*", "/billing/:path*"] };
