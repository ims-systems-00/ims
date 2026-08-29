import { useNavigate } from "react-router-dom";
import CC_CONSTANTS from "../../constants";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";
import { useDrawer } from "@ims-systems-00/ims-ui-kit";

export function useCalculationsForm() {
  const navigate = useNavigate();
  let { closeDrawer, openDrawer } = useDrawer();
  const vistingCategory =
    CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES;
  const course = {
    name: "How to Add Data",
    description: "Add data to the relevant categories.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-categories"]`,
        content: "Find your categories here.",
        // disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="${vistingCategory}"]`,
        content: "Ensure that you have selected the right category.",
        // disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="tile-category-opener"]`,
        content: "Ensure that you have selected the right category.",
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        // hideFooter: true,
        placement: "bottom",
        // spotlightClicks: true,
      },
      {
        target: `[data-tour-step="add-calculation-button"]`,
        content: "Click here to Add Data.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="add-additional-information"]`,
        content:
          "These are optional meta data fields that contain additional information about this data point.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="add-reporting-year"]`,
        content:
          "Reporting Year adds this data point to the reports for the year you select from the dropdown.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="select-relevant-calculations"]`,
        content:
          "Select the calculations that are most relevant to your needs.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      // {
      //   target: `[data-tour-step="add-activities"]`,
      //   content:
      //     "Type - type of Activities are sorted according to the calculations method you chose.",
      //   disableBeacon: true,
      // },
      // {
      //   target: `[data-tour-step="select-right-unit"]`,
      //   content: "Select the right unit of measurement.",
      //   disableBeacon: true,
      // },
      {
        target: `[data-tour-step="add-actual-amount"]`,
        content: "Insert the actual amount of your consumption.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="add-data-grade"]`,
        content:
          "The data grade affects the reported emissions and is reflected in your full ISO 14064‑1 report..",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="add-calculation-submit-button"]`,
        content:
          "Finally, click the ‘Add Data’ button to save your configuration.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="calculation-data-table"]`,
        content: "All emissions are displayed here for your review.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
    ],
    callback: function (data) {
      let { type, status, index, setCurrentStep, action } = data;

      if (type === EVENTS.STEP_AFTER && action !== ACTIONS.PREV) {
        setCurrentStep((prev) => prev + 1);
      }
      if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
        setCurrentStep((prev) => prev - 1);
      }

      if (index === 0) {
        navigate("/calculations/categories");
      }
      if (
        index === 2 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        navigate("/categories?category=" + vistingCategory);
        setTimeout(() => {
          setCurrentStep(3);
          data.resumeTour();
        }, 500);
      }

      if (
        index === 3 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        openDrawer("add-form");
        setTimeout(() => {
          setCurrentStep(4);
          data.resumeTour();
        }, 1000);
      }

      if (
        index === 3 &&
        action === ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        navigate("/calculations/categories");
        setTimeout(() => {
          setCurrentStep(2);
          data.resumeTour();
        }, 500);
      }

      if (
        index === 9 &&
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
