import streamDeck from "@elgato/streamdeck";
import {
  ClaudeUsageAction,
  ClaudeUsageStripAction,
  CodexUsageAction,
  CodexUsageStripAction,
  CombinedUsageAction
} from "./actions/usage-actions.js";
import { usageService } from "./service/usage-service.js";

streamDeck.actions.registerAction(new CodexUsageAction());
streamDeck.actions.registerAction(new ClaudeUsageAction());
streamDeck.actions.registerAction(new CodexUsageStripAction());
streamDeck.actions.registerAction(new ClaudeUsageStripAction());
streamDeck.actions.registerAction(new CombinedUsageAction());

usageService.start();
streamDeck.connect();
