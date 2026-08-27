import { describe, expect, it } from "vitest";
import { personRoleLabel } from "./personRoles";

describe("personRoleLabel", () => {
  it("joins the roles a person actually works in", () => {
    expect(
      personRoleLabel({ roles: ["director", "writer"], gender: 2 })
    ).toBe("Режисер / Сценарист");
    expect(personRoleLabel({ roles: ["actor", "director"], gender: 2 })).toBe(
      "Актор / Режисер"
    );
  });

  it("uses the feminine form when TMDB knows the gender", () => {
    expect(personRoleLabel({ roles: ["actor"], gender: 1 })).toBe("Акторка");
    expect(personRoleLabel({ department: "Directing", gender: 1 })).toBe(
      "Режисерка"
    );
  });

  it("falls back to the known-for department when roles are unknown", () => {
    expect(personRoleLabel({ department: "Acting", gender: 2 })).toBe("Актор");
    expect(personRoleLabel({ department: "Writing" })).toBe("Сценарист");
  });

  it("keeps a readable label for departments that are not one of the three", () => {
    expect(personRoleLabel({ department: "Camera" })).toBe("Операторська робота");
    expect(personRoleLabel({ department: "" })).toBe("");
  });

  it("ignores roles it does not know", () => {
    expect(personRoleLabel({ roles: ["gaffer"], department: "Acting" })).toBe(
      "Актор"
    );
  });
});
