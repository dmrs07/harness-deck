import {
  action,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";
import type { Provider } from "../domain/usage.js";
import { usageService } from "../service/usage-service.js";
import { renderCombined, renderProvider } from "../ui/render.js";

type RenderableAction = {
  setImage(image: string): Promise<void>;
};

abstract class ProviderUsageAction extends SingletonAction {
  private readonly unsubscribers = new Map<object, () => void>();
  protected abstract readonly provider: Provider;

  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    usageService.start();
    const render = () => void this.render(ev.action);
    this.unsubscribers.set(ev.action, usageService.subscribe(render));
    await this.render(ev.action);
  }

  override onWillDisappear(ev: WillDisappearEvent): void {
    this.unsubscribers.get(ev.action)?.();
    this.unsubscribers.delete(ev.action);
  }

  override async onKeyDown(_ev: KeyDownEvent): Promise<void> {
    await usageService.refresh();
  }

  private async render(target: RenderableAction): Promise<void> {
    await target.setImage(renderProvider(usageService.get(this.provider), this.provider));
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
export class CombinedUsageAction extends SingletonAction {
  private readonly unsubscribers = new Map<object, () => void>();

  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    usageService.start();
    const render = () => void this.render(ev.action);
    this.unsubscribers.set(ev.action, usageService.subscribe(render));
    await this.render(ev.action);
  }

  override onWillDisappear(ev: WillDisappearEvent): void {
    this.unsubscribers.get(ev.action)?.();
    this.unsubscribers.delete(ev.action);
  }

  override async onKeyDown(_ev: KeyDownEvent): Promise<void> {
    await usageService.refresh();
  }

  private async render(target: RenderableAction): Promise<void> {
    await target.setImage(renderCombined(usageService.get("codex"), usageService.get("claude")));
  }
}
