// Cloudflare Pages Function: proxies the GitHub Actions API for the deploy
// banner so the browser doesn't hit GitHub's 60/hour anonymous rate limit.
//
// Reads GH_TOKEN from Pages env (fine-grained PAT with Actions:read on this
// repo). 5,000 requests/hour authenticated.
//
// Endpoint: GET /api/deploy-status
// Returns:  { run: <run-summary> | null }

const REPO = 'NickCason/blue-studio';
const BRANCH = 'main';

interface Env {
  GH_TOKEN?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'blue-studio-deploy-status',
  };
  if (env.GH_TOKEN) headers['Authorization'] = `Bearer ${env.GH_TOKEN}`;

  // 1. Latest run on main.
  const runsRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/runs?per_page=1&branch=${BRANCH}`,
    { headers, cf: { cacheTtl: 0 } as any },
  );
  if (!runsRes.ok) {
    return new Response(
      JSON.stringify({ error: `gh runs ${runsRes.status}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const runsJson: any = await runsRes.json();
  const run = runsJson.workflow_runs?.[0];
  if (!run) {
    return jsonResponse({ run: null });
  }

  // 2. Job-level steps if the run isn't completed (for the progress bar).
  let steps: any[] = [];
  if (run.status !== 'completed') {
    const jobsRes = await fetch(
      `https://api.github.com/repos/${REPO}/actions/runs/${run.id}/jobs`,
      { headers, cf: { cacheTtl: 0 } as any },
    );
    if (jobsRes.ok) {
      const jobsJson: any = await jobsRes.json();
      const job = jobsJson.jobs?.[0];
      steps = (job?.steps ?? []).map((s: any) => ({
        name: s.name,
        status: s.status,
        conclusion: s.conclusion,
      }));
    }
  }

  return jsonResponse({
    run: {
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      html_url: run.html_url,
      run_started_at: run.run_started_at,
      created_at: run.created_at,
      updated_at: run.updated_at,
      head_sha: run.head_sha,
    },
    steps,
  });
};

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
