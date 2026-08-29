import { useNavigate } from "react-router-dom";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";

export function useReportingPeriods() {
  const navigate = useNavigate();

  const course = {
    name: "Reporting Periods",
    description:
      "Learn about reporting periods and how they are generated automatically based on your reporting start date.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-report-settings"]`,
        content:
          "Click on ‘Report Settings’ in the sidebar to find your Reporting Periods.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="reporting-periods-configaration"]`,
        content: "Click on the Reporting Periods tab.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="reporting-periods-table"]`,
        content:
          "This table is automatically generated for you based on the ‘Reporting Start Date’ you configured before and will automatically update year on year.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="reporting-periods-table"]`,
        title: "Emission Factor Database Year",
        content:
          "‘Emissions Factor Database’ Year indicates the source DEFRA database that is used for calculating the emissions of that specific reporting period.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="reporting-periods-table"]`,
        title: "Annual Turnover (£)",
        content:
          "You can insert annual turnover directly within the table row, this is used to calculate intensity ratio in the reports.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="reporting-periods-table"]`,
        title: "Average Number of Employees",
        content:
          "You can insert average number of employees directly within the table row, this is used to calculate intensity ratio in the reports.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
    ],
    callback: function (data) {
      let { type, status, index, setCurrentStep, action, step } = data;
      if (type === EVENTS.STEP_AFTER && action !== ACTIONS.PREV) {
        setCurrentStep((prev) => prev + 1);
      }
      if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
        setCurrentStep((prev) => prev - 1);
      }

      if (index === 0) {
        navigate("/parameters/reporting-periods");
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
