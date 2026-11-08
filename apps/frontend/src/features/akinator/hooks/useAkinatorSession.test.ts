import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAkinatorSession } from "./useAkinatorSession";
const api = vi.hoisted(() => ({ startAkinator: vi.fn(), nextAkinator: vi.fn(), logAkinatorResult: vi.fn() }));
vi.mock("../api/akinator", () => api);
beforeEach(() => {
  api.startAkinator.mockReset().mockResolvedValue({ sessionToken: "token", question: { id: "q1", text: "First?" }, step: 1, candidates: 10 });
  api.nextAkinator.mockReset();
  api.logAkinatorResult.mockReset().mockResolvedValue({});
});
describe("akinator corrections", () => {
  it("reuses the prepared start, undoes an answer and excludes a wrong guess", async () => {
    const { result } = renderHook(() => useAkinatorSession());
    await act(async () => { await result.current.start(); });
    expect(api.startAkinator).toHaveBeenCalledTimes(1);
    api.nextAkinator.mockResolvedValueOnce({ type: "question", question: { id: "q2", text: "Second?" }, step: 2, candidates: 5 });
    act(() => result.current.answer("yes"));
    await waitFor(() => expect(result.current.current?.question?.id).toBe("q2"));
    act(() => result.current.undo());
    expect(result.current.current?.question?.id).toBe("q1");
    expect(result.current.answers).toEqual([]);
    api.nextAkinator.mockResolvedValueOnce({ type: "guess", guess: { tmdbId: 23, mediaType: "movie", title: "Guess" }, step: 2, candidates: 1 });
    act(() => result.current.answer("no"));
    await waitFor(() => expect(result.current.current?.type).toBe("guess"));
    api.nextAkinator.mockResolvedValueOnce({ type: "question", question: { id: "q3", text: "Third?" }, step: 2, candidates: 4 });
    await act(async () => { await result.current.finish(false); });
    expect(api.nextAkinator).toHaveBeenLastCalledWith("token", [{ questionId: "q1", answer: "no" }], [23]);
    expect(result.current.current?.question?.id).toBe("q3");
    api.nextAkinator.mockRejectedValueOnce(new Error("Offline"));
    act(() => result.current.answer("yes"));
    await waitFor(() => expect(result.current.error).toBe("Offline"));
    expect(result.current.current?.question?.id).toBe("q3");
    expect(result.current.answers).toHaveLength(1);
  });
});
