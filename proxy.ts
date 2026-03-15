import { NextRequest, NextResponse } from "next/server";

const basicAuthRealm = "Admissions Ops";

function isApiRequest(pathname: string) {
  return pathname.startsWith("/api/");
}

function getDashboardBasicAuthCredentials() {
  const username = process.env.DASHBOARD_BASIC_AUTH_USERNAME?.trim();
  const password = process.env.DASHBOARD_BASIC_AUTH_PASSWORD?.trim();

  if (!username || !password) {
    return null;
  }

  return { username, password };
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

export function proxy(request: NextRequest) {
  const credentials = getDashboardBasicAuthCredentials();

  if (!credentials) {
    return NextResponse.next();
  }

  const suppliedCredentials = decodeBasicAuthHeader(request.headers.get("authorization"));

  if (
    suppliedCredentials &&
    suppliedCredentials.username === credentials.username &&
    suppliedCredentials.password === credentials.password
  ) {
    return NextResponse.next();
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
