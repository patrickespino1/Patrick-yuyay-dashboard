'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { InvestigationLoading } from "@/components/InvestigationLoading";
import { BriefingResults } from "@/components/BriefingResults";
import {
  normalizeWebhookPayload,
  type BriefingPayload,
  type AgentBriefing,
  extractPrimarySubject,
} from "@/utils/parseBriefing";

const baseFieldConfig = [
  {
    key: "Nombre de la persona",
    placeholder: "Nombre completo del objetivo",
    required: true,
  },
  {
    key: "Idioma de Investigación",
    placeholder: "Español, Inglés…",
    required: true,
  },
  {
    key: "País de origen de la persona a investigar",
    placeholder: "República Dominicana",
    required: true,
  },
  {
    key: "Ocupación",
    placeholder: "Senador, Ministro, Empresario",
    required: true,
  },
] as const;

const socialFieldConfig = [
  {
    label: "Instagram",
    urlKey: "instagram",
    userKey: "instagramUser",
    placeholder: "https://instagram.com/...",
    helperPrefix: "@",
  },
  {
    label: "Facebook",
    urlKey: "facebook",
    userKey: "facebookUser",
    placeholder: "https://facebook.com/...",
    helperPrefix: "",
  },
  {
    label: "X / Twitter",
    urlKey: "x",
    userKey: "xUser",
    placeholder: "https://x.com/...",
    helperPrefix: "@",
  },
  {
    label: "YouTube",
    urlKey: "youtube",
    userKey: "youtubeUser",
    placeholder: "https://youtube.com/@...",
    helperPrefix: "@",
  },
  {
    label: "TikTok",
    urlKey: "tiktok",
    userKey: "tiktokUser",
    placeholder: "https://tiktok.com/@...",
    helperPrefix: "@",
  },
] as const;

type BaseFieldKey = (typeof baseFieldConfig)[number]["key"];
type SocialFieldSpec = (typeof socialFieldConfig)[number];
type SocialUrlKey = SocialFieldSpec["urlKey"];
type SocialUserKey = SocialFieldSpec["userKey"];
type FieldKey = BaseFieldKey | SocialUrlKey | SocialUserKey;
type InvestigationForm = Record<FieldKey, string>;

type FormStatus = "idle" | "sending" | "success" | "error";
type StreamState = "connecting" | "open" | "closed";

type ResultEntry = {
  id: string;
  receivedAt: string;
  payload: unknown;
  sourceIp?: string | null;
};

interface InvestigationHistoryItem {
  id: string;
  subject: string;
  createdAt: string;
  source?: string;
  summaryPreview: string;
  fullReport: AgentBriefing;
}

const initialFormKeys = [
  ...baseFieldConfig.map((field) => field.key),
  ...socialFieldConfig.flatMap((field) => [field.urlKey, field.userKey]),
] as FieldKey[];

const initialForm = initialFormKeys.reduce<InvestigationForm>((acc, key) => {
  acc[key] = "";
  return acc;
}, {} as InvestigationForm);

const defaultEntryWebhook =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ??
  "https://dria02.app.n8n.cloud/webhook/c2ad2cd4-a402-47af-a955-d5ca8551381f";

const defaultCallbackUrl =
  process.env.NEXT_PUBLIC_RESULTS_CALLBACK_URL ??
  "https://yuyay-investigacion-politica.vercel.app/api/results";

const statusStyles: Record<FormStatus, { label: string; chip: string }> = {
  idle: {
    label: "Listo para investigar",
    chip: "text-slate-200 border-white/10",
  },
  sending: {
    label: "Transfiriendo datos…",
    chip: "text-amber-200 border-amber-300/40",
  },
  success: {
    label: "Webhook confirmado",
    chip: "text-emerald-300 border-emerald-400/40",
  },
  error: {
    label: "Intento fallido",
    chip: "text-rose-200 border-rose-400/40",
  },
};

type ConnectionStatus = "online" | "offline";

const connectionBadge: Record<ConnectionStatus | StreamState, string> = {
  online: "text-emerald-50 border-emerald-100/30",
  offline: "text-rose-50 border-rose-100/30",
  connecting: "text-amber-50 border-amber-100/30",
  open: "text-emerald-50 border-emerald-100/30",
  closed: "text-rose-50 border-rose-100/30",
};

