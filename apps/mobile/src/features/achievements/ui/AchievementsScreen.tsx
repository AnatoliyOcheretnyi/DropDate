import { AchievementsList } from "./AchievementsList";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
export function AchievementsScreen() {
  return (
    <FeatureScreen
      title="Досягнення"
      subtitle="Твій прогрес у власній кіноісторії."
    >
      <AchievementsList />
    </FeatureScreen>
  );
}
