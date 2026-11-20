const { expo } = require("./app.json");
module.exports = () => {
  if (process.env.EAS_BUILD_PROFILE === "production") {
    const raw = process.env.EXPO_PUBLIC_BACKEND_URL;
    let url;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("Production requires EXPO_PUBLIC_BACKEND_URL.");
    }
    if (
      url.protocol !== "https:" ||
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?)/.test(
        url.hostname,
      )
    ) {
      throw new Error(
        "Production requires a public HTTPS API, not a local development server.",
      );
    }
  }
  return expo;
};
