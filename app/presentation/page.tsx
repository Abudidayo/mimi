"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowsLeftRight,
} from "@phosphor-icons/react";

const slideVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: "easeOut",
    },
  },
};

function Slide({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={slideVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="relative rounded-[36px] border border-white/12 bg-[linear-gradient(180deg,rgba(17,38,91,0.96),rgba(8,19,56,0.98))] px-7 py-8 shadow-[0_24px_80px_rgba(5,10,33,0.35)] backdrop-blur-xl md:px-10 md:py-10"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-200/70">
        {eyebrow}
      </p>
      <h2 className="max-w-4xl text-3xl font-semibold leading-tight text-white md:text-5xl">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </motion.section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-3 py-1 text-sm font-medium text-white/88">
      {children}
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-sky-300 to-fuchsia-400" />
          <p className="text-lg leading-relaxed text-white/84 md:text-xl">{item}</p>
        </div>
      ))}
    </div>
  );
}

function MermaidCard() {
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
    <div className="overflow-hidden rounded-[28px] border border-white/12 bg-[#0b173d]/90 shadow-[0_20px_60px_rgba(5,10,33,0.35)]">
      <div className="border-b border-white/10 bg-white/5 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
          Mermaid Architecture
        </p>
      </div>
      <div className="p-6">
        <div className="relative rounded-3xl border border-white/8 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
          <MermaidRenderer chart={chart} />
        </div>
        <div className="mt-5 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
          <p className="text-sm leading-6 text-white/62">
            Mermaid-rendered architecture view: the supervisor coordinates specialists, the planner assembles a structured trip artifact, and the booking layer executes through the browser.
          </p>
        </div>
      </div>
    </div>
  );
}

function MermaidRenderer({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function renderChart() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "base",
        themeVariables: {
          background: "#0d1a45",
          primaryColor: "#1d3f8d",
          primaryTextColor: "#ffffff",
          primaryBorderColor: "#60a5fa",
          lineColor: "#93c5fd",
          secondaryColor: "#172554",
          tertiaryColor: "#312e81",
          fontFamily: "Fredoka, ui-sans-serif, system-ui",
        },
        flowchart: {
          curve: "basis",
          htmlLabels: true,
          nodeSpacing: 40,
          rankSpacing: 60,
          padding: 20,
        },
      });

      const { svg } = await mermaid.render(`mimi-mermaid-${id}`, chart);
      if (active) {
        setSvg(svg);
      }
    }

    void renderChart();

    return () => {
      active = false;
    };
  }, [chart, id]);

  return (
    <div className="min-h-[440px] overflow-auto rounded-3xl border border-white/8 bg-[#0d1a45]/70 p-4">
      {svg ? (
        <div
          className="[&_.edgeLabel]:!bg-transparent [&_.label]:!text-white [&_.node_label]:!text-white [&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex min-h-[400px] items-center justify-center text-white/55">
          Rendering Mermaid diagram...
        </div>
      )}
    </div>
  );
}

