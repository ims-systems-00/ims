import { useNavigate } from "react-router-dom";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";

export function useDashboard() {
  const navigate = useNavigate();

  const course = {
    name: "Dashboard",
    description:
      "The Dashboard gives you a real-time overview of your carbon usage as an organisation.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-dashboard"]`,
        content:
          "View your organisations carbon status from our real-time dashboard.",
        disableOverlayClose: true,
      },

      {
        target: `[data-tour-step="dashboard-year-change-drop-down"]`,
        content: "Select the relevant Reporting Year which you want to view.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="dashboard-top-four-cards"]`,
        content:
          "Total Scope Based Emissions gives you an overall of your emissions status.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="dashboard-category-chart"]`,
        content:
          "View category-based reporting charts and compare with base year.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="dashboard-bottom-two-table"]`,
        content:
          "Displays the categories and activities contributing most to overall emissions.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
    ],
    callback: function (data) {
      let { type, status, index, setCurrentStep, action, lifecycle } = data;

      if (type === EVENTS.STEP_AFTER && action !== ACTIONS.PREV) {
        setCurrentStep((prev) => prev + 1);
      }
      if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
        setCurrentStep((prev) => prev - 1);
      }

      if (index === 0) {
        navigate("/dashboard");
      }

      if (action === ACTIONS.SKIP) {
        data.pauseTour();
        setCurrentStep(0);
      }
      if (status === STATUS.FINISHED) {
        data.pauseTour();
        navigate("/parameters/guidelines");
        setCurrentStep(0);
      }
    },
  };
  return course;
}
