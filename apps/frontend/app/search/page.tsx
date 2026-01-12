export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { SearchScreen } from "../../src/features/search/screens/SearchScreen";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchScreen />
    </Suspense>
  );
}
