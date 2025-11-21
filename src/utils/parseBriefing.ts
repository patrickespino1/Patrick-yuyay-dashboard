export type BriefingProfilePosition = {
  role?: string;
  org?: string;
  from?: string;
  to?: string;
};

export type BriefingProfileMetadata = {
  subject?: string;
  data_source?: string;
  political_party?: string;
  country?: string;
};

export type BriefingNewsEntry = {
  date?: string | null;
  headline?: string;
  source_name?: string;
  source_url?: string;
  sentiment?: string;
  snippet?: string;
};

export type BriefingControversy = {
  topic?: string;
  context?: string;
  source_url?: string;
  keywords?: string[];
};

export type BriefingProfile = {
  metadata?: BriefingProfileMetadata;
  summary?: {
    biography?: string;
    current_position?: BriefingProfilePosition;
    previous_positions?: BriefingProfilePosition[];
    political_party?: string;
  };
  positions?: {
    current?: BriefingProfilePosition;
    previous?: BriefingProfilePosition[];
  };
  biography?: string;
  relevant_news?: BriefingNewsEntry[];
  controversies?: BriefingControversy[];
};

export type BriefingRecurringTopic = {
  topic?: string;
  evidence?: string[];
};

export type BriefingReputationalRisk = {
  risk?: string;
  rationale?: string;
  evidence?: string[];
};

export type BriefingMediaInfluence = {
  media_positioning?: string;
  recurring_topics?: BriefingRecurringTopic[];
  reputational_risks_media?: BriefingReputationalRisk[];
  key_media_events?: {
    date?: string;
    title?: string;
    impact?: string;
    outlet?: string;
  }[];
  sectors_with_presence?: string[];
};

export type BriefingThemeEvidence = {
  quote_or_paraphrase?: string;
  source?: string;
};

export type BriefingKeyTheme = {
  theme?: string;
  subthemes?: string[];
  why_it_matters?: string;
  evidence?: BriefingThemeEvidence[];
};

export type BriefingAudienceArchetype = {
  label?: string;
  motivation?: string;
  typical_expression?: {
    excerpt?: string;
  };
};

export type BriefingSocialControversy = {
  topic?: string;
  evidence?: BriefingThemeEvidence[];
};

export type BriefingSocialOpinion = {
  metadata?: {
    subject?: string;
  };
  general_narrative?: string;
  key_themes?: BriefingKeyTheme[];
  predominant_emotions?: string[];
  audience_archetypes?: BriefingAudienceArchetype[];
  social_controversies?: BriefingSocialControversy[];
};

export type BriefingRiskOpportunity = {
  title?: string;
  rationale?: string;
  evidence_ids?: string[];
};

export type BriefingRisksOpportunities = {
  media_risks?: BriefingRiskOpportunity[];
  social_risks?: BriefingRiskOpportunity[];
  press_opportunities?: BriefingRiskOpportunity[];
  audience_opportunities?: BriefingRiskOpportunity[];
};

export type BriefingPayload = {
  profile?: BriefingProfile;
  media_influence?: BriefingMediaInfluence;
  social_opinion?: BriefingSocialOpinion;
  risks_opportunities?: BriefingRisksOpportunities;
  narrative_summary?: string;
  recommended_strategy?: string;
  missing_data?: string[];
};

export type BriefingMeta = {
  requestedAt?: string;
  ui?: string;
  sourceWebhookUrl?: string;
};

export type AgentBriefing = {
  callbackUrl?: string;
  meta?: BriefingMeta;
  payload: BriefingPayload;
};

function stripCodeFence(str: string) {
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json/i, "").replace(/^```/, "");
    cleaned = cleaned.replace(/```$/, "");
  }
  return cleaned.trim();
}

function parseJsonString(value: string) {
  try {
    return JSON.parse(stripCodeFence(value));
  } catch (error) {
    console.error("Error parseando JSON del briefing:", error);
    return null;
  }
}

function coerceEnvelope(
  raw: unknown
): { callbackUrl?: string; meta?: BriefingMeta; payload?: unknown } | null {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    return coerceEnvelope(raw[0]);
  }

  if (typeof raw === "string") {
    const parsed = parseJsonString(raw);
    return coerceEnvelope(parsed);
  }

  if (typeof raw === "object") {
    const candidate = raw as Record<string, unknown>;
    if ("payload" in candidate || "callbackUrl" in candidate || "meta" in candidate) {
      return {
        callbackUrl: typeof candidate.callbackUrl === "string" ? candidate.callbackUrl : undefined,
        meta: (candidate.meta ?? undefined) as BriefingMeta | undefined,
        payload: "payload" in candidate ? candidate.payload : candidate,
      };
    }
  }

  return null;
}

export function normalizeWebhookPayload(rawResponse: unknown): AgentBriefing | null {
  if (!rawResponse) return null;

  const envelope = coerceEnvelope(rawResponse);
  if (!envelope) return null;

  let payload: unknown = envelope.payload;

  if (Array.isArray(payload)) {
    payload = payload[0];
  }

  if (typeof payload === "string") {
    payload = parseJsonString(payload);
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    callbackUrl: envelope.callbackUrl,
    meta: envelope.meta,
    payload: payload as BriefingPayload,
  };
}

function sanitizeSubject(subject?: string | null) {
  if (!subject) return undefined;
  const trimmed = subject.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "no detectado") return undefined;
  return trimmed;
}

export function extractPrimarySubject(payload: BriefingPayload) {
  const profileSubject = sanitizeSubject(payload.profile?.metadata?.subject);
  if (profileSubject) return profileSubject;
  const socialSubject = sanitizeSubject(payload.social_opinion?.metadata?.subject);
  if (socialSubject) return socialSubject;
  return profileSubject ?? socialSubject ?? undefined;
}

export function extractPrimaryBiography(payload: BriefingPayload) {
  return payload.profile?.summary?.biography ?? payload.profile?.biography ?? undefined;
}
