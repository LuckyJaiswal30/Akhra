import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import {
  getDb,
  industryInterests,
  milestones,
  organizations,
  problems,
  projectMembers,
  projects,
  projectTests,
  outcomes,
  proposals,
  withoutRls,
  type Transaction,
} from '@akhra/db';
import type { MilestoneStatus, ProblemStatus, TestResult } from '@akhra/shared';

export interface PublicSolution {
  title: string;
  summary: string;
  status: ProblemStatus;
  organizationName: string;
  teamSize: number;
  startedAt: Date | null;
  completedAt: Date | null;
  plan: {
    abstract: string;
    methodology: string;
    expectedOutcomes: string;
    timelineMonths: number;
    approvedAt: Date | null;
  } | null;
  milestones: { id: string; title: string; status: MilestoneStatus; dueDate: Date | null }[];
  tests: {
    id: string;
    title: string;
    method: string;
    result: TestResult;
    findings: string;
    conductedOn: Date;
  }[];
  outcomes: {
    id: string;
    type: string;
    title: string;
    detail: string | null;
    metricName: string | null;
    metricValue: number | null;
    reference: string | null;
    ipStatus: string | null;
  }[];
  partners: string[];
}

async function load(tx: Transaction, problemId: string): Promise<PublicSolution | null> {
  const [project] = await tx
    .select({
      id: projects.id,
      title: projects.title,
      summary: projects.summary,
      status: projects.status,
      startedAt: projects.startedAt,
      completedAt: projects.completedAt,
      organizationName: organizations.name,
    })
    .from(projects)
    // A report kept out of the public list keeps its solution out of it too.
    .innerJoin(problems, and(eq(problems.id, projects.problemId), eq(problems.isPublic, true)))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(eq(projects.problemId, problemId))
    .orderBy(desc(projects.createdAt))
    .limit(1);

  if (!project) return null;

  const [[team], [plan], milestoneRows, testRows, outcomeRows, partnerRows] = await Promise.all([
    tx
      .select({ value: count() })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id)),
    tx
      .select({
        abstract: proposals.abstract,
        methodology: proposals.methodology,
        expectedOutcomes: proposals.expectedOutcomes,
        timelineMonths: proposals.timelineMonths,
        approvedAt: proposals.reviewedAt,
      })
      .from(proposals)
      .where(and(eq(proposals.projectId, project.id), eq(proposals.status, 'approved')))
      .orderBy(desc(proposals.version))
      .limit(1),
    tx
      .select({
        id: milestones.id,
        title: milestones.title,
        status: milestones.status,
        dueDate: milestones.dueDate,
      })
      .from(milestones)
      .where(eq(milestones.projectId, project.id))
      .orderBy(asc(milestones.orderIndex), asc(milestones.createdAt)),
    tx
      .select({
        id: projectTests.id,
        title: projectTests.title,
        method: projectTests.method,
        result: projectTests.result,
        findings: projectTests.findings,
        conductedOn: projectTests.conductedOn,
      })
      .from(projectTests)
      .where(eq(projectTests.projectId, project.id))
      .orderBy(desc(projectTests.conductedOn)),
    tx
      .select({
        id: outcomes.id,
        type: outcomes.outcomeType,
        title: outcomes.title,
        detail: outcomes.detail,
        metricName: outcomes.impactMetricName,
        metricValue: outcomes.impactMetricValue,
        reference: outcomes.reference,
        ipStatus: outcomes.ipStatus,
      })
      .from(outcomes)
      .where(eq(outcomes.projectId, project.id))
      .orderBy(desc(outcomes.recordedAt)),
    tx
      .select({ name: organizations.name })
      .from(industryInterests)
      .innerJoin(organizations, eq(organizations.id, industryInterests.organizationId))
      .where(
        and(
          eq(industryInterests.projectId, project.id),
          inArray(industryInterests.status, ['accepted']),
        ),
      ),
  ]);

  return {
    title: project.title,
    summary: project.summary,
    status: project.status,
    organizationName: project.organizationName,
    teamSize: team?.value ?? 0,
    startedAt: project.startedAt,
    completedAt: project.completedAt,
    plan: plan ?? null,
    milestones: milestoneRows,
    tests: testRows,
    outcomes: outcomeRows.map((row) => ({
      ...row,
      metricValue: row.metricValue === null ? null : Number(row.metricValue),
    })),
    partners: partnerRows.map((row) => row.name),
  };
}

/**
 * Read without row-level security on purpose: this is the public record of a public report, and the
 * reader is usually signed out. Every narrowing the policies would do is done in the query above —
 * the report must be public, and only the approved plan is selected.
 */
export function publicSolution(problemId: string): Promise<PublicSolution | null> {
  return withoutRls(getDb(), (tx) => load(tx, problemId));
}
