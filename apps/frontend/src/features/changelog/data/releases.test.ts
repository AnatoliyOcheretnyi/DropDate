import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { changelogEntries } from "./releases";

describe("changelogEntries", () => {
  it("contains the next frontend patch release first", () => {
    const currentVersion = readFileSync("VERSION", "utf8").trim();
    const [major, minor, patch] = currentVersion.split(".").map(Number);
    const nextPatchVersion = `${major}.${minor}.${patch + 1}`;

    expect(changelogEntries[0].frontendVersion).toBe(nextPatchVersion);
  });

  it("does not contain duplicate release labels", () => {
    const versions = changelogEntries.map((entry) => entry.version);
    expect(new Set(versions).size).toBe(versions.length);
  });
});
