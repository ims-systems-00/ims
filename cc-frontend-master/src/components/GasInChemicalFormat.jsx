import CC_CONSTANTS from "../constants";
const formats = {
  [CC_CONSTANTS.CC_GHG_GASSES.CO2E]: (
    <span>
      CO<sub>2</sub>e
    </span>
  ),
  [CC_CONSTANTS.CC_GHG_GASSES.CO2]: (
    <span>
      CO<sub>2</sub>
    </span>
  ),
  [CC_CONSTANTS.CC_GHG_GASSES.CH4]: (
    <span>
      CH<sub>4</sub>
    </span>
  ),
  [CC_CONSTANTS.CC_GHG_GASSES.SF6]: (
    <span>
      SF<sub>6</sub>
    </span>
  ),
  [CC_CONSTANTS.CC_GHG_GASSES.N2O]: (
    <span>
      N<sub>2</sub>O
    </span>
  ),
  [CC_CONSTANTS.CC_GHG_GASSES.PFC]: (
    <span>{CC_CONSTANTS.CC_GHG_GASSES.PFC}s</span>
  ),
  [CC_CONSTANTS.CC_GHG_GASSES.HFC]: (
    <span>{CC_CONSTANTS.CC_GHG_GASSES.HFC}s</span>
  ),
  [CC_CONSTANTS.CC_GHG_GASSES.NF3]: (
    <span>
      NF<sub>3</sub>
    </span>
  ),
};
export function GasInChemicalFormat({ gas }) {
  return formats[gas];
}
