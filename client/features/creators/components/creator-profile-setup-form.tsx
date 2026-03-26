"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { useAuth } from "@/providers/auth-provider";
import {
  createCreatorProfile,
  type CreateCreatorProfilePayload,
} from "@/features/creators/api/create-creator-profile";

/** Frontend-only; increase or remove to allow more packages without server changes. */
const MAX_PACKAGES_IN_CREATOR_SETUP_FORM = 3;

/** Radix Select requires a non-empty value for the default option. */
const GENDER_VALUE_UNSPECIFIED = "__unspecified__";

type PackageDraft = {
  id: string;
  name: string;
  priceAmount: string;
  deliveryDays: string;
  deliverables: string;
};

function createPackageDraft(
  id: string,
  overrides?: Partial<Omit<PackageDraft, "id">>,
): PackageDraft {
  return {
    id,
    name: overrides?.name ?? "",
    priceAmount: overrides?.priceAmount ?? "",
    deliveryDays: overrides?.deliveryDays ?? "",
    deliverables: overrides?.deliverables ?? "",
  };
}

function splitCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type CreatorProfileSetupFormProps = {
  onSuccess: () => void;
};

export function CreatorProfileSetupForm({
  onSuccess,
}: CreatorProfileSetupFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [travelRadius, setTravelRadius] = useState("");
  const [languages, setLanguages] = useState("");
  const [serviceTypeNames, setServiceTypeNames] = useState("");
  /** Monotonic ids for new rows (initial row is always pkg-0 — stable for SSR hydration). */
  const nextPackageIdRef = useRef(1);
  const [packageDrafts, setPackageDrafts] = useState<PackageDraft[]>(() => [
    createPackageDraft("pkg-0", { name: "Starter", deliveryDays: "3" }),
  ]);

  const updatePackageDraft = useCallback(
    (id: string, patch: Partial<Omit<PackageDraft, "id">>) => {
      setPackageDrafts((rows) =>
        rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const addPackageDraft = useCallback(() => {
    setPackageDrafts((rows) => {
      if (rows.length >= MAX_PACKAGES_IN_CREATOR_SETUP_FORM) return rows;
      const nextNum = rows.length + 1;
      const defaultNames = ["Starter", "Standard", "Pro"] as const;
      const name = defaultNames[nextNum - 1] ?? `Package ${nextNum}`;
      const deliveryDays = nextNum === 1 ? "3" : "5";
      const id = `pkg-${nextPackageIdRef.current++}`;
      return [...rows, createPackageDraft(id, { name, deliveryDays })];
    });
  }, []);

  const removePackageDraft = useCallback((id: string) => {
    setPackageDrafts((rows) => rows.filter((row) => row.id !== id));
  }, []);

  useEffect(() => {
    if (!user) return;
    const name = user.name?.trim() || user.email.split("@")[0] || "";
    setDisplayName(name);
  }, [user]);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const name = displayName.trim();
      if (!name) {
        toast.error("Display name is required");
        return;
      }

      const radiusRaw = travelRadius.trim();
      const radius =
        radiusRaw === "" ? undefined : Number.parseInt(radiusRaw, 10);

      const langs = splitCommaList(languages);
      const services = splitCommaList(serviceTypeNames);

      const builtPackages: NonNullable<
        CreateCreatorProfilePayload["packages"]
      > = [];

      for (const row of packageDrafts) {
        const pkgName = row.name.trim();
        const price = row.priceAmount.trim();
        const dels = splitLines(row.deliverables);
        const rowDays = Number.parseInt(row.deliveryDays, 10);
        const hasDeliveryInput = row.deliveryDays.trim() !== "";
        const touched =
          !!pkgName || !!price || !!row.deliverables.trim() || hasDeliveryInput;
        const daysOk = !Number.isNaN(rowDays) && rowDays >= 0;
        const isComplete = !!pkgName && !!price && daysOk;

        if (touched && !isComplete) {
          toast.error(
            "Complete each package (name, price, delivery days) or clear unused rows.",
          );
          return;
        }

        if (isComplete) {
          builtPackages.push({
            name: pkgName,
            deliverables: dels.length ? dels : ["Deliverables to be confirmed"],
            priceAmount: price,
            deliveryDays: rowDays,
          });
        }
      }

      const packages: CreateCreatorProfilePayload["packages"] =
        builtPackages.length > 0 ? builtPackages : undefined;

      const payload: CreateCreatorProfilePayload = {
        displayName: name,
        city: city.trim() || undefined,
        bio: bio.trim() || undefined,
        gender: gender.trim() || undefined,
        ageRange: ageRange.trim() || undefined,
        travelRadius:
          radius !== undefined && !Number.isNaN(radius) && radius >= 0
            ? radius
            : undefined,
        languages: langs.length ? langs : undefined,
        serviceTypeNames: services.length ? services : undefined,
        packages,
      };

      setPending(true);
      try {
        await createCreatorProfile(payload);
        await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
        toast.success("Creator profile created");
        onSuccess();
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 409) {
          toast.message("Profile already exists", {
            description: "Continuing to your dashboard.",
          });
          await queryClient.invalidateQueries({ queryKey: authMeQueryKey });
          onSuccess();
          return;
        }
        toast.error("Could not create profile", {
          description: "Check your connection and try again.",
        });
      } finally {
        setPending(false);
      }
    },
    [
      displayName,
      city,
      bio,
      gender,
      ageRange,
      travelRadius,
      languages,
      serviceTypeNames,
      packageDrafts,
      onSuccess,
      queryClient,
    ],
  );

  const inputClass = "h-9 text-sm";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex max-h-[inherit] flex-col overflow-y-auto bg-background p-8 md:p-10"
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Set up your creator profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Brands see this in search. You can edit everything later in settings.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Bengaluru"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={gender === "" ? GENDER_VALUE_UNSPECIFIED : gender}
              onValueChange={(v) =>
                setGender(v === GENDER_VALUE_UNSPECIFIED ? "" : v)
              }
            >
              <SelectTrigger id="gender" aria-label="Gender">
                <SelectValue placeholder="Prefer not to say" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GENDER_VALUE_UNSPECIFIED}>
                  Prefer not to say
                </SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Non-binary">Non-binary</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="What do you create? Who do you love working with?"
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 dark:bg-input/30"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ageRange">Age range</Label>
            <Input
              id="ageRange"
              className={inputClass}
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              placeholder="e.g. 18-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travelRadius">Travel radius (km)</Label>
            <Input
              id="travelRadius"
              type="number"
              min={0}
              className={inputClass}
              value={travelRadius}
              onChange={(e) => setTravelRadius(e.target.value)}
              placeholder="0 if none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="languages">Languages</Label>
          <Input
            id="languages"
            className={inputClass}
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            placeholder="Comma-separated, e.g. English, Hindi"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="services">Services / niches</Label>
          <Input
            id="services"
            className={inputClass}
            value={serviceTypeNames}
            onChange={(e) => setServiceTypeNames(e.target.value)}
            placeholder="Comma-separated, e.g. Video Editing, Unboxing"
          />
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Packages</p>
              {/* <p className="text-xs text-muted-foreground">
                Optional — up to {MAX_PACKAGES_IN_CREATOR_SETUP_FORM} packages.
                Brands see your pricing; you can edit later in settings.
              </p> */}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={
                packageDrafts.length >= MAX_PACKAGES_IN_CREATOR_SETUP_FORM
              }
              onClick={addPackageDraft}
            >
              Add package
            </Button>
          </div>

          <div className="space-y-4">
            {packageDrafts.map((row, index) => (
              <div
                key={row.id}
                className="space-y-3 rounded-lg border border-border/80 bg-background/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Package {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removePackageDraft(row.id)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor={`pkg-name-${row.id}`}>Name</Label>
                    <Input
                      id={`pkg-name-${row.id}`}
                      className={inputClass}
                      value={row.name}
                      onChange={(e) =>
                        updatePackageDraft(row.id, { name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`pkg-price-${row.id}`}>Price</Label>
                    <Input
                      id={`pkg-price-${row.id}`}
                      className={inputClass}
                      value={row.priceAmount}
                      onChange={(e) =>
                        updatePackageDraft(row.id, {
                          priceAmount: e.target.value,
                        })
                      }
                      placeholder="199.99"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`pkg-days-${row.id}`}>
                      Delivery (days)
                    </Label>
                    <Input
                      id={`pkg-days-${row.id}`}
                      type="number"
                      min={0}
                      className={inputClass}
                      value={row.deliveryDays}
                      onChange={(e) =>
                        updatePackageDraft(row.id, {
                          deliveryDays: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pkg-deliverables-${row.id}`}>
                    Deliverables (one per line)
                  </Label>
                  <textarea
                    id={`pkg-deliverables-${row.id}`}
                    value={row.deliverables}
                    onChange={(e) =>
                      updatePackageDraft(row.id, {
                        deliverables: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder={"1 UGC video (30–60s)\nBasic editing"}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 dark:bg-input/30"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="mt-8 w-full sm:w-auto"
        disabled={pending}
      >
        {pending ? "Creating…" : "Create profile"}
      </Button>
    </form>
  );
}
