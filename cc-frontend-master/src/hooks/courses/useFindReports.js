import { useNavigate } from "react-router-dom";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";

export function useFindReports() {
  const navigate = useNavigate();

  const course = {
    name: "View Reports",
    description: "View your automated reports.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-reports"]`,
        content: "Find your reports here.",
      },

      {
        target: `[data-tour-step="iso-14064-full-report"]`,
        content: "Click to open a report.",
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        placement: "bottom",
      },
      {
        target: `[data-tour-step="select-year-of-report"]`,
        content: "Select the year you want to view from the dropdown.",
        disableBeacon: true,
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
        navigate("/reports");
      }
      if (
        index === 1 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        navigate("/iso-14064-full-report");
        setTimeout(() => {
          setCurrentStep(2);
          data.resumeTour();
        }, 3000);
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
