import { z } from "zod";

const idSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/);
const iso2Schema = z.string().regex(/^[A-Z]{2}$/);

const stepperControlSchema = z.object({
  type: z.literal("stepper"),
  content: z.string(),
  controlId: idSchema,
  props: z.object({
    initialValue: z.number().int().positive().nullable(),
  }).optional(),
});

const priceControlSchema = z.object({
  type: z.literal("price"),
  content: z.string(),
  controlId: idSchema,
  props: z.object({
    initialValue: z.number().int().nonnegative().nullable(),
  }).optional(),
});

const dateControlSchema = z.object({
  type: z.literal("date"),
  content: z.string(),
  controlId: idSchema,
  props: z.object({
    defaultDate: z.string().nullable(),
  }).optional(),
});

const countryControlSchema = z.object({
  type: z.literal("country"),
  content: z.string(),
  controlId: idSchema,
  props: z.object({
    initialCode: iso2Schema.nullable(),
  }).optional(),
});

const toggleControlSchema = z.object({
  type: z.literal("toggle"),
  content: z.string(),
  controlId: idSchema,
  props: z.object({
    label: z.string().min(1),
    defaultValue: z.boolean(),
  }).optional(),
});

const sliderControlSchema = z.object({
  type: z.literal("slider"),
  content: z.string(),
  controlId: idSchema,
  props: z.object({
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
  }).optional(),
});

const selectOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const selectControlSchema = z.object({
  type: z.literal("select"),
  content: z.string(),
  controlId: idSchema,
  props: z.object({
    options: z.array(selectOptionSchema).min(1),
  }).optional(),
});

const votingControlSchema = z.object({
  type: z.literal("voting"),
  content: z.string(),
  controlId: idSchema,
  props: z.object({
    upvotes: z.number().int().nonnegative(),
    downvotes: z.number().int().nonnegative(),
  }).optional(),
});

export const inlineControlSchema = z.discriminatedUnion("type", [
  stepperControlSchema,
  priceControlSchema,
  dateControlSchema,
  countryControlSchema,
  toggleControlSchema,
  sliderControlSchema,
  selectControlSchema,
  votingControlSchema,
]);

export const inlineTextSegmentSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
});

export const inlineSegmentSchema = z.union([inlineTextSegmentSchema, inlineControlSchema]);

export type InlineSegment = z.infer<typeof inlineSegmentSchema>;

export interface InlineDiagnostic {
  raw: string;
  reason: string;
}

