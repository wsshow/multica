import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClient } from "@multica/core/api/client";
import { WSClient } from "@multica/core/api/ws-client";
import { resetDevRecorder } from "@multica/core/diagnostics";
import { setCurrentWorkspace } from "@multica/core/platform";
import type { WSMessage } from "@multica/core/types";
import { DevToolbar, type DevToolbarProps } from "./dev-toolbar";

const mocks = vi.hoisted(() => ({
  wsStatus: "connected" as string,
  listMembers: vi.fn(),
  listRuntimes: vi.fn(),
  getAgentTaskSnapshot: vi.fn(),
  listAgents: vi.fn(),
}));

class FakeSocket {
  static last: FakeSocket | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeSocket.last = this;
  }
  send() {}
  close() {}
}

/** A connected client whose frames go through the real dispatch path. */
function connectSocket() {
  vi.stubGlobal("WebSocket", FakeSocket as unknown as typeof WebSocket);
  const client = new WSClient("ws://localhost:18080/ws", { cookieAuth: true });
  client.connect();
  FakeSocket.last!.onopen!();
  return {
    client,
    emit: (msg: WSMessage) => FakeSocket.last!.onmessage!({ data: JSON.stringify(msg) }),
  };
}

vi.mock("@multica/core/realtime", () => ({
  useWSStatus: () => mocks.wsStatus,
}));

vi.mock("@multica/core/auth", () => {
  const state = { user: { id: "user-1" } };
  return {
    useAuthStore: Object.assign(
      (selector: (s: typeof state) => unknown) => selector(state),
      { getState: () => state },
    ),
  };
});

vi.mock("@multica/core/api", () => ({
  api: {
    listMembers: mocks.listMembers,
    listRuntimes: mocks.listRuntimes,
    getAgentTaskSnapshot: mocks.getAgentTaskSnapshot,
    listAgents: mocks.listAgents,
  },
}));

function renderToolbar(props: Partial<DevToolbarProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onNavigate = vi.fn();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <DevToolbar
        build="web"
        apiUrl="http://localhost:18080"
        route="/acme/issues"
        onNavigate={onNavigate}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...view, queryClient, onNavigate };
}

