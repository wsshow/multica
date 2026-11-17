import assert from "node:assert/strict";
import test from "node:test";
import { findForbiddenImports } from "./check-telemetry.mjs";

test("connected-app catalog names do not enable telemetry", () => {
  assert.deepEqual(findForbiddenImports(`package connectedapps
import "strings"
var apps = []string{"posthog", "sentry"}
`, ".go"), []);
});

test("Go telemetry SDK imports are rejected, including aliased and grouped imports", () => {
  assert.deepEqual(findForbiddenImports(`package app
import posthog "github.com/posthog/posthog-go"
import (
  _ "github.com/prometheus/client_golang/prometheus"
  "strings"
)
`, ".go"), ["github.com/posthog/posthog-go", "github.com/prometheus/client_golang/prometheus"]);
});

test("frontend telemetry packages remain rejected", () => {
  assert.deepEqual(findForbiddenImports(`import analytics from "posthog-js";
const tracing = import("@opentelemetry/api");`, ".js"), ["posthog-js", "@opentelemetry/api"]);
});
