import {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";
import {
  resolveStripSettings,
  resolveUsageBarSettings,
  type ResolvedStripSettings,
  type ResolvedUsageBarSettings,
  type UsageBarSettings
} from "../config/bar-settings.js";
import type { Provider } from "../domain/usage.js";
import { usageService } from "../service/usage-service.js";
import { renderCombined, renderProvider, renderStripSegment } from "../ui/render.js";

type RenderableAction = {
  setImage(image: string): Promise<void>;
};

type PositionedAction = RenderableAction & {
  coordinates?: { column: number; row: number };
};

abstract class ProviderUsageAction extends SingletonAction<UsageBarSettings> {
  private readonly unsubscribers = new Map<object, () => void>();
  private readonly settings = new Map<object, ResolvedUsageBarSettings>();
  protected abstract readonly provider: Provider;

  override async onWillAppear(ev: WillAppearEvent<UsageBarSettings>): Promise<void> {
    usageService.start();
    const settings = resolveUsageBarSettings(ev.payload.settings);
    this.settings.set(ev.action, settings);
    const render = () => void this.render(ev.action, this.settings.get(ev.action) ?? settings);
    this.unsubscribers.set(ev.action, usageService.subscribe(render));
    await this.render(ev.action, settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<UsageBarSettings>): Promise<void> {
    const settings = resolveUsageBarSettings(ev.payload.settings);
    this.settings.set(ev.action, settings);
    await this.render(ev.action, settings);
  }

  override onWillDisappear(ev: WillDisappearEvent<UsageBarSettings>): void {
    this.unsubscribers.get(ev.action)?.();
    this.unsubscribers.delete(ev.action);
    this.settings.delete(ev.action);
  }

  override async onKeyDown(_ev: KeyDownEvent<UsageBarSettings>): Promise<void> {
    await usageService.refresh();
  }

  private async render(target: RenderableAction, settings: ResolvedUsageBarSettings): Promise<void> {
    await target.setImage(renderProvider(usageService.get(this.provider), this.provider, settings));
  }
}

abstract class ProviderStripAction extends SingletonAction<UsageBarSettings> {
  private readonly unsubscribers = new Map<object, () => void>();
  private readonly settings = new Map<object, ResolvedStripSettings>();
  private readonly columns = new Map<object, number>();
  protected abstract readonly provider: Provider;

  override async onWillAppear(ev: WillAppearEvent<UsageBarSettings>): Promise<void> {
    usageService.start();
    const settings = resolveStripSettings(ev.payload.settings);
    const column = ev.payload.isInMultiAction ? -1 : ev.payload.coordinates.column;
    this.settings.set(ev.action, settings);
    this.columns.set(ev.action, column);
    const render = () => void this.render(ev.action, this.settings.get(ev.action) ?? settings, this.columns.get(ev.action) ?? column);
    this.unsubscribers.set(ev.action, usageService.subscribe(render));
    await this.render(ev.action, settings, column);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<UsageBarSettings>): Promise<void> {
    const settings = resolveStripSettings(ev.payload.settings);
    this.settings.set(ev.action, settings);
    await this.render(ev.action, settings, this.columns.get(ev.action) ?? -1);
  }

  override onWillDisappear(ev: WillDisappearEvent<UsageBarSettings>): void {
    this.unsubscribers.get(ev.action)?.();
    this.unsubscribers.delete(ev.action);
    this.settings.delete(ev.action);
    this.columns.delete(ev.action);
  }

  override async onKeyDown(_ev: KeyDownEvent<UsageBarSettings>): Promise<void> {
    await usageService.refresh();
  }

  private async render(target: PositionedAction, settings: ResolvedStripSettings, column: number): Promise<void> {
    await target.setImage(renderStripSegment(usageService.get(this.provider), this.provider, column, settings));
  }
}

@action({ UUID: "com.dmrs07.harness-deck.codex" })
export class CodexUsageAction extends ProviderUsageAction {
  protected readonly provider = "codex" as const;
}

@action({ UUID: "com.dmrs07.harness-deck.claude" })
export class ClaudeUsageAction extends ProviderUsageAction {
  protected readonly provider = "claude" as const;
}

@action({ UUID: "com.dmrs07.harness-deck.codex-strip" })
export class CodexUsageStripAction extends ProviderStripAction {
  protected readonly provider = "codex" as const;
}

@action({ UUID: "com.dmrs07.harness-deck.claude-strip" })
export class ClaudeUsageStripAction extends ProviderStripAction {
  protected readonly provider = "claude" as const;
}

@action({ UUID: "com.dmrs07.harness-deck.combined" })
export class CombinedUsageAction extends SingletonAction<UsageBarSettings> {
  private readonly unsubscribers = new Map<object, () => void>();
  private readonly settings = new Map<object, ResolvedUsageBarSettings>();

  override async onWillAppear(ev: WillAppearEvent<UsageBarSettings>): Promise<void> {
    usageService.start();
    const settings = resolveUsageBarSettings(ev.payload.settings);
    this.settings.set(ev.action, settings);
    const render = () => void this.render(ev.action, this.settings.get(ev.action) ?? settings);
    this.unsubscribers.set(ev.action, usageService.subscribe(render));
    await this.render(ev.action, settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<UsageBarSettings>): Promise<void> {
    const settings = resolveUsageBarSettings(ev.payload.settings);
    this.settings.set(ev.action, settings);
    await this.render(ev.action, settings);
  }

  override onWillDisappear(ev: WillDisappearEvent<UsageBarSettings>): void {
    this.unsubscribers.get(ev.action)?.();
    this.unsubscribers.delete(ev.action);
    this.settings.delete(ev.action);
  }

  override async onKeyDown(_ev: KeyDownEvent<UsageBarSettings>): Promise<void> {
    await usageService.refresh();
  }

  private async render(target: RenderableAction, settings: ResolvedUsageBarSettings): Promise<void> {
    await target.setImage(renderCombined(usageService.get("codex"), usageService.get("claude"), settings));
  }
}
