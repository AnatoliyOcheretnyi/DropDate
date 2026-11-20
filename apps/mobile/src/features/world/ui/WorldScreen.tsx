import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { ListPickerModal } from "../../../shared/ui/ListPickerModal";
import { useToast } from "../../../shared/ui/Toast";
import { useAuthStore } from "../../auth/store/authStore";
import { useSaved } from "../../saved/hooks/useSaved";
import { useListPicker } from "../../saved/hooks/useListPicker";
import {
  getWorld,
  getWorldPassport,
  makeFilmRoute,
  worldFeedback,
  type WorldFilters,
  type WorldItem,
} from "../api/world";
import { useWatchPreferences } from "../../../shared/utils/watchPreferences";
import countries from "../countries.json";
const modes = [
  ["top", "Найкращі"],
  ["popular", "Популярні"],
  ["gems", "Перлини"],
  ["personal", "Для тебе"],
];
const genres = [
  ["", "Усі жанри"],
  ["18", "Драма"],
  ["35", "Комедія"],
  ["53", "Трилер"],
  ["28", "Бойовик"],
  ["12", "Пригоди"],
  ["16", "Анімація"],
  ["80", "Кримінал"],
  ["99", "Документальний"],
  ["10751", "Сімейний"],
  ["14", "Фентезі"],
  ["36", "Історичний"],
  ["27", "Жахи"],
  ["9648", "Детектив"],
  ["10749", "Романтика"],
  ["878", "Фантастика"],
];
const flag = (code: string) =>
  String.fromCodePoint(...code.split("").map((c) => 127397 + c.charCodeAt(0)));
