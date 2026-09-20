import { diagnoseFailure } from "@/lib/agent-loop";

const API = "https://api.github.com";

function token() {
  const value = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!value) throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN is not configured");
  return value;
}

function parseRepo(value: string) {
  const clean = value.replace(/^https?:\/\/github\.com\//, "").replace(/^\/+|\/+$/g, "");
  const parts = clean.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("repository must be owner/name");
  return { owner: parts[0], repo: parts[1] };
}

async function github(path: string, init?: RequestInit) {
  const response = await fetch(API + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!response.ok) {
    const message = typeof data === "object" && data && "message" in data ? String((data as { message?: unknown }).message) : text;
    const error = new Error(`GitHub ${response.status}: ${message}`);
    throw error;
  }
  return data;
}

export async function readGithubFile(repository: string, path: string, ref?: string) {
  const { owner, repo } = parseRepo(repository);
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const data = await github(`/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}${query}`) as { type?: string; content?: string; encoding?: string; sha?: string; path?: string };
  if (data.type !== "file" || !data.content) throw new Error("GitHub path is not a text file");
  const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { repository, path: data.path || path, sha: data.sha, content };
}

export async function writeGithubFile(input: {
  repository: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
}) {
  const { owner, repo } = parseRepo(input.repository);
  let existingSha: string | undefined;
  try {
    const existing = await readGithubFile(input.repository, input.path, input.branch);
    existingSha = existing.sha;
  } catch (error) {
    if (!String(error instanceof Error ? error.message : error).includes("GitHub 404")) throw error;
  }

  const body = {
    message: input.message,
    content: Buffer.from(input.content, "utf8").toString("base64"),
    ...(input.branch ? { branch: input.branch } : {}),
    ...(existingSha ? { sha: existingSha } : {}),
  };

  try {
    const data = await github(`/repos/${owner}/${repo}/contents/${input.path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as { commit?: { sha?: string }; content?: { sha?: string } };
    return {
      ok: true,
      repository: input.repository,
      path: input.path,
      branch: input.branch || "default",
      commitSha: data.commit?.sha,
      blobSha: data.content?.sha,
    };
  } catch (error) {
    throw new Error(`${diagnoseFailure(error, "github_write")}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getGithubWorkflowStatus(repository: string, commitSha: string) {
  const { owner, repo } = parseRepo(repository);
  const data = await github(`/repos/${owner}/${repo}/commits/${commitSha}/check-runs`) as { check_runs?: Array<{ name?: string; status?: string; conclusion?: string; html_url?: string }> };
  const checks = data.check_runs || [];
  return {
    repository,
    commitSha,
    total: checks.length,
    checks,
    passed: checks.length > 0 && checks.every((check) => check.status === "completed" && check.conclusion === "success"),
    pending: checks.some((check) => check.status !== "completed"),
    failed: checks.some((check) => check.status === "completed" && check.conclusion !== "success"),
  };
}
