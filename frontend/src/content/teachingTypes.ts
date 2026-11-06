export type TeachingContent = {
  idea: string[];
  example: { title: string; body: string[]; limitation: string };
  mechanism: { title: string; body: string }[];
  bridge: { intro: string; focus: string[]; firstAction: string; expected: string };
  steps: { title: string; action: string; observe: string; why: string }[];
};
