import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { HeroDiscoveryBar } from "./HeroDiscoveryBar";

describe("HeroDiscoveryBar", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("sends the phrase to the associative search, not to title search", () => {
    render(<HeroDiscoveryBar />);
    const input = screen.getByLabelText("Опиши, що хочеш подивитись");
    fireEvent.change(input, { target: { value: "комедія з привидами" } });
    fireEvent.submit(input.closest("form")!);
    expect(push).toHaveBeenCalledWith("/vibe?q=%D0%BA%D0%BE%D0%BC%D0%B5%D0%B4%D1%96%D1%8F%20%D0%B7%20%D0%BF%D1%80%D0%B8%D0%B2%D0%B8%D0%B4%D0%B0%D0%BC%D0%B8");
  });

  it("offers example phrases and runs one on click", () => {
    render(<HeroDiscoveryBar />);
    fireEvent.click(screen.getByText("щось легке про любов"));
    expect(push).toHaveBeenCalledWith(
      `/vibe?q=${encodeURIComponent("щось легке про любов")}`
    );
  });

  it("leaves the bar unchanged on focus", () => {
    // Focus must not open a panel or reflow the hero: the examples are already
    // on screen, and a hero that moves when clicked reads as a glitch.
    const { container } = render(<HeroDiscoveryBar />);
    const before = container.innerHTML;
    fireEvent.focus(screen.getByLabelText("Опиши, що хочеш подивитись"));
    expect(container.innerHTML).toBe(before);
  });

  it("ignores a phrase too short to interpret", () => {
    render(<HeroDiscoveryBar />);
    const input = screen.getByLabelText("Опиши, що хочеш подивитись");
    fireEvent.change(input, { target: { value: "жа" } });
    fireEvent.submit(input.closest("form")!);
    expect(push).not.toHaveBeenCalled();
  });
});
