"use client";

import { Suspense } from "react";
import { FriendProfileScreen } from "../../../src/features/friends/screens/FriendProfileScreen";

export default function FriendProfilePage() {
  return (
    <Suspense fallback={null}>
      <FriendProfileScreen />
    </Suspense>
  );
}
