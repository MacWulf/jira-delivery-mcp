import "./bootstrap/load-env.js";

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadConfig } from "./config.js";
import { buildIssueDescriptionWithExecutionMetadata } from "./domain/issue-execution-metadata.js";
import { JiraApi } from "./services/jira-api.js";

type IssueType = "Epic" | "Story" | "Task" | "Bug" | "Feature" | "Request";

type CapabilityBlueprint = {
  id: string;
  issueType: IssueType;
  summary: string;
  description: string;
  parentId?: string;
  labels?: string[];
  executionMetadata?: {
    requiredSkills?: string[];
    optionalSkills?: string[];
    executionMode?: string;
    notes?: string[];
  };
};

type DependencyBlueprint = {
  blocks: string;
  blockedBy: string;
};

type ExistingIssue = {
  key?: string;
  fields?: {
    summary?: string;
    issuelinks?: Array<{
      type?: {
        name?: string;
      };
      inwardIssue?: { key?: string };
      outwardIssue?: { key?: string };
    }>;
  };
};

type StepResult = {
  step: string;
  ok: boolean;
  details: Record<string, unknown>;
};

const LABELS = ["codex-managed", "capability-roadmap", "next-phase"];

const BLUEPRINTS: CapabilityBlueprint[] = [
  {
    id: "epic-workflow",
    issueType: "Epic",
    summary: "Adaptive workflow governance es lifecycle policy",
    description: [
      "Cel: a Jira asszisztens ne alap workflow feltetelezesekkel dolgozzon, hanem projektre szabott lifecycle policyval.",
      "",
      "Elvart eredmeny:",
      "- workflow discovery es semantic map",
      "- DoR es DoD policy retegek",
      "- migration-safe workflow update folyamat"
    ].join("\n"),
    labels: ["workflow", "governance"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-workflow-admin"],
      optionalSkills: ["jira-execution-loop"],
      executionMode: "implement"
    }
  },
  {
    id: "story-workflow-discovery",
    issueType: "Story",
    parentId: "epic-workflow",
    summary: "Aktiv workflow, statusz semantics es transition policy feltarasa",
    description: [
      "A rendszernek projektszinten fel kell ternie, hogy a workflow allapotok mit jelentenek, es mely transitionok ervenyesek a delivery kulonbozo fazisaiban.",
      "",
      "Acceptance criteria:",
      "- a projekt workflowja strukturalt semantic mapkent lekerdezheto",
      "- a statuszokhoz business jelentest tudunk rendelni",
      "- a team-managed es company-managed kulonbsegek elkulonulnek"
    ].join("\n"),
    labels: ["workflow", "discovery"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "story-readiness-policy",
    issueType: "Story",
    parentId: "epic-workflow",
    summary: "Definition of Ready es Definition of Done policy reteg bevezetese",
    description: [
      "A workflow onmagaban nem eleg. Kulon policy kell arra, hogy mikor startolhato es mikor zarhato egy issue.",
      "",
      "Acceptance criteria:",
      "- DoR es DoD szabalyok projektpolitika reszekent modellezettek",
      "- a policy kulon kezeli a story, task, bug es test elemeket",
      "- a delivery loop a policyt figyelembe veszi statuszvaltas elott"
    ].join("\n"),
    labels: ["workflow", "readiness"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-workflow-admin", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "story-workflow-apply",
    issueType: "Story",
    parentId: "epic-workflow",
    summary: "Workflow delta terv, migration logika es audit-safe alkalmazas",
    description: [
      "Ha a projekt workflowja mar nem megfelelo, a rendszernek kontrollaltan kell workflow delta tervet keszitenie es alkalmaznia.",
      "",
      "Acceptance criteria:",
      "- workflow delta es migration terv keszul az aktualis projekthez",
      "- a valtozas blast radiusa dokumentalt",
      "- a nagy hatasu workflow muveletek audit trailt es approval lehetoseget kapnak"
    ].join("\n"),
    labels: ["workflow", "migration"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-workflow-admin"],
      optionalSkills: ["jira-execution-loop"],
      executionMode: "admin"
    }
  },
  {
    id: "epic-quality",
    issueType: "Epic",
    summary: "Quality control, teszt orchestration es bug evidence",
    description: [
      "Cel: az acceptance criteria ne csak le legyen irva, hanem explicit tesztelesi es bugkezelesi reteggel legyen kikényszeritve.",
      "",
      "Elvart eredmeny:",
      "- test taskok vagy test issue-k generalasa",
      "- bug nyitas es evidence csatolas failed validation eseten",
      "- retest loop es statuszvisszaallitas"
    ].join("\n"),
    labels: ["quality", "testing"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement", "jira-execution-loop"],
      executionMode: "implement"
    }
  },
  {
    id: "epic-dependency",
    issueType: "Epic",
    summary: "Dependency control es graph-aware execution",
    description: [
      "Cel: a Jira asszisztens ne csak issue linkeket hozzon letre, hanem ertse is a blokkolasi es sorrendi kapcsolatokat a napi execution loopban.",
      "",
      "Elvart eredmeny:",
      "- explicit dependency snapshot minden fontos issue-n",
      "- dependency-aware next issue selection es blocker indoklas",
      "- dependency maintenance scope-, bug- es tesztvaltozasoknal"
    ].join("\n"),
    labels: ["dependency", "execution"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "story-dependency-model",
    issueType: "Story",
    parentId: "epic-dependency",
    summary: "Issue dependency graph normalizalasa es blokkolo szemantika",
    description: [
      "A rendszernek egyseges dependency snapshotot kell epitenie a Jira issue linkekbol, hogy a Blocks kapcsolat ne csak nyers link, hanem ertelmezett execution input legyen.",
      "",
      "Acceptance criteria:",
      "- a rendszer elkuloniti a blocked by, blocks es egyeb kapcsolati tipusokat",
      "- az issue olvasas dependency snapshotot is visszaad",
      "- az open blokkolo issue-k kulon listazhatok"
    ].join("\n"),
    labels: ["dependency", "model"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "story-dependency-selection",
    issueType: "Story",
    parentId: "epic-dependency",
    summary: "Dependency-aware next issue valasztas es blocker indoklas",
    description: [
      "A kovetkezo ticket kivalasztasanak nem csak priority-alapunak kell lennie: a rendszernek lathato modon indokolnia kell a blokkolt es az indithato issue-kat.",
      "",
      "Acceptance criteria:",
      "- a next issue valasztas visszaadja a blokkolt jelolteket es a blokkolo issue-kat",
      "- a kivalasztasi indoklas utal a dependency allapotra is",
      "- blokkolt issue nem indulhat el rejtetten"
    ].join("\n"),
    labels: ["dependency", "selection"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "story-dependency-maintenance",
    issueType: "Story",
    parentId: "epic-dependency",
    summary: "Dependency maintenance relink, split es reopen eseten",
    description: [
      "Ha a scope valtozik, bug jon letre, vagy egy work item splitelodik, a dependency halo is modosul. Ezt a rendszernek kontrollaltan kell kezelnie.",
      "",
      "Acceptance criteria:",
      "- a rendszer dependency maintenance tervet tud kesziteni relink vagy reopen esetre",
      "- az arvava valt vagy elavult dependency-k kiszurhetok",
      "- a dependency-mutaciok audit traillel hajthatok vegre"
    ].join("\n"),
    labels: ["dependency", "maintenance"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop", "jira-intake-refinement"],
      optionalSkills: ["jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "story-test-generation",
    issueType: "Story",
    parentId: "epic-quality",
    summary: "Acceptance kriteriakbol test work itemek generalasa es linkelese",
    description: [
      "A user storykhoz es taskokhoz a rendszernek explicit tesztmunkat kell rendelnie, hogy az acceptance criteria tenylegesen ellenorizheto legyen.",
      "",
      "Acceptance criteria:",
      "- a rendszer acceptance criteria alapjan test elemeket tud generalni",
      "- a test work item linkelve van a parent storyhoz vagy taskhoz",
      "- a quality reteget nem lehet kommentekkel helyettesiteni"
    ].join("\n"),
    labels: ["quality", "tests"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement"],
      optionalSkills: ["jira-execution-loop"],
      executionMode: "implement"
    }
  },
  {
    id: "story-bug-evidence",
    issueType: "Story",
    parentId: "epic-quality",
    summary: "Failed validation eseten bug nyitas, evidence csatolas es statuszkorrekcio",
    description: [
      "Ha az acceptance criteria nem teljesul, a rendszernek bugot kell nyitnia, bizonyitekot kell rogzitenie, es az erintett issue allapotat korrigalnia kell.",
      "",
      "Acceptance criteria:",
      "- a failed tesztbol bug issue jon letre",
      "- a bug visszalinkelodik az erintett parent issue-ra",
      "- a hiba bizonyiteka strukturaltan rogzitheto",
      "- az erintett issue allapota megfelelo statuszba kerul vissza"
    ].join("\n"),
    labels: ["quality", "bug"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-intake-refinement"],
      executionMode: "implement"
    }
  },
  {
    id: "story-retest-loop",
    issueType: "Story",
    parentId: "epic-quality",
    summary: "Retest loop, acceptance verification es evidence-aware done logika",
    description: [
      "A rendszernek tudnia kell, hogy egy javitott bug utan hogyan ellenorizzuk ujra az acceptance criterion teljesuleset, es mikor lehet tenylegesen Done egy issue.",
      "",
      "Acceptance criteria:",
      "- a retest loop kulon life cycle-kent modellezett",
      "- a Done nem allithato evidence vagy verification nelkul",
      "- a bugfixhez kapcsolodo parent issue ujra ellenorizheto"
    ].join("\n"),
    labels: ["quality", "retest"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "epic-change",
    issueType: "Epic",
    summary: "Change request orchestration es scope evolution control",
    description: [
      "Cel: a projekt kozbeni uj igenyeket, visszanyitasokat es scope-valtozasokat a rendszer explicit valtozasvezetesben kezelje.",
      "",
      "Elvart eredmeny:",
      "- CR, bug, reopen es uj scope osztalyozas",
      "- impact analysis az erintett issue-kra es dependency-kre",
      "- backlog ujraszervezes audit traillel"
    ].join("\n"),
    labels: ["change", "scope"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement", "jira-project-bootstrap"],
      optionalSkills: ["jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "story-change-classify",
    issueType: "Story",
    parentId: "epic-change",
    summary: "Bejovo valtozasok osztalyozasa: CR, bug, reopen vagy uj scope",
    description: [
      "A rendszernek kulonbseget kell tennie uj scope, hibajavitas, visszanyitas es meglevo igeny modositasa kozott.",
      "",
      "Acceptance criteria:",
      "- a bejovo valtozas legalabb 4 osztaly valamelyikebe sorolhato",
      "- a besorolas nem pusztan issue type, hanem kontextus alapu dontes",
      "- ketertelmu esetben a rendszer explicit dontesi pontot jelez"
    ].join("\n"),
    labels: ["change", "classification"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement"],
      optionalSkills: ["jira-project-bootstrap"],
      executionMode: "implement"
    }
  },
  {
    id: "story-change-impact",
    issueType: "Story",
    parentId: "epic-change",
    summary: "Impact analysis a scopevaltozasokhoz, dependency-khez es release sorrendhez",
    description: [
      "Minden komoly valtozasnal fel kell merni, hogy mely issue-ket, dependency-ket, prioritast vagy release sorrendet erinti.",
      "",
      "Acceptance criteria:",
      "- az impact analysis az erintett issue-kat es dependency-ket felsorolja",
      "- jelzi, ha valtozas miatt issue-t vissza kell nyitni vagy splitelni kell",
      "- a release vagy sorrendi kockazat dokumentalt"
    ].join("\n"),
    labels: ["change", "impact"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-intake-refinement", "jira-execution-loop"],
      optionalSkills: ["jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "story-change-apply",
    issueType: "Story",
    parentId: "epic-change",
    summary: "Change plan alkalmazasa: reopen, modify, create es relink",
    description: [
      "A rendszer a jovahagyott valtozasi terv alapjan tudjon regi issue-t visszanyitni, modositani, uj issue-t letrehozni, es a kapcsolatokat atepiteni.",
      "",
      "Acceptance criteria:",
      "- a change plan vegrehajtasa Jira muveletekre bonthato",
      "- a reopen, modify, create es relink muveletek audit traillel mennek",
      "- a backlog valtozasa utolag is magyarazhato"
    ].join("\n"),
    labels: ["change", "execution"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop", "jira-intake-refinement"],
      optionalSkills: ["jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "epic-traceability",
    issueType: "Epic",
    summary: "Traceability, approval gate es audit trail",
    description: [
      "Cel: a nagy hatasu valtozasok, bugok es scope-dontesek emberileg is kovethetok es jovahagyhatok legyenek.",
      "",
      "Elvart eredmeny:",
      "- rovid, visszakeresheto dontesi naplo",
      "- approval gate nagy hatasu muveletekre",
      "- brieftol bugig es CR-ig tarto kapcsolatmodell"
    ].join("\n"),
    labels: ["audit", "traceability"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      optionalSkills: ["jira-workflow-admin"],
      executionMode: "implement"
    }
  },
  {
    id: "story-decision-trail",
    issueType: "Story",
    parentId: "epic-traceability",
    summary: "Dontesi naplo es valtozasi nyom brieftol issue-ig",
    description: [
      "A rendszernek rovid, visszakeresheto dontesi nyomot kell hagynia minden komoly backlog-, workflow- vagy scope-valtozas utan.",
      "",
      "Acceptance criteria:",
      "- a fontos dontesek nem vesznek el kommentzajban",
      "- brief, issue, bug es CR kozott visszakovetheto a kapcsolat",
      "- a valtozas oka roviden dokumentalt"
    ].join("\n"),
    labels: ["audit", "decision-log"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-execution-loop"],
      executionMode: "implement"
    }
  },
  {
    id: "story-approval-gates",
    issueType: "Story",
    parentId: "epic-traceability",
    summary: "Approval gate nagy hatasu workflow- es scope-muveletekre",
    description: [
      "A rendszernek kulon kell kezelnie azokat a muveleteket, amelyek workflow-atirat, tomeges backlog-modositas vagy nagy scope-valtozas miatt emberi jovahagyast igenyelnek.",
      "",
      "Acceptance criteria:",
      "- a rizikos muveletek kulon osztalyba sorolhatok",
      "- az approval gate triggerelheto policy alapjan",
      "- az asszisztens nem hajt vegre vakon nagy hatasu mutaciot"
    ].join("\n"),
    labels: ["audit", "approval"],
    executionMetadata: {
      requiredSkills: ["jira-core", "jira-workflow-admin"],
      optionalSkills: ["jira-execution-loop"],
      executionMode: "admin"
    }
  }
];

const DEPENDENCIES: DependencyBlueprint[] = [
  { blocks: "story-workflow-discovery", blockedBy: "story-readiness-policy" },
  { blocks: "story-readiness-policy", blockedBy: "story-workflow-apply" },
  { blocks: "story-dependency-model", blockedBy: "story-dependency-selection" },
  { blocks: "story-dependency-selection", blockedBy: "story-dependency-maintenance" },
  { blocks: "story-readiness-policy", blockedBy: "story-bug-evidence" },
  { blocks: "story-test-generation", blockedBy: "story-bug-evidence" },
  { blocks: "story-bug-evidence", blockedBy: "story-retest-loop" },
  { blocks: "story-change-classify", blockedBy: "story-change-impact" },
  { blocks: "story-change-impact", blockedBy: "story-change-apply" },
  { blocks: "story-workflow-apply", blockedBy: "story-approval-gates" },
  { blocks: "story-change-impact", blockedBy: "story-approval-gates" },
  { blocks: "story-change-apply", blockedBy: "story-decision-trail" },
  { blocks: "story-bug-evidence", blockedBy: "story-decision-trail" }
];

async function main(): Promise<void> {
  requireLiveConfirmation();

  const config = loadConfig();
  const jiraApi = new JiraApi(config);
  const projectKey = config.defaultProjectKey ?? "KAN";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const results: StepResult[] = [];

  const existingIssues = await jiraApi.searchIssues({
    jql: `project = ${projectKey} AND labels = "${LABELS[1]}" ORDER BY created ASC`,
    maxResults: 100,
    fields: ["summary", "issuelinks"]
  });
  const bySummary = new Map(
    (existingIssues.issues as ExistingIssue[]).map((issue) => [
      issue.fields?.summary ?? "",
      issue
    ])
  );

  const issueKeysById: Record<string, string> = {};
  const created: string[] = [];
  const reused: string[] = [];

  for (const blueprint of BLUEPRINTS) {
    const existing = bySummary.get(qualifiedSummary(blueprint.summary));

    if (existing?.key) {
      issueKeysById[blueprint.id] = existing.key;
      reused.push(existing.key);
      continue;
    }

    const payload: {
      projectKey: string;
      issueType: IssueType;
      summary: string;
      description?: string;
      labels: string[];
      parentIssueKey?: string;
    } = {
      projectKey,
      issueType: blueprint.issueType,
      summary: qualifiedSummary(blueprint.summary),
      labels: [...LABELS, ...(blueprint.labels ?? [])]
    };

    const description = buildIssueDescriptionWithExecutionMetadata(
      blueprint.description,
      blueprint.executionMetadata
    );

    if (description) {
      payload.description = description;
    }

    if (blueprint.parentId) {
      const parentIssueKey = issueKeysById[blueprint.parentId];

      if (parentIssueKey) {
        payload.parentIssueKey = parentIssueKey;
      }
    }

    const issue = await jiraApi.createIssue(payload);

    issueKeysById[blueprint.id] = issue.key;
    created.push(issue.key);
  }

  for (const dependency of DEPENDENCIES) {
    const sourceKey = issueKeysById[dependency.blocks];
    const targetKey = issueKeysById[dependency.blockedBy];

    if (!sourceKey || !targetKey) {
      continue;
    }

    if (await hasBlocksLink(jiraApi, sourceKey, targetKey)) {
      continue;
    }

    await jiraApi.linkIssues({
      typeName: "Blocks",
      inwardIssueKey: targetKey,
      outwardIssueKey: sourceKey,
      comment: "Codex capability roadmap dependency"
    });
  }

  results.push({
    step: "seed capability roadmap",
    ok: true,
    details: {
      projectKey,
      created,
      reused,
      issueKeysById
    }
  });

  const reportPath = resolve(
    process.cwd(),
    "artifacts",
    `capability-roadmap-live-seed-${timestamp}.json`
  );

  await mkdir(resolve(process.cwd(), "artifacts"), { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        projectKey,
        issueKeysById,
        created,
        reused,
        results
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Capability roadmap seed OK. Report written to ${reportPath}`);
  console.log(`Created: ${created.join(", ") || "none"}`);
  console.log(`Reused: ${reused.join(", ") || "none"}`);
}

function qualifiedSummary(summary: string): string {
  return `[Capability] ${summary}`;
}

async function hasBlocksLink(
  jiraApi: JiraApi,
  sourceIssueKey: string,
  targetIssueKey: string
): Promise<boolean> {
  const issue = (await jiraApi.getIssue(sourceIssueKey, [
    "summary",
    "issuelinks"
  ])) as ExistingIssue;
  const links = issue.fields?.issuelinks ?? [];

  return links.some((link) => {
    const target = link.outwardIssue?.key ?? link.inwardIssue?.key;
    return link.type?.name === "Blocks" && target === targetIssueKey;
  });
}

function requireLiveConfirmation(): void {
  if (!process.argv.includes("--confirm-live")) {
    throw new Error(
      "Refusing to run live Jira writes without the --confirm-live flag."
    );
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
