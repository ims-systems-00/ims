function getYearsInRange(startYear = 1980, endYear = 2070) {
  return function () {
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };
}
// only allowed to use at the last level on the object nesting
function assignRightListToEveryItemInLeftList(leftList = [], rightList = []) {
  let maps = {};
  leftList.forEach((item) => {
    let constructed = {};
    constructed[item] = [...rightList];
    maps = { ...maps, ...constructed };
  });
  return maps;
}
/**
 * Parameters:
 * Notes on custom factors
 */

const CC_EMISSION_SCOPE_1_CATEGORY_NAMES = {
  COMPANY_PREMISES: "Company Premises",
  COMPANY_VEHICLES: "Company Vehicles",
  PROCESS_EMISSIONS: "Process Emissions",
  FUGITIVE_EMISSIONS: "Fugitive Emissions",
};
const CC_EMISSION_SCOPE_2_CATEGORY_NAMES = {
  PURCHASED_ELECTRICITY: "Purchased Electricity",
  PURCHASED_HEAT_AND_STEAM: "Purchased Heat and Steam",
};
const CC_EMISSION_SCOPE_3_CATEGORY_NAMES = {
  PURCHASED_GOODS_AND_SERVICES: "Purchased Goods and Services",
  CAPITAL_GOODS: "Capital Goods",
  UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION:
    "Upstream Transportation and Distribution",
  WASTE_GENERATED_IN_OPERATIONS: "Waste Generated in Operations",
  BUSINESS_TRAVEL: "Business Travel",
  EMPLOYEE_COMMUTING: "Employee Commuting",
  EMPLOYEE_COMMUTING_HOMEWORKING: "Employee Commuting (Homeworking)",
  UPSTREAM_LEASED_ASSETS: "Upstream Leased Assets",
  DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION:
    "Downstream Transportation and Distribution",
  PROCESSING_OF_SOLD_PRODUCTS: "Processing of Sold Products",
  USE_OF_SOLD_PRODUCTS: "Use of Sold Products",
  END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS:
    "End-of-life Treatment of Sold Products",
  DOWNSTREAM_LEASED_ASSETS: "Downstream Leased Assets",
  FRANCHISES: "Franchises",
  INVESTMENTS: "Investments",
};

const CC_EMISSION_SCOPE_1_CATEGORY_ORDERS = {
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_PREMISES]: "1.1",
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_VEHICLES]: "1.2",
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.PROCESS_EMISSIONS]: "1.3",
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.FUGITIVE_EMISSIONS]: "1.4",
};
const CC_EMISSION_SCOPE_2_CATEGORY_ORDERS = {
  [CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_ELECTRICITY]: "2.1",
  [CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM]: "2.2",
};
const CC_EMISSION_SCOPE_3_CATEGORY_ORDERS = {
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PURCHASED_GOODS_AND_SERVICES]: "3.1",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.CAPITAL_GOODS]: "3.2",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION]:
    "3.4",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.WASTE_GENERATED_IN_OPERATIONS]: "3.5",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.BUSINESS_TRAVEL]: "3.6",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING]: "3.7",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING_HOMEWORKING]: "3.8",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.UPSTREAM_LEASED_ASSETS]: "3.9",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION]:
    "3.10",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PROCESSING_OF_SOLD_PRODUCTS]: "3.11",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.USE_OF_SOLD_PRODUCTS]: "3.12",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS]:
    "3.13",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.DOWNSTREAM_LEASED_ASSETS]: "3.14",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.FRANCHISES]: "3.15",
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.INVESTMENTS]: "3.16",
};

const CC_EMISSION_CATEGORY_ORDERS = {
  ...CC_EMISSION_SCOPE_1_CATEGORY_ORDERS,
  ...CC_EMISSION_SCOPE_2_CATEGORY_ORDERS,
  ...CC_EMISSION_SCOPE_3_CATEGORY_ORDERS,
};
const CC_EMISSION_SCOPES = {
  SCOPE_1: "Scope 1",
  SCOPE_2: "Scope 2",
  SCOPE_3: "Scope 3",
};
const CC_EMISSION_SCOPE_NAMES = {
  SCOPE_1_NAME: "Direct Emissions",
  SCOPE_2_NAME: "Indirect Emissions",
  SCOPE_3_NAME: "Other Indirect Emissions",
};
const CC_EMISSION_CATEGORY_NAMES = {
  ...CC_EMISSION_SCOPE_1_CATEGORY_NAMES,
  ...CC_EMISSION_SCOPE_2_CATEGORY_NAMES,
  ...CC_EMISSION_SCOPE_3_CATEGORY_NAMES,
};
const CC_EMISSION_COLORS = {
  // Scope 1 (Green shades)
  [CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES]: "#4CAF50", // Moderate Green
  [CC_EMISSION_CATEGORY_NAMES.COMPANY_VEHICLES]: "#388E3C", // Dark Green
  [CC_EMISSION_CATEGORY_NAMES.PROCESS_EMISSIONS]: "#81C784", // Light Green
  [CC_EMISSION_CATEGORY_NAMES.FUGITIVE_EMISSIONS]: "#2E7D32", // Forest Green

  // Scope 2 (Blue shades)
  [CC_EMISSION_CATEGORY_NAMES.PURCHASED_ELECTRICITY]: "#2196F3", // Medium Blue
  [CC_EMISSION_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM]: "#1976D2", // Deep Blue

  // Scope 3 (Orange shades)
  [CC_EMISSION_CATEGORY_NAMES.PURCHASED_GOODS_AND_SERVICES]: "#FF9800", // Vibrant Orange
  [CC_EMISSION_CATEGORY_NAMES.CAPITAL_GOODS]: "#F57C00", // Dark Orange
  [CC_EMISSION_CATEGORY_NAMES.UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION]:
    "#E65100", // Burnt Orange
  [CC_EMISSION_CATEGORY_NAMES.WASTE_GENERATED_IN_OPERATIONS]: "#FF5722", // Orange-Red
  [CC_EMISSION_CATEGORY_NAMES.BUSINESS_TRAVEL]: "#F44336", // Reddish-Orange
  [CC_EMISSION_CATEGORY_NAMES.EMPLOYEE_COMMUTING]: "#FFCC80", // Peach
  [CC_EMISSION_CATEGORY_NAMES.EMPLOYEE_COMMUTING_HOMEWORKING]: "#FFA726", // Amber Orange
  [CC_EMISSION_CATEGORY_NAMES.UPSTREAM_LEASED_ASSETS]: "#FF6F00", // Bright Orange
  [CC_EMISSION_CATEGORY_NAMES.DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION]:
    "#FF7043", // Warm Orange
  [CC_EMISSION_CATEGORY_NAMES.PROCESSING_OF_SOLD_PRODUCTS]: "#FF8A65", // Coral
  [CC_EMISSION_CATEGORY_NAMES.USE_OF_SOLD_PRODUCTS]: "#FB8C00", // Golden Orange
  [CC_EMISSION_CATEGORY_NAMES.END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS]:
    "#EF6C00", // Sunset Orange
  [CC_EMISSION_CATEGORY_NAMES.DOWNSTREAM_LEASED_ASSETS]: "#FFD180", // Pale Orange
  [CC_EMISSION_CATEGORY_NAMES.FRANCHISES]: "#D84315", // Earthy Orange
  [CC_EMISSION_CATEGORY_NAMES.INVESTMENTS]: "#E64A19", // Rust Orange
};

const CC_REPORTING_METHODS = {
  MARKET_BASED: "Market-based",
  LOCATTION_BASED: "Location-based",
};
const CC_ORGANISATIONAL_BOUNDARIES = {
  OPERATIONAL_CONTROL: "Operational Control",
  FINANCIAL_CONTROL: "Financial Control",
  EQUITY_SHARE: "Equity Share",
};
const CC_DATA_QUALITY_GRADES = {
  VERY_GOOD: "Very Good Data Quality",
  GOOD: "Good Data Quality",
  FAIR: "Fair Data Quality",
  BASIC: "Basic Data Quality",
};
const CC_DATA_QUALITY_GRADE_SCORE_MAP = {
  [CC_DATA_QUALITY_GRADES.VERY_GOOD]: 1,
  [CC_DATA_QUALITY_GRADES.GOOD]: 0.8,
  [CC_DATA_QUALITY_GRADES.FAIR]: 0.6,
  [CC_DATA_QUALITY_GRADES.BASIC]: 0.4,
};
const CC_GHG_GASSES = {
  CO2: "CO2",
  CO2E: "CO2e",
  CH4: "CH4",
  N2O: "N2O",
  NF3: "NF3",
  BIOGENICCO2: "",
  HFC: "HFC",
  PFC: "PFC",
  SF6: "SF6",
  WELL_TO_TANK_CO2: "",
};
const CC_GHG_INCLUSION_ASSESSMENT = {
  INCLUDED: "Included",
  EXCLUDED: "Excluded",
  PARTIALLY_INCLUDED: "Partially included",
};
const getAllowedNetZeroTargetYears = getYearsInRange(2030, 2050);
const getAllowedReportingYears = getYearsInRange(2019, 2050);

const CUSTOM = "Custom";
const FUEL_BASED_METHOD = "Fuel-Based";
const DISTANCE_BASED_METHOD = "Distance-Based";
const DISTANCE_BASED_VEHICLES_METHOD = "Distance-Based (Vehicles)";
const DISTANCE_BASED_PUBLIC_TRANSPORT_METHOD =
  "Distance-Based (Public Transport)";
const DEFAULT = "Default";
const SUPPLIER_SPECIFIC_METHOD = "Supplier Specific Method";
const SPEND_BASED_METHOD = "Spend-Based"; // issues here
const AVERAGE_DATA_METHOD = "Average Data Method";
const CC_CALCULATION_CALC_METHOD = {
  SUPPLIER_SPECIFIC_METHOD,
  AVERAGE_DATA_METHOD,
  SPEND_BASED_METHOD,
};

