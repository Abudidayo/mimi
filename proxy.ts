import { authMiddleware } from "@civic/auth/nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";

export const proxy = (req: NextRequest) => {
  // In development with CIVIC_TOKEN, skip auth and let callCivic() use the static token
  if (process.env.CIVIC_TOKEN && !process.env.CIVIC_CLIENT_ID) {
    return NextResponse.next();
  }

  // In production with Civic Auth configured, require login
  return authMiddleware()(req);
};

export const config = {
  matcher: [
    // Only protect export routes — require auth for Google exports
    "/api/export/:path*",
  ],
};
