import {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";
import {
  resolveUsageBarSettings,
  type ResolvedUsageBarSettings,
  type UsageBarSettings
} from "../config/bar-settings.js";
import type { Provider } from "../domain/usage.js";
import { usageService } from "../service/usage-service.js";
import { renderCombined, renderProvider } from "../ui/render.js";

type RenderableAction = {
  setImage(image: string): Promise<void>;
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

@action({ UUID: "com.dmrs07.harness-deck.codex" })
export class CodexUsageAction extends ProviderUsageAction {
  protected readonly provider = "codex" as const;
}

@action({ UUID: "com.dmrs07.harness-deck.claude" })
export class ClaudeUsageAction extends ProviderUsageAction {
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
