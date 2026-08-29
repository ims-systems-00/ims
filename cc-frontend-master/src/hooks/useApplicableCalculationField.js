import CC_CONSTANTS from "../constants";
export const CALCULATION_FIELD_NAMES = {
  SCOPE: "scope",
  SCOPE_NAME: "scopeName",
  CATEGORY: "category",
  CUSTOM_REFERENCE: "customReference",
  REPORTING_YEAR: "reportingYear",
  REPORTING_MONTH: "reportingMonth",
  CALCULATION_METHOD: "calculationMethod",
  ACTIVITY: "activity",
  UNIT: "unit",
  METER_NUMBER: "meterNumber",
  SUPPLIER_NAME: "supplierName",
  INVOICE_NUMBER: "invoiceNumber",
  AMOUNT: "amount",
  ACTIVITY_DATA_GRADE: "activityDataGrade",
  REFERENCE: "reference",
  CATEGORY_ORDER: "categoryOrder",
  PURCHASED_ELECTRICITY_COAL: "purchasedElectricityCoal",
  PURCHASED_ELECTRICITY_NATURAL_GAS: "purchasedElectricityNaturalGas",
  PURCHASED_ELECTRICITY_NUCLEAR: "purchasedElectricityNuclear",
  PURCHASED_ELECTRICITY_RENEWABLES: "purchasedElectricityRenewables",
  PURCHASED_ELECTRICITY_OTHER: "purchasedElectricityOther",
  T_AND_D_LOSSES: "tAndDLosses",
  WTT_T_AND_D: "wttTandD",
  WTT_T_AND_D_GENERATION: "wttTandDGeneration",
  GHG_CO2E_EMISSION: "ghgCo2eEmission",
  GHG_CO2_EMISSION: "ghgCo2Emission",
  GHG_CH4_EMISSION: "ghgCh4Emission",
  ENERGEY_NATURAL_GAS: "energeyNaturalGas",
  GHG_N2O_EMISSION: "ghgN2oEmission",
  GHG_NF3_EMISSION: "ghgNf3Emission",
  GHG_HFC_EMISSION: "ghgHfcEmission",
  GHG_PFC_EMISSION: "ghgPfcEmission",
  GHG_SF6_EMISSION: "ghgSf6Emission",
  GHG_BIOGENIC_CO2_EMISSION: "ghgBiogenicCo2Emission",
  GHG_WELL_TO_TANK_CO2E_EMISSION: "ghgWellToTankCo2eEmission",
  DATA_QUALITY_EMISSION_FACTOR_GRADE: "dataQualityEmissionFactorGrade",
  DATA_QUALITY_EMISSION_FACTOR_SCORE: "dataQualityEmissionFactorScore",
  DATA_QUALITY_EMISSION_FACTOR_WEIGHTED_SCORE:
    "dataQualityEmissionFactorWeightedScore",
  DATA_QUALITY_AD_SCORE: "dataQualityADScore",
  DATA_QUALITY_AD_WEIGHTED_SCORE: "dataQualityADWeightedScore",
  DATA_QUALITY_GHG: "dataQualityGhg",
  EMMISION_FACTOR_KG_CO2E_PER_UNIT: "emmisionFactorKgCo2ePerUnit",
  EMMISION_FACTOR_NOTE: "emmisionFactorNote",
  EMMISION_FACTOR_SOURCE: "emmisionFactorSource",
  SECR_ENERGY: "secrEnergy",
  SECR_TO_INCLUDE: "secrToInclude",
  UNIT_ID: "unitId",
  LOCATION: "location",
};
const APPLICABILITY_CHECKS = {
  [CALCULATION_FIELD_NAMES.LOCATION]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.CUSTOM_REFERENCE]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.SCOPE]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.SCOPE_NAME]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.CATEGORY]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.REPORTING_YEAR]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.REPORTING_MONTH]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.CALCULATION_METHOD]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.ACTIVITY]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.UNIT]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.METER_NUMBER]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.SUPPLIER_NAME]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_VEHICLES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES
        .UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.WASTE_GENERATED_IN_OPERATIONS,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.INVOICE_NUMBER]: function (categiry = null) {
    return false;
    // return [
    //   CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES,
    //   CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_VEHICLES,
    //   CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
    //   CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.WASTE_GENERATED_IN_OPERATIONS,
    // ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.AMOUNT]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.ACTIVITY_DATA_GRADE]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.REFERENCE]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.CATEGORY_ORDER]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_COAL]: function (
    categiry = null
  ) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_NATURAL_GAS]: function (
    categiry = null
  ) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_NUCLEAR]: function (
    categiry = null
  ) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_RENEWABLES]: function (
    categiry = null
  ) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_OTHER]: function (
    categiry = null
  ) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.T_AND_D_LOSSES]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.WTT_T_AND_D]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.WTT_T_AND_D_GENERATION]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.GHG_CO2E_EMISSION]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.GHG_CO2_EMISSION]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_VEHICLES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.GHG_CH4_EMISSION]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_VEHICLES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.ENERGEY_NATURAL_GAS]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.GHG_N2O_EMISSION]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_VEHICLES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.GHG_NF3_EMISSION]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.GHG_HFC_EMISSION]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.GHG_PFC_EMISSION]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.GHG_SF6_EMISSION]: function (categiry = null) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.GHG_BIOGENIC_CO2_EMISSION]: function (
    categiry = null
  ) {
    return [
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_VEHICLES,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES
        .UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.BUSINESS_TRAVEL,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.EMPLOYEE_COMMUTING,
      CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES
        .DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION,
    ].includes(categiry);
  },
  [CALCULATION_FIELD_NAMES.GHG_WELL_TO_TANK_CO2E_EMISSION]: function (
    categiry = null
  ) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.DATA_QUALITY_EMISSION_FACTOR_GRADE]: function (
    categiry = null
  ) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.DATA_QUALITY_EMISSION_FACTOR_SCORE]: function (
    categiry = null
  ) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.DATA_QUALITY_EMISSION_FACTOR_WEIGHTED_SCORE]:
    function (categiry = null) {
      return true;
    },
  [CALCULATION_FIELD_NAMES.DATA_QUALITY_AD_SCORE]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.DATA_QUALITY_AD_WEIGHTED_SCORE]: function (
    categiry = null
  ) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.DATA_QUALITY_GHG]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.EMMISION_FACTOR_KG_CO2E_PER_UNIT]: function (
    categiry = null
  ) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.EMMISION_FACTOR_NOTE]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.EMMISION_FACTOR_SOURCE]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.SECR_ENERGY]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.SECR_TO_INCLUDE]: function (categiry = null) {
    return true;
  },
  [CALCULATION_FIELD_NAMES.UNIT_ID]: function (categiry = null) {
    return true;
  },
};

function useApplicableCalculationField() {
  function isApplicableFieldForCategory(category = null, field = null) {
    if (!field) return false;
    const check = APPLICABILITY_CHECKS[field];
    return check(category);
  }
  return {
    isApplicableFieldForCategory,
  };
}

export default useApplicableCalculationField;