const CC_CALCULATION_CALC_METHOD2 = {
  CUSTOM,
  DEFAULT,
};

const CC_CALCULATION_FUELS_METHOD = {
  FUEL_BASED_METHOD,
};

const CC_CALCULATION_VEHICLES_METHOD = {
  FUEL_BASED_METHOD,
  DISTANCE_BASED_METHOD,
  DISTANCE_BASED_VEHICLES_METHOD,
  DISTANCE_BASED_PUBLIC_TRANSPORT_METHOD,
  CUSTOM,
};

const CC_CALCULATION_ELECTRICITY_METHOD = {
  MARKET_BASED_METHOD: "Market-based",
  LOCATION_BASED_METHOD: "Location-based",
};

const CC_CALCULATION_CAPITAL_CALC_METHOD = {
  SUPPLIER_SPECIFIC_METHOD,
  SPEND_BASED_METHOD,
};

const CC_CALCULATION_FREIGHT_METHOD = {
  CUSTOM,
  FUEL_BASED_METHOD,
  MASS_DISTANCE_BASED_METHOD: "Mass/Distance-Based",
  DISTANCE_BASED_METHOD,
  SPEND_BASED_METHOD,
};

const CC_CALCULATION_WASTE_METHOD = {
  SUPPLIER_SPECIFIC_METHOD,
  AVERAGE_DATA_METHOD,
};

const CC_CALCULATION_HOMEWORKING_METHOD = {
  AVERAGE_DATA_METHOD,
  CUSTOM,
};

const CC_CALCULATION_METHODS = {
  ...CC_CALCULATION_CALC_METHOD,
  ...CC_CALCULATION_CALC_METHOD2,
  ...CC_CALCULATION_HOMEWORKING_METHOD,
  ...CC_CALCULATION_WASTE_METHOD,
  ...CC_CALCULATION_FREIGHT_METHOD,
  ...CC_CALCULATION_CAPITAL_CALC_METHOD,
  ...CC_CALCULATION_ELECTRICITY_METHOD,
  ...CC_CALCULATION_VEHICLES_METHOD,
  ...CC_CALCULATION_FUELS_METHOD,
};

const CC_MISC = {
  OUTSIDE_OF_SCOPES: "Outside of Scopes",
};
const CC_EMISSION_FACTOR_TYPES = {
  SPEND_BASED: "Spend based",
  ACTIVITY_BASED: "Activity based",
  PRODUCTION_BASED: "Production based",
};
const CC_METRIC_UNITS = {
  KG: "kg",
  GJ: "GJ",
  CUBIC_METERS: "cubic metres",
  LITRES: "litres",
  KWH: "kWh",
  KWH_NET_CV: "kWh (Net CV)",
  KWH_GROSS_CV: "kWh (Gross CV)",
  KM: "km",
};
const CC_IMPERIAL_UNITS = {
  TONNES: "tonnes",
  MILES: "miles",
};
const CC_MIXED_UNITS = {
  GJ_PER_TONNE_NET_CV: "GJ/tonne (Net CV)",
  GJ_PER_TONNE_GROSS_CV: "GJ/tonne (Gross CV)",
  KG_PER_M3_DENSITY: "kg/m3 (Density)",
  LITRES_PER_TONNE_DENSITY: "litres/tonne (Density)",
  KWH_PER_KG_NET_CV: "kWh/kg (Net CV)",
  KWH_PER_KG_GROSS_CV: "kWh/kg (Gross CV)",
  KWH_PER_LITRE_NET_CV: "kWh/litre (Net CV)",
  KWH_PER_LITRE_GROSS_CV: "kWh/litre (Gross CV)",
  PASSENGER_KM: "passenger.km",
  MILLION_LITRES: "million litres",
  TONNE_KM: "tonne.km",
  POUND_SPENT: "£ Spent",
  PER_FTE_WORKING_HOUR: "per FTE Working Hour",
};
const CC_UNITS = {
  ...CC_METRIC_UNITS,
  ...CC_IMPERIAL_UNITS,
  ...CC_MIXED_UNITS,
};

const CC_RELEVANCE = {
  RELEVANT_CALCULATED: "Relevant, Calculated",
  RELEVANT_NOT_CALCULATED: "Relevant, Not calculated",
  NOT_RELEVANT: "Not relevant",
};

const CC_CATEGTORIES_WITH_DETAILS = [
  {
    scope: CC_EMISSION_SCOPES.SCOPE_1,
    title: `${CC_EMISSION_SCOPES.SCOPE_1}: ${CC_EMISSION_SCOPE_NAMES.SCOPE_1_NAME}`,
    categories: [
      {
        name: CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_PREMISES,
        description:
          "Direct emissions result from fuel burned by stationary sources owned or controlled by the organization. \n\nFor example: fuel combustion in boilers, furnaces, heaters, and other stationary equipment.",
        example:
          "Fuel combustion in boilers, furnaces, heaters, and other stationary equipment",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation owns or controls stationary combustion equipment.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not own or control stationary combustion equipment.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_VEHICLES,
        description:
          "Direct emissions from mobile sources owned or controlled by the organization. \n\nFor example: fuel used in company-owned vehicles, including vans, lorries, forklifts, and cars.",
        example:
          "Fuel combustion in company-owned cars, vans, forklifts, and other vehicles",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation owns or controls vehicles or other sources of mobile emissions.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not own or control vehicles or other sources of mobile emissions.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_1_CATEGORY_NAMES.PROCESS_EMISSIONS,
        description:
          "Process emissions result from chemical manufacturing or processing. \n\nFor example:  cement, aluminium, adipic acid, ammonia, and waste processing relevant if your processes generate emissions.",
        example:
          "Cement, aluminium, adipic acid, ammonia manufacture, and waste processing",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation generates process emissions.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not generate process emissions.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_1_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
        description:
          "Fugitive emissions are direct emissions resulting from the intentional or unintentional release of greenhouse gases for processes that are owned or controlled by the organization. \n\nFor example: leakages from refrigeration or air conditioning equipment, industrial gases, and pipelines. ",
        example:
          "Leakages from refrigeration or air conditioning equipment, industrial gases, and pipelines",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation owns or control sources of fugitive emissions.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant because the organisation does not own or control sources of fugitive emissions.",
        },
      },
    ],
  },
  {
    scope: CC_EMISSION_SCOPES.SCOPE_2,
    title: `${CC_EMISSION_SCOPES.SCOPE_2}: ${CC_EMISSION_SCOPE_NAMES.SCOPE_2_NAME}`,
    categories: [
      {
        name: CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_ELECTRICITY,
        description:
          "Indirect greenhouse gas emissions that result from the production of the electricity purchased and used by the organization. \n\nFor example: emissions from power plants or other sources that generate the electricity bought and utilized by the organization. ",
        example:
          "Emissions from power plants generating purchased electricity used by the organisation",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation purchases electricity.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant because the organisation does not purchase electricity.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM,
        description:
          "The indirect emissions associated with the generation of heat and steam that are procured and used by the organization. \n\nFor example: emissions from facilities responsible for generating the purchased heat and steam utilized by the organization. ",
        example:
          "Emissions from power plants generating purchased heat and steam used by the organisation.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant to the organisation and emissions have been calculated.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not purchase heat or steam.",
        },
      },
    ],
  },
  {
    scope: CC_EMISSION_SCOPES.SCOPE_3,
    title: `${CC_EMISSION_SCOPES.SCOPE_3}: ${CC_EMISSION_SCOPE_NAMES.SCOPE_3_NAME}`,
    categories: [
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PURCHASED_GOODS_AND_SERVICES,
        description:
          "Emissions occurring outside the organization's direct control result from the goods and services purchased by the organization. \n\nFor example: raw material extraction, such as those from mining or harvesting materials like metals, timber, and oil that will eventually become part of the organization's products. Or textiles for clothing companies and electronic components for tech companies.  ",
        example: "Raw materials, office supplies, contracted services.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation purchases goods and services.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not purchase goods and services",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.CAPITAL_GOODS,
        description:
          "Emissions from the manufacturing and transportation of capital goods, encompassing the greenhouse gas emissions associated with the production and transportation of essential business infrastructure and equipment. \n\nFor example: machinery, vehicles, computer equipment, furniture, and buildings that the organization purchases. ",
        example:
          "Machinery, vehicles, computer equipment, furniture, and buildings.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation purchases capital goods.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not purchase capital goods",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION,
        description:
          "The emissions generated from third-party transportation and distribution of inputs to the organization. Relevant to organizations that purchase transportation services and receive product deliveries from suppliers. \n\nFor example: transporting raw materials and components, such as haulage, transport, and postal services. ",
        example:
          "Transport of raw materials and components. Purchased haulage, transport, and postal services.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation purchases transportation services and/or has products delivered to it by suppliers.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not have purchased goods delivered to its premises nor does it purchase transportation services.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.WASTE_GENERATED_IN_OPERATIONS,
        description:
          "The waste produced as a result of an organization's day-to-day activities. This category is relevant for organizations that generate waste through operational activities. \n\nFor example: in the disposal or treatment of waste, such as landfills, incineration, and recycling processes. ",
        example: "Landfill, incineration, recycling.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation generates waste in its operations.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not generate waste in its operations.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.BUSINESS_TRAVEL,
        description:
          "Emissions from employee business travel accounting for the impact of travel via air, rail, and road transportation. \nFor example: flights, train trips, rental cars, and in employee-owned vehicles. ",
        example: "Flights, train trips, rental cars, employee-owned cars.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because there is business travel performed in vehicles not owned or controlled by the organisation.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because there is no business travel performed in vehicles not owned or controlled by the organisation.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING,
        description:
          "Emissions employees produce when travelling to and from work. \nFor example: emissions from employees using their cars, public transport, or other modes of transportation to commute between their homes and workplaces.",
        example: "Cars, public transport.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because employees of the organisation travel between their homes and its premises.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because employees do not travel to and from company-owned or controlled premises.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING_HOMEWORKING,
        description:
          "Employee commuting (homeworking) involves working from home or remotely. \nFor example: homeworking or working in co-working spaces.",
        example: "Homeworking, co-working spaces.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant to the organisation and emissions have been calculated.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because employees do not work from home.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION,
        description:
          "Emissions from third-party transportation and distribution, accounting for the environmental impact of the organization's transportation and distribution of goods. \n\nFor example: delivery vehicles and shipping for organizations that sell products requiring end-user delivery through services arranged or managed by their customers.",
        example: "Delivery vehicles, shipping.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation sells products which are delivered to end-users in transportation services procured or managed by its customers.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not sell products which are transported to end-users by means not controlled or purchased by the organisation.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PROCESSING_OF_SOLD_PRODUCTS,
        description:
          "Emissions from the processing, use, or treatment of the organization's sold intermediate products and manufacturing using purchased intermediate products like paper, plastics, raw materials, and mechanical components. \n\nFor example: relevant to organizations that sell intermediate products which necessitate additional processing or manufacturing steps before they are ready for use or further sale.",
        example:
          "Manufacturing with sold intermediate products such as paper, plastics, raw materials, and mechanical components.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation sells intermediate products which require further processing.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation because it does not produce intermediate products which require further processing.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.USE_OF_SOLD_PRODUCTS,
        description:
          "The emissions produced during the use of the organization's products by customers. This category is applicable to organizations whose products are sold and result in emissions throughout their lifecycle. \n\nFor example: vehicle fuel consumption by the organization's customers, use of appliances, and energy consumption by end-users.",
        example: "Vehicle fuel consumption, appliance energy use.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant to the organisation because its sold products generate emissions during their lifetimes.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation as its sold products do not directly emit greenhouse gases.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.UPSTREAM_LEASED_ASSETS,
        description:
          "Emissions resulting from the use of leased assets such as vehicles and buildings. \n\nFor example: Leasing office space and vehicles.",
        example: "Leased office space, leased vehicles.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant to the organisation and emissions have been calculated.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "As we have chosen an Operational Control approach, emissions from upstream leased assets will be accounted for in Scope 1 and 2.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.DOWNSTREAM_LEASED_ASSETS,
        description:
          "Emissions from the use of assets that are leased to customers, such as vehicles and buildings. \n\nFor example: emissions from vehicles leased to customers or sublet office space.",
        example: "Leased vehicles to customers, sublet office space.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation leases assets downstream.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation as it does not lease assets to other organisations or individuals.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS,
        description:
          "Emissions resulting from the disposal, recycling, or treatment of the organization's products after consumers have used them. \n\nFor example: product recycling and landfill disposal.",
        example: "Product recycling, landfill disposal.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation sells products which will have an end-of-life impact.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation as it does not sell goods which emit greenhouse gases at the end-of-life stage.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.FRANCHISES,
        description:
          "The emissions produced by the operations of franchise-owned retail outlets or restaurants under the organization's umbrella. \n\nFor example: organizations that own franchises.",
        example: "Emissions from franchise-owned retail outlets, restaurants.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation is a franchisor.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation as it does not own franchises.",
        },
      },
      {
        name: CC_EMISSION_SCOPE_3_CATEGORY_NAMES.INVESTMENTS,
        description:
          "Emissions associated with the investments owned by the organization. Relevant to organizations that have a stake in various investments. \n\nFor example: from shares in other companies as well as investments in infrastructure. ",
        example:
          "Emissions from shares in other companies, emissions from investments in infrastructure.",
        explanation: {
          [CC_RELEVANCE.RELEVANT_CALCULATED]:
            "This category is relevant because the organisation owns investments.",
          [CC_RELEVANCE.RELEVANT_NOT_CALCULATED]:
            "This category is relevant to the organisation but it was not possible to calculate emissions at this time due to the lack of reliable data and the high level of uncertainty.",
          [CC_RELEVANCE.NOT_RELEVANT]:
            "This category is not relevant to the organisation as it does not own investments.",
        },
      },
    ],
  },
];

