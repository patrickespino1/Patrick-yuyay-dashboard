'use client';

import {
  extractPrimaryBiography,
  extractPrimarySubject,
  type AgentBriefing,
  type BriefingNewsEntry,
  type BriefingProfilePosition,
  type BriefingRiskOpportunity,
} from "@/utils/parseBriefing";

type Props = {
  data: AgentBriefing | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
});

const sentimentStyles: Record<string, string> = {
  positivo: "border-emerald-300/40 text-emerald-200",
  neutral: "border-slate-400/40 text-slate-300",
  neutro: "border-slate-400/40 text-slate-300",
  negativo: "border-rose-300/40 text-rose-200",
};

function formatDate(value?: string | null) {
  if (!value) return "s/f";
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateTime(value?: string) {
  if (!value) return null;
  try {
    return dateTimeFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function renderPositions(positions: BriefingProfilePosition[]) {
  if (!positions.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Trayectoria</p>
      <div className="mt-2 space-y-2">
        {positions.map((position, index) => (
          <div
            key={`${position.role}-${position.org}-${index}`}
            className="flex flex-wrap gap-2 text-sm text-slate-200"
          >
            <span className="w-32 text-xs text-slate-500">
              {[position.from, position.to].filter(Boolean).join(" – ") || "Sin fechas"}
            </span>
            <div>
              <p className="font-medium text-white">{position.role ?? "Rol no definido"}</p>
              <p className="text-xs text-slate-400">{position.org ?? "Organización no especificada"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderRiskList(title: string, items: BriefingRiskOpportunity[] | undefined, tone: "risk" | "opportunity") {
  if (!items?.length) return null;
  const toneClasses =
    tone === "risk"
      ? "border-rose-400/20 bg-rose-500/5 text-rose-100"
      : "border-emerald-400/20 bg-emerald-500/5 text-emerald-100";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className="rounded-2xl border border-white/5 bg-black/30 p-3 text-sm text-slate-200"
          >
            <p className={`text-xs font-semibold ${toneClasses}`}>{item.title ?? "Sin título"}</p>
            {item.rationale && <p className="mt-1 text-slate-300">{item.rationale}</p>}
            {item.evidence_ids?.length && (
              <p className="mt-1 text-xs text-slate-500">Evidencia: {item.evidence_ids.join(", ")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BriefingResults({ data }: Props) {
  if (!data?.payload) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-white/5 bg-black/40 px-6 text-sm text-slate-400">
        Aún no hay informes. Envía una investigación para ver los hallazgos aquí.
      </div>
    );
  }

  const { payload, meta } = data;
  const subject = extractPrimarySubject(payload) ?? "Sujeto no identificado";
  const biography = extractPrimaryBiography(payload) ?? "Sin biografía disponible.";
  const currentRole = payload.profile?.summary?.current_position ?? payload.profile?.positions?.current;
  const previousPositions =
    payload.profile?.summary?.previous_positions ?? payload.profile?.positions?.previous ?? [];
  const politicalParty =
    payload.profile?.summary?.political_party ?? payload.profile?.metadata?.political_party;
  const country = payload.profile?.metadata?.country;
  const relevantNews = payload.profile?.relevant_news ?? [];
  const controversies = payload.profile?.controversies ?? [];
  const recurringTopics = payload.media_influence?.recurring_topics ?? [];
  const mediaRisks = payload.media_influence?.reputational_risks_media ?? [];
  const sectorsPresence = payload.media_influence?.sectors_with_presence ?? [];
  const socialNarrative = payload.social_opinion?.general_narrative;
  const keyThemes = payload.social_opinion?.key_themes ?? [];
  const predominantEmotions = payload.social_opinion?.predominant_emotions ?? [];
  const archetypes = payload.social_opinion?.audience_archetypes ?? [];
  const socialControversies = payload.social_opinion?.social_controversies ?? [];
  const mediaRisksList = payload.risks_opportunities?.media_risks ?? [];
  const socialRisks = payload.risks_opportunities?.social_risks ?? [];
  const pressOpportunities = payload.risks_opportunities?.press_opportunities ?? [];
  const audienceOpportunities = payload.risks_opportunities?.audience_opportunities ?? [];
  const investigationDate = formatDateTime(meta?.requestedAt);
  const missingData = payload.missing_data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-black/30 to-black/60 p-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-cyan)]">
            Informe del sujeto
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold text-white">{subject}</h2>
            {politicalParty && (
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
                {politicalParty}
              </span>
            )}
            {country && (
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                {country}
              </span>
            )}
          </div>
          {currentRole && (
            <p className="text-sm text-slate-300">
              Cargo actual: {currentRole.role} · {currentRole.org}
            </p>
          )}
          {investigationDate && (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Informe generado el {investigationDate}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-cyan)]">
            Perfil y biografía
          </h3>
          <p className="text-sm leading-relaxed text-slate-200">{biography}</p>
          {renderPositions(previousPositions)}
          {controversies.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Controversias</p>
              {controversies.map((item, index) => (
                <div key={`${item.topic}-${index}`} className="rounded-2xl border border-white/5 bg-black/30 p-3">
                  <p className="text-sm font-semibold text-white">{item.topic}</p>
                  {item.context && <p className="mt-1 text-xs text-slate-300">{item.context}</p>}
                  {item.keywords?.length && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                      {item.keywords.map((keyword) => (
                        <span key={keyword} className="rounded-full border border-white/10 px-2 py-0.5">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-semibold text-[var(--brand-cyan)]"
                    >
                      Ver fuente →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-cyan)]">
              Cobertura mediática
            </h3>
            {payload.media_influence?.media_positioning && (
              <p className="mt-2 text-sm text-slate-200">{payload.media_influence.media_positioning}</p>
            )}
          </div>

          {recurringTopics.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Temas recurrentes</p>
              <div className="grid gap-3 md:grid-cols-2">
                {recurringTopics.map((topic, index) => (
                  <div key={`${topic.topic}-${index}`} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-white">{topic.topic}</p>
                    {topic.evidence?.length && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                        {topic.evidence.slice(0, 3).map((evidence, idx) => (
                          <li key={`${evidence}-${idx}`}>{evidence}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {mediaRisks.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Riesgos reputacionales en medios
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {mediaRisks.map((risk, index) => (
                  <div key={`${risk.risk}-${index}`} className="rounded-2xl border border-rose-300/20 bg-rose-500/5 p-4">
                    <p className="text-sm font-semibold text-rose-100">{risk.risk}</p>
                    {risk.rationale && <p className="mt-1 text-xs text-rose-200/80">{risk.rationale}</p>}
                    {risk.evidence?.length && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-rose-100/80">
                        {risk.evidence.slice(0, 3).map((evidence, idx) => (
                          <li key={`${evidence}-${idx}`}>{evidence}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sectorsPresence.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sectores con presencia</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sectorsPresence.map((sector) => (
                  <span key={sector} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          )}

          {relevantNews.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Noticias relevantes</p>
              <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20">
                {relevantNews.slice(0, 8).map((news: BriefingNewsEntry, index) => (
                  <div key={`${news.headline}-${index}`} className="grid gap-3 p-4 lg:grid-cols-12">
                    <div className="text-xs text-slate-500 lg:col-span-2">{formatDate(news.date)}</div>
                    <div className="lg:col-span-6">
                      <p className="text-sm font-semibold text-white">{news.headline}</p>
                      {news.snippet && <p className="text-xs text-slate-300">{news.snippet}</p>}
                      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                        {news.source_name}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 lg:col-span-4 lg:items-end">
                      {news.sentiment && (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] ${
                            sentimentStyles[news.sentiment.toLowerCase()] ??
                            "border-white/15 text-slate-200"
                          }`}
                        >
                          {news.sentiment}
                        </span>
                      )}
                      {news.source_url && (
                        <a
                          href={news.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[var(--brand-cyan)]"
                        >
                          Ver fuente →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--brand-cyan)]">
          Opinión social
        </h3>
        {socialNarrative && <p className="mt-2 text-sm leading-relaxed text-slate-200">{socialNarrative}</p>}

        {keyThemes.length > 0 && (
          <div className="mt-5 space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Temas clave</p>
            <div className="grid gap-3 md:grid-cols-2">
              {keyThemes.map((theme, index) => (
                <div key={`${theme.theme}-${index}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm font-semibold text-white">{theme.theme}</p>
                  {theme.subthemes?.length && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {theme.subthemes.map((subtheme) => (
                        <span key={subtheme} className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-slate-300">
                          {subtheme}
                        </span>
                      ))}
                    </div>
                  )}
                  {theme.why_it_matters && (
                    <p className="mt-2 text-xs text-slate-400">{theme.why_it_matters}</p>
                  )}
                  {theme.evidence?.length && (
                    <div className="mt-3 space-y-2 text-xs text-slate-300">
                      {theme.evidence.slice(0, 2).map((evidence, idx) => (
                        <blockquote key={`${evidence.quote_or_paraphrase}-${idx}`} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 italic text-slate-200">
                          {evidence.quote_or_paraphrase}
                        </blockquote>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {predominantEmotions.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Emociones predominantes</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {predominantEmotions.map((emotion) => (
                <span key={emotion} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                  {emotion}
                </span>
              ))}
            </div>
          </div>
        )}

        {archetypes.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Arquetipos de audiencia</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {archetypes.map((archetype, index) => (
                <div key={`${archetype.label}-${index}`} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-200">
                  <p className="text-base font-semibold text-white">{archetype.label}</p>
                  {archetype.motivation && (
                    <p className="mt-1 text-xs text-slate-400">Motivación: {archetype.motivation}</p>
                  )}
                  {archetype.typical_expression?.excerpt && (
                    <blockquote className="mt-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs italic text-slate-200">
                      “{archetype.typical_expression.excerpt}”
                    </blockquote>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {socialControversies.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Controversias sociales</p>
            {socialControversies.map((controversy, index) => (
              <div key={`${controversy.topic}-${index}`} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-slate-200">
                <p className="font-semibold text-white">{controversy.topic}</p>
                {controversy.evidence?.slice(0, 2).map((evidence, idx) => (
                  <blockquote key={`${evidence.quote_or_paraphrase}-${idx}`} className="mt-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs italic text-slate-200">
                    {evidence.quote_or_paraphrase}
                  </blockquote>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {renderRiskList("Riesgos en medios", mediaRisksList, "risk")}
        {renderRiskList("Riesgos en redes sociales", socialRisks, "risk")}
        {renderRiskList("Oportunidades en prensa", pressOpportunities, "opportunity")}
        {renderRiskList("Oportunidades en audiencia", audienceOpportunities, "opportunity")}
      </section>

      {(payload.narrative_summary || payload.recommended_strategy) && (
        <section className="grid gap-4 md:grid-cols-2">
          {payload.narrative_summary && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Resumen narrativo</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{payload.narrative_summary}</p>
            </div>
          )}
          {payload.recommended_strategy && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Estrategia recomendada</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{payload.recommended_strategy}</p>
            </div>
          )}
        </section>
      )}

      {missingData.length > 0 && (
        <section className="rounded-3xl border border-amber-300/30 bg-amber-500/5 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Datos faltantes</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-100">
            {missingData.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
