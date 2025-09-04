import CompanionCard from "@/components/CompanionCard";
import CompanionsList from "@/components/CompanionsList";
import CTA from "@/components/CTA";
import { recentSessions } from "@/constants";
import {
  getAllCompanions,
  getRecentSessions,
} from "@/lib/actions/companion.actions";
import { getSubjectColor } from "@/lib/utils";
import { toast } from "sonner";

const Page = async () => {
  let companions: Companion[] = [];
  const result = await getAllCompanions({ limit: 3 });
  if (!result.success) {
    toast.error(result.message || "Failed to load companions");
    companions = [];
  } else {
    companions = result.data || [];
  }
  let recentSessionsCompanions: Companion[] = [];
  const result2 = await getRecentSessions(10);
  if (!result2.success) {
    toast.error(result2.message || "Failed to load recent sessions");
    recentSessionsCompanions = [];
  } else {
    recentSessionsCompanions = result2.data || [];
  }

  // console.log("recentSessionsCompanions", recentSessionsCompanions);

  return (
    <main>
      <h1>Popular Companions</h1>

      <section className="home-section">
        {companions.map((companion) => (
          <CompanionCard
            key={companion.id}
            {...companion}
            color={getSubjectColor(companion.subject)}
          />
        ))}
      </section>

      <section className="home-section">
        home-section
        <CompanionsList
          title="Recently completed sessions"
          companions={recentSessionsCompanions}
          classNames="w-2/3 max-lg:w-full"
        />
        <CTA />
        hey
      </section>
    </main>
  );
};

export default Page;