const CC_CALCULATION_METHODS_DROPDOWNS = {
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_PREMISES],
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD, CC_CALCULATION_METHODS.CUSTOM]
  ),
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_VEHICLES],
    [
      CC_CALCULATION_METHODS.FUEL_BASED_METHOD,
      CC_CALCULATION_METHODS.DISTANCE_BASED_METHOD,
      CC_CALCULATION_METHODS.CUSTOM,
    ]
  ),
  ...assignRightListToEveryItemInLeftList(
    [
      CC_EMISSION_SCOPE_1_CATEGORY_NAMES.PROCESS_EMISSIONS,
      CC_EMISSION_SCOPE_1_CATEGORY_NAMES.FUGITIVE_EMISSIONS,
    ],
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD, CC_CALCULATION_METHODS.CUSTOM]
  ),
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_ELECTRICITY],
    [
      CC_CALCULATION_METHODS.LOCATION_BASED_METHOD,
      CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
    ]
  ),
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM],
    [
      CC_CALCULATION_METHODS.LOCATION_BASED_METHOD,
    ]
  ),
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PURCHASED_GOODS_AND_SERVICES],
    [
      CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD,
      CC_CALCULATION_METHODS.SPEND_BASED_METHOD,
      CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
    ]
  ),
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.CAPITAL_GOODS],
    [
      CC_CALCULATION_METHODS.SPEND_BASED_METHOD,
      CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
    ]
  ),
  ...assignRightListToEveryItemInLeftList(
    [
      CC_EMISSION_SCOPE_3_CATEGORY_NAMES.UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION,
      CC_EMISSION_SCOPE_3_CATEGORY_NAMES.DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION,
    ],
    [
      CC_CALCULATION_METHODS.CUSTOM,
      CC_CALCULATION_METHODS.FUEL_BASED_METHOD,
      CC_CALCULATION_METHODS.MASS_DISTANCE_BASED_METHOD,
      CC_CALCULATION_METHODS.DISTANCE_BASED_METHOD,
      CC_CALCULATION_METHODS.SPEND_BASED_METHOD,
    ]
  ),
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.WASTE_GENERATED_IN_OPERATIONS],
    [
      CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD,
      CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
    ]
  ),
  ...assignRightListToEveryItemInLeftList(
    [
      CC_EMISSION_SCOPE_3_CATEGORY_NAMES.BUSINESS_TRAVEL,
      CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING,
    ],
    [
      CC_CALCULATION_METHODS.CUSTOM,
      CC_CALCULATION_METHODS.FUEL_BASED_METHOD,
      CC_CALCULATION_METHODS.DISTANCE_BASED_VEHICLES_METHOD,
      CC_CALCULATION_METHODS.DISTANCE_BASED_PUBLIC_TRANSPORT_METHOD,
      CC_CALCULATION_METHODS.SPEND_BASED_METHOD,
    ]
  ),
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING_HOMEWORKING],
    [CC_CALCULATION_METHODS.CUSTOM, CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]
  ),
  ...assignRightListToEveryItemInLeftList(
    [
      CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PROCESSING_OF_SOLD_PRODUCTS,
      CC_EMISSION_SCOPE_3_CATEGORY_NAMES.USE_OF_SOLD_PRODUCTS,
    ],
    [CC_CALCULATION_METHODS.CUSTOM]
  ),
  ...assignRightListToEveryItemInLeftList(
    [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS],
    [CC_CALCULATION_METHODS.CUSTOM, CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]
  ),
};
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_GASEOUS_FUELS_NATURAL_GAS = [
  "Gaseous fuels, Natural gas",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_GASEOUS_FUELS = [
  "Gaseous fuels, Butane",
  "Gaseous fuels, CNG",
  "Gaseous fuels, LNG",
  "Gaseous fuels, LPG",
  "Gaseous fuels, Other petroleum gas",
  "Gaseous fuels, Propane",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_LIQUID_FUELS = [
  "Liquid fuels, Aviation spirit",
  "Liquid fuels, Aviation turbine fuel",
  "Liquid fuels, Burning oil",
  "Liquid fuels, Diesel (average biofuel blend)",
  "Liquid fuels, Diesel (100% mineral diesel)",
  "Liquid fuels, Fuel oil",
  "Liquid fuels, Gas oil",
  "Liquid fuels, Petrol (average biofuel blend)",
  "Liquid fuels, Petrol (100% mineral petrol)",
  "Liquid fuels, Waste oils",
  "Liquid fuels, Marine gas oil",
  "Liquid fuels, Marine fuel oil",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_SOLID_FUELS = [
  "Solid fuels, Coal (industrial)",
  "Solid fuels, Coal (electricity generation)",
  "Solid fuels, Coal (domestic)",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOENERGY = [
  "Biofuel, Bioethanol",
  "Biofuel, Biodiesel ME",
  "Biofuel, Biomethane (compressed)",
  "Biofuel, Biodiesel ME (from used cooking oil)",
  "Biofuel, Biodiesel ME (from tallow)",
  "Biofuel, Biodiesel HVO",
  "Biofuel, Biopropane",
  "Biofuel, Development diesel",
  "Biofuel, Development petrol",
  "Biofuel, Off road biodiesel",
  "Biofuel, Biomethane (liquified)",
  "Biofuel, Methanol (bio)",
  "Biofuel, Avtur (renewable)",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOMASS_AND_GAS = [
  "Biomass, Wood logs",
  "Biomass, Wood chips",
  "Biomass, Wood pellets",
  "Biomass, Grass/straw",
  "Biogas, Biogas",
  "Biogas, Landfill gas",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_DISTANCE_PASSENGER = [
  "Cars (by size), Small car, Diesel",
  "Cars (by size), Small car, Petrol",
  "Cars (by size), Small car, Hybrid",
  "Cars (by size), Small car, Unknown",
  "Cars (by size), Small car, Plug-in Hybrid Electric Vehicle",
  "Cars (by size), Small car, Battery Electric Vehicle",
  "Cars (by size), Medium car, Diesel",
  "Cars (by size), Medium car, Petrol",
  "Cars (by size), Medium car, Hybrid",
  "Cars (by size), Medium car, CNG",
  "Cars (by size), Medium car, LPG",
  "Cars (by size), Medium car, Unknown",
  "Cars (by size), Medium car, Plug-in Hybrid Electric Vehicle",
  "Cars (by size), Medium car, Battery Electric Vehicle",
  "Cars (by size), Large car, Diesel",
  "Cars (by size), Large car, Petrol",
  "Cars (by size), Large car, Hybrid",
  "Cars (by size), Large car, CNG",
  "Cars (by size), Large car, LPG",
  "Cars (by size), Large car, Unknown",
  "Cars (by size), Large car, Plug-in Hybrid Electric Vehicle",
  "Cars (by size), Large car, Battery Electric Vehicle",
  "Cars (by size), Average car, Diesel",
  "Cars (by size), Average car, Petrol",
  "Cars (by size), Average car, Hybrid",
  "Cars (by size), Average car, CNG",
  "Cars (by size), Average car, LPG",
  "Cars (by size), Average car, Unknown",
  "Cars (by size), Average car, Plug-in Hybrid Electric Vehicle",
  "Cars (by size), Average car, Battery Electric Vehicle",
  "Motorbike, Small",
  "Motorbike, Medium",
  "Motorbike, Large",
  "Motorbike, Average",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_DISTANCE_DELIVERY = [
  "Vans, Class I (up to 1.305 tonnes), Diesel",
  "Vans, Class I (up to 1.305 tonnes), Petrol",
  "Vans, Class I (up to 1.305 tonnes), Battery Electric Vehicle",
  "Vans, Class II (1.305 to 1.74 tonnes), Diesel",
  "Vans, Class II (1.305 to 1.74 tonnes), Petrol",
  "Vans, Class II (1.305 to 1.74 tonnes), Battery Electric Vehicle",
  "Vans, Class III (1.74 to 3.5 tonnes), Diesel",
  "Vans, Class III (1.74 to 3.5 tonnes), Petrol",
  "Vans, Class III (1.74 to 3.5 tonnes), Battery Electric Vehicle",
  "Vans, Average (up to 3.5 tonnes), Diesel",
  "Vans, Average (up to 3.5 tonnes), Petrol",
  "Vans, Average (up to 3.5 tonnes), CNG",
  "Vans, Average (up to 3.5 tonnes), LPG",
  "Vans, Average (up to 3.5 tonnes), Unknown",
  "Vans, Average (up to 3.5 tonnes), Battery Electric Vehicle",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), Average laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), Average laden",
  "HGV (all diesel), Rigid (>17 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), Average laden",
  "HGV (all diesel), All rigids, 0% Laden",
  "HGV (all diesel), All rigids, 50% Laden",
  "HGV (all diesel), All rigids, 100% Laden",
  "HGV (all diesel), All rigids, Average laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 0% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 50% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 100% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), Average laden",
  "HGV (all diesel), Articulated (>33t), 0% Laden",
  "HGV (all diesel), Articulated (>33t), 50% Laden",
  "HGV (all diesel), Articulated (>33t), 100% Laden",
  "HGV (all diesel), Articulated (>33t), Average laden",
  "HGV (all diesel), All artics, 0% Laden",
  "HGV (all diesel), All artics, 50% Laden",
  "HGV (all diesel), All artics, 100% Laden",
  "HGV (all diesel), All artics, Average laden",
  "HGV (all diesel), All HGVs, 0% Laden",
  "HGV (all diesel), All HGVs, 50% Laden",
  "HGV (all diesel), All HGVs, 100% Laden",
  "HGV (all diesel), All HGVs, Average laden",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_FUEL = [
  "Liquid fuels, Aviation spirit",
  "Liquid fuels, Aviation turbine fuel",
  "Liquid fuels, Diesel (average biofuel blend)",
  "Liquid fuels, Diesel (100% mineral diesel)",
  "Liquid fuels, Petrol (average biofuel blend)",
  "Liquid fuels, Petrol (100% mineral petrol)",
  "Liquid fuels, Marine gas oil",
  "Liquid fuels, Marine fuel oil",
  "Gaseous fuels, Butane",
  "Gaseous fuels, CNG",
  "Gaseous fuels, LNG",
  "Gaseous fuels, LPG",
  "Gaseous fuels, Other petroleum gas",
  "Gaseous fuels, Propane",
  "Biofuel, Bioethanol",
  "Biofuel, Biodiesel ME",
  "Biofuel, Biomethane (compressed)",
  "Biofuel, Biodiesel ME (from used cooking oil)",
  "Biofuel, Biodiesel ME (from tallow)",
  "Biofuel, Biodiesel HVO",
  "Biofuel, Biopropane",
  "Biofuel, Development diesel",
  "Biofuel, Development petrol",
  "Biofuel, Off road biodiesel",
  "Biofuel, Biomethane (liquified)",
  "Biofuel, Methanol (bio)",
  "Biofuel, Avtur (renewable)",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_PROCESS = [
  "Carbon dioxide",
  "Methane",
  "Nitrous oxide",
  "Sulphur hexafluoride (SF6)",
  "Nitrogen trifluoride",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_REFRIGERENTS = [
  "Carbon dioxide",
  "HFC-125",
  "HFC-134",
  "HFC-134a",
  "HFC-143",
  "HFC-143a",
  "HFC-152",
  "HFC-152a",
  "HFC-161",
  "HFC-227ea",
  "HFC-23",
  "HFC-236cb",
  "HFC-236ea",
  "HFC-236fa",
  "HFC-245ca",
  "HFC-245fa",
  "HFC-32",
  "HFC-365mfc",
  "HFC-41",
  "HFC-43-I0mee",
  "Methane",
  "Nitrogen trifluoride",
  "Nitrous oxide",
  "Perfluorobutane (PFC-3-1-10)",
  "Perfluorocyclobutane (PFC-318)",
  "Perfluorocyclopropane",
  "Perfluoroethane (PFC-116)",
  "Perfluorohexane (PFC-5-1-14)",
  "Perfluoromethane (PFC-14)",
  "Perfluoropentane (PFC-4-1-12)",
  "Perfluoropropane (PFC-218)",
  "PFC-9-1-18",
  "R401A",
  "R401B",
  "R401C",
  "R402A",
  "R402B",
  "R403A",
  "R403B",
  "R404A",
  "R405A",
  "R407A",
  "R407B",
  "R407C",
  "R407D",
  "R407E",
  "R407F",
  "R408A",
  "R410A",
  "R410B",
  "R411A",
  "R411B",
  "R412A",
  "R413A",
  "R415A",
  "R415B",
  "R416A",
  "R417A",
  "R417B",
  "R417C",
  "R418A",
  "R419A",
  "R419B",
  "R420A",
  "R421A",
  "R421B",
  "R422A",
  "R422B",
  "R422C",
  "R422D",
  "R422E",
  "R423A",
  "R424A",
  "R425A",
  "R426A",
  "R427A",
  "R428A",
  "R429A",
  "R430A",
  "R431A",
  "R434A",
  "R435A",
  "R437A",
  "R438A",
  "R439A",
  "R440A",
  "R442A",
  "R444A",
  "R445A",
  "R503",
  "R504",
  "R507A",
  "R508A",
  "R508B",
  "R509A",
  "R511A",
  "R512A",
  "Sulphur hexafluoride (SF6)",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_LOCATION = ["UK Electricity"];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_LOCATION_HEAT_AND_STEAM = ["Onsite heat and steam","District heat and steam"];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_FULL = [
  "Accommodation services",
  "Accounting, bookkeeping and auditing services",
  "Advertising and market research services",
  "Air and spacecraft and related machinery",
  "Air transport services",
  "Alcoholic beverages",
  "Architectural and engineering services",
  "Bakery and farinaceous products",
  "Basic iron and steel",
  "Basic pharmaceutical products and pharmaceutical preparations",
  "Buildings and building construction works",
  "Cement, lime, plaster and articles of concrete, cement and plaster",
  "Coal and lignite",
  "Coke and refined petroleum products",
  "Computer programming, consultancy and related services",
  "Computer, electronic and optical products",
  "Constructions and construction works for civil engineering",
  "Creative, arts and entertainment services",
  "Crude petroleum and natural gas",
  "Dairy products",
  "Dyestuffs, agro-chemicals",
  "Education services",
  "Electrical equipment",
  "Electricity, transmission and distribution",
  "Employment services",
  "Fabricated metal products, excl. machinery and equipment and weapons & ammunition",
  "Financial services, except insurance and pension funding",
  "Fish and other fishing products; aquaculture products; support services to fishing",
  "Food and beverage serving services",
  "Furniture",
  "Gambling and betting services",
  "Gas; distribution of gaseous fuels through mains; steam and air conditioning supply",
  "Glass, refractory, clay, other porcelain and ceramic, stone and abrasive products",
  "Grain mill products, starches and starch products",
  "Human health services",
  "Industrial gases, inorganics and fertilisers (all inorganic chemicals)",
  "Information services",
  "Insurance, reinsurance and pension funding services",
  "Land transport services",
  "Leather and related products",
  "Legal services",
  "Libraries, archives, museums and other cultural services",
  "Machinery and equipment",
  "Mining support services",
  "Motion picture, video and TV programme production services, sound recording & music publishing",
  "Motor vehicles, trailers and semi-trailers",
  "Natural water; water treatment and supply services",
  "Office administrative, office support and other business support services",
  "Other basic metals and casting",
  "Other chemical products",
  "Other food products",
  "Other manufactured goods",
  "Other mining and quarrying products",
  "Other personal services",
  "Other professional, scientific and technical services",
  "Other transport equipment",
  "Owner-Occupiers' Housing Services",
  "Paints, varnishes and similar coatings, printing ink and mastics",
  "Paper and paper products",
  "Petrochemicals",
  "Postal and courier services",
  "Prepared animal feeds",
  "Preserved meat and meat products",
  "Printing and recording services",
  "Processed and preserved fish, crustaceans, molluscs, fruit and vegetables",
  "Products of agriculture, hunting and related services",
  "Products of forestry, logging and related services",
  "Programming and broadcasting services",
  "Public administration and defence services; compulsory social security services",
  "Publishing services",
  "Rail transport services",
  "Real estate services on a fee or contract basis",
  "Real estate services, excluding on a fee or contract basis and imputed rent",
  "Remediation services and other waste management services",
  "Rental and leasing services",
  "Repair and maintenance of aircraft and spacecraft",
  "Repair and maintenance of ships and boats",
  "Repair services of computers and personal and household goods",
  "Residential care services",
  "Rest of repair; Installation",
  "Retail trade services, except of motor vehicles and motorcycles",
  "Rubber and plastic products",
  "Scientific research and development services",
  "Security and investigation services",
  "Services auxiliary to financial services and insurance services",
  "Services furnished by membership organisations",
  "Services of head offices; management consulting services",
  "Services of households as employers of domestic personnel",
  "Services to buildings and landscape",
  "Sewerage services; sewage sludge",
  "Ships and boats",
  "Soap and detergents, cleaning and polishing preparations, perfumes and toilet preparations",
  "Social work services without accommodation",
  "Soft drinks",
  "Specialised construction works",
  "Sports services and amusement and recreation services",
  "Telecommunications services",
  "Textiles",
  "Tobacco products",
  "Travel agency, tour operator and other reservation services and related services",
  "Vegetable and animal oils and fats",
  "Veterinary services",
  "Warehousing and support services for transportation",
  "Waste collection, treatment and disposal services; materials recovery services",
  "Water transport services",
  "Weapons and ammunition",
  "Wearing apparel",
  "Wholesale and retail trade and repair services of motor vehicles and motorcycles",
  "Wholesale trade services, except of motor vehicles and motorcycles",
  "Wood and of products of wood and cork, except furniture; articles of straw and plaiting materials",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_MATERIALS = [
  "Construction, Aggregates, Primary material production",
  "Construction, Aggregates, Re-used",
  "Construction, Aggregates, Closed-loop source",
  "Construction, Average construction, Primary material production",
  "Construction, Asbestos, Primary material production",
  "Construction, Asphalt, Primary material production",
  "Construction, Asphalt, Re-used",
  "Construction, Asphalt, Closed-loop source",
  "Construction, Bricks, Primary material production",
  "Construction, Concrete, Primary material production",
  "Construction, Concrete, Closed-loop source",
  "Construction, Insulation, Primary material production",
  "Construction, Insulation, Closed-loop source",
  "Construction, Metals, Primary material production",
  "Construction, Metals, Closed-loop source",
  "Construction, Soils, Closed-loop source",
  "Construction, Mineral oil, Primary material production",
  "Construction, Mineral oil, Closed-loop source",
  "Construction, Plasterboard, Primary material production",
  "Construction, Plasterboard, Closed-loop source",
  "Construction, Tyres, Primary material production",
  "Construction, Tyres, Re-used",
  "Construction, Wood, Primary material production",
  "Construction, Wood, Re-used",
  "Construction, Wood, Closed-loop source",
  "Other, Glass, Primary material production",
  "Other, Glass, Closed-loop source",
  "Other, Clothing, Primary material production",
  "Other, Clothing, Re-used",
  "Other, Food and drink, Primary material production",
  "Organic, Compost derived from garden waste, Primary material production",
  "Organic, Compost derived from food and garden waste, Primary material production",
  "Electrical items, Electrical items - fridges and freezers, Primary material production",
  "Electrical items, Electrical items - large, Primary material production",
  "Electrical items, Electrical items - IT, Primary material production",
  "Electrical items, Electrical items - small, Primary material production",
  "Electrical items, Batteries - Alkaline, Primary material production",
  "Electrical items, Batteries - Li ion, Primary material production",
  "Electrical items, Batteries - NiMh, Primary material production",
  "Metal, Metal: aluminium cans and foil (excl. forming), Primary material production",
  "Metal, Metal: aluminium cans and foil (excl. forming), Closed-loop source",
  "Metal, Metal: mixed cans, Primary material production",
  "Metal, Metal: mixed cans, Closed-loop source",
  "Metal, Metal: scrap metal, Primary material production",
  "Metal, Metal: scrap metal, Closed-loop source",
  "Metal, Metal: steel cans, Primary material production",
  "Metal, Metal: steel cans, Closed-loop source",
  "Plastic, Plastics: average plastics, Primary material production",
  "Plastic, Plastics: average plastics, Closed-loop source",
  "Plastic, Plastics: average plastic film, Primary material production",
  "Plastic, Plastics: average plastic film, Closed-loop source",
  "Plastic, Plastics: average plastic rigid, Primary material production",
  "Plastic, Plastics: average plastic rigid, Closed-loop source",
  "Plastic, Plastics: HDPE (incl. forming), Primary material production",
  "Plastic, Plastics: HDPE (incl. forming), Closed-loop source",
  "Plastic, Plastics: LDPE and LLDPE (incl. forming), Primary material production",
  "Plastic, Plastics: LDPE and LLDPE (incl. forming), Closed-loop source",
  "Plastic, Plastics: PET (incl. forming), Primary material production",
  "Plastic, Plastics: PET (incl. forming), Closed-loop source",
  "Plastic, Plastics: PP (incl. forming), Primary material production",
  "Plastic, Plastics: PP (incl. forming), Closed-loop source",
  "Plastic, Plastics: PS (incl. forming), Primary material production",
  "Plastic, Plastics: PS (incl. forming), Closed-loop source",
  "Plastic, Plastics: PVC (incl. forming), Primary material production",
  "Plastic, Plastics: PVC (incl. forming), Closed-loop source",
  "Paper, Paper and board: board, Primary material production",
  "Paper, Paper and board: board, Closed-loop source",
  "Paper, Paper and board: mixed, Primary material production",
  "Paper, Paper and board: mixed, Closed-loop source",
  "Paper, Paper and board: paper, Primary material production",
  "Paper, Paper and board: paper, Closed-loop source",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_WATER_SUPPLIES = ["Water Supply"];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_CAPITAL = [
  "Buildings and building construction works",
  "Computer, electronic and optical products",
  "Constructions and construction works for civil engineering",
  "Electrical equipment",
  "Furniture",
  "Machinery and equipment",
  "Motor vehicles, trailers and semi-trailers",
  "Other manufactured goods",
  "Other transport equipment",
  "Ships and boats",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_FUEL = [
  "Liquid fuels, Aviation spirit",
  "Liquid fuels, Aviation turbine fuel",
  "Liquid fuels, Diesel (average biofuel blend)",
  "Liquid fuels, Diesel (100% mineral diesel)",
  "Liquid fuels, Petrol (average biofuel blend)",
  "Liquid fuels, Petrol (100% mineral petrol)",
  "Liquid fuels, Marine gas oil",
  "Liquid fuels, Marine fuel oil",
  "Biofuel, Bioethanol",
  "Biofuel, Biodiesel ME",
  "Biofuel, Biomethane (compressed)",
  "Biofuel, Biodiesel ME (from used cooking oil)",
  "Biofuel, Biodiesel ME (from tallow)",
  "Biofuel, Biodiesel HVO",
  "Biofuel, Biopropane",
  "Biofuel, Development diesel",
  "Biofuel, Development petrol",
  "Biofuel, Off road biodiesel",
  "Biofuel, Biomethane (liquified)",
  "Biofuel, Methanol (bio)",
  "Biofuel, Avtur (renewable)",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_DISTANCE = [
  "Vans, Class I (up to 1.305 tonnes), Diesel",
  "Vans, Class I (up to 1.305 tonnes), Petrol",
  "Vans, Class I (up to 1.305 tonnes), Battery Electric Vehicle",
  "Vans, Class II (1.305 to 1.74 tonnes), Diesel",
  "Vans, Class II (1.305 to 1.74 tonnes), Petrol",
  "Vans, Class II (1.305 to 1.74 tonnes), Battery Electric Vehicle",
  "Vans, Class III (1.74 to 3.5 tonnes), Diesel",
  "Vans, Class III (1.74 to 3.5 tonnes), Petrol",
  "Vans, Class III (1.74 to 3.5 tonnes), Battery Electric Vehicle",
  "Vans, Average (up to 3.5 tonnes), Diesel",
  "Vans, Average (up to 3.5 tonnes), Petrol",
  "Vans, Average (up to 3.5 tonnes), CNG",
  "Vans, Average (up to 3.5 tonnes), LPG",
  "Vans, Average (up to 3.5 tonnes), Unknown",
  "Vans, Average (up to 3.5 tonnes), Battery Electric Vehicle",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), Average laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), Average laden",
  "HGV (all diesel), Rigid (>17 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), Average laden",
  "HGV (all diesel), All rigids, 0% Laden",
  "HGV (all diesel), All rigids, 50% Laden",
  "HGV (all diesel), All rigids, 100% Laden",
  "HGV (all diesel), All rigids, Average laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 0% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 50% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 100% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), Average laden",
  "HGV (all diesel), Articulated (>33t), 0% Laden",
  "HGV (all diesel), Articulated (>33t), 50% Laden",
  "HGV (all diesel), Articulated (>33t), 100% Laden",
  "HGV (all diesel), Articulated (>33t), Average laden",
  "HGV (all diesel), All artics, 0% Laden",
  "HGV (all diesel), All artics, 50% Laden",
  "HGV (all diesel), All artics, 100% Laden",
  "HGV (all diesel), All artics, Average laden",
  "HGV (all diesel), All HGVs, 0% Laden",
  "HGV (all diesel), All HGVs, 50% Laden",
  "HGV (all diesel), All HGVs, 100% Laden",
  "HGV (all diesel), All HGVs, Average laden",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_MASS_DISTANCE = [
  "Vans, Class I (up to 1.305 tonnes), Diesel",
  "Vans, Class I (up to 1.305 tonnes), Petrol",
  "Vans, Class I (up to 1.305 tonnes), Battery Electric Vehicle",
  "Vans, Class II (1.305 to 1.74 tonnes), Diesel",
  "Vans, Class II (1.305 to 1.74 tonnes), Petrol",
  "Vans, Class II (1.305 to 1.74 tonnes), Battery Electric Vehicle",
  "Vans, Class III (1.74 to 3.5 tonnes), Diesel",
  "Vans, Class III (1.74 to 3.5 tonnes), Petrol",
  "Vans, Class III (1.74 to 3.5 tonnes), Battery Electric Vehicle",
  "Vans, Average (up to 3.5 tonnes), Diesel",
  "Vans, Average (up to 3.5 tonnes), Petrol",
  "Vans, Average (up to 3.5 tonnes), CNG",
  "Vans, Average (up to 3.5 tonnes), LPG",
  "Vans, Average (up to 3.5 tonnes), Unknown",
  "Vans, Average (up to 3.5 tonnes), Battery Electric Vehicle",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>3.5 - 7.5 tonnes), Average laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>7.5 tonnes-17 tonnes), Average laden",
  "HGV (all diesel), Rigid (>17 tonnes), 0% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), 50% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), 100% Laden",
  "HGV (all diesel), Rigid (>17 tonnes), Average laden",
  "HGV (all diesel), All rigids, 0% Laden",
  "HGV (all diesel), All rigids, 50% Laden",
  "HGV (all diesel), All rigids, 100% Laden",
  "HGV (all diesel), All rigids, Average laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 0% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 50% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), 100% Laden",
  "HGV (all diesel), Articulated (>3.5 - 33t), Average laden",
  "HGV (all diesel), Articulated (>33t), 0% Laden",
  "HGV (all diesel), Articulated (>33t), 50% Laden",
  "HGV (all diesel), Articulated (>33t), 100% Laden",
  "HGV (all diesel), Articulated (>33t), Average laden",
  "HGV (all diesel), All artics, 0% Laden",
  "HGV (all diesel), All artics, 50% Laden",
  "HGV (all diesel), All artics, 100% Laden",
  "HGV (all diesel), All artics, Average laden",
  "HGV (all diesel), All HGVs, 0% Laden",
  "HGV (all diesel), All HGVs, 50% Laden",
  "HGV (all diesel), All HGVs, 100% Laden",
  "HGV (all diesel), All HGVs, Average laden",
  "Freight flights, Domestic, to/from UK, With RF",
  "Freight flights, Domestic, to/from UK, Without RF",
  "Freight flights, Short-haul, to/from UK, With RF",
  "Freight flights, Short-haul, to/from UK, Without RF",
  "Freight flights, Long-haul, to/from UK, With RF",
  "Freight flights, Long-haul, to/from UK, Without RF",
  "Freight flights, International, to/from non-UK, With RF",
  "Freight flights, International, to/from non-UK, Without RF",
  "Rail, Freight train",
  "Sea tanker, Crude tanker, 200,000+ dwt",
  "Sea tanker, Crude tanker, 120,000-199,999 dwt",
  "Sea tanker, Crude tanker, 80,000-119,999 dwt",
  "Sea tanker, Crude tanker, 60,000-79,999 dwt",
  "Sea tanker, Crude tanker, 10,000-59,999 dwt",
  "Sea tanker, Crude tanker, 0-9999 dwt",
  "Sea tanker, Crude tanker, Average",
  "Sea tanker, Products tanker , 60,000+ dwt",
  "Sea tanker, Products tanker , 20,000-59,999 dwt",
  "Sea tanker, Products tanker , 10,000-19,999 dwt",
  "Sea tanker, Products tanker , 5000-9999 dwt",
  "Sea tanker, Products tanker , 0-4999 dwt",
  "Sea tanker, Products tanker , Average",
  "Sea tanker, Chemical tanker , 20,000+ dwt",
  "Sea tanker, Chemical tanker , 10,000-19,999 dwt",
  "Sea tanker, Chemical tanker , 5000-9999 dwt",
  "Sea tanker, Chemical tanker , 0-4999 dwt",
  "Sea tanker, Chemical tanker , Average",
  "Sea tanker, LNG tanker, 200,000+ m3",
  "Sea tanker, LNG tanker, 0-199,999 m3",
  "Sea tanker, LNG tanker, Average",
  "Sea tanker, LPG Tanker, 50,000+ m3",
  "Sea tanker, LPG Tanker, 0-49,999 m3",
  "Sea tanker, LPG Tanker, Average",
  "Cargo ship, Bulk carrier, 200,000+ dwt",
  "Cargo ship, Bulk carrier, 100,000-199,999 dwt",
  "Cargo ship, Bulk carrier, 60,000-99,999 dwt",
  "Cargo ship, Bulk carrier, 35,000-59,999 dwt",
  "Cargo ship, Bulk carrier, 10,000-34,999 dwt",
  "Cargo ship, Bulk carrier, 0-9999 dwt",
  "Cargo ship, Bulk carrier, Average",
  "Cargo ship, General cargo, 10,000+ dwt",
  "Cargo ship, General cargo, 5000-9999 dwt",
  "Cargo ship, General cargo, 0-4999 dwt",
  "Cargo ship, General cargo, 10,000+ dwt 100+ TEU",
  "Cargo ship, General cargo, 5000-9999 dwt 100+ TEU",
  "Cargo ship, General cargo, 0-4999 dwt 100+ TEU",
  "Cargo ship, General cargo, Average",
  "Cargo ship, Container ship, 8000+ TEU",
  "Cargo ship, Container ship, 5000-7999 TEU",
  "Cargo ship, Container ship, 3000-4999 TEU",
  "Cargo ship, Container ship, 2000-2999 TEU",
  "Cargo ship, Container ship, 1000-1999 TEU",
  "Cargo ship, Container ship, 0-999 TEU",
  "Cargo ship, Container ship, Average",
  "Cargo ship, Vehicle transport, 4000+ CEU",
  "Cargo ship, Vehicle transport, 0-3999 CEU",
  "Cargo ship, Vehicle transport, Average",
  "Cargo ship, RoRo-Ferry, 2000+ LM",
  "Cargo ship, RoRo-Ferry, 0-1999 LM",
  "Cargo ship, RoRo-Ferry, Average",
  "Cargo ship, Large RoPax ferry, Average",
  "Cargo ship, Refrigerated cargo,  All dwt",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_BUSINESS_TRAVEL = [
  "Air transport services",
  "Land transport services",
  "Rail transport services",
  "Water transport services",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_FRIEGHT = [
  ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_BUSINESS_TRAVEL,
  "Postal and courier services",
  "Warehousing and support services for transportation",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_WASTE = [
  "Construction, Aggregates, Open-loop",
  "Construction, Aggregates, Closed-loop",
  "Construction, Aggregates, Landfill",
  "Construction, Average construction, Open-loop",
  "Construction, Average construction, Closed-loop",
  "Construction, Average construction, Combustion",
  "Construction, Bricks, Open-loop",
  "Construction, Bricks, Landfill",
  "Construction, Concrete, Open-loop",
  "Construction, Concrete, Closed-loop",
  "Construction, Concrete, Landfill",
  "Construction, Insulation, Closed-loop",
  "Construction, Insulation, Landfill",
  "Construction, Metals, Closed-loop",
  "Construction, Metals, Landfill",
  "Construction, Mineral oil, Closed-loop",
  "Construction, Mineral oil, Combustion",
  "Construction, Soils, Closed-loop",
  "Construction, Soils, Landfill",
  "Construction, Tyres, Closed-loop",
  "Construction, Wood, Closed-loop",
  "Construction, Wood, Combustion",
  "Construction, Wood, Composting",
  "Construction, Wood, Landfill",
  "Other, Books, Closed-loop",
  "Other, Books, Combustion",
  "Other, Books, Landfill",
  "Other, Glass, Open-loop",
  "Other, Glass, Closed-loop",
  "Other, Glass, Combustion",
  "Other, Glass, Landfill",
  "Other, Clothing, Closed-loop",
  "Other, Clothing, Combustion",
  "Other, Clothing, Landfill",
  "Refuse, Organic: food and drink waste, Combustion",
  "Refuse, Organic: food and drink waste, Composting",
  "Refuse, Organic: food and drink waste, Landfill",
  "Refuse, Organic: food and drink waste, Anaerobic digestion",
  "Refuse, Commercial and industrial waste, Combustion",
  "Refuse, Commercial and industrial waste, Landfill",
  "Electrical items, WEEE - mixed, Open-loop",
  "Electrical items, WEEE - mixed, Combustion",
  "Electrical items, WEEE - mixed, Landfill",
  "Electrical items, Batteries, Open-loop",
  "Electrical items, Batteries, Landfill",
  "Metal, Metal: scrap metal, Open-loop",
  "Metal, Metal: scrap metal, Closed-loop",
  "Metal, Metal: scrap metal, Combustion",
  "Metal, Metal: scrap metal, Landfill",
  "Plastic, Plastics: average plastics, Open-loop",
  "Plastic, Plastics: average plastics, Closed-loop",
  "Plastic, Plastics: average plastics, Combustion",
  "Plastic, Plastics: average plastics, Landfill",
  "Paper, Paper and board: mixed, Closed-loop",
  "Paper, Paper and board: mixed, Combustion",
  "Paper, Paper and board: mixed, Composting",
  "Paper, Paper and board: mixed, Landfill",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_WATER_TREATMENT = [
  "Water Treatment",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_VEHICLES = [
  "Cars (by size), Small car, Diesel",
  "Cars (by size), Small car, Petrol",
  "Cars (by size), Small car, Hybrid",
  "Cars (by size), Small car, Unknown",
  "Cars (by size), Small car, Plug-in Hybrid Electric Vehicle",
  "Cars (by size), Small car, Battery Electric Vehicle",
  "Cars (by size), Medium car, Diesel",
  "Cars (by size), Medium car, Petrol",
  "Cars (by size), Medium car, Hybrid",
  "Cars (by size), Medium car, CNG",
  "Cars (by size), Medium car, LPG",
  "Cars (by size), Medium car, Unknown",
  "Cars (by size), Medium car, Plug-in Hybrid Electric Vehicle",
  "Cars (by size), Medium car, Battery Electric Vehicle",
  "Cars (by size), Large car, Diesel",
  "Cars (by size), Large car, Petrol",
  "Cars (by size), Large car, Hybrid",
  "Cars (by size), Large car, CNG",
  "Cars (by size), Large car, LPG",
  "Cars (by size), Large car, Unknown",
  "Cars (by size), Large car, Plug-in Hybrid Electric Vehicle",
  "Cars (by size), Large car, Battery Electric Vehicle",
  "Cars (by size), Average car, Diesel",
  "Cars (by size), Average car, Petrol",
  "Cars (by size), Average car, Hybrid",
  "Cars (by size), Average car, CNG",
  "Cars (by size), Average car, LPG",
  "Cars (by size), Average car, Unknown",
  "Cars (by size), Average car, Plug-in Hybrid Electric Vehicle",
  "Cars (by size), Average car, Battery Electric Vehicle",
  "Motorbike, Small",
  "Motorbike, Medium",
  "Motorbike, Large",
  "Motorbike, Average",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_PUBLIC = [
  "Taxis, Regular taxi",
  "Taxis, Black cab",
  "Bus, Local bus (not London)",
  "Bus, Local London bus",
  "Bus, Average local bus",
  "Bus, Coach",
  "Rail, National rail",
  "Rail, International rail",
  "Rail, Light rail and tram",
  "Rail, London Underground",
  "Flights, Domestic, to/from UK, Average passenger, With RF",
  "Flights, Short-haul, to/from UK, Average passenger, With RF",
  "Flights, Short-haul, to/from UK, Economy class, With RF",
  "Flights, Short-haul, to/from UK, Business class, With RF",
  "Flights, Long-haul, to/from UK, Average passenger, With RF",
  "Flights, Long-haul, to/from UK, Economy class, With RF",
  "Flights, Long-haul, to/from UK, Premium economy class, With RF",
  "Flights, Long-haul, to/from UK, Business class, With RF",
  "Flights, Long-haul, to/from UK, First class, With RF",
  "Flights, International, to/from non-UK, Average passenger, With RF",
  "Flights, International, to/from non-UK, Economy class, With RF",
  "Flights, International, to/from non-UK, Premium economy class, With RF",
  "Flights, International, to/from non-UK, Business class, With RF",
  "Flights, International, to/from non-UK, First class, With RF",
  "Ferry, Foot passenger",
  "Ferry, Car passenger",
  "Ferry, Average (all passenger)",
];
const CC_COMBINED_REFERENCE_AND_ACTIVITIES_HOMEWORKING_AVERAGE = [
  "Office Equipment",
  "Heating",
  "Homeworking (office equipment + heating)",
];

const CC_COMBINED_REFERENCE_AND_ACTIVITIES_DROPDOWNS = {
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_PREMISES]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_GASEOUS_FUELS_NATURAL_GAS,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_GASEOUS_FUELS,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_LIQUID_FUELS,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_SOLID_FUELS,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOENERGY,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOMASS_AND_GAS,
    ],
  },
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_VEHICLES]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_FUEL,
    ],
    [CC_CALCULATION_METHODS.DISTANCE_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_DISTANCE_PASSENGER,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_DISTANCE_DELIVERY,
    ],
  },
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.PROCESS_EMISSIONS]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_PROCESS,
    ],
  },
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.FUGITIVE_EMISSIONS]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_REFRIGERENTS,
    ],
  },
  [CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_ELECTRICITY]: {
    [CC_CALCULATION_METHODS.LOCATION_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_LOCATION,
    ],
  },
  [CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM]: {
    [CC_CALCULATION_METHODS.LOCATION_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_LOCATION_HEAT_AND_STEAM,
    ],
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PURCHASED_GOODS_AND_SERVICES]: {
    [CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_MATERIALS,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_WATER_SUPPLIES,
    ],
    [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_FULL,
    ],
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.CAPITAL_GOODS]: {
    [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_CAPITAL,
    ],
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION]:
    {
      [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: [
        ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_FUEL,
      ],
      [CC_CALCULATION_METHODS.MASS_DISTANCE_BASED_METHOD]: [
        ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_MASS_DISTANCE,
      ],
      [CC_CALCULATION_METHODS.DISTANCE_BASED_METHOD]: [
        ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_DISTANCE,
      ],
      [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: [
        ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_FRIEGHT,
      ],
    },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION]:
    {
      [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: [
        ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_FUEL,
      ],
      [CC_CALCULATION_METHODS.MASS_DISTANCE_BASED_METHOD]: [
        ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_MASS_DISTANCE,
      ],
      [CC_CALCULATION_METHODS.DISTANCE_BASED_METHOD]: [
        ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_DISTANCE,
      ],
      [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: [
        ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_FRIEGHT,
      ],
    },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.WASTE_GENERATED_IN_OPERATIONS]: {
    [CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_WASTE,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_WATER_TREATMENT,
    ],
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.BUSINESS_TRAVEL]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_LIQUID_FUELS,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOENERGY,
    ],
    [CC_CALCULATION_METHODS.DISTANCE_BASED_VEHICLES_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_VEHICLES,
    ],
    [CC_CALCULATION_METHODS.DISTANCE_BASED_PUBLIC_TRANSPORT_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_PUBLIC,
    ],
    [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_BUSINESS_TRAVEL,
    ],
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_LIQUID_FUELS,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOENERGY,
    ],
    [CC_CALCULATION_METHODS.DISTANCE_BASED_VEHICLES_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_VEHICLES,
    ],
    [CC_CALCULATION_METHODS.DISTANCE_BASED_PUBLIC_TRANSPORT_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_PUBLIC,
    ],
    [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_BUSINESS_TRAVEL,
    ],
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING_HOMEWORKING]: {
    [CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_HOMEWORKING_AVERAGE,
    ],
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS]: {
    [CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]: [
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_WASTE,
      ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_WATER_TREATMENT,
    ],
  },
};

const CC_UNITS_FUELS_1 = [
  CC_UNITS.TONNES,
  CC_UNITS.LITRES,
  CC_UNITS.KWH_NET_CV,
  CC_UNITS.KWH_GROSS_CV,
];
const CC_UNITS_FUELS_2 = [
  CC_UNITS.TONNES,
  CC_UNITS.CUBIC_METERS,
  CC_UNITS.KWH_NET_CV,
  CC_UNITS.KWH_GROSS_CV,
];
const CC_UNITS_FUELS_3 = [
  CC_UNITS.TONNES,
  CC_UNITS.KWH_NET_CV,
  CC_UNITS.KWH_GROSS_CV,
];
const CC_UNITS_FUELS_4 = [CC_UNITS.LITRES, CC_UNITS.KG];
const CC_UNITS_FUELS_5 = [CC_UNITS.TONNES, CC_UNITS.KWH];
const CC_UNITS_VEHICLE_FUEL = [CC_UNITS.LITRES];
const CC_UNITS_VEHICLE_DISTANCE = [CC_UNITS.KM, CC_UNITS.MILES];
const CC_UNITS_PRO_FUG = [CC_UNITS.KG];
const CC_UNITS_ELECTRICITY_LOCATION = [CC_UNITS.KWH];
const CC_UNITS_HEAT_AND_STEAM_LOCATION = [CC_UNITS.KWH];
const CC_UNITS_MATERIALS = [CC_UNITS.TONNES];
const CC_UNITS_WATER = [CC_UNITS.CUBIC_METERS, CC_UNITS.MILLION_LITRES];
const CC_UNITS_DROPDOWNS = {
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_PREMISES]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        [...CC_COMBINED_REFERENCE_AND_ACTIVITIES_GASEOUS_FUELS_NATURAL_GAS],
        CC_UNITS_FUELS_2
      ),
      ...assignRightListToEveryItemInLeftList(
        [
          ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_GASEOUS_FUELS,
          ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_LIQUID_FUELS,
        ],
        CC_UNITS_FUELS_1
      ),
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_SOLID_FUELS,
        CC_UNITS_FUELS_3
      ),
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOENERGY,
        CC_UNITS_FUELS_4
      ),
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOMASS_AND_GAS,
        CC_UNITS_FUELS_5
      ),
    },
  },
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.COMPANY_VEHICLES]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_FUEL,
        CC_UNITS_VEHICLE_FUEL
      ),
    },
    [CC_CALCULATION_METHODS.DISTANCE_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        [
          ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_DISTANCE_PASSENGER,
          ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_VEHICLES_DISTANCE_DELIVERY,
        ],
        CC_UNITS_VEHICLE_DISTANCE
      ),
    },
  },
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.PROCESS_EMISSIONS]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_PROCESS,
        CC_UNITS_PRO_FUG
      ),
    },
  },
  [CC_EMISSION_SCOPE_1_CATEGORY_NAMES.FUGITIVE_EMISSIONS]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_REFRIGERENTS,
        CC_UNITS_PRO_FUG
      ),
    },
  },
  [CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_ELECTRICITY]: {
    [CC_CALCULATION_METHODS.LOCATION_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_LOCATION,
        CC_UNITS_ELECTRICITY_LOCATION
      ),
    },
  },
  [CC_EMISSION_SCOPE_2_CATEGORY_NAMES.PURCHASED_HEAT_AND_STEAM]: {
    [CC_CALCULATION_METHODS.LOCATION_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_LOCATION_HEAT_AND_STEAM,
        CC_UNITS_HEAT_AND_STEAM_LOCATION
      ),
    },
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.PURCHASED_GOODS_AND_SERVICES]: {
    [CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_MATERIALS,
        CC_UNITS_MATERIALS
      ),
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_WATER_SUPPLIES,
        CC_UNITS_WATER
      ),
    },
    [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_FULL,
        [CC_UNITS.POUND_SPENT]
      ),
    },
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.CAPITAL_GOODS]: {
    [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_CAPITAL,
        [CC_UNITS.POUND_SPENT]
      ),
    },
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION]:
    {
      [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: {
        ...assignRightListToEveryItemInLeftList(
          CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_FUEL,
          [CC_UNITS.LITRES]
        ),
      },

      [CC_CALCULATION_METHODS.MASS_DISTANCE_BASED_METHOD]: {
        ...assignRightListToEveryItemInLeftList(
          CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_MASS_DISTANCE,
          [CC_UNITS.TONNE_KM]
        ),
      },
      [CC_CALCULATION_METHODS.DISTANCE_BASED_METHOD]: {
        ...assignRightListToEveryItemInLeftList(
          CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_DISTANCE,
          [CC_UNITS.KM, CC_UNITS.MILES]
        ),
      },
      [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: {
        ...assignRightListToEveryItemInLeftList(
          CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_FRIEGHT,
          [CC_UNITS.POUND_SPENT]
        ),
      },
    },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.DOWNSTREAM_TRANSPORTATION_AND_DISTRIBUTION]:
    {
      [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: {
        ...assignRightListToEveryItemInLeftList(
          CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_FUEL,
          [CC_UNITS.LITRES]
        ),
      },

      [CC_CALCULATION_METHODS.MASS_DISTANCE_BASED_METHOD]: {
        ...assignRightListToEveryItemInLeftList(
          CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_MASS_DISTANCE,
          [CC_UNITS.TONNE_KM]
        ),
      },
      [CC_CALCULATION_METHODS.DISTANCE_BASED_METHOD]: {
        ...assignRightListToEveryItemInLeftList(
          CC_COMBINED_REFERENCE_AND_ACTIVITIES_FRIEGHT_DISTANCE,
          [CC_UNITS.KM, CC_UNITS.MILES]
        ),
      },
      [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: {
        ...assignRightListToEveryItemInLeftList(
          CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_FRIEGHT,
          [CC_UNITS.POUND_SPENT]
        ),
      },
    },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.WASTE_GENERATED_IN_OPERATIONS]: {
    [CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_WASTE,
        CC_UNITS_MATERIALS
      ),
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_WATER_TREATMENT,
        CC_UNITS_WATER
      ),
    },
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.BUSINESS_TRAVEL]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        [
          ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_LIQUID_FUELS,
          ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOENERGY,
        ],
        [CC_UNITS.LITRES]
      ),
    },
    [CC_CALCULATION_METHODS.DISTANCE_BASED_VEHICLES_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_VEHICLES,
        [CC_UNITS.KM, CC_UNITS.MILES]
      ),
    },
    [CC_CALCULATION_METHODS.DISTANCE_BASED_PUBLIC_TRANSPORT_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_PUBLIC,
        [CC_UNITS.PASSENGER_KM]
      ),
    },
    [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_BUSINESS_TRAVEL,
        [CC_UNITS.POUND_SPENT]
      ),
    },
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING]: {
    [CC_CALCULATION_METHODS.FUEL_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        [
          ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_LIQUID_FUELS,
          ...CC_COMBINED_REFERENCE_AND_ACTIVITIES_BIOENERGY,
        ],
        [CC_UNITS.LITRES]
      ),
    },
    [CC_CALCULATION_METHODS.DISTANCE_BASED_VEHICLES_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_VEHICLES,
        [CC_UNITS.KM, CC_UNITS.MILES]
      ),
    },
    [CC_CALCULATION_METHODS.DISTANCE_BASED_PUBLIC_TRANSPORT_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_DISTANCE_PUBLIC,
        [CC_UNITS.PASSENGER_KM]
      ),
    },
    [CC_CALCULATION_METHODS.SPEND_BASED_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_SIC_BUSINESS_TRAVEL,
        [CC_UNITS.POUND_SPENT]
      ),
    },
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.EMPLOYEE_COMMUTING_HOMEWORKING]: {
    [CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_HOMEWORKING_AVERAGE,
        [CC_UNITS.PER_FTE_WORKING_HOUR]
      ),
    },
  },
  [CC_EMISSION_SCOPE_3_CATEGORY_NAMES.END_OF_LIFE_TREATMENT_OF_SOLD_PRODUCTS]: {
    [CC_CALCULATION_METHODS.AVERAGE_DATA_METHOD]: {
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_WASTE,
        CC_UNITS_MATERIALS
      ),
      ...assignRightListToEveryItemInLeftList(
        CC_COMBINED_REFERENCE_AND_ACTIVITIES_WATER_TREATMENT,
        CC_UNITS_WATER
      ),
    },
  },
};
const CC_DEFAULT_REPORTS = {
  SINGLE_YEAR_REPORT: "Single year report",
};
const CC_DATA_QUALITY_INFORMATION = {
  [CC_DATA_QUALITY_GRADES.VERY_GOOD]: {
    DEFINITION: CC_DATA_QUALITY_GRADES.VERY_GOOD,
    ACTIVITY_DATA_CRITERIA:
      "Direct measurement data for the reporting period. Reliable primary data for the reporting period. Reliable estimates based on recent operational data.",
    EMISSION_FACTOR_CRITERIA: "",
  },
  [CC_DATA_QUALITY_GRADES.GOOD]: {
    DEFINITION: CC_DATA_QUALITY_GRADES.GOOD,
    ACTIVITY_DATA_CRITERIA:
      "Data derived from financial or operational estimations with a justified method. Verified data partly based on assumptions.",
    EMISSION_FACTOR_CRITERIA: "",
  },
  [CC_DATA_QUALITY_GRADES.FAIR]: {
    DEFINITION: CC_DATA_QUALITY_GRADES.FAIR,
    ACTIVITY_DATA_CRITERIA:
      "Historical data used with justified adjustments to make them reliable. Estimates with limited direct measurement.",
    EMISSION_FACTOR_CRITERIA: "",
  },
  [CC_DATA_QUALITY_GRADES.BASIC]: {
    DEFINITION: CC_DATA_QUALITY_GRADES.BASIC,
    ACTIVITY_DATA_CRITERIA:
      "Broadly allocated estimates with no direct measurement, high uncertainty, and low direct measurement correlation. Spend-based calculations.",
    EMISSION_FACTOR_CRITERIA: "",
  },
};
const CC_PRECISION_DECIMALS = 2;
const CC_CONSTANTS = {
  CC_EMISSION_SCOPES,
  CC_EMISSION_SCOPE_1_CATEGORY_NAMES,
  CC_EMISSION_SCOPE_2_CATEGORY_NAMES,
  CC_EMISSION_SCOPE_3_CATEGORY_NAMES,
  CC_EMISSION_SCOPE_1_CATEGORY_ORDERS,
  CC_EMISSION_SCOPE_2_CATEGORY_ORDERS,
  CC_EMISSION_SCOPE_3_CATEGORY_ORDERS,
  CC_EMISSION_SCOPE_NAMES,
  CC_EMISSION_CATEGORY_NAMES,
  CC_DATA_QUALITY_GRADES,
  CC_ORGANISATIONAL_BOUNDARIES,
  CC_REPORTING_METHODS,
  CC_ALLOWED_NET_ZERO_TARGET_YEARS: getAllowedNetZeroTargetYears(),
  CC_ALLOWED_NET_ZERO_REPORTING_YEARS: getAllowedReportingYears(),
  CC_CALCULATION_METHODS,
  CC_GHG_GASSES,
  CC_GHG_INCLUSION_ASSESSMENT,
  CC_MISC,
  CC_EMISSION_FACTOR_TYPES,
  CC_METRIC_UNITS,
  CC_IMPERIAL_UNITS,
  CC_UNITS,
  CC_DATA_QUALITY_GRADE_SCORE_MAP,
  CC_RELEVANCE,
  CC_CATEGTORIES_WITH_DETAILS,
  CC_COMBINED_REFERENCE_AND_ACTIVITIES_DROPDOWNS,
  CC_UNITS_DROPDOWNS,
  CC_CALCULATION_METHODS_DROPDOWNS,
  CC_DEFAULT_REPORTS,
  CC_EMISSION_CATEGORY_ORDERS,
  CC_DATA_QUALITY_INFORMATION,
  CC_EMISSION_COLORS,
  CC_PRECISION_DECIMALS,
};
export default { ...CC_CONSTANTS };