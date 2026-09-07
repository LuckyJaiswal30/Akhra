/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as account from "../account.js";
import type * as ai from "../ai.js";
import type * as dashboard from "../dashboard.js";
import type * as data_institutions from "../data/institutions.js";
import type * as data_partners from "../data/partners.js";
import type * as data_problems from "../data/problems.js";
import type * as dev from "../dev.js";
import type * as http from "../http.js";
import type * as institutions from "../institutions.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_classify from "../lib/classify.js";
import type * as lib_districts from "../lib/districts.js";
import type * as lib_gemini from "../lib/gemini.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_groq from "../lib/groq.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_priority from "../lib/priority.js";
import type * as lib_profile from "../lib/profile.js";
import type * as lib_rules from "../lib/rules.js";
import type * as lib_upload from "../lib/upload.js";
import type * as lib_webhook from "../lib/webhook.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as partners from "../partners.js";
import type * as problems from "../problems.js";
import type * as projects from "../projects.js";
import type * as reset from "../reset.js";
import type * as routing from "../routing.js";
import type * as seed from "../seed.js";
import type * as selftest from "../selftest.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  account: typeof account;
  ai: typeof ai;
  dashboard: typeof dashboard;
  "data/institutions": typeof data_institutions;
  "data/partners": typeof data_partners;
  "data/problems": typeof data_problems;
  dev: typeof dev;
  http: typeof http;
  institutions: typeof institutions;
  "lib/auth": typeof lib_auth;
  "lib/classify": typeof lib_classify;
  "lib/districts": typeof lib_districts;
  "lib/gemini": typeof lib_gemini;
  "lib/geo": typeof lib_geo;
  "lib/groq": typeof lib_groq;
  "lib/identity": typeof lib_identity;
  "lib/priority": typeof lib_priority;
  "lib/profile": typeof lib_profile;
  "lib/rules": typeof lib_rules;
  "lib/upload": typeof lib_upload;
  "lib/webhook": typeof lib_webhook;
  migrations: typeof migrations;
  notifications: typeof notifications;
  partners: typeof partners;
  problems: typeof problems;
  projects: typeof projects;
  reset: typeof reset;
  routing: typeof routing;
  seed: typeof seed;
  selftest: typeof selftest;
  users: typeof users;
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

export declare const components: {};
