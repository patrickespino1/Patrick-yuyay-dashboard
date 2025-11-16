import { Fragment, type ReactNode } from "react";

export interface InvestigationReport {
  profile?: {
    subject?: string;
    political_party?: string;
    data_source?: string;
    timestamp?: string;
    summary?: {
      biography?: string;
      current_position?: {
        role?: string;
        org?: string;
      };
    };
    metadata?: Record<string, unknown>;
    influencers?: Array<{
      name: string;
      type?: string;
      relevance?: string;
      description?: string;
    }>;
    active_sectors?: string[];
    hashtags?: string[];
    relevant_news?: Array<{
      title: string;
      headline?: string;
      snippet?: string;
      date?: string;
      source?: string;
      source_url?: string;
      sentiment?: "positivo" | "neutro" | "negativo";
      crisis_or_impact?: boolean;
    }>;
    controversies?: Array<{
      keywords?: string[];
      context?: string;
      source_url?: string;
    }>;
    key_events?: Array<{
      date?: string;
      title: string;
      category?: string;
      impact?: string;
    }>;
  };
  media_influence?: {
    media_positioning?: string;
    recurring_topics?: string[];
    reputational_risks?: string[];
    sectors_with_presence?: string[];
    key_media_events?: Array<{
      date?: string;
      label: string;
      description?: string;
    }>;
  };
  social_opinion?: {
    general_narrative?: string;
    key_themes?: Array<{
      theme: string;
      subthemes?: string[];
      evidence?: string[];
    }>;
    predominant_emotions?: string[];
    audience_archetypes?: Array<{
      label: string;
      motivation?: string;
      typical_expression?: { excerpt?: string };
    }>;
    social_controversies?: Array<{
      topic: string;
      impact?: string;
      evidence?: string;
    }>;
  };
  risks_opportunities?: {
    media_risks?: RiskOpportunity[];
    social_network_risks?: RiskOpportunity[];
    press_opportunities?: RiskOpportunity[];
    audience_opportunities?: RiskOpportunity[];
  };
  narrative_summary?: string;
  recommended_strategy?: string;
  missing_data?: string[];
}

export interface RiskOpportunity {
  title: string;
  rationale?: string;
  evidence_ids?: string[];
}

