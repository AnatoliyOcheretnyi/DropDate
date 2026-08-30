import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoHint } from "./InfoHint";

/** Waits past the close grace period, with the timer's state update in act. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

const renderHint = () =>
  render(
    <InfoHint title="Як працює пошук">
      <p>Жанри складаються через «і».</p>
    </InfoHint>
  );

describe("InfoHint", () => {
  it("opens on hover after the delay and closes when the pointer leaves", async () => {
    renderHint();
    const trigger = screen.getByRole("button", { name: "Як працює пошук" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.mouseEnter(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("stays open while the pointer is on the card, so the copy can be read", async () => {
    renderHint();
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Як працює пошук" }));
    const card = await screen.findByRole("dialog");

    fireEvent.mouseLeave(screen.getByRole("button", { name: "Як працює пошук" }));
    fireEvent.mouseEnter(card);
    await settle();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("pins open on click, because a touch screen never hovers", async () => {
    renderHint();
    const trigger = screen.getByRole("button", { name: "Як працює пошук" });

    fireEvent.click(trigger);
    const card = await screen.findByRole("dialog");
    // Leaving no longer closes it: the reader asked for it explicitly.
    fireEvent.mouseLeave(trigger);
    await settle();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Закрити" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(card).not.toBeInTheDocument();
  });

  it("dismisses a pinned card with Escape", async () => {
    renderHint();
    fireEvent.click(screen.getByRole("button", { name: "Як працює пошук" }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
