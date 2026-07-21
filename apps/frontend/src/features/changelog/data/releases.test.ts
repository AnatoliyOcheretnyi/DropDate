import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { changelogEntries } from "./releases";

describe("changelogEntries", () => {
  it("contains the current frontend release first", () => {
    const currentVersion = readFileSync("VERSION", "utf8").trim();
    expect(changelogEntries[0].frontendVersion).toBe(currentVersion);
  });

  it("does not contain duplicate release labels", () => {
    const versions = changelogEntries.map((entry) => entry.version);
    expect(new Set(versions).size).toBe(versions.length);
  });
});
