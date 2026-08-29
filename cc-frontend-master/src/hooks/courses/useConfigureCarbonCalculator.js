import { useNavigate } from "react-router-dom";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";

export function useConfigureCarbonCalculator() {
  const navigate = useNavigate();

  const course = {
    name: "Configure your Carbon Calculator",
    description:
      "Configure the parameters that are used for automation of your Dashboard and Reports.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-report-settings"]`,
        title: "Report Settings Navigation",
        content:
          "Click on ‘Report Settings’ in the sidebar to find your carbon calculator configurations.",
        // disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="select-the-reporting-start-date"]`,
        title: "Report Start Date",
        content:
          "Ensure you select the correct ‘Reporting Start Date’, as it is used for automating your reporting periods and the reports.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="select-base-reporting"]`,
        title: "The Base Year",
        content:
          "It is recommended to select the ‘Base Year’ and ‘Reporting Start Date’ as the same, this is a critical parameter for real-time tracking and reporting progress.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="reporting-method-and-organisational"]`,
        content:
          "Configure your ‘Reporting Method’ and ‘Organisational Boundary’.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="add-net-zero-target"]`,
        content:
          "Your Net Zero Target will help shape your organisation year on year.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="click-update-button"]`,
        content: "Finally, click the update button to save your configuration.",
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
        navigate("/parameters/reporting-overview");
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