const TOKEN_PATTERNS = {
  stepper: /^\{\{\+\[([a-zA-Z0-9_-]+)(?:\|(\d+))?\]-\}\}$/,
  price: /^\{\{\+\[\$([a-zA-Z0-9_-]+)(?:\|(\d+))?\]-\}\}$/,
  date: /^\{\{::date-picker\[([a-zA-Z0-9_-]+)(?:\|(\d{4}-\d{2}-\d{2}))?\]\}\}$/,
  country: /^\{\{::country\[([a-zA-Z0-9_-]+)(?:\|([A-Z]{2}))?\]\}\}$/,
  toggle: /^\{\{\[(x| )\]\s*([a-zA-Z0-9_ &'-]+)\}\}$/,
  slider: /^\{\{::slider\[([a-zA-Z0-9_-]+)\|min:(\d+)\|max:(\d+)(?:\|step:(\d+))?\]\}\}$/,
  select: /^\{\{::select\[([a-zA-Z0-9_-]+)\|([a-zA-Z0-9_\- ]+(?:,[a-zA-Z0-9_\- ]+)*)\]\}\}$/,
  voting: /^\{\{::vote\[([a-zA-Z0-9_-]+)\|up:(\d+)\|down:(\d+)\]\}\}$/,
} as const;

function titleCaseOption(value: string) {
  const normalized = value.trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/-/g, " ");
}

function slugifyLabel(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function parseInlineToken(raw: string): InlineSegment | null {
  let match = raw.match(TOKEN_PATTERNS.stepper);
  if (match) {
    return inlineControlSchema.parse({
      type: "stepper",
      content: raw,
      controlId: match[1],
      props: { initialValue: match[2] ? Number.parseInt(match[2], 10) : null },
    });
  }

  match = raw.match(TOKEN_PATTERNS.price);
  if (match) {
    return inlineControlSchema.parse({
      type: "price",
      content: raw,
      controlId: match[1],
      props: { initialValue: match[2] ? Number.parseInt(match[2], 10) : null },
    });
  }

  match = raw.match(TOKEN_PATTERNS.date);
  if (match) {
    return inlineControlSchema.parse({
      type: "date",
      content: raw,
      controlId: match[1],
      props: { defaultDate: match[2] ?? null },
    });
  }

  match = raw.match(TOKEN_PATTERNS.country);
  if (match) {
    return inlineControlSchema.parse({
      type: "country",
      content: raw,
      controlId: match[1],
      props: { initialCode: match[2] ?? null },
    });
  }

  match = raw.match(TOKEN_PATTERNS.toggle);
  if (match) {
    const label = match[2].trim();
    return inlineControlSchema.parse({
      type: "toggle",
      content: raw,
      controlId: slugifyLabel(label),
      props: {
        label,
        defaultValue: match[1] === "x",
      },
    });
  }

  match = raw.match(TOKEN_PATTERNS.slider);
  if (match) {
    return inlineControlSchema.parse({
      type: "slider",
      content: raw,
      controlId: match[1],
      props: {
        min: Number.parseInt(match[2], 10),
        max: Number.parseInt(match[3], 10),
        step: match[4] ? Number.parseInt(match[4], 10) : 1,
      },
    });
  }

  match = raw.match(TOKEN_PATTERNS.select);
  if (match) {
    const options = match[2]
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean)
      .map((option) => ({
        value: option,
        label: titleCaseOption(option),
      }));

    return inlineControlSchema.parse({
      type: "select",
      content: raw,
      controlId: match[1],
      props: { options },
    });
  }

  match = raw.match(TOKEN_PATTERNS.voting);
  if (match) {
    return inlineControlSchema.parse({
      type: "voting",
      content: raw,
      controlId: match[1],
      props: {
        upvotes: Number.parseInt(match[2], 10),
        downvotes: Number.parseInt(match[3], 10),
      },
    });
  }

  return null;
}

export function parseInlineUI(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const tokenRegex = /\{\{[^{}]+\}\}/g;
  let lastIndex = 0;

  for (const match of text.matchAll(tokenRegex)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push(inlineTextSegmentSchema.parse({ type: "text", content: text.slice(lastIndex, index) }));
    }

    const parsed = parseInlineToken(raw);
    if (parsed) {
      segments.push(parsed);
    } else {
      segments.push(inlineTextSegmentSchema.parse({ type: "text", content: raw }));
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push(inlineTextSegmentSchema.parse({ type: "text", content: text.slice(lastIndex) }));
  }

  return segments.length > 0 ? segments : [inlineTextSegmentSchema.parse({ type: "text", content: text })];
}

export function validateInlineUI(text: string): { valid: boolean; diagnostics: InlineDiagnostic[] } {
  const diagnostics: InlineDiagnostic[] = [];
  const tokenRegex = /\{\{[^{}]+\}\}/g;

  for (const match of text.matchAll(tokenRegex)) {
    const raw = match[0];
    if (!parseInlineToken(raw)) {
      diagnostics.push({
        raw,
        reason: "Unrecognized inline control syntax",
      });
    }
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
  };
}

export const INLINE_UI_PROMPT_GUIDE = `
## Inline UI Syntax
| Control | Syntax |
|---|---|
| Number stepper | \`{{+[id|N]-}}\` — always include initial number (example: \`{{+[travelers|2]-}}\`) |
| Price stepper | \`{{+[$id|N]-}}\` — always include initial amount (example: \`{{+[$budget|3000]-}}\`) |
| Date picker | \`{{::date-picker[id|YYYY-MM-DD]}}\` — include a smart default date when possible |
| Country picker | \`{{::country[id|ISO2]}}\` — always include ISO-2 code |
| Toggle chip | \`{{[x] Label}}\` or \`{{[ ] Label}}\` |
| Slider | \`{{::slider[id|min:0|max:100|step:5]}}\` |
| Select | \`{{::select[id|opt1,opt2,opt3]}}\` |
| Voting | \`{{::vote[id|up:12|down:3]}}\` |
`.trim();
