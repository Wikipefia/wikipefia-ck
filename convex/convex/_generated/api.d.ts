/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat_agent_action from "../chat/agent_action.js";
import type * as chat_agents from "../chat/agents.js";
import type * as chat_export from "../chat/export.js";
import type * as chat_files from "../chat/files.js";
import type * as chat_messages from "../chat/messages.js";
import type * as chat_threads from "../chat/threads.js";
import type * as github from "../github.js";
import type * as projects from "../projects.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "chat/agent_action": typeof chat_agent_action;
  "chat/agents": typeof chat_agents;
  "chat/export": typeof chat_export;
  "chat/files": typeof chat_files;
  "chat/messages": typeof chat_messages;
  "chat/threads": typeof chat_threads;
  github: typeof github;
  projects: typeof projects;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
