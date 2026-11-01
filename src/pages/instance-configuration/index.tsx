import {
  useGetInstanceConfigOptionsQuery,
  useGetInstanceConfigQuery,
  useSetInstanceConfigMutation,
} from "@/api/configApi";
import { Button, useToast } from "@/admin-web-components";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { PageHeader } from "@/components/layouts/PageHeader";
import {
  COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN,
  COURIER_DIETARY_RESTRICTIONS_TO_HUMAN,
  CURRENCY_TO_HUMAN,
  DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN,
  DISTANCE_UNIT_TO_HUMAN,
  GEO_CALCULATION_TYPE_TO_HUMAN,
  QUOTE_CALCULATION_TYPE_TO_HUMAN,
} from "@/shared-types";
import {
  InstanceCard,
  MATCHER_COPY,
  MatchingCard,
  OffersCard,
  PricingCard,
  PublicPagesCard,
  RiderPayCard,
  SECTIONS,
  ServiceAreaCard,
  PUBLIC_PAGES,
  type PublicPage,
} from "@/modules/instance-config/cards/SettingsCards";
import { PublicPageEditor } from "@/modules/instance-config/PublicPageEditor";
import { ReassignmentPayoutPolicyEditor } from "@/modules/instance-config/components/ReassignmentPayoutPolicyEditor";
import { SaveBar } from "@/modules/instance-config/SaveBar";
import {
  EMPTY_FORM,
  blockers as findBlockers,
  sameValue,
  formFromSettings,
  pendingChanges,
  savePayload,
  successMessage,
  type SettingKey,
  type SettingsForm,
} from "@/modules/instance-config/settingsDiff";
import type { NextPage } from "next";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

// The drawing tool loads only in the browser (Leaflet needs `window`).
const AdminMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
      Loading map…
    </div>
  ),
});

// Words for an option's code in the save bar, by setting.
const OPTION_LABELS: Partial<Record<SettingKey, Record<string, string>>> = {
  currency: CURRENCY_TO_HUMAN,
  distanceUnit: DISTANCE_UNIT_TO_HUMAN,
  quoteCalculationType: QUOTE_CALCULATION_TYPE_TO_HUMAN,
  geoCalculationType: GEO_CALCULATION_TYPE_TO_HUMAN,
  deliveryDurationCalculationType: DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN,
  courierCompensationCalculationType: COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN,
  defaultDietaryRestrictions: COURIER_DIETARY_RESTRICTIONS_TO_HUMAN,
};

const optionLabel = (key: SettingKey, option: string): string =>
  key === "courierMatcherType"
    ? MATCHER_COPY[option]?.title ?? option
    : OPTION_LABELS[key]?.[option] ?? option;

// Co-op settings (spec 0010): the instance's settings in seven cards, one save bar that lists
// every change as "old → new" and sends only those. The dropped rider pay policies and the
// public pages keep their own Save.
// The public page entry for a view (the table lives beside the card that lists them).
// Every view has an entry, so the throw is never reached; it only tells TypeScript so.
const pageOf = (view: PublicPage) => {
  const page = PUBLIC_PAGES.find((candidate) => candidate.view === view);
  if (!page) throw new Error(`No public page entry for ${view}`);
  return page;
};

