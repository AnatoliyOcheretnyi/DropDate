import { describe, expect, it, vi } from "vitest";
import { enqueueSavedWrite } from "./savedWriteQueue";

describe("enqueueSavedWrite", () => {
  it("keeps save and undo writes ordered for the same list item", async () => {
    let finishSave!: () => void;
    const calls: string[] = [];
    const onDrain = vi.fn();

    const save = enqueueSavedWrite(
      "movie:1:favorite",
      () =>
        new Promise<void>((resolve) => {
          calls.push("save:start");
          finishSave = () => {
            calls.push("save:end");
            resolve();
          };
        }),
      onDrain
    );
    const undo = enqueueSavedWrite(
      "movie:1:favorite",
      async () => {
        calls.push("undo");
      },
      onDrain
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toEqual(["save:start"]);
    finishSave();
    await Promise.all([save, undo]);

    expect(calls).toEqual(["save:start", "save:end", "undo"]);
    expect(onDrain).toHaveBeenCalledTimes(1);
  });

  it("continues with undo even when the initial save fails", async () => {
    const calls: string[] = [];

    const save = enqueueSavedWrite(
      "movie:2:favorite",
      async () => {
        calls.push("save");
        throw new Error("offline");
      },
      () => undefined
    );
    const undo = enqueueSavedWrite(
      "movie:2:favorite",
      async () => {
        calls.push("undo");
      },
      () => undefined
    );

    await expect(save).rejects.toThrow("offline");
    await undo;
    expect(calls).toEqual(["save", "undo"]);
  });
});
