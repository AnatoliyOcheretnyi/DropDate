export type ReleaseInfo = {
  title: string;
  type: string;
  nextRelease: string;
  source: string;
  posterUrl?: string;
};

export type Suggestion = {
  id: number;
  title: string;
  mediaType: string;
  year?: string;
};
