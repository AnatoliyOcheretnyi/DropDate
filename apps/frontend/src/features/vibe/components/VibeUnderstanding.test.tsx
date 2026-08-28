import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VibeLabel, VibePlan } from "../types";
import { VibeUnderstanding } from "./VibeUnderstanding";

const plan: VibePlan = {
  phrase: "молодіжний жах де багато крові",
  themes: ["slasher", "coming_of_age"],
  genres: ["horror"],
  source: "ai",
};

const labels: VibeLabel[] = [
  { kind: "theme", id: "slasher", label: "Маніяк і слешер", emoji: "🩸" },
  { kind: "theme", id: "coming_of_age", label: "Дорослішання", emoji: "🌱" },
  { kind: "genre", id: "horror", label: "Жахи" },
];

const renderPanel = (props: Partial<Parameters<typeof VibeUnderstanding>[0]> = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const merged = {
    plan,
    labels,
    isLoading: false,
    onRemove: vi.fn(),
    onAddTheme: vi.fn(),
    onAddGenre: vi.fn(),
    onReset: vi.fn(),
    ...props,
  };
  render(
    <QueryClientProvider client={client}>
      <VibeUnderstanding {...merged} />
    </QueryClientProvider>
  );
  return merged;
};

describe("VibeUnderstanding", () => {
  it("shows what the phrase was read as", () => {
    renderPanel();
    expect(screen.getByText("Маніяк і слешер")).toBeInTheDocument();
    expect(screen.getByText("Дорослішання")).toBeInTheDocument();
    expect(screen.getByText("Жахи")).toBeInTheDocument();
  });

  it("reports a removed chip so the query can be re-run", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByLabelText("Прибрати Дорослішання"));
    expect(props.onRemove).toHaveBeenCalledWith(labels[1]);
  });

  it("says when the plan came from the keyword fallback rather than the model", () => {
    renderPanel({ plan: { ...plan, source: "keywords" } });
    expect(
      screen.getByText(/Розібрали без AI/)
    ).toBeInTheDocument();
  });
});
