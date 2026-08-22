import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import { SESSION_COOKIE } from "@/lib/auth-shared";

const PUBLIC_PATHS = ["/login", "/installation", "/manifest.webmanifest"];

function secret() {
  const value =
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "development" ? "dev-secret-personnal-coach" : "");
  return new TextEncoder().encode(value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      role = typeof payload.role === "string" ? payload.role : null;
    } catch {
      role = null;
    }
  }

  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // L'espace coach est réservé au coach.
  if (pathname.startsWith("/coach") && role !== "coach") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
