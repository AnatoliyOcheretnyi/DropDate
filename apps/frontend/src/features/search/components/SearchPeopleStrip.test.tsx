import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PersonMatch } from "../types";
import { SearchPeopleStrip } from "./SearchPeopleStrip";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const people: PersonMatch[] = [
  {
    id: 525,
    name: "Крістофер Нолан",
    department: "Directing",
    gender: 2,
    roles: ["director", "writer"],
    profileUrl: "https://image.tmdb.org/t/p/w342/nolan.jpg",
    knownFor: [
      {
        id: 27205,
        title: "Початок",
        mediaType: "movie" as const,
        year: "2010",
      },
    ],
  },
  { id: 2, name: "Нолан Норт", department: "Acting", gender: 2 },
  { id: 3, name: "Софія Коппола", department: "Directing", gender: 1 },
];

describe("SearchPeopleStrip", () => {
  it("renders a card per person with a readable department", () => {
    render(<SearchPeopleStrip people={people} />);
    expect(screen.getByText("Крістофер Нолан")).toBeInTheDocument();
    // Roles come from credits, so someone who directs and writes reads as both.
    expect(screen.getByText("Режисер / Сценарист · Початок")).toBeInTheDocument();
    expect(screen.getByText("Актор")).toBeInTheDocument();
    // TMDB gender picks the form of the noun.
    expect(screen.getByText("Режисерка")).toBeInTheDocument();
  });

  it("opens the person page on click", () => {
    render(<SearchPeopleStrip people={people} />);
    fireEvent.click(screen.getByText("Крістофер Нолан"));
    expect(push).toHaveBeenCalledWith("/person/525");
  });

  it("renders nothing when the query matched no people", () => {
    const { container } = render(<SearchPeopleStrip people={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
