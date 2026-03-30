import type { IssueExecutionMetadataInput } from "./issue-execution-metadata.js";

export type KickoffItemType = "Epic" | "Story" | "Task";

export type KickoffItemBlueprint = {
  id: string;
  issueType: KickoffItemType;
  summary: string;
  description: string;
  executionMetadata?: IssueExecutionMetadataInput;
  parentId?: string;
  labels?: string[];
  marksDone?: boolean;
  startWork?: boolean;
};

export type KickoffDependencyBlueprint = {
  blocks: string;
  blockedBy: string;
};

export type KickoffTemplate = {
  key: "codex-jira-assistant-mvp";
  name: string;
  labels: string[];
  items: KickoffItemBlueprint[];
  dependencies: KickoffDependencyBlueprint[];
};

export function buildCodexJiraAssistantKickoffTemplate(): KickoffTemplate {
  return {
    key: "codex-jira-assistant-mvp",
    name: "Codex Jira Assistant MVP",
    labels: ["codex-managed", "jira-integration", "product-backlog"],
    items: [
      {
        id: "epic-bootstrap",
        issueType: "Epic",
        labels: ["epic"],
        summary: "Projekt bootstrap es kickoff automatizalas",
        description: [
          "Cel: a jovobeli Codex-projektek inditasa kontrollalt Jira bootstrapon keresztul tortenjen.",
          "",
          "Elvart eredmeny:",
          "- bootstrap input contract",
          "- projektletrehozas es template-valasztas",
          "- kickoff checklist es kezdeti artifact seed"
        ].join("\n")
      },
      {
        id: "story-brief-schema",
        issueType: "Story",
        parentId: "epic-bootstrap",
        labels: ["story"],
        startWork: true,
        summary: "Bootstrap input contract es project brief schema definialasa",
        description: [
          "PO szemszogbol a projektinditas csak akkor automatizalhato biztonsagosan, ha a brief strukturalt es ellenorizheto.",
          "",
          "Acceptance criteria:",
          "- a kickoff brief kotelezo es opcionlis mezoit formalisan definialjuk",
          "- a schema tartalmazza a projektcel, scope, delivery model, ownership es definition of done elemeket",
          "- ervenytelen input eseten a rendszer egyertelmu hibakat ad vissza"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap"],
          optionalSkills: ["jira-intake-refinement"],
          executionMode: "implement"
        }
      },
      {
        id: "story-project-create",
        issueType: "Story",
        parentId: "epic-bootstrap",
        labels: ["story"],
        summary: "Jira projekt letrehozasi es template-valasztasi folyamat veglegesitese",
        description: [
          "A projekt bootstrapnak professzionalis modon kell dontenie a megfelelo Jira projekt-tipusrol es template-rol.",
          "",
          "Acceptance criteria:",
          "- a kickoff brief alapjan eldontjuk a software/business/service desk iranyt",
          "- a management model es delivery model valasztasa dokumentalt",
          "- a bootstrap eredmenye audit-olhato"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap"],
          optionalSkills: ["jira-workflow-admin"],
          executionMode: "implement"
        }
      },
      {
        id: "story-kickoff-artifacts",
        issueType: "Story",
        parentId: "epic-bootstrap",
        labels: ["story"],
        summary: "Kickoff checklist es kezdeti projekt artifactok seedelese",
        description: [
          "A projektinditasnak nem csak projektet kell letrehoznia, hanem a kezdeti operacios artefaktumokat is.",
          "",
          "Acceptance criteria:",
          "- kickoff checklist jegyek letrejonnek",
          "- ownership es default operacios elemek rogzitettek",
          "- a kezdeti seed nem hagy ki kritikus indito lepeseket"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap"],
          executionMode: "implement"
        }
      },
      {
        id: "epic-backlog",
        issueType: "Epic",
        labels: ["epic"],
        summary: "Backlog generalas es dependency modellezes",
        description: [
          "Cel: a projekt briefbol valodi, dolgozhato delivery backlog alljon elo, nem csak elszigetelt issue-k.",
          "",
          "Elvart eredmeny:",
          "- epic/story/task generalas",
          "- explicit dependency graph",
          "- idempotens ujrafutas"
        ].join("\n")
      },
      {
        id: "story-backlog-generate",
        issueType: "Story",
        parentId: "epic-backlog",
        labels: ["story"],
        summary: "Briefbol epicek, storyk es taskok generalasa",
        description: [
          "A briefnek automatikusan backlogga kell alakulnia, hogy a projekt a kickoff utan azonnal munkakepes legyen.",
          "",
          "Acceptance criteria:",
          "- a briefbol epicek, storyk es taskok jonnek letre",
          "- a jegyek leirasa tartalmazza a szandekot es a feldolgozasi kontextust",
          "- a backlog megfelel a PO altal elvart szeletezesnek"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: [
            "jira-core",
            "jira-project-bootstrap",
            "jira-intake-refinement"
          ],
          executionMode: "implement"
        }
      },
      {
        id: "story-dependency-graph",
        issueType: "Story",
        parentId: "epic-backlog",
        labels: ["story"],
        summary: "Dependency graph es blocks link kezeles bevezetese",
        description: [
          "A delivery sorrendhez explicit dependency model kell, kulonben az asszisztens rossz sorrendben kezdhet dolgozni.",
          "",
          "Acceptance criteria:",
          "- a blokkolasi logika `Blocks` issue linkeken alapul",
          "- a rendszer el tudja kuloniteni a startolhato es blokkolt munkat",
          "- a dependency-k ujrageneralasa nem okoz kaoszt"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap"],
          optionalSkills: ["jira-execution-loop"],
          executionMode: "implement"
        }
      },
      {
        id: "story-idempotent-rerun",
        issueType: "Story",
        parentId: "epic-backlog",
        labels: ["story"],
        summary: "Idempotens ujrafutas es duplicate vedelem",
        description: [
          "A kickoff es backlog seed csak akkor uzemszeru, ha tobbszor is futtathato duplikaciok nelkul.",
          "",
          "Acceptance criteria:",
          "- ugyanazon projekt seed ujrafutasa nem gyart ujra mindent",
          "- a duplikalt issue-k es dependency-k felismerhetok",
          "- a seed eredmenye transzparens riporttal zarul"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-project-bootstrap"],
          executionMode: "implement"
        }
      },
      {
        id: "epic-execution",
        issueType: "Epic",
        labels: ["epic"],
        summary: "Vegrehajtasi orchestrator es issue lifecycle",
        description: [
          "Cel: a backlog seed utan az asszisztens tenylegesen tudja vezetni a munkat Jira-ban.",
          "",
          "Elvart eredmeny:",
          "- kovetkezo issue valasztas",
          "- statusz es komment orchestration",
          "- readiness alapu handoff es done"
        ].join("\n")
      },
      {
        id: "story-next-issue",
        issueType: "Story",
        parentId: "epic-execution",
        labels: ["story"],
        summary: "Kovetkezo nem blokkolt issue kivalasztasa",
        description: [
          "A Codexnek a backlogbol a kovetkezo helyes munkat kell felvennie.",
          "",
          "Acceptance criteria:",
          "- a done es blokkolt issue-k nem kerulnek kivalsztasra",
          "- a prioritasi szabalyok konfiguralhatok",
          "- a valasztas indoklasa visszaadhato"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-execution-loop"],
          executionMode: "implement"
        }
      },
      {
        id: "story-work-lifecycle",
        issueType: "Story",
        parentId: "epic-execution",
        labels: ["story"],
        summary: "Munkainditas, komment, worklog es statuszlepes orchestralasa",
        description: [
          "A valodi delivery loophoz az issue allapotat es a kiserofolyamatokat is kezelni kell.",
          "",
          "Acceptance criteria:",
          "- a rendszer el tudja inditani a munkat a megfelelo transitionnel",
          "- komment es worklog automatikusan rogzitheto",
          "- a statuszlepesek projektpolitika szerint mennek"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-execution-loop"],
          optionalSkills: ["jira-workflow-admin"],
          executionMode: "implement"
        }
      },
      {
        id: "story-readiness",
        issueType: "Story",
        parentId: "epic-execution",
        labels: ["story"],
        summary: "Readiness alapu handoff es done logika",
        description: [
          "A done allapotot nem szabad pusztan mechanikusan allitani.",
          "",
          "Acceptance criteria:",
          "- review, teszt es dokumentacios checklist tamogatott",
          "- a done transition elott readiness check fut",
          "- a handoff es close viselkedese audit-olhato"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: [
            "jira-core",
            "jira-execution-loop",
            "jira-intake-refinement"
          ],
          executionMode: "implement"
        }
      },
      {
        id: "epic-governance",
        issueType: "Epic",
        labels: ["epic"],
        summary: "Governance, workflow policy es dokumentacios reteg",
        description: [
          "Cel: a rendszer ne csak mukodjon, hanem uzemszeru legyen tobb jovobeli Codex-projekthez is.",
          "",
          "Elvart eredmeny:",
          "- workflow policy map",
          "- approval es audit gate",
          "- kickoff dokumentacio"
        ].join("\n")
      },
      {
        id: "story-workflow-policy",
        issueType: "Story",
        parentId: "epic-governance",
        labels: ["story"],
        summary: "Project-specifikus workflow es status policy reteg",
        description: [
          "A rendszernek tanulnia kell a projekt workflowjat, nem beleegetett allapotokra tamaszkodnia.",
          "",
          "Acceptance criteria:",
          "- a workflow es transition policy projekt-szinten modellezett",
          "- team-managed es egyedi workflow-k kulonbsege kezelheto",
          "- a delivery loop csak ervenyes transitionoket hasznal"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core", "jira-workflow-admin"],
          optionalSkills: ["jira-execution-loop"],
          executionMode: "admin"
        }
      },
      {
        id: "story-audit-approval",
        issueType: "Story",
        parentId: "epic-governance",
        labels: ["story"],
        summary: "Approval gate es audit trail kritikus muveletekre",
        description: [
          "A nagy hatasu muveleteket kontrollaltan kell futtatni.",
          "",
          "Acceptance criteria:",
          "- a kritikus irasok es workflow-muveletek audit trailt kapnak",
          "- a rizikos muveletek approval gate-re tehetok",
          "- a naplozas utolag visszakovetheto"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core"],
          optionalSkills: ["jira-workflow-admin"],
          executionMode: "implement"
        }
      },
      {
        id: "story-docs-confluence",
        issueType: "Story",
        parentId: "epic-governance",
        labels: ["story"],
        summary: "Kickoff dokumentacio es Confluence szinkron",
        description: [
          "A projektinditas eredmenyet emberileg is olvashato modon dokumentalni kell.",
          "",
          "Acceptance criteria:",
          "- kickoff dokumentacio legeneralhato",
          "- a repo es Confluence kozotti szerepkor tiszta",
          "- a projektinditas eredmenye utolag is ertelmezheto"
        ].join("\n"),
        executionMetadata: {
          requiredSkills: ["jira-core"],
          optionalSkills: ["jira-project-bootstrap"],
          executionMode: "implement"
        }
      }
    ],
    dependencies: [
      { blocks: "story-brief-schema", blockedBy: "story-project-create" },
      { blocks: "story-brief-schema", blockedBy: "story-kickoff-artifacts" },
      { blocks: "story-brief-schema", blockedBy: "story-backlog-generate" },
      { blocks: "story-brief-schema", blockedBy: "story-docs-confluence" },
      { blocks: "story-project-create", blockedBy: "story-backlog-generate" },
      { blocks: "story-backlog-generate", blockedBy: "story-dependency-graph" },
      { blocks: "story-backlog-generate", blockedBy: "story-idempotent-rerun" },
      { blocks: "story-workflow-policy", blockedBy: "story-next-issue" },
      { blocks: "story-workflow-policy", blockedBy: "story-work-lifecycle" },
      { blocks: "story-work-lifecycle", blockedBy: "story-audit-approval" },
      { blocks: "story-workflow-policy", blockedBy: "story-audit-approval" }
    ]
  };
}
