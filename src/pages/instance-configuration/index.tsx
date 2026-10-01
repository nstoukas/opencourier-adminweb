import {
  useGetInstanceConfigOptionsQuery,
  useGetInstanceConfigQuery,
  useSetInstanceConfigMutation,
} from "@/api/configApi";
import type { InstanceConfigSettingsDto } from "@/backend-admin-sdk";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import type { NextPage } from "next";
// `import type` = these names are used only in type positions and vanish at build time.
// The GeoJSON shapes come from @types/geojson (already installed).
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { Button, Input, Label, useToast } from "@/admin-web-components";
import {
  COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN,
  COURIER_DIETARY_RESTRICTIONS_TO_HUMAN,
  COURIER_MATCHER_TYPE_TO_HUMAN,
  CURRENCY_TO_HUMAN,
  DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN,
  DISTANCE_UNIT_TO_HUMAN,
  GEO_CALCULATION_TYPE_TO_HUMAN,
  QUOTE_CALCULATION_TYPE_TO_HUMAN,
} from "@/shared-types";
import dynamic from "next/dynamic";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { featureCollection } from "@turf/turf";
import ReactMarkdown from "react-markdown";
import { parseQuoteRateInput } from "@/utils/quoteRate";
import { describeBaseFee, parseBaseFeeInput } from "@/utils/baseFee";
import { parseNumberInput } from "@/utils/numberInput";
import { QuoteRateEditor } from "@/modules/instance-config/components/QuoteRateEditor";
import { ReassignmentPayoutPolicyEditor } from "@/modules/instance-config/components/ReassignmentPayoutPolicyEditor";

// `node` is pulled out so react-markdown's AST node is never spread onto the DOM element.
const MARKDOWN_COMPONENTS = {
  ul: ({ node: _node, ...props }: any) => (
    <ul className="list-disc list-inside ml-4" {...props} />
  ),
  ol: ({ node: _node, ...props }: any) => (
    <ol className="list-decimal list-inside ml-4" {...props} />
  ),
  li: ({ node: _node, ...props }: any) => <li className="mb-1" {...props} />,
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-semibold mt-5 mb-3">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-md font-medium mt-3 mb-2 text-gray-700">
      {children}
    </h4>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

const AdminMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-4/5 bg-gray-100 animate-pulse rounded-lg items-center justify-center flex">
      Loading Map...
    </div>
  ),
});

