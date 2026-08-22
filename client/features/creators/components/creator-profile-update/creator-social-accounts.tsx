"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronDown,
  Instagram,
  Youtube,
  MessageCircle,
  RefreshCw,
  Link2Off,
} from "lucide-react";
import { SectionCard } from "./shared-components";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  socialConnectionsQueryKey,
  type DemographicBucketApi,
  type SocialConnectionApi,
} from "@/features/creators/api/social-connections";
import {
  useConnectInstagramMutation,
  useDisconnectSocialMutation,
  useSocialConnectionsQuery,
} from "@/features/creators/hooks/use-social-connections";
import { usePublicInstagramInsightsQuery } from "@/features/creators/hooks/use-public-instagram-insights";
import {
  publicInstagramInsightsQueryKey,
  refreshCreatorInstagramInsights,
} from "@/features/creators/api/instagram-insights";
import {
  InstagramInsights,
  hasInstagramInsightsData,
} from "@/features/creators/components/instagram-insights/instagram-insights";

function formatCount(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const GENDER_LABELS: Record<string, string> = {
  F: "Female",
  M: "Male",
  U: "Unknown",
};

function DemographicBars({
  title,
  buckets,
  labelMap,
}: {
  title: string;
  buckets: DemographicBucketApi[];
  labelMap?: Record<string, string>;
}) {
  if (!buckets?.length) return null;
  const max = Math.max(...buckets.map((b) => b.value));
  return (
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          margin: "0 0 8px",
          color: "var(--muted-foreground)",
        }}
      >
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {buckets.map((b) => (
          <div
            key={b.key}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                fontSize: 12,
                width: 92,
                flexShrink: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={labelMap?.[b.key] ?? b.key}
            >
              {labelMap?.[b.key] ?? b.key}
            </span>
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 999,
                background: "var(--muted)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${max > 0 ? (b.value / max) * 100 : 0}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "var(--primary)",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 11.5,
                width: 44,
                textAlign: "right",
                color: "var(--muted-foreground)",
                flexShrink: 0,
              }}
            >
              {b.share != null
                ? `${Math.round(b.share * 100)}%`
                : formatCount(b.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "10px 14px",
        minWidth: 96,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
        {label}
      </div>
    </div>
  );
}

function InstagramConnected({
  conn,
  onDisconnect,
  onReconnect,
  disconnecting,
  reconnecting,
}: {
  conn: SocialConnectionApi;
  onDisconnect: () => void;
  onReconnect: () => void;
  disconnecting: boolean;
  reconnecting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const expired = conn.status === "EXPIRED" || conn.status === "REVOKED";
  const audience = conn.audience;
  const reach = conn.reach30d;
  const hasAudience = Boolean(
    audience &&
      (audience.ageRanges.length > 0 ||
        audience.gender.length > 0 ||
        audience.topCities.length > 0 ||
        audience.topCountries.length > 0),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 12,
            background:
              "linear-gradient(45deg,#f9ce34,#ee2a7b 45%,#6228d7)",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <Instagram size={20} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: 15 }}>
              {conn.username ? `@${conn.username}` : "Instagram"}
            </strong>
            {expired ? (
              <Badge
                variant="outline"
                style={{
                  color: "var(--destructive)",
                  borderColor: "var(--destructive)",
                }}
              >
                Reconnect needed
              </Badge>
            ) : (
              <Badge variant="secondary">Connected</Badge>
            )}
          </div>
          <div
            style={{ fontSize: 12, color: "var(--muted-foreground)" }}
          >
            {conn.lastSyncedAt
              ? `Last updated ${new Date(conn.lastSyncedAt).toLocaleString()}`
              : "Metrics will appear after the first sync (within a day)."}
          </div>
        </div>
        {expired ? (
          <Button
            type="button"
            size="sm"
            onClick={onReconnect}
            disabled={reconnecting}
          >
            {reconnecting ? <Spinner /> : <RefreshCw size={14} />}
            Reconnect
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? <Spinner /> : <Link2Off size={14} />}
            Disconnect
          </Button>
        )}
      </div>

      {/* Accordion: keep the connected state compact and reveal the full
          Instagram metrics + audience breakdown only when the creator asks. */}
      {!expired ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              width: "100%",
              padding: "10px 14px",
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "var(--muted)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--foreground)",
            }}
          >
            <span>{expanded ? "Hide details" : "View details"}</span>
            <ChevronDown
              size={16}
              aria-hidden
              style={{
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 0.18s ease",
              }}
            />
          </button>

          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                key="ig-details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    paddingTop: 4,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <MetricTile
                      label="Followers"
                      value={formatCount(conn.followersCount)}
                    />
                    <MetricTile
                      label="Posts"
                      value={formatCount(conn.mediaCount)}
                    />
                    {reach != null && (
                      <MetricTile
                        label="Reach (30d)"
                        value={formatCount(reach)}
                      />
                    )}
                    {conn.profileViews30d != null && (
                      <MetricTile
                        label="Profile views (30d)"
                        value={formatCount(conn.profileViews30d)}
                      />
                    )}
                  </div>

                  {hasAudience && audience ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(200px,1fr))",
                        gap: 20,
                        paddingTop: 4,
                      }}
                    >
                      <DemographicBars
                        title="Age ranges"
                        buckets={audience.ageRanges}
                      />
                      <DemographicBars
                        title="Gender"
                        buckets={audience.gender}
                        labelMap={GENDER_LABELS}
                      />
                      <DemographicBars
                        title="Top cities"
                        buckets={audience.topCities}
                      />
                      <DemographicBars
                        title="Top countries"
                        buckets={audience.topCountries}
                      />
                    </div>
                  ) : (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--muted-foreground)",
                        margin: 0,
                      }}
                    >
                      Audience metrics will appear here after the first sync
                      (within a day of connecting).
                    </p>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}

