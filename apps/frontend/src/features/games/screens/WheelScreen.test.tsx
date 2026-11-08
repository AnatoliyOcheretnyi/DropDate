import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WheelScreen } from "./WheelScreen";
const fixtures = vi.hoisted(() => ({ saved: Array.from({ length: 40 }, (_, i) => ({ id: `movie:${i + 1}`, tmdbId: i + 1, title: `Movie ${i + 1}`, mediaType: "movie", type: "movie", listTypes: ["watchlist"] })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../../shared/state/auth", () => ({ useAuth: () => ({ user: { id: "user" } }) }));
vi.mock("../../saved/hooks/useSavedReleases", () => ({ useSavedReleases: () => ({ saved: fixtures.saved, isReady: true }) }));
vi.mock("../components/GameShell", () => ({ GameShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("../components/Confetti", () => ({ Confetti: () => null }));
vi.mock("../../../shared/ui/MovieInfoButton", () => ({ MovieInfoButton: () => null }));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("wheel draws", () => {
  it("can select the last of 40 titles and excludes it on the next spin", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.99999);
    const { container } = render(<WheelScreen />);
    expect(screen.getByText("У колесі: 40 з 40")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Крутнути" }));
    act(() => { vi.advanceTimersByTime(4800); });
    expect(container.querySelector(".wheel__result-title")).toHaveTextContent("Movie 40");
    fireEvent.click(screen.getByRole("button", { name: "Крутнути ще" }));
    act(() => { vi.advanceTimersByTime(4800); });
    expect(container.querySelector(".wheel__result-title")).toHaveTextContent("Movie 39");
    fireEvent.click(screen.getByRole("checkbox", { name: /Фільми/ }));
    expect(screen.getByText(/За цими фільтрами немає тайтлів/)).toBeInTheDocument();
    expect(container.querySelector(".wheel__result-title")).toBeNull();
  });
});
