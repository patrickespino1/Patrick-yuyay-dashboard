'use client';

import {
  extractPrimaryBiography,
  extractPrimarySubject,
  type AgentBriefing,
  type BriefingAudienceArchetype,
  type BriefingControversy,
  type BriefingNewsEntry,
  type BriefingProfilePosition,
  type BriefingRecurringTopic,
  type BriefingRiskOpportunity,
  type BriefingThemeEvidence,
} from '@/utils/parseBriefing';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type Props = {
  data: AgentBriefing | null;
};

type VirtualizedListProps<T> = {
  items: T[];
  estimate: number;
  itemRenderer: (item: T, index: number) => ReactNode;
  maxVisibleRows?: number;
  emptyFallback?: ReactNode | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
});

const sentimentStyles: Record<string, string> = {
  positivo: 'border-emerald-300/40 text-emerald-200',
  neutral: 'border-slate-400/40 text-slate-300',
  neutro: 'border-slate-400/40 text-slate-300',
  negativo: 'border-rose-300/40 text-rose-200',
};

const SectionCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 via-black/40 to-black/70 p-6 backdrop-blur-sm transition duration-300 hover:border-white/20 ${className}`}
  >
    {children}
  </div>
);

const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[var(--brand-cyan)]">{title}</p>
    {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
  </div>
);

const LazySection = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? (
        children
      ) : (
        <div className="rounded-[28px] border border-white/5 bg-black/40 p-6">
          <div
            className="h-4 w-32 animate-pulse rounded-full bg-white/5"
            style={{ animationDelay: '0.1s' }}
          />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-4 w-full animate-pulse rounded-full bg-white/5"
                style={{ animationDelay: `${index * 0.1}s` }}
              />
            ))}
          </div>
          <div className="mt-6 h-[1px] w-full bg-white/5" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-white/5" />
          <div className="mt-2 h-[200px]" />
        </div>
      )}
    </div>
  );
};

function VirtualizedItems<T>({
  items,
  estimate,
  itemRenderer,
  maxVisibleRows = 4,
  emptyFallback = null,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * estimate;
  const viewportHeight = maxVisibleRows * estimate;
  const overscan = 2;

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / estimate) - overscan);
  const endIndex = Math.min(items.length, startIndex + maxVisibleRows + overscan * 2);
  const offsetY = startIndex * estimate;

  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

  if (!items?.length) {
    return emptyFallback;
  }

  if (items.length <= maxVisibleRows) {
    return <div className="space-y-3">{items.map((item, index) => itemRenderer(item, index))}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto pr-1"
      style={{ maxHeight: viewportHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }} className="space-y-3">
          {visibleItems.map((item, index) => itemRenderer(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
}

function InlineList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function renderPositions(positions: BriefingProfilePosition[]) {
  if (!positions.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {positions.map((position, index) => (
        <div
          key={`${position.role}-${position.org}-${index}`}
          className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-black/30 p-3 text-sm text-slate-200 md:flex-row md:items-start md:gap-4"
        >
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {[position.from, position.to].filter(Boolean).join(' – ') || 'Sin fechas'}
          </span>
          <div>
            <p className="font-semibold text-white">{position.role ?? 'Rol no definido'}</p>
            <p className="text-xs text-slate-400">{position.org ?? 'Organización no especificada'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderRiskList(
  title: string,
  items: BriefingRiskOpportunity[] | undefined,
  tone: 'risk' | 'opportunity'
) {
  if (!items?.length) return null;
  const toneClasses =
    tone === 'risk'
      ? 'border-rose-400/20 bg-rose-500/5 text-rose-100'
      : 'border-emerald-400/20 bg-emerald-500/5 text-emerald-100';

  return (
    <SectionCard>
      <SectionHeading title={title} />
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className="rounded-2xl border border-white/5 bg-black/30 p-4 text-sm text-slate-200 transition hover:border-white/30"
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${toneClasses}`}>
              {item.title ?? 'Sin título'}
            </p>
            {item.rationale && <p className="mt-2 text-slate-300">{item.rationale}</p>}
            {item.evidence_ids?.length ? (
              <p className="mt-1 text-xs text-slate-500">
                Evidencia: {item.evidence_ids.slice(0, 4).join(', ')}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 's/f';
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

const EmptyState = () => (
  <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-white/5 bg-black/40 px-6 text-sm text-slate-400">
    Aún no hay informes. Envía una investigación para ver los hallazgos aquí.
  </div>
);

export const BriefingResults = memo(function BriefingResults({ data }: Props) {
  const basePayload = data?.payload ?? null;
  const memoPayload = useMemo(() => basePayload, [basePayload]);
  const memoMeta = data?.meta ?? null;

  const renderTopic = useCallback((topic: BriefingRecurringTopic, index: number) => {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4" key={`${topic.topic}-${index}`}>
        <p className="text-sm font-semibold text-white">{topic.topic}</p>
        {topic.evidence?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-400">
            {topic.evidence.slice(0, 3).map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }, []);

  const renderNews = useCallback((news: BriefingNewsEntry, index: number) => {
    const sentiment = news.sentiment?.toLowerCase() ?? 'neutral';
    return (
      <div
        key={`${news.headline}-${index}`}
        className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/40 p-4 text-sm text-slate-200 transition hover:border-white/25 md:flex-row md:items-start md:gap-6"
      >
        <div className="min-w-[120px] text-xs text-slate-500">
          {formatDate(news.date)} <br />
          <span className="uppercase tracking-[0.25em]">{news.source_name}</span>
        </div>
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-white">{news.headline}</p>
          {news.snippet && <p className="text-xs text-slate-300">{news.snippet}</p>}
          {news.source_url && (
            <a
              href={news.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-xs font-semibold text-[var(--brand-cyan)]"
            >
              Ver fuente →
            </a>
          )}
        </div>
        {news.sentiment && (
          <span
            className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] ${
              sentimentStyles[sentiment] ?? 'border-white/10 text-slate-300'
            }`}
          >
            {news.sentiment}
          </span>
        )}
      </div>
    );
  }, []);

  const renderTheme = useCallback((theme: BriefingThemeEvidence, index: number) => {
    return (
      <blockquote
        key={`${theme.quote_or_paraphrase}-${index}`}
        className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-xs italic text-slate-200"
      >
        {theme.quote_or_paraphrase}
      </blockquote>
    );
  }, []);

  const renderArchetype = useCallback((item: BriefingAudienceArchetype, index: number) => {
    return (
      <div
        key={`${item.label}-${index}`}
        className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-200"
      >
        <p className="text-base font-semibold text-white">{item.label}</p>
        {item.motivation && (
          <p className="mt-1 text-xs text-slate-400">Motivación: {item.motivation}</p>
        )}
        {item.typical_expression?.excerpt && (
          <blockquote className="mt-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs italic text-slate-200">
            “{item.typical_expression.excerpt}”
          </blockquote>
        )}
      </div>
    );
  }, []);

  const renderSocialControversy = useCallback(
    (item: BriefingControversy, index: number) => (
      <div
        key={`${item.topic}-${index}`}
        className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-200"
      >
        <p className="font-semibold text-white">{item.topic}</p>
        {item.context && <p className="mt-1 text-xs text-slate-400">{item.context}</p>}
        {item.keywords?.length ? (
          <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
            {item.keywords.map((keyword) => (
              <span key={`${keyword}-${index}`} className="rounded-full border border-white/10 px-2 py-0.5">
                {keyword}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    ),
    []
  );

  if (!memoPayload) {
    return <EmptyState />;
  }

  const payload = memoPayload;
  const subject = extractPrimarySubject(payload) ?? 'Sujeto no identificado';
  const biography = extractPrimaryBiography(payload) ?? 'Sin biografía disponible.';
  const currentRole =
    payload.profile?.summary?.current_position ?? payload.profile?.positions?.current;
  const previousPositions =
    payload.profile?.summary?.previous_positions ?? payload.profile?.positions?.previous ?? [];

  const politicalParty =
    payload.profile?.summary?.political_party ?? payload.profile?.metadata?.political_party;
  const country = payload.profile?.metadata?.country;
  const controversies = payload.profile?.controversies ?? [];
  const investigationDate = formatDateTime(memoMeta?.requestedAt);

  const recurringTopics = payload.media_influence?.recurring_topics ?? [];
  const mediaRisks = payload.media_influence?.reputational_risks_media ?? [];
  const sectorsPresence = payload.media_influence?.sectors_with_presence ?? [];
  const newsItems = payload.profile?.relevant_news ?? [];
  const keyEvents = payload.media_influence?.key_media_events ?? [];

  const socialNarrative = payload.social_opinion?.general_narrative;
  const keyThemes = payload.social_opinion?.key_themes ?? [];
  const emotions = payload.social_opinion?.predominant_emotions ?? [];
  const archetypes = payload.social_opinion?.audience_archetypes ?? [];
  const socialControversies = payload.social_opinion?.social_controversies ?? [];

  const mediaRisksList = payload.risks_opportunities?.media_risks ?? [];
  const socialRisks = payload.risks_opportunities?.social_risks ?? [];
  const pressOpportunities = payload.risks_opportunities?.press_opportunities ?? [];
  const audienceOpportunities = payload.risks_opportunities?.audience_opportunities ?? [];

  const missingData = payload.missing_data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <LazySection>
        <SectionCard className="shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Informe del sujeto</p>
              <h2 className="mt-1 text-3xl font-semibold text-white leading-tight">{subject}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                {politicalParty && (
                  <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.25em] text-white/80">
                    {politicalParty}
                  </span>
                )}
                {country && (
                  <span className="rounded-full border border-white/5 px-3 py-1 text-white/70">
                    {country}
                  </span>
                )}
                {investigationDate && (
                  <span className="text-slate-400">Informe generado: {investigationDate}</span>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </LazySection>

      <LazySection>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <SectionCard>
            <SectionHeading title="Perfil y biografía" />
            <p className="mt-4 text-base leading-relaxed text-slate-200">{biography}</p>
            {currentRole && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cargo actual</p>
                <p className="mt-1 font-semibold text-white">
                  {currentRole.role} · {currentRole.org}
                </p>
              </div>
            )}
            {renderPositions(previousPositions)}
          </SectionCard>

          {controversies.length > 0 && (
            <SectionCard>
              <SectionHeading title="Controversias recientes" />
              <VirtualizedItems
                items={controversies}
                estimate={120}
                maxVisibleRows={3}
                itemRenderer={(item, index) => (
                  <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-3">
                    <p className="text-sm font-semibold text-white">{item.topic}</p>
                    {item.context && <p className="text-xs text-slate-400">{item.context}</p>}
                    {item.keywords?.length ? (
                      <div className="flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                        {item.keywords.map((keyword) => (
                          <span key={`${keyword}-${index}`} className="rounded-full border border-white/10 px-2 py-0.5">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[var(--brand-cyan)]"
                      >
                        Ver fuente →
                      </a>
                    )}
                  </div>
                )}
              />
            </SectionCard>
          )}
        </div>
      </LazySection>

      <LazySection>
        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard>
            <SectionHeading title="Cobertura mediática" />
            {payload.media_influence?.media_positioning && (
              <p className="mt-4 text-sm leading-relaxed text-slate-200">
                {payload.media_influence.media_positioning}
              </p>
            )}
            {recurringTopics.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Temas recurrentes</p>
                <VirtualizedItems
                  items={recurringTopics}
                  estimate={110}
                  itemRenderer={renderTopic}
                  maxVisibleRows={3}
                />
              </div>
            )}
            {sectorsPresence.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sectores con presencia</p>
                <InlineList items={sectorsPresence} />
              </div>
            )}
          </SectionCard>

          {mediaRisks.length > 0 && (
            <SectionCard>
              <SectionHeading title="Riesgos reputacionales" />
              <div className="mt-4 space-y-3">
                {mediaRisks.map((risk, index) => (
                  <div
                    key={`${risk.risk}-${index}`}
                    className="rounded-2xl border border-rose-300/30 bg-rose-500/5 p-4 text-sm text-rose-100"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-rose-200">{risk.risk}</p>
                    {risk.rationale && <p className="mt-2 text-rose-100/80">{risk.rationale}</p>}
                    {risk.evidence?.length && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-rose-100/70">
                        {risk.evidence.slice(0, 3).map((item, idx) => (
                          <li key={`${item}-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </LazySection>

      {newsItems.length > 0 && (
        <LazySection>
          <SectionCard>
            <SectionHeading title="Noticias relevantes" subtitle="Recorrido virtualizado para garantizar desplazamiento fluido" />
            <div className="mt-4">
              <VirtualizedItems
                items={newsItems}
                estimate={150}
                maxVisibleRows={4}
                itemRenderer={renderNews}
              />
            </div>
          </SectionCard>
        </LazySection>
      )}

      {keyEvents.length > 0 && (
        <LazySection>
          <SectionCard>
            <SectionHeading title="Eventos mediáticos clave" />
            <div className="mt-4 space-y-3">
              {keyEvents.slice(0, 8).map((event, index) => (
                <div
                  key={`${event.title}-${index}`}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-slate-200"
                >
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-cyan)]/30 text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">{formatDate(event.date)} • {event.outlet ?? 'Medio no identificado'}</p>
                    <p className="font-semibold text-white">{event.title}</p>
                    {event.impact && <p className="text-xs text-slate-400">{event.impact}</p>}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </LazySection>
      )}

      <LazySection>
        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard>
            <SectionHeading title="Narrativa social general" />
            {socialNarrative ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-200">{socialNarrative}</p>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Sin narrativa disponible.</p>
            )}
            {emotions.length > 0 && (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Emociones predominantes</p>
                <InlineList items={emotions} />
              </div>
            )}
          </SectionCard>

          {keyThemes.length > 0 && (
            <SectionCard>
              <SectionHeading title="Temas clave en redes" />
              <VirtualizedItems
                items={keyThemes}
                estimate={170}
                maxVisibleRows={3}
                itemRenderer={(theme, index) => (
                  <div
                    key={`${theme.theme}-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-200"
                  >
                    <p className="text-base font-semibold text-white">{theme.theme}</p>
                    {theme.subthemes?.length && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {theme.subthemes.map((subtheme) => (
                          <span
                            key={`${subtheme}-${index}`}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200"
                          >
                            {subtheme}
                          </span>
                        ))}
                      </div>
                    )}
                    {theme.why_it_matters && (
                      <p className="mt-2 text-xs text-slate-400">{theme.why_it_matters}</p>
                    )}
                    {theme.evidence?.length && (
                      <div className="mt-2 space-y-2">
                        {theme.evidence.slice(0, 2).map(renderTheme)}
                      </div>
                    )}
                  </div>
                )}
              />
            </SectionCard>
          )}
        </div>
      </LazySection>

      {(archetypes.length > 0 || socialControversies.length > 0) && (
        <LazySection>
          <div className="grid gap-5 lg:grid-cols-2">
            {archetypes.length > 0 && (
              <SectionCard>
                <SectionHeading title="Arquetipos de audiencia" />
                <VirtualizedItems
                  items={archetypes}
                  estimate={150}
                  itemRenderer={renderArchetype}
                  maxVisibleRows={3}
                />
              </SectionCard>
            )}

            {socialControversies.length > 0 && (
              <SectionCard>
                <SectionHeading title="Controversias sociales" />
                <VirtualizedItems
                  items={socialControversies}
                  estimate={150}
                  itemRenderer={renderSocialControversy}
                  maxVisibleRows={3}
                />
              </SectionCard>
            )}
          </div>
        </LazySection>
      )}

      <LazySection>
        <div className="grid gap-5 lg:grid-cols-2">
          {renderRiskList('Riesgos en medios', mediaRisksList, 'risk')}
          {renderRiskList('Riesgos en redes sociales', socialRisks, 'risk')}
          {renderRiskList('Oportunidades en prensa', pressOpportunities, 'opportunity')}
          {renderRiskList('Oportunidades en audiencia', audienceOpportunities, 'opportunity')}
        </div>
      </LazySection>

      {(payload.narrative_summary || payload.recommended_strategy) && (
        <LazySection>
          <div className="grid gap-5 md:grid-cols-2">
            {payload.narrative_summary && (
              <SectionCard>
                <SectionHeading title="Narrativa sintetizada" />
                <p className="mt-4 text-sm leading-relaxed text-slate-200">
                  {payload.narrative_summary}
                </p>
              </SectionCard>
            )}
            {payload.recommended_strategy && (
              <SectionCard>
                <SectionHeading title="Estrategia recomendada" />
                <p className="mt-4 text-sm leading-relaxed text-slate-200">
                  {payload.recommended_strategy}
                </p>
              </SectionCard>
            )}
          </div>
        </LazySection>
      )}

      {missingData.length > 0 && (
        <LazySection>
          <SectionCard className="border-amber-400/20 bg-amber-500/5">
            <SectionHeading title="Datos faltantes / limitaciones" />
            <ul className="mt-4 list-disc space-y-2 pl-4 text-sm text-amber-100">
              {missingData.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </SectionCard>
        </LazySection>
      )}
    </div>
  );
});
