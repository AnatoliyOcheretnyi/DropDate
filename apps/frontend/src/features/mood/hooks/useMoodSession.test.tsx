import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, type ReactNode } from "react";
import { useMoodSession } from "./useMoodSession";
import { fetchMoodNext } from "../api/mood";

vi.mock("../api/mood", () => ({
  fetchMoodNext: vi.fn(),
  fetchMoodPicks: vi.fn(),
}));
const question = {
  id: "time",
  title: "Скільки маєш часу?",
  type: "single",
  options: [],
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

describe("mood shortcut and return from details", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(fetchMoodNext)
      .mockReset()
      .mockResolvedValue({
        question,
        done: false,
        answered: 1,
        meta: { depth: "quick", version: 1 },
      });
  });
  it("carries the chosen mood into the first backend request", async () => {
    const { result } = renderHook(() => useMoodSession("token", "cozy"), {
      wrapper,
    });
    await act(() => result.current.start("quick", true));
    expect(fetchMoodNext).toHaveBeenCalledWith(
      "quick",
      { mood: "cozy" },
      "token",
    );
    expect(result.current.answers.mood).toBe("cozy");
  });
  it("restores matching results instead of starting over on return", async () => {
    sessionStorage.setItem(
      "dropdate:mood-session",
      JSON.stringify({
        status: "results",
        depth: "quick",
        answers: { mood: "cozy", time: "short" },
        picks: [{ tmdbId: 1, mediaType: "movie", title: "Saved pick" }],
      }),
    );
    const { result } = renderHook(() => useMoodSession("token", "cozy"), {
      wrapper,
    });
    await act(() => result.current.start("quick", true));
    expect(fetchMoodNext).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.status).toBe("results"));
    expect(result.current.picks[0].title).toBe("Saved pick");
    expect(
      JSON.parse(sessionStorage.getItem("dropdate:mood-session")!).answers.time,
    ).toBe("short");
  });
  it("starts a new flow when the shortcut mood differs", async () => {
    sessionStorage.setItem(
      "dropdate:mood-session",
      JSON.stringify({
        status: "results",
        answers: { mood: "cry" },
        picks: [],
      }),
    );
    const { result } = renderHook(() => useMoodSession("token", "cozy"), {
      wrapper,
    });
    await act(() => result.current.start("quick", true));
    expect(fetchMoodNext).toHaveBeenCalledWith(
      "quick",
      { mood: "cozy" },
      "token",
    );
  });
});