const HISTORY_STORAGE_KEY = "yuyay.history";
const CALLBACK_STORAGE_KEY = "yuyay.callbackUrl";
const MAX_HISTORY_ITEMS = 20;
const SUMMARY_PREVIEW_LENGTH = 180;

function sanitizeHandle(handle: string) {
  return handle.trim().replace(/^@/, "").replace(/\/+$/, "");
}

function normalizeUrl(value: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(prefixed);
  } catch {
    return null;
  }
}

function extractSocialHandle(urlValue: string, platform: SocialFieldSpec["urlKey"]) {
  if (!urlValue) return "";
  if (urlValue.startsWith("@")) {
    return sanitizeHandle(urlValue);
  }

  const parsed = normalizeUrl(urlValue);
  if (!parsed) return "";

  const pathname = parsed.pathname.replace(/\/+/g, "/").replace(/^\/+/, "");
  if (!pathname) return "";
  const [firstSegment, secondSegment] = pathname.split("/");

  switch (platform) {
    case "instagram":
    case "facebook":
    case "x": {
      return sanitizeHandle(firstSegment);
    }
    case "tiktok": {
      if (firstSegment?.startsWith("@")) {
        return sanitizeHandle(firstSegment);
      }
      return sanitizeHandle(firstSegment);
    }
    case "youtube": {
      if (firstSegment?.startsWith("@")) {
        return sanitizeHandle(firstSegment);
      }
      if (["c", "channel", "user"].includes(firstSegment) && secondSegment) {
        return sanitizeHandle(secondSegment);
      }
      return sanitizeHandle(firstSegment);
    }
    default:
      return sanitizeHandle(firstSegment);
  }
}