const suggestion = (item: WorldItem) => ({ ...item, id: item.tmdbId });
export default function WorldScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    country?: string;
    seed?: string;
    intent?: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const { saved } = useSaved();
  const picker = useListPicker();
  const { showToast } = useToast();
  const watch = useWatchPreferences();
  const [filters, setFilters] = useState<WorldFilters>({
    country: countries.some((c) => c.code === params.country)
      ? params.country!
      : "UA",
    mode: "top",
    genre: "",
    decade: "",
    runtime: "",
    hideWatched: true,
    seed: params.seed,
    intent: params.intent,
  });
  const [countryPicker, setCountryPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [onlyServices, setOnlyServices] = useState(false);
  const [hidden, setHidden] = useState<number[]>([]);
  const country = countries.find((c) => c.code === filters.country) ?? {
    code: filters.country,
    name: filters.country,
  };
  const update = (next: Partial<WorldFilters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setHidden([]);
  };
  const request = {
    ...filters,
    providers: onlyServices ? watch.ids : [],
    region: watch.region,
  };
  const query = useInfiniteQuery({
    queryKey: ["world", user?.id, request],
    initialPageParam: 1,
    enabled: filters.mode !== "personal" || Boolean(user),
    queryFn: ({ pageParam, signal }) => getWorld(request, pageParam, signal),
    getNextPageParam: (last, pages) =>
      !last.exhausted && last.items.length && pages.length < 10
        ? pages.length + 1
        : undefined,
  });
  const watched = useMemo(
    () =>
      new Set(
        saved
          .filter(
            (i) =>
              i.mediaType === "movie" &&
              (i.listTypes.includes("watched") ||
                i.watchCount ||
                i.lastWatchedAt),
          )
          .map((i) => i.tmdbId),
      ),
    [saved],
  );
  const passportKey = saved
    .filter(
      (i) =>
        i.mediaType === "movie" &&
        i.listTypes.some((t) =>
          ["watched", "favorite", "liked", "disliked"].includes(t),
        ),
    )
    .map((i) => i.tmdbId)
    .sort((a, b) => a - b)
    .join(",");
  const passport = useQuery({
    queryKey: ["world-passport", user?.id, passportKey],
    queryFn: ({ signal }) => getWorldPassport(signal),
    enabled: Boolean(user),
  });
  const items = useMemo(
    () =>
      [
        ...new Map(
          (query.data?.pages.flatMap((p) => p.items ?? []) ?? []).map((i) => [
            i.tmdbId,
            i,
          ]),
        ).values(),
      ].filter(
        (i) =>
          !hidden.includes(i.tmdbId) &&
          (!filters.hideWatched || !watched.has(i.tmdbId)),
      ),
    [query.data, hidden, filters.hideWatched, watched],
  );
  const route = useMemo(() => makeFilmRoute(items), [items]);
  const reaction = useMutation({
    mutationFn: ({
      item,
      action,
    }: {
      item: WorldItem;
      action: "liked" | "disliked";
    }) => worldFeedback(item, action),
    onSuccess: (_, { item, action }) => {
      if (action === "disliked") setHidden((v) => [...v, item.tmdbId]);
      showToast("Врахуємо у наступних рекомендаціях");
    },
    onError: () => showToast("Не вдалося зберегти реакцію. Спробуй ще раз."),
  });
  const openTitle = (item: WorldItem) =>
    router.push(`/title/${item.mediaType}/${item.tmdbId}`);
  const chips = (
    options: string[][],
    value: string,
    choose: (value: string) => void,
  ) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chips}
    >
      {options.map(([id, label]) => (
        <MotionPressable
          key={id}
          accessibilityState={{ selected: value === id }}
          style={[
            s.chip,
            { backgroundColor: value === id ? colors.accent : colors.elevated },
          ]}
          onPress={() => choose(id)}
        >
          <Text
            style={{
              color:
                value === id
                  ? colors.isDark
                    ? "#10281c"
                    : "#fff"
                  : colors.text,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {label}
          </Text>
        </MotionPressable>
      ))}
    </ScrollView>
  );
  const visited = passport.data?.countries ?? {};
  const header = (
    <View style={s.header}>
      <Text style={[s.eyebrow, { color: colors.accent }]}>
        КІНО БЕЗ КОРДОНІВ
      </Text>
      <Text style={[s.title, { color: colors.text }]}>
        Світ у твоєму{`\n`}кінопаспорті.
      </Text>
      <Text style={[s.lead, { color: colors.textMuted }]}>
        Нові країни. Інший погляд. Історії, які варто привезти з собою.
      </Text>
      <View
        style={[
          s.passport,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name="earth-outline" size={44} color={colors.accent} />
        <View style={s.grow}>
          <Text style={[s.cardTitle, { color: colors.text }]}>
            {user
              ? `${Object.keys(visited).length} країн відкрито`
              : "Твоя подорож починається"}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 5 }}>
            {user
              ? `${passport.data?.totalWatched ?? 0} фільмів у кінопаспорті`
              : "Обирай країну та відкривай її кіно"}
          </Text>
        </View>
        <MotionPressable
          accessibilityLabel="Відкрити кінопаспорт"
          style={s.icon}
          onPress={() =>
            user ? setPassportOpen(!passportOpen) : router.push("/auth")
          }
        >
          <Ionicons name="arrow-forward" size={22} color={colors.text} />
        </MotionPressable>
      </View>
      {passportOpen && (
        <View style={[s.panel, { backgroundColor: colors.card }]}>
          {passport.isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : passport.isError ? (
            <ScreenState
              title="Кінопаспорт недоступний"
              onRetry={() => void passport.refetch()}
            />
          ) : (
            <>
              <Text style={{ color: colors.textMuted }}>
                Переглянуті, улюблені та оцінені фільми за країною виробництва.
              </Text>
              {Object.entries(visited)
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => (
                  <MotionPressable
                    key={code}
                    style={s.row}
                    onPress={() => {
                      update({ country: code });
                      setPassportOpen(false);
                    }}
                  >
                    <Text style={{ color: colors.text }}>
                      {flag(code)}{" "}
                      {countries.find((c) => c.code === code)?.name ?? code}
                    </Text>
                    <Text style={{ color: colors.accent }}>{count}</Text>
                  </MotionPressable>
                ))}
              {!Object.keys(visited).length && (
                <Text style={{ color: colors.text }}>
                  Познач перший переглянутий фільм, щоб почати подорож.
                </Text>
              )}
              {Boolean(passport.data?.missing) && (
                <Text style={{ color: colors.textMuted }}>
                  Для {passport.data?.missing} фільмів країна поки невідома.
                </Text>
              )}
            </>
          )}
        </View>
      )}
      <View style={s.row}>
        <MotionPressable
          style={[s.country, { backgroundColor: colors.elevated }]}
          onPress={() => setCountryPicker(true)}
        >
          <Text style={s.flag}>{flag(country.code)}</Text>
          <Text
            numberOfLines={2}
            style={[s.cardTitle, s.grow, { color: colors.text }]}
          >
            {country.name}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </MotionPressable>
        <MotionPressable
          style={s.icon}
          accessibilityLabel="Випадкова країна"
          onPress={() =>
            update({
              country:
                countries[Math.floor(Math.random() * countries.length)].code,
            })
          }
        >
          <Ionicons name="shuffle-outline" size={24} color={colors.accent} />
        </MotionPressable>
        <MotionPressable
          style={s.icon}
          accessibilityLabel="Фільтри"
          accessibilityState={{ expanded: filtersOpen }}
          onPress={() => setFiltersOpen(!filtersOpen)}
        >
          <Ionicons name="options-outline" size={24} color={colors.text} />
        </MotionPressable>
      </View>
      {chips(modes, filters.mode, (mode) => update({ mode }))}
      {filtersOpen && (
        <View style={[s.panel, { backgroundColor: colors.card }]}>
          {chips(genres, filters.genre, (genre) => update({ genre }))}
          {chips(
            [
              ["", "Усі роки"],
              ...Array.from({ length: 8 }, (_, i) => {
                const y = String(
                  Math.floor(new Date().getFullYear() / 10) * 10 - i * 10,
                );
                return [y, `${y}-ті`];
              }),
            ],
            filters.decade,
            (decade) => update({ decade }),
          )}
          {chips(
            [
              ["", "Будь-яка тривалість"],
              ["90", "До 90 хв"],
              ["120", "До 2 год"],
              ["180", "До 3 год"],
            ],
            filters.runtime,
            (runtime) => update({ runtime }),
          )}
          <View style={s.row}>
            <Text style={{ color: colors.text }}>Без переглянутого</Text>
            <Switch
              accessibilityLabel="Приховати переглянуте"
              value={filters.hideWatched}
              onValueChange={(hideWatched) => update({ hideWatched })}
            />
          </View>
          <View style={s.row}>
            <Text style={[s.grow, { color: colors.text }]}>
              {watch.ids.length
                ? `Мої сервіси · ${watch.region}`
                : "Обери свої сервіси у «Де дивитися»"}
            </Text>
            <Switch
              accessibilityLabel="Лише мої сервіси"
              disabled={!watch.ids.length}
              value={onlyServices}
              onValueChange={setOnlyServices}
            />
          </View>
        </View>
      )}
      <Text style={[s.caption, { color: colors.textMuted }]}>
        Країна виробництва фільму. Рейтинги й популярність — TMDB.
        {filters.mode === "personal"
          ? query.data?.pages[0]?.aiUsed
            ? " Добірку доповнено AI."
            : " Добірка за твоїм смаком."
          : ""}
      </Text>
      {query.data?.pages.some((p) => p.partial) && (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.gold }}>
          Частина даних недоступна. Показуємо те, що вдалося завантажити.
        </Text>
      )}
      {route.length === 3 && (
        <MotionPressable
          style={[s.chip, { backgroundColor: colors.accentSoft }]}
          onPress={() => setRouteOpen(!routeOpen)}
        >
          <Text style={{ color: colors.accent }}>
            Три вечори — одна кіноподорож {routeOpen ? "−" : "+"}
          </Text>
        </MotionPressable>
      )}
      {routeOpen &&
        route.map((item, i) => (
          <MotionPressable
            key={item.tmdbId}
            style={[s.row, s.route, { borderColor: colors.border }]}
            onPress={() => openTitle(item)}
          >
            <Text style={{ color: colors.accent, fontSize: 26 }}>0{i + 1}</Text>
            <View style={s.grow}>
              <Text style={[s.caption, { color: colors.textMuted }]}>
                {["Знайомство", "Продовження", "Відкриття"][i]}
              </Text>
              <Text style={{ color: colors.text, marginTop: 5 }}>
                {item.title}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
          </MotionPressable>
        ))}
      {filters.mode === "personal" && !user && (
        <MotionPressable
          style={[s.panel, { backgroundColor: colors.accentSoft }]}
          onPress={() => router.push("/auth")}
        >
          <Text style={{ color: colors.accent }}>
            Увійди для персональної добірки →
          </Text>
        </MotionPressable>
      )}
    </View>
  );
  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <View style={s.nav}>
        <MotionPressable
          style={s.icon}
          accessibilityLabel="Назад"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        >
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </MotionPressable>
        <Text style={{ color: colors.textMuted, fontWeight: "600" }}>
          АТЛАС КІНО
        </Text>
        <View style={s.icon} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.tmdbId)}
        contentContainerStyle={s.list}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (
            query.hasNextPage &&
            !query.isFetchingNextPage &&
            !query.isFetchNextPageError
          )
            void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          filters.mode === "personal" && !user ? null : (
            <ScreenState
              loading={query.isPending}
              title={
                query.isPending
                  ? "Шукаємо історії…"
                  : query.isError
                    ? "Не вдалося завантажити"
                    : "Поки немає фільмів"
              }
              message={
                !query.isPending && !query.isError
                  ? "Зміни фільтри або обери іншу країну."
                  : undefined
              }
              onRetry={query.isError ? () => void query.refetch() : undefined}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} />
          ) : query.isFetchNextPageError ? (
            <ScreenState
              title="Не вдалося завантажити більше"
              onRetry={() => void query.fetchNextPage()}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={[
              s.film,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <MotionPressable
              style={s.poster}
              onPress={() => openTitle(item)}
              accessibilityLabel={`Відкрити ${item.title}`}
            >
              <Image
                source={{ uri: item.posterUrl }}
                style={s.posterImage}
                contentFit="cover"
                transition={150}
              />
            </MotionPressable>
            <View style={s.filmInfo}>
              <MotionPressable onPress={() => openTitle(item)}>
                <Text style={[s.cardTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
              </MotionPressable>
              <Text style={[s.caption, { color: colors.gold }]}>
                {[
                  item.year,
                  item.rating ? `★ ${item.rating.toFixed(1)}` : "",
                  item.runtime ? `${item.runtime} хв` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text
                style={[s.caption, { color: colors.textMuted }]}
                numberOfLines={3}
              >
                {item.reason}
              </Text>
              <View style={s.filmActions}>
                <MotionPressable
                  accessibilityLabel={`Зберегти ${item.title}`}
                  style={s.icon}
                  onPress={() => picker.openPicker(suggestion(item))}
                >
                  <Ionicons
                    name={
                      picker.isSaved(suggestion(item))
                        ? "bookmark"
                        : "bookmark-outline"
                    }
                    size={20}
                    color={colors.accent}
                  />
                </MotionPressable>
                {(["liked", "disliked"] as const).map((action) => (
                  <MotionPressable
                    key={action}
                    accessibilityLabel={
                      action === "liked"
                        ? "Рекомендувати більше такого"
                        : "Не рекомендувати цей фільм"
                    }
                    disabled={reaction.isPending}
                    style={s.icon}
                    onPress={() =>
                      user
                        ? reaction.mutate({ item, action })
                        : router.push("/auth")
                    }
                  >
                    <Ionicons
                      name={
                        action === "liked"
                          ? "thumbs-up-outline"
                          : "thumbs-down-outline"
                      }
                      size={18}
                      color={colors.textMuted}
                    />
                  </MotionPressable>
                ))}
              </View>
            </View>
          </View>
        )}
      />
      <ListPickerModal
        visible={picker.pickerVisible}
        value={picker.pickerItem ? picker.getListTypes(picker.pickerItem) : []}
        onClose={picker.closePicker}
        onApply={picker.applyListTypes}
      />
      <Modal
        visible={countryPicker}
        animationType="fade"
        onRequestClose={() => setCountryPicker(false)}
      >
        <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
          <View style={s.nav}>
            <Text style={[s.cardTitle, { color: colors.text }]}>
              Куди вирушимо?
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрити вибір країни"
              style={s.icon}
              onPress={() => setCountryPicker(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <TextInput
            autoFocus
            accessibilityLabel="Пошук країни"
            placeholder="Знайти країну"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[
              s.input,
              { color: colors.text, backgroundColor: colors.elevated },
            ]}
          />
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={countries.filter(
              (c) =>
                c.name
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()) ||
                c.code.toLowerCase().includes(search.toLowerCase()),
            )}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <MotionPressable
                style={[s.row, s.countryRow]}
                onPress={() => {
                  update({ country: item.code });
                  setCountryPicker(false);
                  setSearch("");
                }}
              >
                <Text style={{ color: colors.text, fontSize: 17 }}>
                  {flag(item.code)} {item.name}
                </Text>
                {visited[item.code] ? (
                  <Text style={{ color: colors.accent }}>
                    {visited[item.code]} ✓
                  </Text>
                ) : null}
              </MotionPressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    minHeight: 54,
  },
  icon: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  header: { gap: 18, paddingTop: 18, paddingBottom: 24 },
  eyebrow: { fontSize: 10, letterSpacing: 2.5, fontWeight: "700" },
  title: {
    fontSize: 38,
    lineHeight: 43,
    letterSpacing: -1.5,
    fontWeight: "700",
  },
  lead: { fontSize: 16, lineHeight: 24 },
  passport: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  grow: { flex: 1 },
  cardTitle: { fontWeight: "700", fontSize: 17, letterSpacing: -0.4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 48,
  },
  country: {
    flex: 1,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
  },
  flag: { fontSize: 24 },
  chips: { gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  panel: { padding: 16, borderRadius: 20, gap: 14 },
  caption: { fontSize: 12, lineHeight: 18 },
  route: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  film: {
    flexDirection: "row",
    gap: 16,
    padding: 12,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  poster: { width: 100, height: 150, borderRadius: 14 },
  posterImage: { width: "100%", height: "100%" },
  filmInfo: { flex: 1, gap: 7 },
  filmActions: { flexDirection: "row", marginTop: "auto" },
  input: {
    margin: 20,
    minHeight: 52,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
  },
  countryRow: { paddingHorizontal: 24, paddingVertical: 12 },
});