const validateURL = (url: string): boolean => {
  if (!url) return true; // Allow empty fields
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const sanitizeURL = (url: string): string => {
  if (!url) return url;
  return url.replace(/\/$/, ""); // Remove trailing slash
};

const InstanceConfigurationPage: NextPage = () => {
  const instanceConfigOptionsResponse = useGetInstanceConfigOptionsQuery({});
  const instanceConfigResponse = useGetInstanceConfigQuery({});
  const [setInstanceConfigMutation] = useSetInstanceConfigMutation();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [urlErrors, setUrlErrors] = useState<{
    link?: string;
    websocketLink?: string;
    imageUrl?: string;
  }>({});

  const regionDataRef = useRef<any>(null);

  // Local state for all config fields
  const [config, setConfig] = useState({
    name: "",
    link: "",
    websocketLink: "",
    imageUrl: "",
    // `as …` tells TypeScript what this field will hold later; without it the type is
    // inferred as literally `null` and no use of config.region can ever be checked.
    // The map hands back an array of drawn Features; the server hands back a
    // FeatureCollection (saved by this page) or a bare geometry (seeded instances).
    region: null as FeatureCollection | Feature[] | Geometry | null,
    courierMatcherType: "",
    quoteCalculationType: "",
    geoCalculationType: "",
    deliveryDurationCalculationType: "",
    courierCompensationCalculationType: "",
    defaultDietaryRestrictions: [] as string[],
    currency: "",
    distanceUnit: "",
    // null = no value stored (or the box was cleared). Never 0: a 0 here would be saved
    // as a real vote by Save all.
    maxAssignmentDistance: null as number | null,
    maxDriftDistance: null as number | null,
    quoteExpirationMinutes: null as number | null,
    defaultCourierPayRate: null as number | null,
    defaultMaxWorkingHours: null as number | null,
    feePercentageAmount: null as number | null,
    quoteRatePerDistanceUnit: 0,
  });

  const [quoteRateText, setQuoteRateText] = useState("");
  const [quoteRateError, setQuoteRateError] = useState("");
  const [isSavingPayoutPolicies, setIsSavingPayoutPolicies] = useState(false);
  const [isSavingQuoteRate, setIsSavingQuoteRate] = useState(false);
  // The base fee lives outside `config` on purpose: only its own Save button sends it, so
  // "Save All Changes" can never send an empty or half typed base fee. It holds the text in
  // the box (a string), and is named after the setting so the coverage guard test finds it.
  const [quoteBaseFee, setQuoteBaseFee] = useState("");
  const [baseFeeError, setBaseFeeError] = useState("");
  const [isSavingBaseFee, setIsSavingBaseFee] = useState(false);

  const [privacyPolicyContent, setPrivacyPolicyContent] = useState("");
  const [termsOfServiceContent, setTermsOfServiceContent] = useState("");
  const [rulesContent, setRulesContent] = useState("");
  const [descriptionContent, setDescriptionContent] = useState("");
  const [currentView, setCurrentView] = useState<
    | "main"
    | "privacy-policy"
    | "terms-of-service"
    | "rules"
    | "description"
  >("main");

  // Sync server data to local state
  useEffect(() => {
    // `Partial<…>` = same object, every field optional. The SDK declares these fields as
    // always present and never null, and both halves of that are untrue at runtime: its
    // FromJSON copies each key with no default (an omitted key stays `undefined`), and the
    // backend DTO casts away nulls that InstanceConfigSettings really allows — `currency`
    // and `distanceUnit` are `| null` at the source. This annotation is what keeps the
    // `?? ""` defaults below both necessary and checked.
    const data: Partial<InstanceConfigSettingsDto> | undefined =
      instanceConfigResponse.data;
    if (data) {
      const details = (data.details as any) || {};
      setConfig({
        name: details.name ?? "",
        link: details.link ?? "",
        websocketLink: details.websocketLink ?? "",
        imageUrl: details.imageUrl ?? "",
        region: details.region ?? null,
        courierMatcherType: data.courierMatcherType ?? "",
        quoteCalculationType: data.quoteCalculationType ?? "",
        geoCalculationType: data.geoCalculationType ?? "",
        deliveryDurationCalculationType:
          data.deliveryDurationCalculationType ?? "",
        courierCompensationCalculationType:
          data.courierCompensationCalculationType ?? "",
        defaultDietaryRestrictions: Array.isArray(
          data.defaultDietaryRestrictions,
        )
          ? data.defaultDietaryRestrictions
          : [],
        currency: data.currency ?? "",
        distanceUnit: data.distanceUnit ?? "",
        maxAssignmentDistance: data.maxAssignmentDistance ?? null,
        maxDriftDistance: data.maxDriftDistance ?? null,
        quoteExpirationMinutes: data.quoteExpirationMinutes ?? null,
        defaultCourierPayRate: data.defaultCourierPayRate ?? null,
        defaultMaxWorkingHours: data.defaultMaxWorkingHours ?? null,
        feePercentageAmount: data.feePercentageAmount ?? null,
        quoteRatePerDistanceUnit: data.quoteRatePerDistanceUnit ?? 0,
      });
      setQuoteRateText(String(data.quoteRatePerDistanceUnit ?? 0));
      setQuoteRateError("");
      // An empty box (not "0") when the backend sends no value, so a missing setting is
      // never shown, or saved, as a base fee of 0.
      setQuoteBaseFee(
        data.quoteBaseFee === null || data.quoteBaseFee === undefined
          ? ""
          : String(data.quoteBaseFee),
      );
      setBaseFeeError("");
      setPrivacyPolicyContent(details.privacyPolicyContent ?? "");
      setTermsOfServiceContent(details.termsOfServiceContent ?? "");
      setRulesContent(details.rulesContent ?? "");
      setDescriptionContent(details.descriptionContent ?? "");
    }
  }, [instanceConfigResponse.data]);

  const onInstanceConfigChangeDietaryRestrictions = (select: any) => {
    const result = [];
    const options = select && select.options;
    let opt;

    for (let i = 0, iLen = options.length; i < iLen; i++) {
      opt = options[i];
      if (opt.selected) {
        result.push(opt.value || opt.text);
      }
    }

    setConfig({ ...config, defaultDietaryRestrictions: result });
  };

  const handleSavePrivacyPolicy = async () => {
    setIsSaving(true);
    try {
      const existingDetails =
        (instanceConfigResponse.data?.details as any) || {};

      await setInstanceConfigMutation({
        details: {
          ...existingDetails,
          privacyPolicyContent: privacyPolicyContent.trim(),
        },
        // .unwrap() makes a refused save throw, so the catch below reports it as a failure
        // instead of showing "saved". Every save on this page follows the same rule.
      } as any).unwrap();
      // PRINT OUT DATA!
      console.log(config);
      toast({
        title: "Success!",
        description: "Privacy policy saved successfully.",
      });
      setCurrentView("main");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to save privacy policy. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save privacy policy:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTermsOfService = async () => {
    setIsSaving(true);
    try {
      const existingDetails =
        (instanceConfigResponse.data?.details as any) || {};

      await setInstanceConfigMutation({
        details: {
          ...existingDetails,
          termsOfServiceContent: termsOfServiceContent.trim(),
        },
      } as any).unwrap();
      toast({
        title: "Success!",
        description: "Terms of service saved successfully.",
      });
      // PRINT OUT DATA!
      console.log(config);
      setCurrentView("main");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to save terms of service. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save terms of service:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRules = async () => {
    setIsSaving(true);
    try {
      const existingDetails =
        (instanceConfigResponse.data?.details as any) || {};

      await setInstanceConfigMutation({
        details: {
          ...existingDetails,
          rulesContent: rulesContent.trim(),
        },
      } as any).unwrap();
      toast({
        title: "Success!",
        description: "Rules saved successfully.",
      });
      // PRINT OUT DATA!
      console.log(config);
      setCurrentView("main");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to save rules. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save rules:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsSaving(true);
    try {
      const existingDetails =
        (instanceConfigResponse.data?.details as any) || {};

      await setInstanceConfigMutation({
        details: {
          ...existingDetails,
          descriptionContent: descriptionContent.trim(),
        },
      } as any).unwrap();
      toast({
        title: "Success!",
        description: "Description saved successfully.",
      });
      // PRINT OUT DATA!
      console.log(config);
      setCurrentView("main");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to save description. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save description:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Every reason "Save All Changes" is off, in words the page shows under the button. An empty
  // list means it can save. Websocket URL and Logo Image URL are not required: only the dropped
  // instance registry needed them filled, and their other readers (the courier app, the public
  // metadata) cope with an empty value. They still block the save when they hold a bad URL.
  const saveAllBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (config.name.trim() === "") blockers.push("Name is empty");
    if (config.link.trim() === "") blockers.push("URL is empty");
    if (config.region === null) blockers.push("Operating Region is not drawn");
    if (config.defaultDietaryRestrictions.length === 0) {
      blockers.push("Default Dietary Restrictions has nothing selected");
    }
    if (urlErrors.link) blockers.push("URL is not a valid URL");
    if (urlErrors.websocketLink) {
      blockers.push("Websocket URL is not a valid URL");
    }
    if (urlErrors.imageUrl) blockers.push("Logo Image URL is not a valid URL");
    if (quoteRateError !== "") {
      blockers.push("Quote Rate Per Distance Unit is not a valid number");
    }
    return blockers;
  }, [config, urlErrors, quoteRateError]);

  const handleSaveAllChanges = async () => {
    setIsSaving(true);
    try {
      const { name, link, websocketLink, imageUrl, region, ...restConfig } =
        config;
      const existingDetails =
        (instanceConfigResponse.data?.details as any) || {};

      // Sanitize and trim URL fields
      const sanitizedName = name.trim();
      const sanitizedLink = sanitizeURL(link.trim());
      const sanitizedWebsocketLink = sanitizeURL(websocketLink.trim());
      const sanitizedImageUrl = sanitizeURL(imageUrl.trim());

      // Update config state with sanitized values
      setConfig({
        ...config,
        name: sanitizedName,
        link: sanitizedLink,
        websocketLink: sanitizedWebsocketLink,
        imageUrl: sanitizedImageUrl,
      });

      // Process region data - keep as FeatureCollection for individual polygon editing
      let processedRegion = null;
      const rawData = regionDataRef.current;

      // If regionDataRef is null, use the existing region from config (no changes made)
      if (!rawData && region) {
        processedRegion = region;
      } else if (rawData) {
        // Normalize Data: Ensure we have a FeatureCollection
        if (Array.isArray(rawData)) {
          // If it's just an array of features, wrap them in a FeatureCollection
          processedRegion = featureCollection(rawData);
        } else if (rawData.type === "FeatureCollection") {
          // It's already formatted correctly
          processedRegion = rawData;
        } else if (rawData.type === "Feature") {
          // Single feature, wrap it in a FeatureCollection
          processedRegion = featureCollection([rawData]);
        }
      }

      // .unwrap() is what makes a rejected save actually throw. configApi's queryFn returns
      // `{ error }` instead of throwing, so without it the catch below never runs and a 400
      // would be reported as success.
      await setInstanceConfigMutation({
        ...restConfig,
        details: {
          ...existingDetails,
          name: sanitizedName,
          link: sanitizedLink,
          websocketLink: sanitizedWebsocketLink,
          imageUrl: sanitizedImageUrl,
          privacyPolicyUrl: computedURLs.privacyPolicyUrl,
          termsOfServiceUrl: computedURLs.termsOfServiceUrl,
          rulesUrl: computedURLs.rulesUrl,
          descriptionUrl: computedURLs.descriptionUrl,
          region: processedRegion,
        },
      } as any).unwrap();
      toast({
        title: "Success!",
        description: "Instance configuration saved successfully.",
      });
      // PRINT OUT DATA!
      console.log(config, computedURLs);
    } catch (error: any) {
      toast({
        title: "Error",
        // The backend's own reason (e.g. "maxAssignmentDistance cannot be 0: ..."), which
        // the SDK puts on the thrown ApiError. The generic text is the fallback for an error
        // that carries no message at all.
        description:
          error?.message ||
          "Failed to save instance configuration. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save configuration:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Compute URL fields based on instance link
  const computedURLs = useMemo(() => {
    const baseLink = sanitizeURL(config.link);
    return {
      privacyPolicyUrl: baseLink ? `${baseLink}/privacy-policy` : "",
      termsOfServiceUrl: baseLink ? `${baseLink}/terms-of-service` : "",
      rulesUrl: baseLink ? `${baseLink}/rules` : "",
      descriptionUrl: baseLink ? `${baseLink}/description` : "",
    };
  }, [config.link]);

  // Memoize the onUpdate callback to prevent map re-renders
  const handleMapUpdate = useCallback((val: any) => {
    regionDataRef.current = val;
    // Update config state to reflect region changes (including clearing)
    setConfig((prevConfig) => ({
      ...prevConfig,
      region: val,
    }));
  }, []);

  const handleURLFieldChange = (
    field: "link" | "websocketLink" | "imageUrl",
    value: string,
  ) => {
    setConfig({ ...config, [field]: value });
    if (value && !validateURL(value)) {
      setUrlErrors({ ...urlErrors, [field]: "Invalid URL format" });
    } else {
      const newErrors = { ...urlErrors };
      delete newErrors[field];
      setUrlErrors(newErrors);
    }
  };

  // Mirrors handleURLFieldChange: keep what was typed, then set or clear the inline error that
  // gates the save button. Only a valid rate reaches `config`, so an emptied or negative box can
  // never be sent by "Save All Changes" (an empty box would otherwise become 0 via Number('')).
  const handleQuoteRateChange = (value: string) => {
    setQuoteRateText(value);
    const rate = parseQuoteRateInput(value);
    if (rate === null) {
      setQuoteRateError("Enter a whole number of cents, zero or more.");
      return;
    }
    setConfig({ ...config, quoteRatePerDistanceUnit: rate });
    setQuoteRateError("");
  };

  const handleSaveQuoteRate = async () => {
    // Re-read the box rather than trusting `config`: what is on screen is what gets sent.
    const rate = parseQuoteRateInput(quoteRateText);
    if (rate === null) {
      setQuoteRateError("Enter a whole number of cents, zero or more.");
      return;
    }
    setIsSavingQuoteRate(true);
    try {
      // .unwrap() is what makes a rejected save actually throw. configApi's queryFn returns
      // `{ error }` instead of throwing, so without it the catch below never runs and a 400
      // would be reported as success. Only this one key is sent: the backend setter writes
      // just the keys that are present, so nothing else in the instance config is touched.
      await setInstanceConfigMutation({
        quoteRatePerDistanceUnit: rate,
      }).unwrap();
      toast({
        title: "Success!",
        description: "Quote rate saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to save the quote rate. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save quote rate:", error);
    } finally {
      setIsSavingQuoteRate(false);
    }
  };

  const BASE_FEE_INPUT_ERROR =
    "Base fee: enter a whole number of cents, zero or more.";

  // Same shape as the quote rate handlers above: keep what was typed, flag it if it is not a
  // valid base fee, and send only what is in the box when Save is pressed.
  const handleBaseFeeChange = (value: string) => {
    setQuoteBaseFee(value);
    setBaseFeeError(parseBaseFeeInput(value) === null ? BASE_FEE_INPUT_ERROR : "");
  };

  const handleSaveBaseFee = async () => {
    const fee = parseBaseFeeInput(quoteBaseFee);
    if (fee === null) {
      setBaseFeeError(BASE_FEE_INPUT_ERROR);
      return;
    }
    setIsSavingBaseFee(true);
    try {
      // .unwrap() makes a refused save throw, so the catch below shows the backend's reason.
      // Only this one key is sent, so nothing else in the instance config is touched.
      await setInstanceConfigMutation({
        quoteBaseFee: fee,
      }).unwrap();
      toast({
        title: "Success!",
        description: "Base fee saved successfully. It applies to the next quote.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to save the base fee. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save base fee:", error);
    } finally {
      setIsSavingBaseFee(false);
    }
  };

  const handleSavePayoutPolicies = async (
    policies: Record<string, number>,
    defaultPolicy: string,
  ) => {
    setIsSavingPayoutPolicies(true);
    try {
      // .unwrap() is what makes a rejected save actually throw. configApi's queryFn returns
      // `{ error }` instead of throwing, so without it the catch below never runs and a 400
      // would be reported as success. Both keys go in one request: the backend rejects a menu
      // whose default policy is not one of its own keys.
      await setInstanceConfigMutation({
        reassignmentPayoutPolicies: policies,
        reassignmentPayoutDefaultPolicy: defaultPolicy,
      }).unwrap();
      toast({
        title: "Success!",
        description: "Reassignment payout policies saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
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

  return (
    <DefaultLayout>
      {/* Header and Edit Links - Always Visible */}
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-medium tracking-tight pb-2">
          Instance Configuration
        </h2>
        {currentView !== "main" && (
          <button
            className="bg-gray-200 rounded-md text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-300"
            onClick={() => setCurrentView("main")}
          >
            ← Back
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentView("rules")}
          className="text-gray-500 cursor-pointer hover:text-gray-800"
        >
          <Label className="cursor-pointer">Edit Rules</Label>
        </button>
        <div className="h-4 w-px bg-gray-300" />
        <button
          onClick={() => setCurrentView("description")}
          className="text-gray-500 cursor-pointer hover:text-gray-800"
        >
          <Label className="cursor-pointer">Edit Description</Label>
        </button>
        <div className="h-4 w-px bg-gray-300" />
        <button
          onClick={() => setCurrentView("terms-of-service")}
          className="text-gray-500 cursor-pointer hover:text-gray-800"
        >
          <Label className="cursor-pointer">Edit Terms of Service</Label>
        </button>
        <div className="h-4 w-px bg-gray-300" />
        <button
          onClick={() => setCurrentView("privacy-policy")}
          className="text-gray-500 cursor-pointer hover:text-gray-800"
        >
          <Label className="cursor-pointer">Edit Privacy Policy</Label>
        </button>
      </div>

      {/* Content - Changes Based on View */}
      {currentView === "main" ? (
        <>
          <div></div>
          <div className="pt-4 flex flex-col gap-2">
            <div>
              <Label className="text-right">Name</Label>
              <Input
                key="instanceName"
                type="text"
                value={config.name}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    name: event.target.value,
                  })
                }
                className="max-w-[500px]"
              />
            </div>
            <div>
              <Label className="text-right">URL</Label>
              <p className="text-sm text-gray-600 mb-1">
                (Warning: Once the URL is saved, it cannot be changed. Please
                ensure it is correct before saving.)
              </p>
              <Input
                key="link"
                type="text"
                value={config.link}
                onChange={(event) =>
                  handleURLFieldChange("link", event.target.value)
                }
                disabled={!!(instanceConfigResponse.data?.details as any)?.link}
                className={`max-w-[500px] ${
                  urlErrors.link ? "border-red-500 border-2" : ""
                } ${
                  !!(instanceConfigResponse.data?.details as any)?.link
                    ? "bg-gray-100 cursor-not-allowed"
                    : ""
                }`}
              />
              {urlErrors.link && (
                <p className="text-red-500 text-sm mt-1">{urlErrors.link}</p>
              )}
            </div>
            <div>
              <Label className="text-right">Websocket URL</Label>
              <Input
                key="websocketLink"
                type="text"
                value={config.websocketLink}
                onChange={(event) =>
                  handleURLFieldChange("websocketLink", event.target.value)
                }
                className={`max-w-[500px] ${
                  urlErrors.websocketLink ? "border-red-500 border-2" : ""
                }`}
              />
              {urlErrors.websocketLink && (
                <p className="text-red-500 text-sm mt-1">
                  {urlErrors.websocketLink}
                </p>
              )}
            </div>
            <div>
              <Label className="text-right">Logo Image URL</Label>
              <Input
                key="imageUrl"
                type="text"
                value={config.imageUrl}
                onChange={(event) =>
                  handleURLFieldChange("imageUrl", event.target.value)
                }
                className={`max-w-[500px] ${
                  urlErrors.imageUrl ? "border-red-500 border-2" : ""
                }`}
              />
              {urlErrors.imageUrl && (
                <p className="text-red-500 text-sm mt-1">
                  {urlErrors.imageUrl}
                </p>
              )}
            </div>
            <div>
              <Label className="text-right">Operating Region</Label>
              <div className="pt-2 max-w-4xl">
                <AdminMap
                  initialGeoJSON={config.region}
                  onUpdate={handleMapUpdate}
                />
              </div>
            </div>
            <div>
              <Label className="text-right">Courier Matcher Type</Label>
              <br />
              <select
                className="border-[1px] border-input rounded-md h-10 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={config.courierMatcherType}
                onChange={(e) =>
                  setConfig({ ...config, courierMatcherType: e.target.value })
                }
              >
                {instanceConfigOptionsResponse.data?.courierMatcherType.map(
                  (option) => (
                    <option key={option} value={option}>
                      {COURIER_MATCHER_TYPE_TO_HUMAN[option]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label className="text-right">Quote Calculation Type</Label>
              <br />
              <select
                className="border-[1px] border-input rounded-md h-10 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={config.quoteCalculationType}
                onChange={(e) =>
                  setConfig({ ...config, quoteCalculationType: e.target.value })
                }
              >
                {instanceConfigOptionsResponse.data?.quoteCalculationType.map(
                  (option) => (
                    <option key={option} value={option}>
                      {QUOTE_CALCULATION_TYPE_TO_HUMAN[option]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <QuoteRateEditor
              rateText={quoteRateText}
              rate={config.quoteRatePerDistanceUnit}
              currencyCode={config.currency}
              distanceUnit={config.distanceUnit}
              error={quoteRateError}
              isSaving={isSavingQuoteRate}
              onChange={handleQuoteRateChange}
              onSave={handleSaveQuoteRate}
            />
            <div>
              <Label className="text-right" htmlFor="quoteBaseFee">
                Base Fee Per Delivery
              </Label>
              <p className="text-sm text-gray-600 mb-1">
                {describeBaseFee(parseBaseFeeInput(quoteBaseFee), config.currency)}
              </p>
              <Input
                id="quoteBaseFee"
                key="quoteBaseFee"
                type="number"
                min={0}
                step={1}
                value={quoteBaseFee}
                onChange={(event) => handleBaseFeeChange(event.target.value)}
                className={`max-w-[120px] ${baseFeeError ? "border-red-500 border-2" : ""}`}
              />
              {baseFeeError && (
                <p className="text-red-500 text-sm mt-1">{baseFeeError}</p>
              )}
              <div>
                <Button
                  type="button"
                  disabled={
                    isSavingBaseFee || parseBaseFeeInput(quoteBaseFee) === null
                  }
                  onClick={handleSaveBaseFee}
                  className="mt-2"
                >
                  {isSavingBaseFee ? "Saving…" : "Save base fee"}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-right">Geo Calculation Type</Label>
              <br />
              <select
                className="border-[1px] border-input rounded-md h-10 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={config.geoCalculationType}
                onChange={(e) =>
                  setConfig({ ...config, geoCalculationType: e.target.value })
                }
              >
                {instanceConfigOptionsResponse.data?.geoCalculationType.map(
                  (option) => (
                    <option key={option} value={option}>
                      {GEO_CALCULATION_TYPE_TO_HUMAN[option]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label className="text-right">
                Delivery Duration Calculation Type
              </Label>
              <br />
              <select
                className="border-[1px] border-input rounded-md h-10 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={config.deliveryDurationCalculationType}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    deliveryDurationCalculationType: e.target.value,
                  })
                }
              >
                {instanceConfigOptionsResponse.data?.deliveryDurationCalculationType.map(
                  (option) => (
                    <option key={option} value={option}>
                      {DELIVERY_DURATION_CALCULATION_TYPE_TO_HUMAN[option]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label className="text-right">
                Courier Compensation Calculation Type
              </Label>
              <br />
              <select
                className="border-[1px] border-input rounded-md h-10 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={config.courierCompensationCalculationType}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    courierCompensationCalculationType: e.target.value,
                  })
                }
              >
                {instanceConfigOptionsResponse.data?.courierCompensationCalculationType.map(
                  (option) => (
                    <option key={option} value={option}>
                      {COURIER_DELIVERY_COMPENSATION_TYPE_TO_HUMAN[option]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label className="text-right">Default Dietary Restrictions</Label>
              <p className="text-sm text-gray-600 mb-1">(Select multiple)</p>
              <select
                className="border-[1px] border-input rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={config.defaultDietaryRestrictions}
                onChange={(e) =>
                  onInstanceConfigChangeDietaryRestrictions(e.target)
                }
                multiple
              >
                {instanceConfigOptionsResponse.data?.defaultDietaryRestrictions.map(
                  (option) => (
                    <option key={option} value={option}>
                      {COURIER_DIETARY_RESTRICTIONS_TO_HUMAN[option]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label className="text-right">Currency</Label>
              <br />
              <select
                className="border-[1px] border-input rounded-md h-10 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={config.currency}
                onChange={(e) =>
                  setConfig({ ...config, currency: e.target.value })
                }
              >
                {instanceConfigOptionsResponse.data?.currency.map((option) => (
                  <option key={option} value={option}>
                    {CURRENCY_TO_HUMAN[option]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-right">Distance Unit</Label>
              <br />
              <select
                className="border-[1px] border-input rounded-md h-10 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={config.distanceUnit}
                onChange={(e) =>
                  setConfig({ ...config, distanceUnit: e.target.value })
                }
              >
                {instanceConfigOptionsResponse.data?.distanceUnit.map(
                  (option) => (
                    <option key={option} value={option}>
                      {DISTANCE_UNIT_TO_HUMAN[option]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label className="text-right">Max Assignment Distance</Label>
              <Input
                key="maxAssignmentDistance"
                type="number"
                value={config.maxAssignmentDistance ?? ""}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    maxAssignmentDistance: parseNumberInput(event.target.value),
                  })
                }
                className="max-w-[120px]"
              />
            </div>
            <div>
              <Label className="text-right">Max Drift Distance</Label>
              <p className="text-sm text-gray-600 mb-1">
                (Maximum amount of distance that the quote and delivery pickup
                can differ in meters)
              </p>
              <Input
                key="maxDriftDistance"
                type="number"
                value={config.maxDriftDistance ?? ""}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    maxDriftDistance: parseNumberInput(event.target.value),
                  })
                }
                className="max-w-[120px]"
              />
            </div>
            <div>
              <Label className="text-right">Quote Expiration Minutes</Label>
              <Input
                key="quoteExpirationMinutes"
                type="number"
                value={config.quoteExpirationMinutes ?? ""}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    quoteExpirationMinutes: parseNumberInput(event.target.value),
                  })
                }
                className="max-w-[120px]"
              />
            </div>
            <div>
              <Label className="text-right">Default Courier Pay Rate</Label>
              <Input
                key="defaultCourierPayRate"
                type="number"
                value={config.defaultCourierPayRate ?? ""}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    defaultCourierPayRate: parseNumberInput(event.target.value),
                  })
                }
                className="max-w-[120px]"
              />
            </div>
            <div>
              <Label className="text-right">Default Max Working Hours</Label>
              <Input
                key="defaultMaxWorkingHours"
                type="number"
                value={config.defaultMaxWorkingHours ?? ""}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    defaultMaxWorkingHours: parseNumberInput(event.target.value),
                  })
                }
                className="max-w-[120px]"
              />
            </div>
            <div>
              <Label className="text-right">Fee Percentage Amount</Label>
              <Input
                key="feePercentageAmount"
                type="number"
                value={config.feePercentageAmount ?? ""}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    feePercentageAmount: parseNumberInput(event.target.value),
                  })
                }
                className="max-w-[120px]"
              />
            </div>
            <ReassignmentPayoutPolicyEditor
              policies={instanceConfigResponse.data?.reassignmentPayoutPolicies}
              defaultPolicy={instanceConfigResponse.data?.reassignmentPayoutDefaultPolicy}
              isSaving={isSavingPayoutPolicies}
              onSave={handleSavePayoutPolicies}
            />
          </div>
          <button
            onClick={handleSaveAllChanges}
            disabled={isSaving || saveAllBlockers.length > 0}
            aria-describedby={
              saveAllBlockers.length > 0 ? "save-all-blockers" : undefined
            }
            className="mt-4 bg-black rounded-md text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
          {/* role="status" makes a screen reader announce the reasons when they appear or
              change; the disabled button can't take focus, so aria-describedby alone may never
              be read. The wrapper is always on the page because a live region that appears
              together with its text is often not announced. */}
          <div role="status">
            {saveAllBlockers.length > 0 && (
              <div id="save-all-blockers" className="text-sm text-red-600 mt-2">
                <p>Save All Changes is off until you fix:</p>
                <ul className="list-disc list-inside ml-2">
                  {saveAllBlockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      ) : currentView === "terms-of-service" ? (
        <div className="mt-4">
          <h3 className="text-lg font-semibold pb-2">
            Editing Terms of Service
          </h3>
          <div className="grid grid-cols-2 gap-6">
            {/* Editor */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <div className="mb-1">
                <Label className="block text-sm font-medium text-gray-900 mb-2">
                  Content (Markdown)
                </Label>
                <textarea
                  value={termsOfServiceContent}
                  onChange={(e) => setTermsOfServiceContent(e.target.value)}
                  className="w-full h-96 rounded-md border border-gray-300 px-4 py-3 text-sm font-mono shadow-sm focus:border-black focus:ring-black resize-none"
                  placeholder="# Terms of Service&#10;&#10;## Agreement&#10;Write your content in markdown..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use markdown formatting: # Headers, **bold**, *italic*, -
                  Lists, [links](url)
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Preview
              </h2>
              <div className="bg-white rounded-md border border-gray-200 p-4 prose prose-sm max-w-none overflow-y-auto h-96">
                {termsOfServiceContent ? (
                  <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                    {termsOfServiceContent}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-500">No content yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveTermsOfService}
              disabled={isSaving}
              className="bg-black rounded-md text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setCurrentView("main")}
              className="bg-gray-200 rounded-md text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : currentView === "rules" ? (
        <div className="mt-4">
          <h3 className="text-lg font-semibold pb-2">Editing Rules</h3>
          <div className="grid grid-cols-2 gap-6">
            {/* Editor */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <div className="mb-1">
                <Label className="block text-sm font-medium text-gray-900 mb-2">
                  Content (Markdown)
                </Label>
                <textarea
                  value={rulesContent}
                  onChange={(e) => setRulesContent(e.target.value)}
                  className="w-full h-96 rounded-md border border-gray-300 px-4 py-3 text-sm font-mono shadow-sm focus:border-black focus:ring-black resize-none"
                  placeholder="# Rules&#10;&#10;## Guidelines&#10;Write your content in markdown..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use markdown formatting: # Headers, **bold**, *italic*, -
                  Lists, [links](url)
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Preview
              </h2>
              <div className="bg-white rounded-md border border-gray-200 p-4 prose prose-sm max-w-none overflow-y-auto h-96">
                {rulesContent ? (
                  <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                    {rulesContent}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-500">No content yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveRules}
              disabled={isSaving}
              className="bg-black rounded-md text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setCurrentView("main")}
              className="bg-gray-200 rounded-md text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : currentView === "description" ? (
        <div className="mt-4">
          <h3 className="text-lg font-semibold pb-2">Editing Description</h3>
          <div className="grid grid-cols-2 gap-6">
            {/* Editor */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <div className="mb-1">
                <Label className="block text-sm font-medium text-gray-900 mb-2">
                  Content (Markdown)
                </Label>
                <textarea
                  value={descriptionContent}
                  onChange={(e) => setDescriptionContent(e.target.value)}
                  className="w-full h-96 rounded-md border border-gray-300 px-4 py-3 text-sm font-mono shadow-sm focus:border-black focus:ring-black resize-none"
                  placeholder="# Description&#10;&#10;## About Us&#10;Write your content in markdown..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use markdown formatting: # Headers, **bold**, *italic*, -
                  Lists, [links](url)
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Preview
              </h2>
              <div className="bg-white rounded-md border border-gray-200 p-4 max-w-none overflow-y-auto h-96">
                {descriptionContent ? (
                  <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                    {descriptionContent}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-500">No content yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveDescription}
              disabled={isSaving}
              className="bg-black rounded-md text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setCurrentView("main")}
              className="bg-gray-200 rounded-md text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // Only "privacy-policy" is left: the four other views are handled above and the
        // union has no sixth member. A new view goes into this chain, not after it.
        <div className="mt-4">
          <h3 className="text-lg font-semibold pb-2">Editing Privacy Policy</h3>
          <div className="grid grid-cols-2 gap-6">
            {/* Editor */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <div className="mb-1">
                <Label className="block text-sm font-medium text-gray-900 mb-2">
                  Content (Markdown)
                </Label>
                <textarea
                  value={privacyPolicyContent}
                  onChange={(e) => setPrivacyPolicyContent(e.target.value)}
                  className="w-full h-96 rounded-md border border-gray-300 px-4 py-3 text-sm font-mono shadow-sm focus:border-black focus:ring-black resize-none"
                  placeholder="# Privacy Policy&#10;&#10;## Introduction&#10;Write your content in markdown..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use markdown formatting: # Headers, **bold**, *italic*, -
                  Lists, [links](url)
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Preview
              </h2>
              <div className="bg-white rounded-md border border-gray-200 p-4 prose prose-sm max-w-none overflow-y-auto h-96">
                {privacyPolicyContent ? (
                  <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                    {privacyPolicyContent}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-500">No content yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSavePrivacyPolicy}
              disabled={isSaving}
              className="bg-black rounded-md text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setCurrentView("main")}
              className="bg-gray-200 rounded-md text-gray-900 px-4 py-2 text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
};

export default InstanceConfigurationPage;
