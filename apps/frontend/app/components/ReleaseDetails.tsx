"use client";

import type { ReleaseInfo } from "../../lib/release";

type Props = {
  release: ReleaseInfo;
};

export function ReleaseDetails({ release }: Props) {
  const releaseDate = new Date(release.nextRelease);
  const formattedDate = releaseDate.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedWeekday = releaseDate.toLocaleDateString("uk-UA", {
    weekday: "long",
  });

  return (
    <dl>
      <div>
        <dt>Тип</dt>
        <dd>{release.type}</dd>
      </div>
      <div>
        <dt>Дата</dt>
        <dd className="date">
          <span>{formattedDate}</span>
          <span>{formattedWeekday}</span>
        </dd>
      </div>
      <div>
        <dt>Джерело</dt>
        <dd>{release.source}</dd>
      </div>
    </dl>
  );
}
