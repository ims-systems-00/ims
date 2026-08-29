import { useNavigate } from "react-router-dom";
import { STATUS, EVENTS, ACTIONS } from "react-joyride";
import { useDrawer } from "@ims-systems-00/ims-ui-kit";

export function useAddLocationOrSites() {
  const navigate = useNavigate();

  const { openDrawer, closeDrawer } = useDrawer();

  const course = {
    name: "Add Locations/Sites",
    description: "Specify your organisation’s operational locations and sites.",
    steps: [
      {
        target: `[data-tour-step="sidebar-menu-item-report-settings"]`,
        content:
          "Click on ‘Report Settings’ in the sidebar to find your Reporting Periods.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="locations-configaration"]`,
        content:
          "Click on ‘Locations’ to view, edit and update your locations.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="add-location-button"]`,
        content:
          "Click here to open the form to start creating a new location.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="location-name-input"]`,
        content: "Enter the name of your location here.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="location-map-picker"]`,
        content: "Pick the exact location on the map for accurate positioning.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="manual-address-input"]`,
        content:
          "Alternatively, you can manually enter the address if map selection isn’t convenient.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="other-details-section"]`,
        content: "Provide any additional details about the location here.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="add-location-submit-button"]`,
        content:
          "After filling out the form, click this button to save the location.",
        disableBeacon: true,
        disableOverlayClose: true,
      },
      {
        target: `[data-tour-step="locations-data-table"]`,
        content:
          "“All your saved locations can be accessed in the Calculations tab under the locations drop‑down. These will also be useful for location‑based reporting, which will be available soon.”",
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
        navigate("/parameters/locations");
      }

      if (
        index === 2 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        data.pauseTour();

        openDrawer("add-location-form");
        setTimeout(() => {
          setCurrentStep(3);
          data.resumeTour();
        }, 1000);
      }

      if (
        index === 7 &&
        action !== ACTIONS.PREV &&
        type === EVENTS.STEP_AFTER
      ) {
        closeDrawer("add-location-form");
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