const InstanceConfigurationPage: NextPage = () => {
  const instanceConfigOptionsResponse = useGetInstanceConfigOptionsQuery({});
  const instanceConfigResponse = useGetInstanceConfigQuery({});
  const [setInstanceConfigMutation] = useSetInstanceConfigMutation();
  const { toast } = useToast();

  const data = instanceConfigResponse.data;
  const loaded = !!data;
  // `as Record<…>`: the SDK types `details` loosely; it is the backend's free JSON object.
  const savedDetails = useMemo(
    () => ((data?.details as Record<string, unknown> | undefined) ?? {}),
    [data],
  );

  // What is saved (null until it loads) and what the boxes hold.
  const saved = useMemo<SettingsForm | null>(
    () => (data ? formFromSettings(data as Record<string, any>) : null),
    [data],
  );
  // The representative's edits, laid over the saved settings. A refetch (after any save on this
  // page, the policy editor's and the public pages' included) then only moves the "old" values;
  // an edit stays until Discard, or until it equals the saved value (row 87 review).
  // `Partial<SettingsForm>` = the same shape with every field optional.
  const [overrides, setOverrides] = useState<Partial<SettingsForm>>({});
  const edited = useMemo<SettingsForm>(
    () => ({ ...(saved ?? EMPTY_FORM), ...overrides }),
    [saved, overrides],
  );
  // Bumped on Discard so the map draws the saved area again (it reads its shape only when it mounts).
  const [mapKey, setMapKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPayoutPolicies, setIsSavingPayoutPolicies] = useState(false);

  // Each time the settings arrive, an edit that now equals its saved value is dropped: after the
  // bar's own save, its changes become the saved values and leave the bar.
  useEffect(() => {
    if (!saved) return;
    setOverrides((current) => {
      const kept: Partial<SettingsForm> = {};
      // `Object.keys(...) as SettingKey[]`: TypeScript types Object.keys as string[].
      for (const key of Object.keys(current) as SettingKey[]) {
        if (!sameValue(key, current[key], saved[key])) {
          (kept as Record<string, unknown>)[key] = current[key];
        }
      }
      return kept;
    });
  }, [saved]);

  // `useCallback` keeps the same function between draws, so the cards and the map do not
  // redraw for nothing.
  const set = useCallback(
    <K extends SettingKey>(key: K, value: SettingsForm[K]) =>
      setOverrides((current) => ({ ...current, [key]: value })),
    [],
  );
  const handleMapUpdate = useCallback(
    (region: unknown) => set("region", region),
    [set],
  );

  const changes = useMemo(
    () => pendingChanges(saved, edited, optionLabel),
    [saved, edited],
  );
  const blockers = useMemo(() => findBlockers(changes, edited), [changes, edited]);

  const handleDiscard = () => {
    setOverrides({});
    setMapKey((key) => key + 1);
  };

  const handleSave = async () => {
    if (changes.length === 0 || blockers.length > 0 || refetching) return;
    setIsSaving(true);
    try {
      // .unwrap() makes a refused save throw; configApi's queryFn returns `{ error }` instead of
      // throwing, so without it a 400 would be reported as success. `as any`: the SDK input type
      // has no room for a partial body, which the backend accepts (spec 0010, Data model).
      await setInstanceConfigMutation(
        savePayload(changes, edited, savedDetails) as any,
      ).unwrap();
      toast({ title: "Saved", description: successMessage(changes) });
    } catch (error: any) {
      // The backend's own reason (row 50); every change stays in the bar.
      toast({
        title: "Not saved",
        description:
          error?.message || "The settings could not be saved. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save the co-op settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayoutPolicies = async (
    policies: Record<string, number>,
    defaultPolicy: string,
  ) => {
    setIsSavingPayoutPolicies(true);
    try {
      // Both keys go in one request: the backend rejects a menu whose default policy is not one
      // of its own keys.
      await setInstanceConfigMutation({
        reassignmentPayoutPolicies: policies,
        reassignmentPayoutDefaultPolicy: defaultPolicy,
      }).unwrap();
      toast({
        title: "Saved",
        description: "Reassignment payout policies saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Not saved",
        description:
          error?.message ||
          "Failed to save reassignment payout policies. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save reassignment payout policies:", error);
    } finally {
      setIsSavingPayoutPolicies(false);
    }
  };

  // The public page being edited, if any, and the text in its editor.
  const [currentView, setCurrentView] = useState<"main" | PublicPage>("main");
  const [pageText, setPageText] = useState("");
  const [isSavingPage, setIsSavingPage] = useState(false);

  const openPage = (view: PublicPage) => {
    setPageText(String(savedDetails[pageOf(view).key] ?? ""));
    setCurrentView(view);
  };

  const handleSavePage = async () => {
    if (currentView === "main") return;
    const page = pageOf(currentView);
    setIsSavingPage(true);
    try {
      // `details` is replaced whole by the backend, so the saved details go with the new text.
      await setInstanceConfigMutation({
        details: { ...savedDetails, [page.key]: pageText.trim() },
      } as any).unwrap();
      toast({ title: "Saved", description: `${page.title} saved successfully.` });
      setCurrentView("main");
    } catch (error: any) {
      toast({
        title: "Not saved",
        description:
          error?.message ||
          `Failed to save ${page.title.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
      console.error(`Failed to save ${page.title}:`, error);
    } finally {
      setIsSavingPage(false);
    }
  };

  // True while the settings are being fetched again (after any save): Save waits, so it never
  // sends a change that has just been saved (row 87 review).
  const refetching = instanceConfigResponse.isFetching;

  const cardProps = {
    form: edited,
    set,
    options: instanceConfigOptionsResponse.data,
    loaded,
  };

  return (
    <DefaultLayout>
      <PageHeader
        title="Co-op settings"
        action={
          currentView !== "main" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCurrentView("main")}
            >
              ← Back
            </Button>
          ) : undefined
        }
      />

      {currentView === "main" ? (
        <>
          {/* Pills that jump to each card (spec 0010, AC-1). */}
          <nav aria-label="Settings sections" className="mb-6 flex flex-wrap gap-2">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {section.title}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-6">
            <PricingCard {...cardProps} />
            <MatchingCard {...cardProps} />
            <OffersCard {...cardProps} />
            <RiderPayCard
              {...cardProps}
              policyEditor={
                <ReassignmentPayoutPolicyEditor
                  policies={data?.reassignmentPayoutPolicies}
                  defaultPolicy={data?.reassignmentPayoutDefaultPolicy}
                  isSaving={isSavingPayoutPolicies}
                  onSave={handleSavePayoutPolicies}
                />
              }
            />
            <ServiceAreaCard
              map={
                <AdminMap
                  key={mapKey}
                  initialGeoJSON={edited.region as any}
                  onUpdate={handleMapUpdate}
                />
              }
            />
            <InstanceCard {...cardProps} linkLocked={!!savedDetails.link} />
            <PublicPagesCard onEdit={openPage} />
          </div>
          <SaveBar
            changes={changes}
            blockers={blockers}
            isSaving={isSaving || refetching}
            onDiscard={handleDiscard}
            onSave={handleSave}
          />
        </>
      ) : (
        <PublicPageEditor
          title={pageOf(currentView).title}
          value={pageText}
          placeholder={pageOf(currentView).placeholder}
          isSaving={isSavingPage}
          onChange={setPageText}
          onSave={handleSavePage}
          onCancel={() => setCurrentView("main")}
        />
      )}
    </DefaultLayout>
  );
};

export default InstanceConfigurationPage;
