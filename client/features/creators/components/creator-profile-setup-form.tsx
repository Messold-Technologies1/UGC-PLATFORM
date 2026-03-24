"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authMeQueryKey } from "@/features/auth/hooks/use-me-query";
import { useAuth } from "@/providers/auth-provider";
import {
  createCreatorProfile,
  type CreateCreatorProfilePayload,
} from "@/features/creators/api/create-creator-profile";

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
  const [packageName, setPackageName] = useState("Starter");
  const [priceAmount, setPriceAmount] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("3");
  const [deliverables, setDeliverables] = useState("");

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

      const days = Number.parseInt(deliveryDays, 10);
      const radiusRaw = travelRadius.trim();
      const radius =
        radiusRaw === "" ? undefined : Number.parseInt(radiusRaw, 10);

      const langs = splitCommaList(languages);
      const services = splitCommaList(serviceTypeNames);
      const dels = splitLines(deliverables);

      const price = priceAmount.trim();
      const pkgName = packageName.trim();
      const packages: CreateCreatorProfilePayload["packages"] =
        price && pkgName && !Number.isNaN(days) && days >= 0
          ? [
              {
                name: pkgName,
                deliverables: dels.length
                  ? dels
                  : ["Deliverables to be confirmed"],
                priceAmount: price,
                deliveryDays: days,
              },
            ]
          : undefined;

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
      packageName,
      priceAmount,
      deliveryDays,
      deliverables,
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
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="dark:bg-input/30 border-input h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
            </select>
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

        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Starter package</p>
          <p className="text-xs text-muted-foreground">
            Optional — helps brands see your pricing. Add more packages in
            settings later.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="pkgName">Name</Label>
              <Input
                id="pkgName"
                className={inputClass}
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                className={inputClass}
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                placeholder="199.99"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Delivery (days)</Label>
              <Input
                id="days"
                type="number"
                min={0}
                className={inputClass}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliverables">Deliverables (one per line)</Label>
            <textarea
              id="deliverables"
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              rows={3}
              placeholder={"1 UGC video (30–60s)\nBasic editing"}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3 dark:bg-input/30"
            />
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