export default function PresentationPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#081338_0%,#0c1d49_38%,#11265b_100%)] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 md:px-8 md:py-14">
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[40px] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_34%),radial-gradient(circle_at_left,rgba(56,189,248,0.18),transparent_36%),linear-gradient(180deg,rgba(17,38,91,0.98),rgba(8,19,56,0.98))] px-7 py-10 shadow-[0_26px_90px_rgba(5,10,33,0.4)] md:px-12 md:py-14"
        >
          <div className="absolute right-6 top-6 h-28 w-28 rounded-full bg-fuchsia-400/12 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-sky-400/12 blur-3xl" />

          <div className="relative z-10 max-w-5xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Pill>AI Agents</Pill>
              <Pill>Generative UI</Pill>
              <Pill>Browser Execution</Pill>
            </div>
            <h1 className="text-5xl font-semibold leading-none tracking-tight md:text-7xl">
              Mimi
            </h1>
            <p className="mt-4 max-w-4xl text-xl leading-relaxed text-sky-100/88 md:text-2xl">
              Agentic Travel Planning With Low-Friction Human Approval
            </p>
            <p className="mt-3 max-w-4xl text-base leading-7 text-white/70 md:text-lg">
              Multi-agent orchestration, generative UI, and browser execution for real trip planning.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-white/90">
              <ArrowsLeftRight weight="bold" className="h-4 w-4 text-sky-200" />
              We don&apos;t remove the human. We remove the work.
            </div>
          </div>
        </motion.header>

        <Slide eyebrow="Slide 2" title="Why Travel AI Still Feels Broken">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <BulletList
                items={[
                  "Most travel assistants are still text-heavy.",
                  "Users keep repeating preferences in natural language.",
                  "Planning, transport, stays, safety, packing, and booking are fragmented.",
                  "Most so-called agents still talk more than they act.",
                ]}
              />
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <p className="text-2xl font-semibold leading-snug text-white">
                “Good design starts with the customer experience and works back toward the technology.”
              </p>
              <p className="mt-4 text-base font-medium uppercase tracking-[0.2em] text-fuchsia-200/80">
                Steve Jobs
              </p>
              <div className="mt-8 rounded-3xl border border-white/8 bg-[#11265b]/70 p-5">
                <p className="text-sm uppercase tracking-[0.26em] text-white/40">Design takeaway</p>
                <p className="mt-3 text-lg leading-8 text-white/78">
                  The core challenge is not model capability. It&apos;s reducing friction while still respecting human choice.
                </p>
              </div>
            </div>
          </div>
        </Slide>

        <Slide eyebrow="Slide 3" title="How Mimi Works">
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                "A supervisor agent coordinates specialist agents.",
                "Specialists handle transport, lodging, weather, safety, packing, discovery, itinerary, and booking.",
                "Generative UI replaces repeated text clarification with inline controls and structured cards.",
                "Once the user confirms, Mimi can attempt live browser-based booking workflows.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-base leading-7 text-white/82"
                >
                  {item}
                </div>
              ))}
            </div>
            <MermaidCard />
          </div>
        </Slide>

        <Slide eyebrow="Slide 4" title="What Makes This More Than A Chatbot">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <BulletList
                items={[
                  "The system chooses which specialists to run and when.",
                  "It gathers missing inputs with UI instead of long text exchanges.",
                  "It gates itinerary generation on transport and stay readiness.",
                  "It surfaces plans, selections, and browser actions transparently.",
                  "It can execute booking flows and stop safely at checkout.",
                ]}
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-[28px] border border-sky-300/18 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(168,85,247,0.08))] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200/70">
                  Core idea
                </p>
                <p className="mt-3 text-2xl font-semibold leading-snug text-white">
                  The agent reasons. The UI compresses approval. The browser executes.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <p className="text-sm uppercase tracking-[0.26em] text-white/40">Judge lens</p>
                <p className="mt-3 text-lg leading-8 text-white/78">
                  This is not just tool calling. It is a multi-step workflow with orchestration, edits, visibility, and safe execution boundaries.
                </p>
              </div>
            </div>
          </div>
        </Slide>

        <Slide eyebrow="Slide 5" title="Autonomy People Would Actually Use">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <BulletList
                items={[
                  "Less text, lower friction, fewer wasted tokens.",
                  "More trust through visible plans and editable controls.",
                  "A better fit for real consumer decision-making.",
                  "A pattern that extends beyond travel into other multi-step workflows.",
                ]}
              />
            </div>
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
              <div className="flex flex-wrap gap-2">
                <Pill>Autonomy</Pill>
                <Pill>Usefulness</Pill>
                <Pill>Execution</Pill>
              </div>
              <p className="mt-6 text-3xl font-semibold leading-tight text-white">
                Mimi shows that useful autonomy is collaborative, visible, and action-oriented.
              </p>
              <p className="mt-4 text-lg leading-8 text-white/72">
                We&apos;re not trying to replace human judgment. We&apos;re trying to eliminate human busywork.
              </p>
            </div>
          </div>
        </Slide>

        <Slide eyebrow="Demo" title="Live Demo Flow">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                title: "1. Start broad",
                body: "“I want to go to Albania with my girlfriend next week.”",
              },
              {
                title: "2. Gather context",
                body: "Show city suggestions and inline controls for missing trip info.",
              },
              {
                title: "3. Build the trip",
                body: "Run specialists, open the planner drawer, and show the trip artifact.",
              },
              {
                title: "4. Execute",
                body: "Trigger booking, show the browser timeline, and stop safely at checkout.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="rounded-[26px] border border-white/10 bg-white/5 p-5"
              >
                <p className="text-lg font-semibold text-white">{step.title}</p>
                <p className="mt-3 text-base leading-7 text-white/74">{step.body}</p>
              </div>
            ))}
          </div>
        </Slide>
      </div>
    </main>
  );
}
