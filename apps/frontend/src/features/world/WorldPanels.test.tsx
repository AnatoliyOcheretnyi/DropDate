import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorldPanels } from "./WorldPanels";

describe("atlas and film navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
  });
  afterEach(() => vi.unstubAllGlobals());
  it("keeps the globe mounted and moves keyboard focus into the active view", async () => {
    const mount = vi.fn(),
      unmount = vi.fn();
    function Atlas() {
      useEffect(() => {
        mount();
        return unmount;
      }, []);
      return <input type="search" aria-label="Знайти країну" />;
    }
    const back = vi.fn();
    const props = {
      onBack: back,
      country: "UA",
      atlas: <Atlas />,
      children: <h2>Фільми</h2>,
    };
    const view = render(<WorldPanels {...props} showFilms={false} />);
    expect(
      screen.queryByRole("button", { name: /До глобуса/ }),
    ).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(screen.getByRole("searchbox"));
    view.rerender(<WorldPanels {...props} showFilms />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /До глобуса/ })).toHaveFocus(),
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /До глобуса/ }));
    expect(back).toHaveBeenCalledOnce();
    view.rerender(<WorldPanels {...props} showFilms={false} />);
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
    expect(mount).toHaveBeenCalledOnce();
    expect(unmount).not.toHaveBeenCalled();
  });
  it("leaves wheel and touch scrolling native and returns only with the button", () => {
    const back = vi.fn();
    const { container } = render(
      <WorldPanels
        showFilms
        onBack={back}
        country="JP"
        atlas={<div>Globe</div>}
      >
        <div>Films</div>
      </WorldPanels>,
    );
    const pane = container.querySelector<HTMLElement>(".world-pane--films")!;
    Object.defineProperties(pane, {
      clientHeight: { value: 500 },
      scrollHeight: { value: 1500 },
    });
    for (const position of [0, 400, 1000]) {
      pane.scrollTop = position;
      for (const deltaY of [-240, 240]) {
        expect(fireEvent.wheel(pane, { deltaY, cancelable: true })).toBe(true);
      }
      fireEvent.touchStart(pane, { touches: [{ clientX: 80, clientY: 100 }] });
      expect(
        fireEvent.touchMove(pane, {
          touches: [{ clientX: 280, clientY: 300 }],
          cancelable: true,
        }),
      ).toBe(true);
      fireEvent.touchEnd(pane, {
        touches: [],
        changedTouches: [{ clientX: 280, clientY: 300 }],
      });
    }
    expect(back).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /До глобуса/ }));
    expect(back).toHaveBeenCalledOnce();
  });
});
