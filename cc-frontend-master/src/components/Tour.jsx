import React, { useContext, useState } from "react";
import Joyride, { STATUS } from "react-joyride";
import { Box } from "./Box";
import classNames from "classnames";
export const Context = React.createContext({
  setSteps: function () {},
  startTour: function () {},
  setRun: function () {},
  setCallback: function () {},
  markTourAsEnded: function () {},
});
export function useTour() {
  return useContext(Context);
}
function emptyCallback() {}
export function Tour({ children }) {
  const [run, setRun] = useState(false);
  const [callback, setCallback] = useState(emptyCallback);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  function startTour(course) {
    setRun(true);
    setSteps(course.steps || []);
    setCallback(() => course.callback || emptyCallback);
  }
  function markTourAsEnded() {
    setRun(false);
    setCallback(() => emptyCallback);
    setSteps([]);
  }

  function getStep(stepId) {
    return steps.find((step) => step.target === `[data-tour-step="${stepId}"]`);
  }

  return (
    <React.Fragment>
      <Joyride
        run={run}
        steps={steps}
        callback={function (data) {
          let { status } = data;
          callback({
            ...data,
            setCurrentStep: setCurrentStep,
            pauseTour: () => setRun(false),
            resumeTour: () => setRun(true),
          });
          // doing generic staff here...
          // if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
          //   markTourAsEnded();
          // }
        }}
        styles={{
          options: {
            arrowColor: "#fff",
            backgroundColor: "#fff",
            overlayColor: "rgba(0, 0, 0, 0.6)",
            primaryColor: "#000",
            textColor: "#004a14",
            // width: 400,
            zIndex: 1060,
          },
          overlay: {
            mixBlendMode: "darken",
          },
          spotlight: {
            borderRadius: "12px",
            border: "2px solid #daff99",
            backgroundColor: "#fff",
          },
        }}
        stepIndex={currentStep}
        showSkipButton
        hideBackButton
        tooltipComponent={Tooltip}
      />
      <Context.Provider
        value={{
          setSteps,
          setCallback,
          setRun,
          startTour,
          markTourAsEnded,
          getStep,
        }}
      >
        {children}
      </Context.Provider>
    </React.Fragment>
  );
}

function Tooltip({
  backProps,
  continuous,
  index,
  isLastStep,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
}) {
  return (
    <Box minWidth={360} maxWidth={400} {...tooltipProps}>
      <div>
        {step.title && <h5>{step.title}</h5>}
        {step.content && (
          <div className="text-justify pt-2 fs-6 fw-medium">{step.content}</div>
        )}
      </div>
      <div className="mt-4">
        <div
          className={classNames("d-flex align-items-center", {
            "justify-content-end": isLastStep,
            "justify-content-between": !isLastStep,
          })}
        >
          {!isLastStep && (
            <button
              className="border-0 text-capitalize fs-6 bg-transparent p-0 fw-bold"
              {...skipProps}
            >
              skip
            </button>
          )}
          <div>
            {/* {index > 0 && (
              <Button {...backProps} size="sm">
                back
              </Button>
            )} */}

            <button
              className="border-0 text-success text-capitalize fs-6 bg-transparent fw-bold"
              {...primaryProps}
            >
              {isLastStep ? "Finish" : "next"}
            </button>
          </div>
        </div>
      </div>
    </Box>
  );
}
