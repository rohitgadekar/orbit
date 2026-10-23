import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
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
  });

  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.includes("-auth-token") || c.name.includes("sb-"),
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // Supabase API is unreachable / offline: assume authenticated if cookies exist
    if (hasAuthCookie) {
      return response;
    }
  }

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup";
  const isApi = path.startsWith("/api");
  const isOfflineRoute = path === "/downloaded";
  const isPublic = isAuthPage || path === "/" || isApi || isOfflineRoute;

  if (!user && !hasAuthCookie && !isPublic) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    return NextResponse.redirect(redirect);
  }

  if (user && (isAuthPage || path === "/")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/home";
    return NextResponse.redirect(redirect);
  }

  return response;
}
