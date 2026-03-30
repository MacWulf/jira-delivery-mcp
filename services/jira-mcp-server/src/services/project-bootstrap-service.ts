export type SoftwareDeliveryModel = "kanban" | "scrum";
export type SoftwareManagementModel = "team-managed" | "company-managed";

export type SoftwareProjectBootstrapPlan = {
  projectTypeKey: "software";
  projectTemplateKey: string;
  deliveryModel: SoftwareDeliveryModel;
  managementModel: SoftwareManagementModel;
};

export class ProjectBootstrapService {
  planSoftwareProject(input?: {
    deliveryModel?: SoftwareDeliveryModel;
    managementModel?: SoftwareManagementModel;
  }): SoftwareProjectBootstrapPlan {
    const deliveryModel = input?.deliveryModel ?? "kanban";
    const managementModel = input?.managementModel ?? "team-managed";

    return {
      projectTypeKey: "software",
      projectTemplateKey: resolveSoftwareTemplateKey(
        deliveryModel,
        managementModel
      ),
      deliveryModel,
      managementModel
    };
  }
}

function resolveSoftwareTemplateKey(
  deliveryModel: SoftwareDeliveryModel,
  managementModel: SoftwareManagementModel
): string {
  if (managementModel === "team-managed") {
    return deliveryModel === "kanban"
      ? "com.pyxis.greenhopper.jira:gh-simplified-agility-kanban"
      : "com.pyxis.greenhopper.jira:gh-simplified-agility-scrum";
  }

  return deliveryModel === "kanban"
    ? "com.pyxis.greenhopper.jira:gh-simplified-kanban-classic"
    : "com.pyxis.greenhopper.jira:gh-simplified-scrum-classic";
}
