'use server';

import { revalidatePath } from 'next/cache';
import {
  ACADEMIC_DISCIPLINES,
  DOMAINS,
  facultyExpertiseSchema,
  institutionProfileSchema,
  INSTITUTION_FACILITIES,
  createProjectSchema,
  projectMemberSchema,
  proposalSchema,
  routingResponseSchema,
  UNIVERSITY_ROLES,
  type ActionState,
} from '@akhra/shared';
import { formId, parseInput, runAction } from '@/server/api';
import { requireRole } from '@/server/session';
import { setFacultyExpertise, updateInstitutionProfile } from './profile';
import {
  addProjectMember,
  createProject,
  removeProjectMember,
  respondToRouting,
  submitProposal,
} from './service';

export async function respondToRoutingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('routing response', async () => {
    const actor = await requireRole(...UNIVERSITY_ROLES);
    const routingId = formId(formData, 'routingId');
    const input = parseInput(routingResponseSchema, {
      response: formData.get('response'),
      note: formData.get('note') || undefined,
    });
    await respondToRouting(actor, routingId, input.response, input.note);
    revalidatePath('/university');
    return { message: 'Response recorded.' };
  });
}

export async function createProjectAction(
  _prev: ActionState<{ projectId: string }>,
  formData: FormData,
): Promise<ActionState<{ projectId: string }>> {
  return runAction('project creation', async () => {
    const actor = await requireRole(...UNIVERSITY_ROLES);
    const problemId = formId(formData, 'problemId');
    const input = parseInput(createProjectSchema, {
      title: formData.get('title'),
      summary: formData.get('summary'),
      facultyMentorId: formData.get('facultyMentorId') || undefined,
    });
    const project = await createProject(actor, { problemId, ...input });
    revalidatePath('/university');
    return { data: { projectId: project.id }, message: 'Project created.' };
  });
}

export async function addMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('adding a team member', async () => {
    const actor = await requireRole(...UNIVERSITY_ROLES);
    const projectId = formId(formData, 'projectId');
    const input = parseInput(projectMemberSchema, {
      userId: formData.get('userId'),
      memberRole: formData.get('memberRole'),
      discipline: formData.get('discipline') || undefined,
    });
    await addProjectMember(actor, projectId, input);
    revalidatePath(`/projects/${projectId}`);
    return { message: 'Team member added.' };
  });
}

export async function removeMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('removing a team member', async () => {
    const actor = await requireRole(...UNIVERSITY_ROLES);
    const projectId = formId(formData, 'projectId');
    const userId = formId(formData, 'userId');
    await removeProjectMember(actor, projectId, userId);
    revalidatePath(`/projects/${projectId}`);
    return { message: 'Team member removed.' };
  });
}

export async function submitProposalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('proposal submission', async () => {
    const actor = await requireRole(...UNIVERSITY_ROLES);
    const projectId = formId(formData, 'projectId');
    const input = parseInput(proposalSchema, {
      abstract: formData.get('abstract'),
      methodology: formData.get('methodology'),
      expectedOutcomes: formData.get('expectedOutcomes'),
      timelineMonths: formData.get('timelineMonths'),
      budgetEstimate: formData.get('budgetEstimate') || undefined,
      status: formData.get('status') || 'submitted',
    });
    const result = await submitProposal(actor, projectId, input);
    revalidatePath(`/projects/${projectId}`);
    return { message: `Proposal version ${result.version} saved.` };
  });
}

/**
 * The profile form posts one strength per area (0 meaning "not an area we work on") and a checkbox
 * per discipline and facility, so each list is read against its fixed set of values.
 */
export async function updateInstitutionProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('updating the institution profile', async () => {
    const actor = await requireRole('university_admin');
    const input = parseInput(institutionProfileSchema, {
      description: formData.get('description') ?? '',
      domains: DOMAINS.map((domain) => ({
        domain,
        strength: Number(formData.get(`strength_${domain}`) ?? 0),
      })).filter((row) => row.strength > 0),
      disciplines: ACADEMIC_DISCIPLINES.filter((d) => formData.get(`discipline_${d}`) === 'on'),
      facilities: INSTITUTION_FACILITIES.filter((f) => formData.get(`facility_${f}`) === 'on'),
    });
    await updateInstitutionProfile(actor, input);
    revalidatePath('/university/profile');
    revalidatePath('/university');
    return { message: 'Profile saved. Referrals will be matched against it from now on.' };
  });
}

export async function setFacultyExpertiseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction('recording a colleague’s discipline', async () => {
    const actor = await requireRole('university_admin');
    const userId = formId(formData, 'userId');
    const input = parseInput(facultyExpertiseSchema, {
      discipline: formData.get('discipline'),
      specialisation: formData.get('specialisation') || undefined,
    });
    await setFacultyExpertise(actor, userId, input);
    revalidatePath('/university/profile');
    return { message: 'Saved.' };
  });
}