export interface InvestigationReportViewProps {
  report: InvestigationReport;
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export function extractReportFromAgentPayload(payload: unknown): InvestigationReport | null {
  if (!payload) return null;

  const unwrapJsonString = (value: string) => {
    const match = value.match(/```json\s*([\s\S]*?)\s*```/i);
    const jsonString = match ? match[1] : value.replace(/```/g, "");
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  const parseItem = (item: unknown): InvestigationReport | null => {
    if (item && typeof item === "object" && "output" in item) {
      const output = (item as { output?: string }).output;
      if (typeof output === "string") {
        return unwrapJsonString(output);
      }
    }
    if (typeof item === "string") {
      return unwrapJsonString(item);
    }
    if (item && typeof item === "object") {
      return item as InvestigationReport;
    }
    return null;
  };

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const parsed = parseItem(entry);
      if (parsed) return parsed;
    }
    return null;
  }

  if (typeof payload === "string") {
    return parseItem(payload);
  }

  if (payload && typeof payload === "object") {
    if ("output" in (payload as Record<string, unknown>)) {
      return parseItem(payload);
    }
    return payload as InvestigationReport;
  }

  return null;
}

const sentimentStyles: Record<string, string> = {
  positivo: "bg-emerald-500/20 text-emerald-200 border border-emerald-300/40",
  neutro: "bg-slate-600/20 text-slate-200 border border-slate-200/30",
  negativo: "bg-rose-500/20 text-rose-200 border border-rose-300/40",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
});

export function InvestigationReportView({ report }: InvestigationReportViewProps) {
  const profile = report.profile ?? {};
  const summary = profile.summary ?? {};
  const position = summary.current_position ?? {};

  const renderList = (title: string, items?: string[], accent?: "danger" | "info" | "success") => {
    if (!items || items.length === 0) return null;
    return (
      <SectionCard title={title}>
        <ul className="space-y-2 text-sm text-slate-200/90">
          {items.map((item) => (
            <li
              key={item}
              className={cn(
                "rounded-2xl px-3 py-2",
                accent === "danger" && "bg-rose-500/10 border border-rose-300/20 text-rose-100",
                accent === "success" && "bg-emerald-500/10 border border-emerald-300/25 text-emerald-100",
                !accent && "bg-white/5 border border-white/5 text-white/80"
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard>
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.4em] text-[var(--brand-cyan)]">Informe del sujeto</p>
          <h1 className="text-3xl font-semibold text-white">{profile.subject ?? "Sujeto sin nombre"}</h1>
          <p className="text-lg text-white/80">
            {[position.role, position.org].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-3">
            {profile.political_party && (
              <Chip pill label={profile.political_party} tone="brand" />
            )}
            {profile.data_source && <Chip label={`Fuente: ${profile.data_source}`} />}
            {profile.timestamp && (
              <Chip label={dateFormatter.format(new Date(profile.timestamp))} />
            )}
          </div>
          {summary.biography && (
            <p className="text-base text-slate-200 leading-relaxed">{summary.biography}</p>
          )}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {profile.influencers && profile.influencers.length > 0 && (
          <SectionCard title="Influencers clave">
            <div className="flex flex-col gap-4">
              {profile.influencers.map((inf) => (
                <div key={`${inf.name}-${inf.type}`} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{inf.name}</p>
                    {inf.type && (
                      <Chip
                        label={inf.type}
                        tone={
                          inf.type === "opositor"
                            ? "danger"
                            : inf.type === "aliado"
                              ? "success"
                              : "neutral"
                        }
                      />
                    )}
                    {inf.relevance && (
                      <Chip label={`Relevancia: ${inf.relevance}`} tone="info" />
                    )}
                  </div>
                  {inf.description && (
                    <p className="mt-2 text-sm text-slate-300">{inf.description}</p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <div className="flex flex-col gap-6">
          {profile.active_sectors && profile.active_sectors.length > 0 && (
            <SectionCard title="Sectores activos">
              <TagGroup items={profile.active_sectors} />
            </SectionCard>
          )}

          {profile.hashtags && profile.hashtags.length > 0 && (
            <SectionCard title="Hashtags clave">
              <TagGroup items={profile.hashtags.map((h) => `#${h.replace(/^#/, "")}`)} />
            </SectionCard>
          )}
        </div>
      </div>

      {profile.relevant_news && profile.relevant_news.length > 0 && (
        <SectionCard title="Noticias relevantes">
          <div className="mt-4 grid gap-4 max-h-[28rem] overflow-y-auto pr-2">
            {profile.relevant_news.map((news, index) => (
              <article
                key={`${news.title}-${index}`}
                className="rounded-2xl border border-white/6 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  {news.date && (
                    <span>{shortDateFormatter.format(new Date(news.date))}</span>
                  )}
                  {news.source && <span className="uppercase tracking-[0.3em]">{news.source}</span>}
                  {news.sentiment && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem]", sentimentStyles[news.sentiment])}>
                      {news.sentiment}
                    </span>
                  )}
                  {news.crisis_or_impact && (
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[0.65rem] text-rose-200">
                      ⚠ Crisis
                    </span>
                  )}
                </div>
                <h4 className="mt-2 text-lg font-semibold text-white">{news.title ?? news.headline}</h4>
                {news.snippet && <p className="mt-2 text-sm text-slate-300">{news.snippet}</p>}
                {news.source_url && (
                  <a
                    href={news.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-xs font-semibold text-[var(--brand-cyan)]"
                  >
                    Ver fuente →
                  </a>
                )}
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {profile.controversies && profile.controversies.length > 0 && (
          <SectionCard title="Controversias">
            <div className="flex flex-col gap-4">
              {profile.controversies.map((controversy, index) => (
                <div
                  key={`controversy-${index}`}
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4"
                >
                  {controversy.keywords && (
                    <div className="flex flex-wrap gap-2">
                      {controversy.keywords.map((keyword) => (
                        <Chip key={keyword} label={keyword} tone="danger" />
                      ))}
                    </div>
                  )}
                  {controversy.context && (
                    <p className="mt-2 text-sm text-rose-100/90">{controversy.context}</p>
                  )}
                  {controversy.source_url && (
                    <a
                      href={controversy.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex text-xs font-semibold text-rose-200"
                    >
                      Ver fuente →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {profile.key_events && profile.key_events.length > 0 && (
          <SectionCard title="Eventos clave">
            <div className="relative border-l border-white/10 pl-6">
              {profile.key_events.map((event, index) => (
                <div key={`event-${index}`} className="relative pb-6">
                  <div className="absolute -left-[15px] top-1.5 h-3 w-3 rounded-full bg-[var(--brand-cyan)] shadow-[0_0_10px_rgba(45,224,203,0.8)]" />
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {event.date && <span>{shortDateFormatter.format(new Date(event.date))}</span>}
                      {event.category && <Chip label={event.category} tone="brand" />}
                    </div>
                    <p className="text-base font-semibold text-white">{event.title}</p>
                    {event.impact && <p className="text-sm text-slate-300">{event.impact}</p>}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {report.media_influence && (
        <div className="grid gap-6 lg:grid-cols-2">
          {report.media_influence.media_positioning && (
            <SectionCard title="Posicionamiento mediático">
              <p className="text-sm text-slate-200 leading-relaxed">
                {report.media_influence.media_positioning}
              </p>
            </SectionCard>
          )}

          {renderList("Temas recurrentes", report.media_influence.recurring_topics, "info")}
          {renderList("Riesgos reputacionales", report.media_influence.reputational_risks, "danger")}
          {renderList("Sectores con presencia", report.media_influence.sectors_with_presence)}

          {report.media_influence.key_media_events && report.media_influence.key_media_events.length > 0 && (
            <SectionCard title="Eventos mediáticos clave">
              <div className="flex flex-col gap-4">
                {report.media_influence.key_media_events.map((item, index) => (
                  <div key={`media-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-slate-400">
                      {item.date && shortDateFormatter.format(new Date(item.date))}
                    </div>
                    <p className="text-base font-semibold text-white">{item.label}</p>
                    {item.description && <p className="text-sm text-slate-300">{item.description}</p>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {report.social_opinion && (
        <div className="grid gap-6 lg:grid-cols-2">
          {report.social_opinion.general_narrative && (
            <SectionCard title="Narrativa social general">
              <p className="text-sm text-slate-200 leading-relaxed">
                {report.social_opinion.general_narrative}
              </p>
            </SectionCard>
          )}

          {report.social_opinion.key_themes && report.social_opinion.key_themes.length > 0 && (
            <SectionCard title="Temas clave en redes">
              <div className="flex flex-col gap-4">
                {report.social_opinion.key_themes.map((theme, index) => (
                  <div key={`theme-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-base font-semibold text-white">{theme.theme}</p>
                    {theme.subthemes && theme.subthemes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {theme.subthemes.map((sub) => (
                          <Chip key={sub} label={sub} tone="info" />
                        ))}
                      </div>
                    )}
                    {theme.evidence && theme.evidence.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2 text-sm italic text-slate-400">
                        {theme.evidence.map((quote, quoteIndex) => (
                          <blockquote key={`quote-${quoteIndex}`}>"{quote}"</blockquote>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {report.social_opinion.predominant_emotions && report.social_opinion.predominant_emotions.length > 0 && (
            <SectionCard title="Emociones predominantes">
              <TagGroup items={report.social_opinion.predominant_emotions} />
            </SectionCard>
          )}

          {report.social_opinion.audience_archetypes && report.social_opinion.audience_archetypes.length > 0 && (
            <SectionCard title="Arquetipos de audiencia">
              <div className="flex flex-col gap-4">
                {report.social_opinion.audience_archetypes.map((archetype, index) => (
                  <div key={`archetype-${index}`} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-base font-semibold text-white">{archetype.label}</p>
                    {archetype.motivation && (
                      <p className="text-sm text-slate-300">Motivación: {archetype.motivation}</p>
                    )}
                    {archetype.typical_expression?.excerpt && (
                      <p className="text-sm italic text-slate-400">
                        "{archetype.typical_expression.excerpt}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {report.social_opinion.social_controversies && report.social_opinion.social_controversies.length > 0 && (
            <SectionCard title="Controversias en redes">
              <div className="flex flex-col gap-3">
                {report.social_opinion.social_controversies.map((controversy, index) => (
                  <div key={`social-controversy-${index}`} className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3">
                    <p className="text-sm font-semibold text-white">{controversy.topic}</p>
                    {controversy.impact && (
                      <p className="text-xs text-rose-100/90">Impacto: {controversy.impact}</p>
                    )}
                    {controversy.evidence && (
                      <p className="text-xs text-rose-100/80">"{controversy.evidence}"</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {report.risks_opportunities && (
        <div className="grid gap-6 lg:grid-cols-2">
          <RiskOpportunityCard title="Riesgos en medios" items={report.risks_opportunities.media_risks} variant="danger" />
          <RiskOpportunityCard title="Riesgos en redes sociales" items={report.risks_opportunities.social_network_risks} variant="danger" />
          <RiskOpportunityCard title="Oportunidades en prensa" items={report.risks_opportunities.press_opportunities} variant="success" />
          <RiskOpportunityCard title="Oportunidades en audiencia" items={report.risks_opportunities.audience_opportunities} variant="success" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {report.narrative_summary && (
          <SectionCard title="Resumen narrativo">
            <p className="text-sm leading-relaxed text-slate-200">{report.narrative_summary}</p>
          </SectionCard>
        )}
        {report.recommended_strategy && (
          <SectionCard title="Estrategia recomendada">
            <p className="text-sm leading-relaxed text-slate-200">{report.recommended_strategy}</p>
          </SectionCard>
        )}
      </div>

      {report.missing_data && report.missing_data.length > 0 && (
        <SectionCard title="Datos faltantes / Limitaciones" tone="info">
          <ul className="list-disc space-y-2 pl-5 text-sm text-white/90">
            {report.missing_data.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
  tone,
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "danger" | "success";
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border p-6 sm:p-7",
        tone === "danger" && "border-rose-500/30 bg-rose-500/5",
        tone === "info" && "border-cyan-400/30 bg-cyan-400/5",
        tone === "success" && "border-emerald-400/30 bg-emerald-400/5",
        !tone && "border-white/10 bg-white/5"
      )}
    >
      {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
      <div className={cn(title && "mt-4")}>{children}</div>
    </section>
  );
}

function Chip({
  label,
  tone = "neutral",
  pill,
}: {
  label: string;
  tone?: "brand" | "danger" | "success" | "info" | "neutral";
  pill?: boolean;
}) {
  const tones: Record<string, string> = {
    brand: "bg-[var(--brand-cyan)]/15 text-[var(--brand-cyan)] border border-[var(--brand-cyan)]/30",
    danger: "bg-rose-500/15 text-rose-100 border border-rose-300/30",
    success: "bg-emerald-500/15 text-emerald-100 border border-emerald-300/30",
    info: "bg-slate-600/20 text-slate-200 border border-slate-400/30",
    neutral: "bg-white/10 text-white/80 border border-white/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em]",
        tones[tone],
        pill !== false ? "rounded-full" : "rounded-xl"
      )}
    >
      {label}
    </span>
  );
}

function TagGroup({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80">
          {item}
        </span>
      ))}
    </div>
  );
}

function RiskOpportunityCard({
  title,
  items,
  variant,
}: {
  title: string;
  items?: RiskOpportunity[];
  variant: "danger" | "success";
}) {
  if (!items || items.length === 0) return null;
  return (
    <SectionCard title={title} tone={variant === "danger" ? "danger" : "success"}>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <Fragment key={`${title}-${index}`}>
            <div>
              <p className="font-semibold text-white">{item.title}</p>
              {item.rationale && <p className="text-sm text-white/80">{item.rationale}</p>}
              {item.evidence_ids && item.evidence_ids.length > 0 && (
                <p className="text-xs text-white/60">Evidencia: {item.evidence_ids.join(", ")}</p>
              )}
            </div>
            {index < items.length - 1 && <div className="h-px bg-white/10" />}
          </Fragment>
        ))}
      </div>
    </SectionCard>
  );
}
