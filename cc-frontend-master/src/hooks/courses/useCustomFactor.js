import { useNavigate } from "react-router-dom";
import CC_CONSTANTS from "../../constants";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";
import { useDrawer } from "@ims-systems-00/ims-ui-kit";
import CustomFactorsTour from "../../assets/image/custom_factors_tour.png";

export function useCustomFactor() {
  const navigate = useNavigate();
  const vistingCategory =
    CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES;

  const { openDrawer, closeDrawer } = useDrawer();

  const course = {
    name: "Using a custom factor",
    description:
      "This journey shows you how to add and configure your customer factors from your suppliers.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-categories"]`,
        content: "To add a custom factor, you need to navigate to a category.",
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
        // hideFooter: true,
        placement: "bottom",
        // spotlightClicks: true,
      },
      {
        target: `[data-tour-step="custom-factors-tab"]`,
        content:
          "You can configure your own custom factor, provided you include the appropriate sources.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="add-custom-factor-button"]`,
        content: "Click to add ‘Custom Factors’ from here.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="custom-factor-form-fields"]`,
        content:
          "Be sure to include the appropriate source details in the form for auditors’ verification.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="carbon-emissions-tab"]`,
        content:
          "After you've added a factor, it can be used when adding your data.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="add-calculation-button"]`,
        content: "Click ‘Add Data’ to get your pre-configured custom factor.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="select-relevant-calculations"]`,
        content: "Select ‘Custom’ as your ‘Calculation Method’.",
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="select-relevant-calculations"]`,
        content: (
          <div>
            <p>You can now find all your Custom Factors here</p>
            <img
              className="my-2 border rounded"
              alt="name"
              src={CustomFactorsTour}
            />
          </div>
        ),
        disableBeacon: true,
      },
      {
        target: `[data-tour-step="add-calculation-submit-button"]`,
        content:
          "Simply Click ‘Add Data’ after filling in required fields to save your configuration.",
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

        navigate("/categories/custom-factors");
        setTimeout(() => {
          setCurrentStep(4);
          data.resumeTour();
        }, 500);
      }

      if (
        index === 4 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        openDrawer("add-custom-factor-form");
        setTimeout(() => {
          setCurrentStep(5);
          data.resumeTour();
        }, 1000);
      }

      if (
        index === 5 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        closeDrawer("add-custom-factor-form");
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

      if (
        index === 7 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        openDrawer("add-form");
        setTimeout(() => {
          setCurrentStep(8);
          data.resumeTour();
        }, 1000);
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