function buildSummaryPreview(report: BriefingPayload) {
  const source =
    report.narrative_summary ??
    report.profile?.summary?.biography ??
    report.recommended_strategy ??
    "Sin resumen disponible";
  if (source.length <= SUMMARY_PREVIEW_LENGTH) return source;
  return `${source.slice(0, SUMMARY_PREVIEW_LENGTH).trim()}…`;
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

const visibleFieldKeys = [
  ...baseFieldConfig.map((field) => field.key),
  ...socialFieldConfig.map((field) => field.urlKey),
] as const;

export default function Home() {
  const [formData, setFormData] = useState<InvestigationForm>(initialForm);
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [, setStatusMessage] = useState("Listo para investigar");
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [entryWebhook, setEntryWebhook] = useState(defaultEntryWebhook);
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState(defaultEntryWebhook);
  const [callbackUrl, setCallbackUrl] = useState(defaultCallbackUrl);
  const [isEditingCallback, setIsEditingCallback] = useState(false);
  const [callbackDraft, setCallbackDraft] = useState(defaultCallbackUrl);
  const [viewMode, setViewMode] = useState<"form" | "results">("form");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminPinError, setAdminPinError] = useState("");
  const [history, setHistory] = useState<InvestigationHistoryItem[]>([]);
  const [briefing, setBriefing] = useState<AgentBriefing | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const runTimestampRef = useRef<number | null>(null);
  const isFormMode = viewMode === "form";

  const persistHistory = useCallback((items: InvestigationHistoryItem[]) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    }
  }, []);

  const addHistoryEntry = useCallback((item: InvestigationHistoryItem) => {
    setHistory((prev) => {
      if (prev.some((entry) => entry.id === item.id)) {
        return prev;
      }
      const next = [item, ...prev].slice(0, MAX_HISTORY_ITEMS);
      persistHistory(next);
      return next;
    });
  }, [persistHistory]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const inferredCallback = `${window.location.origin}/api/results`;
      setCallbackUrl((prev) => (prev === defaultCallbackUrl ? inferredCallback : prev));
      setCallbackDraft((prev) => (prev === defaultCallbackUrl ? inferredCallback : prev));

      const storedWebhook = window.localStorage.getItem("yuyay.entryWebhook");
      if (storedWebhook) {
        setEntryWebhook(storedWebhook);
        setWebhookDraft(storedWebhook);
      }

      const storedCallback = window.localStorage.getItem(CALLBACK_STORAGE_KEY);
      if (storedCallback) {
        setCallbackUrl(storedCallback);
        setCallbackDraft(storedCallback);
      }

      const adminStored = window.localStorage.getItem("yuyay.adminMode");
      if (adminStored === "true") {
        setIsAdminMode(true);
      }
      const storedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory) as InvestigationHistoryItem[];
          const upgraded: InvestigationHistoryItem[] = parsed
            .filter(Boolean)
            .map((item) => {
              const reportCandidate = (item.fullReport as AgentBriefing)?.payload
                ? (item.fullReport as AgentBriefing)
                : ({ payload: item.fullReport as unknown as BriefingPayload } as AgentBriefing);
              return {
                ...item,
                fullReport: reportCandidate,
              };
            });
          setHistory(upgraded);
          if (upgraded.length > 0 && upgraded[0].fullReport) {
            setBriefing(upgraded[0].fullReport);
          }
        } catch {
          // ignore corrupted localStorage
        }
      }
    }
  }, []);

  useEffect(() => {
    if (formStatus === "success" || formStatus === "error") {
      const timeout = setTimeout(() => {
        setFormStatus("idle");
        setStatusMessage("Listo para investigar");
      }, 3500);
      return () => clearTimeout(timeout);
    }
  }, [formStatus]);

  useEffect(() => {
    const eventSource = new EventSource("/api/results/stream");

    eventSource.onopen = () => setStreamState("open");
    eventSource.onerror = () => setStreamState("closed");

    eventSource.addEventListener("heartbeat", () => {
      setStreamState("open");
    });

    eventSource.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as ResultEntry | unknown;
        const normalizedReport = normalizeWebhookPayload(
          Array.isArray(raw) ? raw : (raw as ResultEntry)?.payload ?? raw
        );

        if (!normalizedReport) return;

        const entryMeta =
          raw && typeof raw === "object" && !Array.isArray(raw) && "id" in (raw as ResultEntry)
            ? (raw as ResultEntry)
            : undefined;

        const historyId =
          (entryMeta?.id ??
            normalizedReport.meta?.requestedAt ??
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}`);

        const createdAt =
          normalizedReport.meta?.requestedAt ??
          entryMeta?.receivedAt ??
          new Date().toISOString();

        const subject =
          extractPrimarySubject(normalizedReport.payload) ?? "Sujeto sin identificar";

        const metadataSource =
          normalizedReport.meta?.sourceWebhookUrl ??
          normalizedReport.payload.profile?.metadata?.data_source ??
          normalizedReport.payload.profile?.metadata?.country;

        const historyItem: InvestigationHistoryItem = {
          id: historyId,
          subject,
          createdAt,
          source: metadataSource,
          summaryPreview: buildSummaryPreview(normalizedReport.payload),
          fullReport: normalizedReport,
        };

        addHistoryEntry(historyItem);
        setBriefing(normalizedReport);
        setIsLoadingResult(false);
        setViewMode("results");

        if (runTimestampRef.current && createdAt) {
          const receivedAt = new Date(createdAt).getTime();
          if (receivedAt >= runTimestampRef.current) {
            setIsLoadingResult(false);
          }
        }
      } catch (error) {
        console.warn("No se pudo parsear el mensaje SSE", error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [addHistoryEntry]);

  const completion = useMemo(() => {
    const filled = visibleFieldKeys.filter(
      (key) => formData[key]?.trim().length > 0
    ).length;
    return Math.round((filled / visibleFieldKeys.length) * 100);
  }, [formData]);

  const handleChange = (key: FieldKey, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSocialUrlChange = (key: SocialUrlKey, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSocialBlur = (config: SocialFieldSpec) => {
    setFormData((prev) => {
      const next = { ...prev };
      next[config.userKey] = extractSocialHandle(next[config.urlKey], config.urlKey);
      return next;
    });
  };

  const copyToClipboard = async (value: string, label: string) => {
    if (!navigator?.clipboard || !value) return;
    await navigator.clipboard.writeText(value);
    setCopiedTarget(label);
    setTimeout(() => setCopiedTarget(null), 1800);
  };

  const connectionStatus: ConnectionStatus =
    streamState === "open" ? "online" : "offline";
  const displayedEntryWebhook = briefing?.meta?.sourceWebhookUrl ?? entryWebhook;
  const displayedCallbackUrl = briefing?.callbackUrl ?? callbackUrl;

  const openAdminModal = () => {
    setAdminPin("");
    setAdminPinError("");
    setShowAdminModal(true);
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminPin("");
    setAdminPinError("");
  };

  const handleAdminAccess = () => {
    if (adminPin === "3333") {
      setIsAdminMode(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("yuyay.adminMode", "true");
      }
      closeAdminModal();
    } else {
      setAdminPinError("PIN incorrecto");
    }
  };

  const handleAdminDisable = () => {
    setIsAdminMode(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("yuyay.adminMode");
    }
    closeAdminModal();
  };

  const handleHistorySelect = (item: InvestigationHistoryItem) => {
    setBriefing(item.fullReport);
    setIsLoadingResult(false);
    setViewMode("results");
  };

  const startWebhookEdit = () => {
    setWebhookDraft(entryWebhook);
    setIsEditingWebhook(true);
  };

  const cancelWebhookEdit = () => {
    setWebhookDraft(entryWebhook);
    setIsEditingWebhook(false);
  };

  const saveWebhookEdit = () => {
    const sanitized = webhookDraft.trim();
    if (!sanitized) return;
    setEntryWebhook(sanitized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("yuyay.entryWebhook", sanitized);
    }
    setIsEditingWebhook(false);
  };

  const startCallbackEdit = () => {
    setCallbackDraft(callbackUrl);
    setIsEditingCallback(true);
  };

  const cancelCallbackEdit = () => {
    setCallbackDraft(callbackUrl);
    setIsEditingCallback(false);
  };

  const saveCallbackEdit = () => {
    const sanitized = callbackDraft.trim();
    if (!sanitized) return;
    setCallbackUrl(sanitized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CALLBACK_STORAGE_KEY, sanitized);
    }
    setIsEditingCallback(false);
  };

  const handleStartNewInvestigation = () => {
    setFormData(initialForm);
    setViewMode("form");
    setFormStatus("idle");
    setStatusMessage("Listo para investigar");
    setIsLoadingResult(false);
    setBriefing(null);
    runTimestampRef.current = null;
  };

  const dispatchForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const preparedForm = applySocialExtraction(formData);
    setFormData(preparedForm);
    setViewMode("results");
    setIsLoadingResult(true);
    setBriefing(null);
    runTimestampRef.current = Date.now();

    setFormStatus("sending");
    setStatusMessage("Enviando datos al webhook de entrada…");

    try {
      const response = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: preparedForm, entryWebhook, callbackUrl }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Webhook remoto respondió con error");
      }

      setFormStatus("success");
      setStatusMessage("Webhook aceptó la solicitud");
    } catch (error) {
      setFormStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Error inesperado"
      );
      setIsLoadingResult(false);
    }
  };

  const ResultsPanel = ({ fullWidth = false }: { fullWidth?: boolean }) => {
    const containerClass = [
      "glass-panel rounded-3xl border border-white/10 p-6 sm:p-7",
      fullWidth ? "w-full lg:mt-2" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const showLoader = viewMode === "results" && isLoadingResult;

    return (
      <section className={containerClass}>
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-cyan)]">
            Investigación del sujeto
          </p>
          <h3 className="text-2xl font-semibold text-white leading-tight">
            Resultados de la investigación
          </h3>
          <p className="text-sm text-slate-400">
            Visualiza el informe completo generado por el agente.
          </p>
        </div>
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          {showLoader ? (
            <InvestigationLoading />
          ) : (
            <BriefingResults data={briefing} />
          )}
        </div>
        {fullWidth && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleStartNewInvestigation}
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/5"
            >
              Nueva investigación
            </button>
          </div>
        )}
      </section>
    );
  };

  return (
    <>
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(45,224,203,0.22),_transparent_45%)]">
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute -top-32 left-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(45,224,203,0.35),_transparent_60%)] blur-2xl" />
        <div className="absolute top-32 right-8 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(91,124,239,0.38),_transparent_55%)] blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 lg:px-12">
        <header className="glass-panel w-full rounded-3xl border border-white/10 px-6 py-8 shadow-[0_20px_60px_rgba(5,13,30,0.45)] sm:px-8 lg:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
            <div className="flex flex-1 flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:gap-5 lg:text-left">
              <img
                src="/logo-yuyay.png"
                alt="Yuyay Logo"
                className="h-14 w-auto object-contain transition-opacity duration-300"
              />
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.4em] text-[var(--brand-cyan)] sm:text-[0.7rem]">
                  Yuyay // Inteligencia aplicada
                </p>
                <p className="text-2xl font-semibold bg-gradient-to-r from-[var(--brand-cyan)] via-white/95 to-[var(--brand-indigo)] bg-clip-text text-transparent sm:text-3xl lg:text-[2.35rem]">
                  Briefing de investigación política
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/5 to-white/0 px-6 py-4 text-center text-sm text-white/90 shadow-[0_10px_35px_rgba(5,13,30,0.35)] sm:flex-row sm:items-center sm:justify-between sm:text-left sm:gap-4 lg:w-auto lg:min-w-[320px]">
              <div className="flex flex-col">
                <p className="text-[0.55rem] uppercase tracking-[0.55em] text-slate-400">
                  Panel interno
                </p>
                <p className="text-base font-semibold text-white/90">
                  {connectionStatus === "online"
                    ? "Listo para investigar"
                    : "Conéctalo para investigar"}
                </p>
              </div>
              <span
                className={`inline-flex items-center justify-center rounded-full border bg-white/5 px-2.5 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.35em] sm:mt-[1px] ${connectionBadge[connectionStatus]}`}
              >
                {connectionStatus === "online" ? "ONLINE" : "OFFLINE"}
              </span>
              <button
                type="button"
                onClick={openAdminModal}
                aria-label="Abrir configuración"
                className="rounded-full p-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5 text-slate-400 transition hover:text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.89-1.543.877-3.31 2.42-2.42.943.544 2.14.136 2.573-1.065z"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div className="flex w-full flex-col gap-10 lg:px-4">
          {isFormMode ? (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
              <section className="glass-panel rounded-3xl border border-white/8 p-6 sm:p-8 lg:mt-2">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-cyan)]">
                  Ficha del sujeto
                </p>
                <h2 className="text-3xl font-semibold text-white leading-tight">
                  Datos para disparar la investigación
                </h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-xs text-slate-400">Progreso</p>
                <p className="text-2xl font-semibold text-[var(--brand-cyan)]">
                  {completion}%
                </p>
              </div>
            </div>

            <div className="mt-6 h-2 rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-indigo)] transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>

            <form
              className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2"
              onSubmit={dispatchForm}
            >
              {baseFieldConfig.map((field) => (
                <label
                  key={field.key}
                  className="flex flex-col gap-2 text-sm text-slate-200"
                >
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    {field.key}
                  </span>
                  <input
                    type="text"
                    required={field.required}
                    value={formData[field.key]}
                    onChange={(event) =>
                      handleChange(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-400 transition focus:border-[var(--brand-cyan)] focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--brand-cyan)]/30"
                  />
                </label>
              ))}

              {socialFieldConfig.map((social) => (
                <label
                  key={social.urlKey}
                  className="flex flex-col gap-2 text-sm text-slate-200"
                >
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    {social.label}
                  </span>
                  <input
                    type="url"
                    value={formData[social.urlKey]}
                    onChange={(event) =>
                      handleSocialUrlChange(social.urlKey, event.target.value)
                    }
                    onBlur={() => handleSocialBlur(social)}
                    placeholder={social.placeholder}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-400 transition focus:border-[var(--brand-cyan)] focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--brand-cyan)]/30"
                  />
                  {formData[social.userKey] && (
                    <p className="text-xs text-slate-400">
                      Usuario detectado:{" "}
                      <span className="font-mono text-white/80">
                        {social.helperPrefix}
                        {formData[social.userKey]}
                      </span>
                    </p>
                  )}
                </label>
              ))}

              <div className="md:col-span-2 mt-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`badge-pill border ${statusStyles[formStatus].chip}`}
                  >
                    {statusStyles[formStatus].label}
                  </span>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-indigo)] px-6 py-3 text-base font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={formStatus === "sending"}
                >
                  {formStatus === "sending"
                    ? "Enviando solicitud…"
                    : "Iniciar"}
                </button>
              </div>
            </form>
            </section>
              <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-cyan)]">
                      Historial
                    </p>
                    <h3 className="text-2xl font-semibold text-white">
                      Investigaciones
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    {history.length} evento(s)
                  </p>
                </div>
                {history.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
                    Aún no hay investigaciones guardadas. Ejecuta una
                    investigación para ver el historial aquí.
                  </div>
                ) : (
                  <div className="mt-6 flex max-h-[26rem] flex-col divide-y divide-white/10 overflow-auto pr-1">
                    {history.map((item) => (
                      <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-base font-semibold text-white">
                              {item.subject}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span>
                                {dateFormatter.format(new Date(item.createdAt))}
                              </span>
                              {item.source && (
                                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.3em] text-white/70">
                                  {item.source}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleHistorySelect(item)}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-cyan)] transition hover:text-white"
                          >
                            Ver informe <span aria-hidden>→</span>
                          </button>
                        </div>
                        <p
                          className="mt-2 text-sm text-slate-300"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.summaryPreview}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <ResultsPanel fullWidth />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {isAdminMode && (
              <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-7">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-white">
                    Webhooks conectados
                  </p>
                  <span
                    className={`badge-pill border bg-transparent ${connectionBadge[streamState]}`}
                  >
                    {streamState === "open" ? "ON" : "OFF"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Confirma que tu flujo apunta a estos endpoints.
                </p>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">
                      Entrada
                    </div>
                    {!isEditingWebhook && (
                      <button
                        type="button"
                        onClick={startWebhookEdit}
                        className="text-xs font-semibold text-[var(--brand-cyan)] hover:text-white transition"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  {isEditingWebhook ? (
                    <>
                      <input
                        type="url"
                        value={webhookDraft}
                        onChange={(event) => setWebhookDraft(event.target.value)}
                        className="mt-3 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-[var(--brand-cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-cyan)]/40"
                        placeholder="https://tu-webhook..."
                      />
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={saveWebhookEdit}
                          disabled={!webhookDraft.trim()}
                          className="rounded-2xl bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-indigo)] px-4 py-2 text-xs font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelWebhookEdit}
                          className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/5"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 break-all font-mono text-xs text-white/80">
                        {displayedEntryWebhook}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(displayedEntryWebhook, "entrada")}
                          className="text-xs font-semibold text-[var(--brand-cyan)]"
                        >
                          {copiedTarget === "entrada" ? "Copiado" : "Copiar URL"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">
                      Salida (callback de esta UI)
                    </div>
                    {!isEditingCallback && (
                      <button
                        type="button"
                        onClick={startCallbackEdit}
                        className="text-xs font-semibold text-[var(--brand-cyan)] hover:text-white transition"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  {isEditingCallback ? (
                    <>
                      <input
                        type="url"
                        value={callbackDraft}
                        onChange={(event) => setCallbackDraft(event.target.value)}
                        className="mt-3 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-[var(--brand-cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-cyan)]/40"
                        placeholder="https://tu-callback..."
                      />
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={saveCallbackEdit}
                          disabled={!callbackDraft.trim()}
                          className="rounded-2xl bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-indigo)] px-4 py-2 text-xs font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelCallbackEdit}
                          className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/5"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 break-all font-mono text-xs text-white/80">
                        {displayedCallbackUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(displayedCallbackUrl, "salida")}
                        className="mt-3 text-xs font-semibold text-[var(--brand-cyan)]"
                      >
                        {copiedTarget === "salida" ? "Copiado" : "Copiar URL"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#050505] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--brand-cyan)]">
              Modo administrador
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Introduce el PIN</h3>
            <p className="mt-1 text-sm text-slate-400">
              Solo los administradores pueden configurar los webhooks.
            </p>
            <input
              type="password"
              value={adminPin}
              onChange={(event) => {
                setAdminPin(event.target.value);
                if (adminPinError) setAdminPinError("");
              }}
              className="mt-4 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-[var(--brand-cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-cyan)]/30"
              placeholder="••••"
              autoFocus
            />
            {adminPinError && (
              <p className="mt-2 text-sm text-rose-300">{adminPinError}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {isAdminMode && (
                <button
                  type="button"
                  onClick={handleAdminDisable}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/5"
                >
                  Desactivar
                </button>
              )}
              <button
                type="button"
                onClick={closeAdminModal}
                className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdminAccess}
                className="rounded-2xl bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-indigo)] px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Acceder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
  const applySocialExtraction = (current: InvestigationForm) => {
    const next = { ...current };
    socialFieldConfig.forEach((social) => {
      const handle = extractSocialHandle(next[social.urlKey], social.urlKey);
      next[social.userKey] = handle;
    });
    return next;
  };
