import { Stagehand } from '@browserbasehq/stagehand';
import {
  appendBrowserProgressEvent,
  finishBrowserProgressRun,
  startBrowserProgressRun,
} from '@/lib/browser/progress-store';

export type BrowserExecutionStatus = 'completed' | 'partial' | 'skipped' | 'failed';

export interface BrowserExecutionRequest {
  startUrl: string;
  instruction: string;
  label: string;
}

export interface BrowserExecutionResult {
  status: BrowserExecutionStatus;
  label: string;
  summary: string;
  sessionUrl?: string;
  actions: string[];
}

function logBrowserExecution(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.log(`[browser] ${message}`, details);
    return;
  }

  console.log(`[browser] ${message}`);
}

function getStagehandModelConfig(modelName?: string) {
  const explicitModelName = modelName?.trim() || process.env.STAGEHAND_MODEL?.trim();

  let resolvedModelName = explicitModelName;
  if (!resolvedModelName) {
    if (process.env.OPENAI_API_KEY) {
      resolvedModelName = 'openai/gpt-4o-mini';
    } else if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      resolvedModelName = 'google/gemini-2.5-flash';
    } else if (process.env.ANTHROPIC_API_KEY) {
      resolvedModelName = 'anthropic/claude-sonnet-4-5';
    } else {
      resolvedModelName = 'openai/gpt-4o-mini';
    }
  }

  const provider = resolvedModelName.split('/')[0];
  const apiKey =
    provider === 'openai'
      ? process.env.OPENAI_API_KEY
      : provider === 'google'
        ? process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
        : provider === 'anthropic'
          ? process.env.ANTHROPIC_API_KEY
          : provider === 'groq'
            ? process.env.GROQ_API_KEY
            : undefined;

  return {
    modelName: resolvedModelName,
    apiKey,
  };
}

function getStagehandEnv(): 'BROWSERBASE' | 'LOCAL' | null {
  const configuredEnv = process.env.STAGEHAND_ENV?.trim().toUpperCase();
  const browserbaseApiKey = process.env.BB_API_KEY;
  const browserbaseProjectId = process.env.BB_PROJECT_ID;

  if (configuredEnv === 'LOCAL') {
    return 'LOCAL';
  }

  if (process.env.STAGEHAND_LOCAL_BROWSER === 'true') {
    return 'LOCAL';
  }

  if (configuredEnv === 'BROWSERBASE') {
    return browserbaseApiKey && browserbaseProjectId ? 'BROWSERBASE' : null;
  }

  if (browserbaseApiKey && browserbaseProjectId) {
    return 'BROWSERBASE';
  }

  return null;
}

export function isBrowserExecutionAvailable() {
  return getStagehandEnv() !== null;
}

export async function executeBrowserFlow(
  request: BrowserExecutionRequest
): Promise<BrowserExecutionResult> {
  const env = getStagehandEnv();
  const browserbaseApiKey = process.env.BB_API_KEY;
  const browserbaseProjectId =process.env.BB_PROJECT_ID;
  const stagehandModel = getStagehandModelConfig();
  const stagehandAgentModel = getStagehandModelConfig(process.env.STAGEHAND_AGENT_MODEL);
  const stagehandExecutionModel = getStagehandModelConfig(process.env.STAGEHAND_EXECUTION_MODEL);
  if (!env) {
    return {
      status: 'skipped',
      label: request.label,
      summary: 'Browser execution is not configured, so this reservation stayed in demo mode.',
      actions: [],
    };
  }

  const progressRunId = startBrowserProgressRun(request.label, request.startUrl);

  const stagehand = new Stagehand({
    env,
    apiKey: browserbaseApiKey,
    projectId: browserbaseProjectId,
    model: stagehandModel,
    localBrowserLaunchOptions: {
      headless: env === 'BROWSERBASE',
      executablePath: process.env.STAGEHAND_BROWSER_PATH,
      userDataDir: process.env.STAGEHAND_USER_DATA_DIR,
      chromiumSandbox: false,
      acceptDownloads: true,
      viewport: {
        width: 1440,
        height: 1024,
      },
    },
    verbose: 1,
    logger: (line) => {
      const level = typeof line.level === 'number' ? line.level : undefined;
      const category =
        typeof line.category === 'string' ? ` ${line.category}` : '';
      const message =
        typeof line.message === 'string' ? line.message : JSON.stringify(line);
      appendBrowserProgressEvent(progressRunId, message);

      if (level !== undefined && level >= 50) {
        console.error(`[browser][stagehand${category}] ${message}`, line);
        return;
      }

      console.log(`[browser][stagehand${category}] ${message}`, line);
    },
  });

  try {
    logBrowserExecution('Starting browser execution', {
      label: request.label,
      env,
      startUrl: request.startUrl,
      model: stagehandModel.modelName,
      agentModel: stagehandAgentModel.modelName,
      executionModel: stagehandExecutionModel.modelName,
    });
    appendBrowserProgressEvent(progressRunId, `Starting ${request.label}`);

    await stagehand.init();
    const page = await stagehand.context.newPage(request.startUrl);
    const agent = stagehand.agent({
      mode: 'dom',
      model: stagehandAgentModel,
      executionModel: stagehandExecutionModel,
    });

    const result = await agent.execute({
      instruction: `${request.instruction} Stop before checkout is fully submitted. Do not submit payment. Do not finalize any purchase.`,
      page,
      maxSteps: 25,
    });

    const actions = result.actions
      .map((action) => {
        if (typeof action.instruction === 'string' && action.instruction.trim()) {
          return action.instruction.trim();
        }

        if (typeof action.action === 'string' && action.action.trim()) {
          return action.action.trim();
        }

        return null;
      })
      .filter((action): action is string => Boolean(action))
      .slice(0, 12);

    logBrowserExecution('Browser execution finished', {
      label: request.label,
      completed: result.completed,
      summary: result.message,
      sessionUrl: stagehand.browserbaseSessionURL,
      actions,
    });
    for (const action of actions) {
      appendBrowserProgressEvent(progressRunId, action);
    }
    finishBrowserProgressRun(
      progressRunId,
      result.completed ? 'completed' : 'failed',
      result.message,
      stagehand.browserbaseSessionURL
    );

    return {
      status: result.completed ? 'completed' : 'partial',
      label: request.label,
      summary: result.message,
      sessionUrl: stagehand.browserbaseSessionURL,
      actions: actions.slice(0, 6),
    };
  } catch (error) {
    logBrowserExecution('Browser execution failed', {
      label: request.label,
      error: error instanceof Error ? error.message : String(error),
      sessionUrl: stagehand.browserbaseSessionURL,
    });
    finishBrowserProgressRun(
      progressRunId,
      'failed',
      error instanceof Error ? error.message : 'Browser execution failed unexpectedly.',
      stagehand.browserbaseSessionURL
    );

    return {
      status: 'failed',
      label: request.label,
      summary: error instanceof Error ? error.message : 'Browser execution failed unexpectedly.',
      sessionUrl: stagehand.browserbaseSessionURL,
      actions: [],
    };
  } finally {
    await stagehand.close({ force: true }).catch(() => undefined);
  }
}
