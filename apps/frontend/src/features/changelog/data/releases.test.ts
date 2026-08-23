import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { changelogEntries } from "./releases";

describe("changelogEntries", () => {
  it("leads with the release that is about to ship", () => {
    const currentVersion = readFileSync("VERSION", "utf8").trim();
    const [major, minor, patch] = currentVersion.split(".").map(Number);

    // The changelog has to describe the next release before it is requested,
    // and that release may be a patch, a minor or a major -- release-local.sh
    // accepts all three, so pinning this to patch would block the other two.
    const nextVersions = [
      `${major}.${minor}.${patch + 1}`,
      `${major}.${minor + 1}.0`,
      `${major + 1}.0.0`,
    ];

    expect(nextVersions).toContain(changelogEntries[0].frontendVersion);
  });

  it("does not contain duplicate release labels", () => {
    const versions = changelogEntries.map((entry) => entry.version);
    expect(new Set(versions).size).toBe(versions.length);
  });
});
