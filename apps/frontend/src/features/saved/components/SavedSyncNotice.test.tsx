import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SavedSyncNotice } from "./SavedSyncNotice";
import {
  beginSavedWrite,
  failSavedWrite,
  SAVED_WRITES_KEY,
  useSavedWrites,
} from "../store/savedWrites";
import { retrySavedWrite } from "../api/savedApi";
const auth = vi.hoisted(() => ({
  user: { id: "viewer" } as { id: string } | null,
  isLoading: false,
}));
vi.mock("../../../shared/state/auth", () => ({ useAuth: () => auth }));
vi.mock("../../../widgets/AuthModal", () => ({
  AuthModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">Вхід</div> : null,
}));
vi.mock("../api/savedApi", () => ({
  retrySavedWrite: vi.fn(async () => undefined),
}));
const operation = {
  kind: "save" as const,
  payload: {
    tmdbId: 53064,
    mediaType: "movie" as const,
    title: "Мідорі",
    nextRelease: "",
    status: "released" as const,
    listType: "watchlist" as const,
  },
};

beforeEach(() => {
  sessionStorage.clear();
  useSavedWrites.setState({
    writes: [],
    hydrated: false,
    storageUnavailable: false,
  });
  auth.user = { id: "viewer" };
  vi.clearAllMocks();
});

describe("persistent save feedback", () => {
  it("shows the film and actionable error after navigating away and back", () => {
    const write = beginSavedWrite("viewer", "Мідорі", operation);
    failSavedWrite(write.id, "Сервер зараз недоступний.");
    const first = render(<SavedSyncNotice />);
    expect(screen.getByRole("alert")).toHaveTextContent("Не збережено змін: 1");
    expect(screen.getByText("Мідорі")).toBeVisible();
    first.unmount();
    render(<SavedSyncNotice />);
    fireEvent.click(screen.getByRole("button", { name: "Повторити: Мідорі" }));
    expect(retrySavedWrite).toHaveBeenCalledWith(write.id);
  });

  it("restores an interrupted save after reload without replaying it automatically", () => {
    beginSavedWrite("viewer", "Мідорі", operation);
    expect(sessionStorage.getItem(SAVED_WRITES_KEY)).toContain("Мідорі");
    useSavedWrites.setState({ writes: [], hydrated: false });
    render(<SavedSyncNotice />);
    expect(screen.getByRole("alert")).toHaveTextContent("Не збережено");
    expect(screen.getByText("Мідорі")).toBeVisible();
    expect(retrySavedWrite).not.toHaveBeenCalled();
  });

  it("shows saving status and warns before reload while writes are pending", () => {
    beginSavedWrite("viewer", "Мідорі", operation);
    render(<SavedSyncNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("Зберігаємо зміни: 1");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    act(() => useSavedWrites.setState({ writes: [] }));
    expect(screen.queryByLabelText("Стан збереження")).not.toBeInTheDocument();
    const next = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(next);
    expect(next.defaultPrevented).toBe(false);
  });

  it("asks for login after session rejection and hides another account's film names", () => {
    const write = beginSavedWrite("viewer", "Мідорі", operation);
    failSavedWrite(write.id, "Сесія завершилась.");
    auth.user = null;
    const view = render(<SavedSyncNotice />);
    expect(screen.queryByText("Мідорі")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Увійти в акаунт" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    auth.user = { id: "another-viewer" };
    view.rerender(<SavedSyncNotice />);
    expect(screen.queryByLabelText("Стан збереження")).not.toBeInTheDocument();
  });
});
