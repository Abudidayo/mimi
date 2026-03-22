"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import Script from "next/script";
import {
  ArrowsLeftRight,
  Browser,
  LockKey,
  MicrophoneStage,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      render: (id: string, chart: string) => Promise<{ svg: string }>;
    };
  }
}

const slideVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut" as const,
    },
  },
};

function Slide({
  index,
  title,
  subtitle,
  children,
}: {
  index: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={slideVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="border border-white/10 bg-[#141414] px-6 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.45)] md:px-8 md:py-8"
    >
      <div className="flex items-start justify-between gap-6 border-b border-white/8 pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/45">
            {index}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/64 md:text-lg">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center border border-white/12 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white/68">
      {children}
    </span>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/55" />
      <p className="text-lg leading-8 text-white/82">{children}</p>
    </div>
  );
}

function StatCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/42">{title}</p>
      <p className="mt-3 text-base leading-7 text-white/80">{body}</p>
    </div>
  );
}

function QuoteCard() {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-6">
      <p className="text-2xl font-medium leading-tight text-white md:text-3xl">
        “Good design starts with the customer experience and works back toward the technology.”
      </p>
      <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/45">Steve Jobs</p>
    </div>
  );
}

function MermaidRenderer({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let active = true;
    let attempts = 0;

    async function renderChart() {
      const mermaid = window.mermaid;
      if (!mermaid) {
        if (attempts < 20) {
          attempts += 1;
          window.setTimeout(() => {
            void renderChart();
          }, 150);
        }
        return;
      }

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "base",
        themeVariables: {
          background: "#141414",
          primaryColor: "#262626",
          primaryTextColor: "#f8fafc",
          primaryBorderColor: "#525252",
          secondaryColor: "#171717",
          tertiaryColor: "#404040",
          lineColor: "#a3a3a3",
          clusterBkg: "#171717",
          clusterBorder: "#525252",
          fontFamily: "Geist, ui-sans-serif, system-ui",
          fontSize: "16px",
        },
        flowchart: {
          curve: "basis",
          htmlLabels: true,
          nodeSpacing: 40,
          rankSpacing: 65,
          padding: 16,
        },
      });

      const { svg } = await mermaid.render(`mimi-mermaid-${id}`, chart);
      if (active) setSvg(svg);
    }

    void renderChart();

    return () => {
      active = false;
    };
  }, [chart, id]);

  return (
    <div className="border border-white/10 bg-[#161616] p-4">
      {svg ? (
        <div
          className="[&_.edgeLabel]:!bg-transparent [&_.label]:!text-white [&_.node_label]:!text-white [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex min-h-[360px] items-center justify-center text-white/45">
          Rendering Mermaid diagram...
        </div>
      )}
    </div>
  );
}

function TechnicalGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatCard
        title="Agent Orchestration"
        body="Mastra supervisor routing, specialist agents, itinerary gating on transport + stay, and browser-backed booking execution with a visible run timeline."
      />
      <StatCard
        title="Generative UI"
        body="Inline controls and structured cards replace repeated text clarification. This lowers token usage, compresses approval loops, and makes agent interaction much more usable."
      />
      <StatCard
        title="Generative UI"
        body="Inline controls and structured cards replace repeated text clarification. This lowers token usage, compresses approval loops, and makes agent interaction much more usable."
      />
      <StatCard
        title="Browser Execution"
        body="Stagehand powers live browser-use so Mimi can attempt reservation workflows, surface each step, and stop safely before checkout."
      />
      <StatCard
        title="Guardrails"
        body="Topic guardrails, specialist boundaries, hidden action prompts, sanitized persistence, and stop-at-checkout browser limits keep execution useful without feeling reckless."
      />
      <StatCard
        title="Multilingual + Voice"
        body="Mimi is designed for multilingual interaction and voice-first usage, so the same orchestration model can work across typed chat, realtime voice, and messaging surfaces."
      />
    </div>
  );
}

