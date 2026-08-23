"use client";

import { useRouter } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { copy } from "../../../shared/lib/strings";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { Icon } from "../../../shared/ui/Icon";
import {
  spotlightReleaseAt,
  useSpotlightDetails,
} from "../hooks/useSpotlightDetails";
import { HeroCountdown } from "./HeroCountdown";
import { HeroDiscoveryBar } from "./HeroDiscoveryBar";

type Props = {
  spotlight: Suggestion | null;
  /** Everything else the home page loaded, for the "surprise me" die. */
  surprisePool: Suggestion[];
  isSuggestionSaved: (suggestion: Suggestion) => boolean;
  getListTypes: (suggestion: Suggestion) => ListType[];
  onChangeLists: (suggestion: Suggestion, next: ListType[]) => void;
};

export function HomeHero({
  spotlight,
  surprisePool,
  isSuggestionSaved,
  getListTypes,
  onChangeLists,
}: Props) {
  const router = useRouter();
  const { data: details } = useSpotlightDetails(spotlight);
  const releaseAt = spotlightReleaseAt(details);

  if (!spotlight) {
    return null;
  }

  const isTracked = getListTypes(spotlight).includes("watchlist");
  const backdrop = details?.backdropUrl ?? spotlight.posterUrl;

  const mediaLabel =
    spotlight.mediaType === "movie" ? copy.mediaType.movie : copy.mediaType.series;

  // Meta chips are whatever the API actually knows: the type is always there,
  // the rest appear as /details fills in.
  const metaChips = [
    mediaLabel.toUpperCase(),
    spotlight.year,
    details?.networks?.[0],
    details?.genres?.slice(0, 2).join(" · "),
  ].filter((chip): chip is string => Boolean(chip));

  const handleTrack = () => {
    if (isTracked) {
      router.push("/saved");
      return;
    }
    onChangeLists(spotlight, [...getListTypes(spotlight), "watchlist"]);
  };

  return (
    <section className="home-hero hero-bleed" aria-labelledby="home-hero-title">
      <div className="home-hero__media" aria-hidden="true">
        {backdrop ? (
          <CoverImage
            src={backdrop}
            alt=""
            sizes="100vw"
            priority
            ariaHidden
            className="home-hero__image"
          />
        ) : null}
        <span className="home-hero__scrim" />
      </div>

      <div className="home-hero__inner">
        <div className="home-hero__body">
          <div className="home-hero__copy">
            <p className="home-hero__badge">
              <Icon name="flame" size={14} />
              <span>ГОЛОВНА ПРЕМʼЄРА СЕЗОНУ</span>
            </p>

            <h1 id="home-hero-title" className="home-hero__title">
              {spotlight.title}
            </h1>

            <ul className="home-hero__meta">
              {metaChips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>

            {details?.overview ? (
              <p className="home-hero__overview">{details.overview}</p>
            ) : null}

            <div className="home-hero__cta">
              <button
                type="button"
                className="home-hero__cta-primary"
                onClick={handleTrack}
              >
                <Icon name={isTracked ? "bookmark-check" : "bell-plus"} size={18} />
                <span>{isTracked ? "У твоєму списку" : "Нагадати про реліз"}</span>
              </button>
              <button
                type="button"
                className="home-hero__cta-secondary"
                onClick={() =>
                  router.push(`/title/${spotlight.mediaType}/${spotlight.id}`)
                }
              >
                <Icon name="play" size={18} />
                <span>Детальніше</span>
              </button>
            </div>
          </div>

          <HeroCountdown details={details ?? null} releaseAt={releaseAt} />
        </div>

        <HeroDiscoveryBar
          surprisePool={surprisePool}
          isSuggestionSaved={isSuggestionSaved}
        />
      </div>
    </section>
  );
}
