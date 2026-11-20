# DropDate Mobile

Native Expo Router client for iOS and Android, built with Expo SDK 54 / React Native 0.81. The app uses the live DropDate API; it is not a mock catalogue.

## Run

Yarn is the mobile package manager and `yarn.lock` is the authoritative lockfile. Install dependencies with Yarn in the repository root and in `apps/mobile`. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_BACKEND_URL` to an API reachable from the device. A physical phone needs a LAN/public address; Android Emulator normally uses `http://10.0.2.2:8080` for the host. Restart Metro after changing public environment variables.

From the repository root:

```sh
npx nx run mobile:start
npx nx run mobile:ios
npx nx run mobile:android
npx nx run mobile:android-build # sync native config and build a debug APK; requires Android SDK
npx nx run-many -t lint,typecheck,test,bundle -p mobile
```

`mobile:preview` starts the web rendering at port 8082 for layout checks. Browser requests additionally need a same-origin API proxy or an API that explicitly allows the preview origin. This does not affect native requests. Browser refresh tokens are memory-only; persistent session verification must use a native build.

Rebuild the native app after dependency/plugin changes. SecureStore, MMKV and other native modules cannot be added to an already installed binary by a JavaScript reload. Expo Go is not the native acceptance-test environment for this app.

## Experience and feature coverage

- Five tabs: home, search, saved lists, games and profile. Shared dark/light themes, safe areas, keyboard handling and restrained transitions with system Reduce Motion support.
- Title and descriptive search, catalogue filters, curated collections, mood selection, Cinematch, similar titles and movie bridges.
- Details, cast/people, providers with persistent preferred region/services, episode tracking, ratings, watch counts and release calendar.
- Guest lists persist on the device. Account lists use the authenticated API. List changes report errors and the picker waits for the write to finish.
- Friends, recommendations, activity, shared lists and public shared links, achievements, taste profile and game modes.
- World cinema: country atlas, top/popular/gems/personal modes, genre/decade/runtime/service filters, hide watched, passport aggregation, feedback and three-film itineraries. The mobile country picker replaces the web 3D globe.
- Account settings and password-confirmed account deletion. Unconfigured legal/support links remain hidden until supplied.

## Reliability

Native refresh tokens use Keychain/Keystore through SecureStore. Existing plaintext tokens migrate only after a successful secure write. Concurrent refreshes are shared, offline failures preserve the session, and sign-out clears account caches. Catalogue data can be shown from cache with an offline banner.

The mobile test target covers API refresh/cancellation/error handling, secure-token migration/write ordering, guest-list persistence, world filters/passport pagination and itinerary selection. `bundle` exports Android/iOS Hermes bundles and the web preview; it does **not** create signed APK/AAB/IPA binaries.

## Verification of this revision

- Mobile lint, TypeScript, formatting and all 17 tests pass.
- Android/iOS Hermes and web exports complete successfully.
- Android native prebuild and `app:assembleDebug` succeed with target SDK 36. The APK is at `android/app/build/outputs/apk/debug/app-debug.apk`; this debug build needs Metro and a device-reachable API.
- Backend tests, including account-deletion handler cases, pass.
- Welcome, home with live catalogue data and the list picker were inspected in the browser. Full authenticated flows and small-phone/native visual acceptance remain unverified.
- A native iOS build was not run because Xcode/simulators are unavailable in this environment.

## Release validation still required

The current work is a development build candidate, not a certification that App Store or Play review will pass. Before submission:

- Run signed release builds on real iOS and Android devices, including a small phone, large text, VoiceOver/TalkBack, Reduce Motion and both themes.
- Exercise login, verification, token restoration after relaunch, offline/reconnect, list writes, episodes, games, shared links and deletion against a disposable test account. Backend deletion handler unit tests do not replace a database cascade integration check.
- Measure scrolling and transitions in release mode; browser screenshots and Hermes export do not establish native frame rate or memory behavior.
- Supply the production HTTPS API, privacy/terms/support links, web deletion page, store metadata, review credentials and distribution signing. These inputs were explicitly deferred while UI/functionality is the priority.
- Verify domain association files for universal/app links and validate all links from a cold launch.
- Resolve the remaining dependency advisories that need incompatible transitive upgrades (including Expo tooling and router URL parsing); the dependency audit is not clean. Compatible lockfile updates remove the critical shell-quote advisory.
- Recheck current Apple/Google SDK and submission requirements on the actual upload date; choose and verify a compatible EAS/Xcode image rather than assuming an export satisfies them.

`eas.json` defines development, preview and production profiles. The production app config rejects local/non-HTTPS API addresses. EAS signing, store upload and deployment are separate steps and have not been performed by this change.
