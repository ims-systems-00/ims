import { useNavigate } from "react-router-dom";
import CC_CONSTANTS from "../../constants";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";

export function useImportData() {
  const navigate = useNavigate();
  const vistingCategory =
    CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES;
  const course = {
    name: "How to Import Data",
    description:
      "Learn how to import data from a CSV file using the Import Data feature.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-categories"]`,
        content: "Find your categories here.",
        // disableBeacon: true,
      },
      {
        target: `[data-tour-step="${vistingCategory}"]`,
        content: "This is where you can find all the categories.",
        // disableBeacon: true,
      },
      {
        target: `[data-tour-step="tile-category-opener"]`,
        content: "Click here to open and view a category.",
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
      },
      {
        target: `[data-tour-step="data-import-tab"]`,
        content: "Click on the import data tab.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="import-data-table"]`,
        content:
          "Copy the relevant data from one or more Excel spreadsheets and paste it into the system. Only the reference and amount are required—the remaining details can be selected directly within the system.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="import-data-table"]`,
        content:
          "Validate the data by selecting the right ‘Reporting Year’ and ‘Unit of Measurement’.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="import-data-submit-button"]`,
        content:
          "“Simply click ‘Validate and Import Data’. Your data will automatically be transferred to the appropriate category.”",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="calculation-data-table"]`,
        content: "All imported data are displayed here for your review.",
        disableOverlayClose: true,
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

        navigate("/categories/data-import");
        setTimeout(() => {
          setCurrentStep(4);
          data.resumeTour();
        }, 500);
      }

      if (
        index === 6 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        navigate("/categories?category=" + vistingCategory);
        setTimeout(() => {
          setCurrentStep(7);
          data.resumeTour();
        }, 500);
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
