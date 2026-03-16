import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

const configWithSentry =
  process.env.SENTRY_DSN && process.env.SENTRY_DSN.trim().length > 0 ? withSentryConfig(nextConfig) : nextConfig;

export default configWithSentry;