function ComingSoonRow({
  icon: Icon,
  name,
}: {
  icon: React.ComponentType<{ size?: number }>;
  name: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        opacity: 0.6,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--muted)",
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </span>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: 14 }}>{name}</strong>
      </div>
      <Badge variant="outline">Coming soon</Badge>
    </div>
  );
}

function AdminInstagramPanel({ profileId }: { profileId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = usePublicInstagramInsightsQuery(profileId, {
    enabled: Boolean(profileId),
  });
  const refresh = useMutation({
    mutationFn: () => refreshCreatorInstagramInsights(profileId),
    onSuccess: (fresh) => {
      queryClient.setQueryData(
        publicInstagramInsightsQueryKey(profileId),
        fresh,
      );
      toast.success("Instagram insights refreshed");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to refresh Instagram insights");
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Spinner /> Loading…
      </div>
    );
  }

  if (!data?.connected) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(45deg,#f9ce34,#ee2a7b 45%,#6228d7)",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <Instagram size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <strong style={{ fontSize: 14 }}>Instagram</strong>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            This creator hasn&apos;t connected an Instagram account yet.
          </div>
        </div>
        <Badge variant="outline">Not connected</Badge>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(45deg,#f9ce34,#ee2a7b 45%,#6228d7)",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <Instagram size={20} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: 15 }}>
              {data.username ? `@${data.username}` : "Instagram"}
            </strong>
            <Badge variant="secondary">Connected</Badge>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {data.snapshotDate
              ? `Last snapshot ${new Date(data.snapshotDate).toLocaleString()}`
              : "Audience metrics sync daily after connect."}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
        >
          {refresh.isPending ? <Spinner /> : <RefreshCw size={14} />}
          Refresh
        </Button>
      </div>

      {hasInstagramInsightsData(data) ? (
        <InstagramInsights insights={data} variant="full" showHeader={false} />
      ) : (
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
          Connected, but audience metrics haven&apos;t synced yet.
        </p>
      )}
    </div>
  );
}

function CreatorOwnSocialAccounts() {
  const { data: connections, isLoading } = useSocialConnectionsQuery();
  const connectInstagram = useConnectInstagramMutation();
  const disconnect = useDisconnectSocialMutation();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Surface the OAuth callback result and refresh once we return from Instagram.
  useEffect(() => {
    const status = searchParams.get("instagram");
    if (!status) return;
    if (status === "connected") {
      toast.success("Instagram connected. Fetching your metrics…");
      queryClient.invalidateQueries({ queryKey: socialConnectionsQueryKey });
    } else if (status === "already_linked") {
      toast.error(
        "This Instagram account is already connected to another creator. Disconnect it there first, or use a different account.",
      );
    } else if (status === "error") {
      toast.error("Instagram connection failed. Please try again.");
    }
    // Strip the query param so the toast doesn't repeat on refresh.
    router.replace("/creator/settings/profile", { scroll: false });
  }, [searchParams, queryClient, router]);

  const instagram = connections?.find((c) => c.platform === "INSTAGRAM");
  const connecting = connectInstagram.isPending;

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Spinner /> Loading…
      </div>
    );
  }

  if (instagram) {
    return (
      <InstagramConnected
        conn={instagram}
        disconnecting={disconnect.isPending}
        reconnecting={connecting}
        onDisconnect={() => disconnect.mutate("INSTAGRAM")}
        onReconnect={() => connectInstagram.mutate()}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "linear-gradient(45deg,#f9ce34,#ee2a7b 45%,#6228d7)",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <Instagram size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 180 }}>
        <strong style={{ fontSize: 14 }}>Instagram</strong>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          Connect a Professional (Business or Creator) account.
        </div>
      </div>
      <Button
        type="button"
        onClick={() => connectInstagram.mutate()}
        disabled={connecting}
      >
        {connecting ? <Spinner /> : <Instagram size={16} />}
        Connect Instagram
      </Button>
    </div>
  );
}

export function CreatorSocialAccounts({
  adminMode,
  profileId,
}: {
  adminMode?: boolean;
  profileId?: string;
} = {}) {
  const isAdminView = Boolean(adminMode && profileId);

  return (
    <SectionCard id="social-accounts" icon={Instagram}>
      {isAdminView ? (
        <AdminInstagramPanel profileId={profileId!} />
      ) : (
        <CreatorOwnSocialAccounts />
      )}

      <div
        style={{
          marginTop: 20,
          borderTop: "1px solid var(--border)",
          paddingTop: 4,
        }}
      >
        <ComingSoonRow icon={Youtube} name="YouTube" />
        <ComingSoonRow icon={MessageCircle} name="Reddit" />
      </div>
    </SectionCard>
  );
}