export default function PresentationPage() {
  const chart = `flowchart LR
  U["User"] --> S["Supervisor Agent"]
  S --> UI["Generative UI"]
  S --> T["Transport Agent"]
  S --> L["Lodging Agent"]
  S --> X["Weather / Safety / Events / Packing"]
  T --> P["Planner Agent"]
  L --> P
  X --> P
  P --> D["Trip Planner Drawer"]
  D --> B["Booking Agent"]
  B --> R["Browser Execution"]`;

  return (
    <main
      className="min-h-screen text-white"
      style={{
        fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif",
        backgroundColor: "#0d0d0d",
        backgroundImage: [
          "radial-gradient(ellipse 125% 90% at 50% 100%, rgba(36, 58, 108, 0.48) 0%, rgba(22, 38, 78, 0.22) 42%, transparent 66%)",
          "radial-gradient(ellipse 95% 68% at 18% 100%, rgba(45, 72, 130, 0.18) 0%, transparent 50%)",
          "radial-gradient(ellipse 95% 68% at 82% 100%, rgba(45, 72, 130, 0.18) 0%, transparent 50%)",
        ].join(", "),
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        backgroundAttachment: "fixed",
      }}
    >
      <Script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js" strategy="afterInteractive" />

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="border border-white/10 bg-[#121212] px-6 py-8 md:px-8 md:py-10"
        >
          <div className="flex flex-wrap gap-2">
            <Tag>AI Agents</Tag>
            <Tag>Generative UI</Tag>
            <Tag>Browser Execution</Tag>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-white/42">Mimi</p>
              <h1 className="mt-3 text-5xl font-semibold tracking-tight text-white md:text-7xl">
                Agentic Travel Planning
              </h1>
              <p className="mt-4 max-w-3xl text-xl leading-9 text-white/66 md:text-2xl">
                Low-friction human approval through multi-agent orchestration, generative UI, and browser execution.
              </p>
              <div className="mt-8 inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/82">
                <ArrowsLeftRight weight="bold" className="h-4 w-4 text-white/72" />
                We don&apos;t remove the human. We remove the work.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Product thesis</p>
                <p className="mt-3 text-lg leading-8 text-white/82">
                  Consumer autonomy should be collaborative, not authoritarian.
                </p>
              </div>
              <div className="border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Innovation focus</p>
                <p className="mt-3 text-lg leading-8 text-white/82">
                  Generative UI turns approval into a product interaction, not another prompt.
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        <Slide
          index="Slide 2"
          title="Why Travel AI Still Feels Broken"
          subtitle="The problem is not model intelligence. It is the interaction model."
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 border border-white/10 bg-white/[0.03] p-6">
              <Bullet>Most travel assistants are still text-heavy.</Bullet>
              <Bullet>Users keep repeating preferences in natural language.</Bullet>
              <Bullet>Planning, transport, stays, safety, packing, and booking are fragmented.</Bullet>
              <Bullet>Many so-called agents still talk more than they act.</Bullet>
            </div>
            <QuoteCard />
          </div>
        </Slide>

        <Slide
          index="Slide 3"
          title="Core Technical Architecture"
          subtitle="The system is not just a chat wrapper. It is a multi-agent orchestration layer paired with generative UI, guardrails, and live execution."
        >
          <TechnicalGrid />
          <div className="mt-5">
            <MermaidRenderer chart={chart} />
          </div>
        </Slide>

        <Slide
          index="Slide 4"
          title="Sponsor Track: Civic"
          subtitle="Civic gives Mimi identity, secure user context, and trusted integrations into the user’s real productivity surface."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4 border border-white/10 bg-white/[0.03] p-6">
              <Bullet>Civic identity gives Mimi authenticated user context instead of anonymous prompt-only state.</Bullet>
              <Bullet>That identity layer unlocks Google-connected flows like Docs, Sheets, and Calendar exports from the trip artifact.</Bullet>
              <Bullet>It supports agentic security by tying actions to a real signed-in user before touching personal workspace tools.</Bullet>
              <Bullet>Combined with guardrails, it helps keep browser-use and workflow execution bounded to the right user and the right approvals.</Bullet>
            </div>

            <div className="space-y-4">
              <div className="border border-white/10 bg-[#161616] p-6">
                <div className="flex items-center gap-3 text-white/72">
                  <LockKey weight="fill" className="h-5 w-5" />
                  <p className="text-xs uppercase tracking-[0.18em]">Civic impact</p>
                </div>
                <p className="mt-4 text-3xl font-semibold leading-tight text-white">
                  Identity turns agent actions into trusted user workflows.
                </p>
              </div>

              <div className="border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 text-emerald-300">
                  <ShieldCheck weight="fill" className="h-5 w-5" />
                  <p className="text-xs uppercase tracking-[0.18em]">Agentic security</p>
                </div>
                <p className="mt-4 text-lg leading-8 text-white/78">
                  Civic, tool boundaries, and our approval model work together so the agent can act with more context while still preserving consent, identity, and security constraints.
                </p>
              </div>
            </div>
          </div>
        </Slide>

        <Slide
          index="Slide 5"
          title="Sponsor Track: Luffa"
          subtitle="Luffa extends Mimi beyond the web app into a messaging and voice surface that can proactively help before, during, and after the trip."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4 border border-white/10 bg-white/[0.03] p-6">
              <Bullet>Luffa gives Mimi a lightweight companion surface for reminders and notifications about the trip.</Bullet>
              <Bullet>That means airport reminders, packing nudges, schedule prompts, and trip updates can reach the user outside the main app.</Bullet>
              <Bullet>We also support realtime voice patterns and multilingual interaction, so the same orchestration can work across chat, voice, and mobile messaging.</Bullet>
              <Bullet>Next, we plan to add crypto payments directly through the Luffa bot so reservation and payment intent can happen in the same assistant surface.</Bullet>
            </div>
            <div className="grid gap-4">
              <div className="border border-white/10 bg-[#161616] p-6">
                <div className="flex items-center gap-3 text-fuchsia-300">
                  <MicrophoneStage weight="fill" className="h-5 w-5" />
                  <p className="text-xs uppercase tracking-[0.18em]">Luffa impact</p>
                </div>
                <p className="mt-4 text-3xl font-semibold leading-tight text-white">
                  One agent system, multiple surfaces: web, voice, bot, reminders.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border border-white/10 bg-[#161616] p-4">
                  <MicrophoneStage className="h-5 w-5 text-emerald-300" weight="fill" />
                  <p className="mt-3 text-sm uppercase tracking-[0.15em] text-white/42">Realtime voice</p>
                </div>
                <div className="border border-white/10 bg-[#161616] p-4">
                  <Sparkle className="h-5 w-5 text-white/72" weight="fill" />
                  <p className="mt-3 text-sm uppercase tracking-[0.15em] text-white/42">Multilingual</p>
                </div>
                <div className="border border-white/10 bg-[#161616] p-4">
                  <Browser className="h-5 w-5 text-fuchsia-300" weight="fill" />
                  <p className="mt-3 text-sm uppercase tracking-[0.15em] text-white/42">Bot reminders</p>
                </div>
              </div>
            </div>
          </div>
        </Slide>

        <Slide
          index="Slide 6"
          title="Why This Matters"
          subtitle="The real innovation is not autonomy without humans. It is autonomy with radically lower supervision cost."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4 border border-white/10 bg-white/[0.03] p-6">
              <Bullet>Generative UI is the core interaction innovation in this project.</Bullet>
              <Bullet>It turns approval from a prompt-writing problem into a product-design problem.</Bullet>
              <Bullet>That means less text, lower token use, faster iteration, and more trustworthy agent behavior.</Bullet>
              <Bullet>Mimi shows that useful autonomy is collaborative, visible, and action-oriented.</Bullet>
            </div>
            <div className="border border-white/10 bg-[#161616] p-6">
              <div className="flex flex-wrap gap-2">
                <Tag>Autonomy</Tag>
                <Tag>Generative UI</Tag>
                <Tag>Security</Tag>
                <Tag>Voice</Tag>
              </div>
              <p className="mt-5 text-3xl font-semibold leading-tight text-white">
                We’re not trying to replace human judgment.
                <br />
                We’re trying to eliminate human busywork.
              </p>
            </div>
          </div>
        </Slide>
      </div>
    </main>
  );
}
