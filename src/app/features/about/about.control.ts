export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'review', title: 'Review the product or design', description: 'The product specifications or custom reference are checked before confirmation.', icon: 'pi pi-search' },
  { id: 'confirm', title: 'Confirm the requirements', description: 'Size, material, color, finish, price, and production information are confirmed for the order.', icon: 'pi pi-check-circle' },
  { id: 'produce', title: 'Manufacture the piece', description: 'Made-to-order production begins after confirmation using the selected product requirements.', icon: 'pi pi-cog' },
  { id: 'prepare', title: 'Prepare for delivery', description: 'The completed piece is checked and delivery arrangements are handled separately from production.', icon: 'pi pi-box' }
];

export const SERVICE_PRINCIPLES: WorkflowStep[] = [
  { id: 'data', title: 'Product-specific specifications', description: 'Material, finish, dimensions, weight, and safety information are managed per product.', icon: 'pi pi-list' },
  { id: 'media', title: 'Photos before interactive media', description: 'Product information stays usable if a 3D model or WebGL is unavailable.', icon: 'pi pi-images' },
  { id: 'custom', title: 'Custom feasibility review', description: 'Custom designs are checked for printability and permissions before they can be accepted.', icon: 'pi pi-verified' }
];
