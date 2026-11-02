import { router, useLocalSearchParams } from "expo-router";
import InfoScreen from "../../screens/InfoScreen";
import type { InfoPage } from "../../lib/types";

const infoPages: InfoPage[] = ["about", "privacy", "terms", "contact"];

export default function InfoRoute() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const selectedPage = infoPages.find((item) => item === page) ?? "about";
  return (
    <InfoScreen
      page={selectedPage}
      onHome={() => router.replace("/")}
      onNavigate={(target) => router.push(`/info/${target}`)}
    />
  );
}
