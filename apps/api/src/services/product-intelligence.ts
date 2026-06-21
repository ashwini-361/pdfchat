import {
  competitiveBenchmarks,
  deploymentTargets,
  sampleStudyPack,
  studentFeatureModules,
} from '@doc-chat/shared';
import type { StudyPack } from '@doc-chat/shared';

export const listCompetitiveBenchmarks = async () => competitiveBenchmarks;

export const listStudentFeatures = async () => studentFeatureModules;

export const listDeploymentTargets = async () => deploymentTargets;

export const generateStudyPack = async (input: {
  documentId: string;
  title?: string;
  focus?: string;
}): Promise<StudyPack> => ({
  ...sampleStudyPack,
  documentId: input.documentId,
  title: input.title ?? sampleStudyPack.title,
  summary: input.focus
    ? `${sampleStudyPack.summary} Focus area requested: ${input.focus}.`
    : sampleStudyPack.summary,
});

