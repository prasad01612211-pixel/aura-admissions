const options = {
  org: process.env.SENTRY_ORG || "auto-detect",
  project: process.env.SENTRY_PROJECT || "admissions-app",
  silent: true,
  widenClientFileUpload: true,
  disableServerWebpackPlugin: false,
  disableClientWebpackPlugin: false,
};

export default options;
