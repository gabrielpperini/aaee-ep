import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./env";
import {
  E2E_AUTH_COOKIE,
  decodeE2EAuth,
  isE2EMode,
} from "./e2e-shim";

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/api/e2e"];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  let userPresent: boolean;
  let response = NextResponse.next({ request });

  if (isE2EMode()) {
    const raw = request.cookies.get(E2E_AUTH_COOKIE)?.value;
    userPresent = decodeE2EAuth(raw) !== null;
  } else {
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    userPresent = user !== null;
  }

  if (!userPresent && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  if (userPresent && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
