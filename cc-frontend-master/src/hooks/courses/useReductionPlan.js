import { useNavigate } from "react-router-dom";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";
import { useDrawer } from "@ims-systems-00/ims-ui-kit";

export function useReductionPlan() {
  const navigate = useNavigate();
  let { closeDrawer, openDrawer } = useDrawer();

  const course = {
    name: "Reduction Plan",
    description:
      "The Reduction Plan is designed to help you track and report on your carbon reduction initiatives.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-reduction-plan"]`,
        content: "Navigate here to find your Carbon Reduction initiatives.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="reduction-plan-years-container"]`,
        content:
          "Your reduction initiatives are organized according to your reporting period configuration. This list is automatically updated each year.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="reduction-plan-year-tile-0"]`,
        content:
          "Click to view your Planned or Completed Initiatives for this year.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="year-select-drop-down"]`,
        content:
          "You can also quickly change the deleted Reporting Year here to view that year’s data in the tables.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="planned-initiatives-tab"]`,
        content: "Find all your planned initiatives for the selected year.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="completed-initiatives-tab"]`,
        content: "Find all your complete initiatives for the selected year.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="add-innitive-button"]`,
        content: "Open the add form to add an initiative in the system.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="all-input-fields-together"]`,
        content: "Fill in all the relevant Carbo Initiative information.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="data-identified-alert-box"]`,
        content:
          "Only specify a Date Identified field if you want to add data for past Reporting Years. Otherwise, the system will automatically assign your initiative to the latest Reporting Year by default.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="bottom-date-implemented-checkbox"]`,
        content:
          "Specify a Date Identified field if you are adding some old data from the past for recording purposes. Otherwise, you can implement it from the details page later.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="initiative-submit-button"]`,
        content:
          "After you submit, this data will be used to build your automated reports. You can then monitor the progress and activities of these initiatives from the ‘View Details’ drawer.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="year-select-drop-down"]`,
        content: "Change the reporting year if you have back‑dated your data.",
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
        navigate("/reduction-plan");
      }
      if (
        index === 2 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        navigate("/initiatives/planned");
        setTimeout(() => {
          setCurrentStep(3);
          data.resumeTour();
        }, 500);
      }

      if (
        index === 6 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        openDrawer("add-form");
        setTimeout(() => {
          setCurrentStep(7);
          data.resumeTour();
        }, 1000);
      }
      if (
        index === 10 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        closeDrawer("add-form");
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
