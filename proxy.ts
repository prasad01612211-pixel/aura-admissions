import { NextRequest, NextResponse } from "next/server";

import { isDashboardBasicAuthConfigured, isSupabaseConfigured, serverEnv } from "@/lib/env";
import { updateProxySession } from "@/lib/supabase/proxy-session";

const basicAuthRealm = "Admissions Ops";

function isApiRequest(pathname: string) {
  return pathname.startsWith("/api/");
}

function decodeBasicAuthHeader(headerValue: string | null) {
  if (!headerValue || !headerValue.toLowerCase().startsWith("basic ")) {
    return null;
  }

  try {
    const decoded = atob(headerValue.slice(6).trim());
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function buildUnauthorizedResponse(request: NextRequest) {
  if (isApiRequest(request.nextUrl.pathname)) {
    return NextResponse.json(
      {
        error: "Operator authentication required.",
      },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function buildBasicUnauthorizedResponse(request: NextRequest) {
  const headers = new Headers({
    "WWW-Authenticate": `Basic realm="${basicAuthRealm}", charset="UTF-8"`,
  });

  if (isApiRequest(request.nextUrl.pathname)) {
    return NextResponse.json(
      {
        error: "Operator authentication required.",
      },
      {
        status: 401,
        headers,
      },
    );
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers,
  });
}

function validateBasicAuth(request: NextRequest) {
  if (!isDashboardBasicAuthConfigured) {
    return NextResponse.next();
  }

  const suppliedCredentials = decodeBasicAuthHeader(request.headers.get("authorization"));

  if (
    suppliedCredentials &&
    suppliedCredentials.username === serverEnv.DASHBOARD_BASIC_AUTH_USERNAME &&
    suppliedCredentials.password === serverEnv.DASHBOARD_BASIC_AUTH_PASSWORD
  ) {
    return NextResponse.next();
  }

  return buildBasicUnauthorizedResponse(request);
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return validateBasicAuth(request);
  }

  const { response, user } = await updateProxySession(request);

  if (user) {
    return response;
  }

  return buildUnauthorizedResponse(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/setup-wizard/:path*",
    "/api/lead-actions/:path*",
    "/api/leads/import/:path*",
    "/api/campaigns/:path*",
    "/api/tasks/:path*",
    "/api/visits/:path*",
    "/api/dashboard/:path*",
    "/api/branches/performance/:path*",
    "/api/system/:path*",
  ],
};
