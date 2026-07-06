"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
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

function formatCount(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function latestReach(conn: SocialConnectionApi): number | undefined {
  const withReach = (conn.metrics ?? []).filter((m) => m.reach != null);
  return withReach.length ? withReach[withReach.length - 1].reach : undefined;
}

function followersGained30d(conn: SocialConnectionApi): number | undefined {
  const deltas = (conn.metrics ?? [])
    .map((m) => m.followersDelta)
    .filter((v): v is number => v != null);
  if (!deltas.length) return undefined;
  return deltas.reduce((a, b) => a + b, 0);
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
  const expired = conn.status === "EXPIRED" || conn.status === "REVOKED";
  const audience = conn.audience;
  const reach = latestReach(conn);
  const gained = followersGained30d(conn);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <MetricTile
          label="Followers"
          value={formatCount(conn.followersCount)}
        />
        <MetricTile label="Posts" value={formatCount(conn.mediaCount)} />
        {reach != null && (
          <MetricTile label="Reach (latest)" value={formatCount(reach)} />
        )}
        {gained != null && (
          <MetricTile
            label="New followers (30d)"
            value={`${gained >= 0 ? "+" : ""}${formatCount(gained)}`}
          />
        )}
      </div>

      {audience &&
        (audience.ageRanges.length > 0 ||
          audience.gender.length > 0 ||
          audience.topCities.length > 0 ||
          audience.topCountries.length > 0) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: 20,
              paddingTop: 4,
            }}
          >
            <DemographicBars title="Age ranges" buckets={audience.ageRanges} />
            <DemographicBars
              title="Gender"
              buckets={audience.gender}
              labelMap={GENDER_LABELS}
            />
            <DemographicBars title="Top cities" buckets={audience.topCities} />
            <DemographicBars
              title="Top countries"
              buckets={audience.topCountries}
            />
          </div>
        )}
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

export function CreatorSocialAccounts() {
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
    } else if (status === "error") {
      toast.error("Instagram connection failed. Please try again.");
    }
    // Strip the query param so the toast doesn't repeat on refresh.
    router.replace("/creator/settings/profile", { scroll: false });
  }, [searchParams, queryClient, router]);

  const instagram = connections?.find((c) => c.platform === "INSTAGRAM");
  const connecting = connectInstagram.isPending;

  return (
    <SectionCard
      id="social-accounts"
      icon={Instagram}
      title="Connected accounts"
      desc="Link your Instagram to showcase live audience metrics and demographics. YouTube and Reddit are coming soon."
    >
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Spinner /> Loading…
        </div>
      ) : instagram ? (
        <InstagramConnected
          conn={instagram}
          disconnecting={disconnect.isPending}
          reconnecting={connecting}
          onDisconnect={() => disconnect.mutate("INSTAGRAM")}
          onReconnect={() => connectInstagram.mutate()}
        />
      ) : (
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