describe("DevToolbar", () => {
  beforeEach(() => {
    mocks.wsStatus = "connected";
    mocks.listMembers.mockReset().mockResolvedValue([
      { user_id: "user-1", role: "admin" },
      { user_id: "user-2", role: "owner" },
    ]);
    mocks.listRuntimes.mockReset().mockResolvedValue([]);
    mocks.getAgentTaskSnapshot.mockReset().mockResolvedValue([]);
    mocks.listAgents.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    resetDevRecorder();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setCurrentWorkspace(null, null);
  });

  it("shows the client, backend, workspace role and connection state", async () => {
    setCurrentWorkspace("acme", "ws-1");
    mocks.wsStatus = "reconnecting";
    renderToolbar();

    const bar = screen.getByTestId("dev-toolbar");
    expect(bar).toHaveTextContent("web");
    expect(bar).toHaveTextContent("localhost:18080");
    expect(bar).toHaveTextContent("acme");
    expect(bar).toHaveTextContent("/acme/issues");
    expect(bar).toHaveTextContent("Syncreconnecting");
    expect(await screen.findByText("admin")).toBeInTheDocument();
    expect(mocks.listMembers).toHaveBeenCalledWith("ws-1");
  });

  it("does not look up a role outside a workspace", () => {
    renderToolbar();
    expect(screen.getByTestId("dev-toolbar")).toBeInTheDocument();
    expect(mocks.listMembers).not.toHaveBeenCalled();
  });

  it("reserves its height from viewport-sized shells only while expanded", () => {
    const reservesSpace = () =>
      [...document.querySelectorAll("style")].some((s) =>
        s.textContent?.includes(".h-svh{height:calc(100svh - 24px)}"),
      );
    renderToolbar();
    expect(reservesSpace()).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Hide dev toolbar" }));
    expect(screen.queryByTestId("dev-toolbar")).not.toBeInTheDocument();
    expect(reservesSpace()).toBe(false);

    fireEvent.click(screen.getByTestId("dev-toolbar-restore"));
    expect(screen.getByTestId("dev-toolbar")).toBeInTheDocument();
    expect(reservesSpace()).toBe(true);
  });

  it("keeps the network panel empty while API failures still reach the caller", async () => {
    renderToolbar();
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "version conflict" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(new ApiClient("http://localhost:18080").listMembers("ws-1")).rejects.toThrow("version conflict");
    expect(fetch).toHaveBeenCalled();

    expect(screen.getByTestId("dev-toolbar-net")).toHaveTextContent(/^Net0$/);
    fireEvent.click(screen.getByTestId("dev-toolbar-net"));
    expect(await screen.findByText("No API requests yet.")).toBeInTheDocument();
    expect(screen.queryByText("/api/workspaces/ws-1/members")).not.toBeInTheDocument();
  });

  it("leaves console logging intact without adding errors to the diagnostic panel", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    renderToolbar();
    const error = new Error("Cannot read properties of undefined");
    console.error(error);

    expect(log).toHaveBeenCalledWith(error);
    expect(screen.getByTestId("dev-toolbar-errors")).toHaveTextContent(/^Errors0$/);
    fireEvent.click(screen.getByTestId("dev-toolbar-errors"));
    expect(await screen.findByText(/^No errors\./)).toBeInTheDocument();
    expect(screen.queryByText("Error: Cannot read properties of undefined")).not.toBeInTheDocument();
  });

  it("handles realtime updates without recording frames or cache effects", async () => {
    const { queryClient } = renderToolbar();
    const { client, emit } = connectSocket();
    const queryKey = ["issues", "ws-1", "detail", "issue-1"];
    const issue = { id: "issue-1", identifier: "MUL-1" };
    client.on("issue:updated", () => queryClient.setQueryData(queryKey, issue));
    try {
      emit({ type: "issue:updated", payload: { issue } });
      expect(queryClient.getQueryData(queryKey)).toEqual(issue);
      expect(screen.getByTestId("dev-toolbar-events")).toHaveTextContent(/^Events0\/m$/);
      fireEvent.click(screen.getByTestId("dev-toolbar-events"));
      expect(await screen.findByText("No realtime events yet.")).toBeInTheDocument();
      expect(screen.queryByText("issue:updated")).not.toBeInTheDocument();
    } finally {
      client.disconnect();
    }
  });

  it("searches the query cache and invalidates one query by hand", async () => {
    const { queryClient } = renderToolbar();
    queryClient.setQueryData(["issues", "ws-1", "detail", "issue-1"], { id: "issue-1" });
    queryClient.setQueryData(["labels", "ws-1"], []);

    fireEvent.click(screen.getByTestId("dev-toolbar-cache"));
    fireEvent.change(await screen.findByLabelText("Search query keys"), { target: { value: "labels" } });
    expect(screen.queryByText('["issues","ws-1","detail","issue-1"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: 'Invalidate ["labels","ws-1"]' }));
    expect(queryClient.getQueryState(["labels", "ws-1"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["issues", "ws-1", "detail", "issue-1"])?.isInvalidated).toBe(false);
  });

  it("keeps the cache fetch counter in place while queries load and settle", async () => {
    // Stop the toolbar's 1s clock so only the query cache can move the counter;
    // racing that tick against waitFor's 1s timeout made this test flaky.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { queryClient } = renderToolbar();
    const counter = screen.getByTestId("dev-toolbar-cache-fetching");
    expect(counter).toHaveTextContent("↻0");

    let settle!: (value: string[]) => void;
    void queryClient.fetchQuery({
      queryKey: ["labels", "ws-1"],
      queryFn: () => new Promise<string[]>((resolve) => (settle = resolve)),
    });
    await waitFor(() => expect(counter).toHaveTextContent("↻1"));

    settle([]);
    await waitFor(() => expect(counter).toHaveTextContent("↻0"));
    expect(screen.getByTestId("dev-toolbar-cache-fetching")).toBe(counter);
  });

  it("shows runtime health and opens the issue a running agent task works on", async () => {
    setCurrentWorkspace("acme", "ws-1");
    mocks.listRuntimes.mockResolvedValue([
      { id: "rt-1", name: "Claude (mac)", provider: "claude", runtime_mode: "local", status: "online", metadata: { cli_version: "0.9.1" }, last_seen_at: null, device_info: "" },
      { id: "rt-2", name: "Codex (mac)", provider: "codex", runtime_mode: "local", status: "offline", metadata: {}, last_seen_at: null, device_info: "" },
    ]);
    mocks.getAgentTaskSnapshot.mockResolvedValue([
      { id: "t-1", agent_id: "agent-1", issue_id: "issue-1", status: "running", created_at: "2026-11-12T04:00:00Z", started_at: null, dispatched_at: null },
      { id: "t-2", agent_id: "agent-1", issue_id: "issue-2", status: "completed", created_at: "2026-11-12T03:00:00Z", started_at: null, dispatched_at: null },
    ]);
    mocks.listAgents.mockResolvedValue([{ id: "agent-1", name: "Lambda" }]);
    const { onNavigate } = renderToolbar();

    await waitFor(() => expect(screen.getByTestId("dev-toolbar-runtimes")).toHaveTextContent("Runtimes1/2"));
    expect(screen.getByTestId("dev-toolbar-tasks")).toHaveTextContent("Tasks1");

    fireEvent.click(screen.getByTestId("dev-toolbar-runtimes"));
    expect(await screen.findByText("Claude (mac)")).toBeInTheDocument();
    expect(screen.getByText("v0.9.1")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("dev-toolbar-tasks"));
    const row = (await screen.findByText("Lambda")).closest("button")!;
    expect(within(row).getByText("running")).toBeInTheDocument();
    fireEvent.click(row);
    expect(onNavigate).toHaveBeenCalledWith("/acme/issues/issue-1");
  });
});
