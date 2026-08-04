export interface WorkflowStep {
  stepNumber: string;
  title: string;
  description: string;
  icon: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stepNumber: '01',
    title: '3D Modeling & CAD Refinement',
    description: 'Every anime prop begins with detailed digital mesh modeling to ensure true-to-anime guard geometries and proportion balance.',
    icon: 'pi pi-desktop'
  },
  {
    stepNumber: '02',
    title: 'High-Density PLA Printing',
    description: 'We slice models for high structural fill density and print using premium matte PLA+ filaments at ultra-fine layer height.',
    icon: 'pi pi-box'
  },
  {
    stepNumber: '03',
    title: 'Hand Inspection & Safety Check',
    description: 'Each piece undergoes strict quality check to verify non-sharp safety edges and structural rigidity before shipment.',
    icon: 'pi pi-shield'
  },
  {
    stepNumber: '04',
    title: 'Secure Otaku Packaging',
    description: 'Items are packaged in reinforced anime-themed boxes to guarantee safe worldwide arrival to your doorstep.',
    icon: 'pi pi-send'
  }
];
