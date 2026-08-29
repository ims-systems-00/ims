import { Col, Row } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { GiElectric } from "react-icons/gi";
import { LuBadgeCheck } from "react-icons/lu";
import { MdAllInclusive } from "react-icons/md";
import DataCard from "../../../../components/DataCard";
import TextEditableLi from "../../../../components/TextEditableLi";
import { useCategoryCalculation } from "../store";
import useApplicableCalculationField, {
  CALCULATION_FIELD_NAMES,
} from "../../../../hooks/useApplicableCalculationField";
import If from "../../../../components/If";
import CC_CONSTANTS from "../../../../constants";
import { GasInChemicalFormat } from "../../../../components/GasInChemicalFormat";
const GHG_NOT_APPLICABLE_TEXT = "Gas is not applicable";
export default function InputSettings({}) {
  const { viewingCategoryCalculation } = useCategoryCalculation();
  const { isApplicableFieldForCategory } = useApplicableCalculationField();
  if (!viewingCategoryCalculation) return null;
  return (
    <React.Fragment>
      <h6>Data Quality</h6>
      <Row>
        <Col md="6">
          <DataCard
            variant="primary"
            icon={<LuBadgeCheck size={16} className="text-dark" />}
            heading={viewingCategoryCalculation.activityDataGrade}
            subHeading={"Data grade"}
          />
        </Col>
        {/* <Col md="4">
          <DataCard
            variant="pending"
            icon={<BiTachometer size={16} className="text-dark" />}
            heading={viewingCategoryCalculation.dataQualityADScore}
            subHeading={"AD Score"}
          />
        </Col>
        <Col md="4">
          <DataCard
            variant="dark"
            icon={<TbWeight size={16} className="text-dark" />}
            heading={viewingCategoryCalculation.dataQualityADWeightedScore}
            subHeading={"AD Weighted Score"}
          />
        </Col>
        <Col md="4">
          <DataCard
            variant="warning"
            icon={<LuBadgeCheck size={16} className="text-dark" />}
            heading={viewingCategoryCalculation.dataQualityEmissionFactorGrade}
            subHeading={"EF Grade"}
          />
        </Col>
        <Col md="4">
          <DataCard
            variant="success"
            icon={<BiTachometer size={16} className="text-dark" />}
            heading={viewingCategoryCalculation.dataQualityEmissionFactorScore}
            subHeading={"EF Score"}
          />
        </Col>
        <Col md="4">
          <DataCard
            variant="danger"
            icon={<LuBadgeCheck size={16} className="text-dark" />}
            heading={
              viewingCategoryCalculation.dataQualityEmissionFactorWeightedScore
            }
            subHeading={"Ef Weighted Score"}
          />
        </Col> */}
      </Row>
      <h6>Greenhouse Gases (Tonnes)</h6>
      <Row>
        <Col md="6">
          <TextEditableLi
            label={
              <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
            }
            disabled
            value={viewingCategoryCalculation.ghgCo2eEmission}
          />
        </Col>
        <If
          expression={
            ![
              CC_CONSTANTS.CC_CALCULATION_METHODS.CUSTOM,
              CC_CONSTANTS.CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
              CC_CONSTANTS.CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
            ].includes(viewingCategoryCalculation.calculationMethod)
          }
        >
          <If
            expression={isApplicableFieldForCategory(
              viewingCategoryCalculation.category,
              CALCULATION_FIELD_NAMES.GHG_CO2_EMISSION
            )}
          >
            <Col md="6">
              <TextEditableLi
                label={
                  <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2} />
                }
                disabled
                value={
                  !isApplicableFieldForCategory(
                    viewingCategoryCalculation.category,
                    CALCULATION_FIELD_NAMES.GHG_CO2_EMISSION
                  )
                    ? GHG_NOT_APPLICABLE_TEXT
                    : viewingCategoryCalculation.ghgCo2Emission
                }
              />
            </Col>
          </If>
          <If
            expression={isApplicableFieldForCategory(
              viewingCategoryCalculation.category,
              CALCULATION_FIELD_NAMES.GHG_BIOGENIC_CO2_EMISSION
            )}
          >
            <Col md="6">
              <TextEditableLi
                label={
                  <span>
                    Biogenic{" "}
                    <GasInChemicalFormat
                      gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E}
                    />
                  </span>
                }
                disabled
                value={
                  !isApplicableFieldForCategory(
                    viewingCategoryCalculation.category,
                    CALCULATION_FIELD_NAMES.GHG_BIOGENIC_CO2_EMISSION
                  )
                    ? GHG_NOT_APPLICABLE_TEXT
                    : viewingCategoryCalculation.ghgBiogenicCo2Emission
                }
              />
            </Col>
          </If>
          <Col md="6">
            <TextEditableLi
              label={
                <span>
                  Well-To-Tank{" "}
                  <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />
                </span>
              }
              disabled
              value={viewingCategoryCalculation.ghgWellToTankCo2eEmission}
            />
          </Col>
          <If
            expression={isApplicableFieldForCategory(
              viewingCategoryCalculation.category,
              CALCULATION_FIELD_NAMES.GHG_CH4_EMISSION
            )}
          >
            <Col md="6">
              <TextEditableLi
                label={
                  <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CH4} />
                }
                disabled
                value={
                  !isApplicableFieldForCategory(
                    viewingCategoryCalculation.category,
                    CALCULATION_FIELD_NAMES.GHG_CH4_EMISSION
                  )
                    ? GHG_NOT_APPLICABLE_TEXT
                    : viewingCategoryCalculation.ghgCh4Emission
                }
              />
            </Col>
          </If>
          <If
            expression={isApplicableFieldForCategory(
              viewingCategoryCalculation.category,
              CALCULATION_FIELD_NAMES.GHG_N2O_EMISSION
            )}
          >
            <Col md="6">
              <TextEditableLi
                label={
                  <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.N2O} />
                }
                disabled
                value={
                  !isApplicableFieldForCategory(
                    viewingCategoryCalculation.category,
                    CALCULATION_FIELD_NAMES.GHG_N2O_EMISSION
                  )
                    ? GHG_NOT_APPLICABLE_TEXT
                    : viewingCategoryCalculation.ghgN2oEmission
                }
              />
            </Col>
          </If>
          <If
            expression={isApplicableFieldForCategory(
              viewingCategoryCalculation.category,
              CALCULATION_FIELD_NAMES.GHG_HFC_EMISSION
            )}
          >
            <Col md="6">
              <TextEditableLi
                label={
                  <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.HFC} />
                }
                disabled
                value={
                  !isApplicableFieldForCategory(
                    viewingCategoryCalculation.category,
                    CALCULATION_FIELD_NAMES.GHG_HFC_EMISSION
                  )
                    ? GHG_NOT_APPLICABLE_TEXT
                    : viewingCategoryCalculation.ghgHfcEmission
                }
              />
            </Col>
          </If>
          <If
            expression={isApplicableFieldForCategory(
              viewingCategoryCalculation.category,
              CALCULATION_FIELD_NAMES.GHG_NF3_EMISSION
            )}
          >
            <Col md="6">
              <TextEditableLi
                label={
                  <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.NF3} />
                }
                disabled
                value={
                  !isApplicableFieldForCategory(
                    viewingCategoryCalculation.category,
                    CALCULATION_FIELD_NAMES.GHG_NF3_EMISSION
                  )
                    ? GHG_NOT_APPLICABLE_TEXT
                    : viewingCategoryCalculation.ghgNf3Emission
                }
              />
            </Col>
          </If>
          <If
            expression={isApplicableFieldForCategory(
              viewingCategoryCalculation.category,
              CALCULATION_FIELD_NAMES.GHG_SF6_EMISSION
            )}
          >
            <Col md="6">
              <TextEditableLi
                label={
                  <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.SF6} />
                }
                disabled
                value={
                  !isApplicableFieldForCategory(
                    viewingCategoryCalculation.category,
                    CALCULATION_FIELD_NAMES.GHG_SF6_EMISSION
                  )
                    ? GHG_NOT_APPLICABLE_TEXT
                    : viewingCategoryCalculation.ghgSf6Emission
                }
              />
            </Col>
          </If>
          <If
            expression={isApplicableFieldForCategory(
              viewingCategoryCalculation.category,
              CALCULATION_FIELD_NAMES.GHG_PFC_EMISSION
            )}
          >
            <Col md="6">
              <TextEditableLi
                label={
                  <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.PFC} />
                }
                disabled
                value={
                  !isApplicableFieldForCategory(
                    viewingCategoryCalculation.category,
                    CALCULATION_FIELD_NAMES.GHG_PFC_EMISSION
                  )
                    ? GHG_NOT_APPLICABLE_TEXT
                    : viewingCategoryCalculation.ghgPfcEmission
                }
              />
            </Col>
          </If>
        </If>
      </Row>
      <h6 className="mb-2">SECR Information</h6>
      <Row>
        <Col md="6">
          <DataCard
            icon={<MdAllInclusive size={24} className="text-dark" />}
            heading={"To Include"}
            subHeading={viewingCategoryCalculation.secrToInclude}
          />
        </Col>
        <Col md="6">
          <DataCard
            icon={<GiElectric size={24} className="text-dark" />}
            heading={"Energy (kWh)"}
            subHeading={viewingCategoryCalculation.secrEnergy}
          />
        </Col>
      </Row>
      <h6 className="mb-2">Emission Factor</h6>
      <Row>
        <Col md="6">
          <DataCard
            icon={<LuBadgeCheck size={24} className="text-dark" />}
            heading={viewingCategoryCalculation.emmisionFactorKgCo2ePerUnit}
            subHeading={"Emission factor (kgCO2e/unit)"}
          />
        </Col>
        <Col md="6">
          <DataCard
            icon={<LuBadgeCheck size={24} className="text-dark" />}
            heading={viewingCategoryCalculation.emmisionFactorSource || "N/A"}
            subHeading={"Emission factor source"}
          />
        </Col>
      </Row>
      <h6 className="mb-2">Emission Factor Notes</h6>
      <div className="p-3 bg-secondary-extra-light rounded">
        {viewingCategoryCalculation.emmisionFactorNote ? (
          <p>{viewingCategoryCalculation.emmisionFactorNote || "N/A"}</p>
        ) : (
          <p>Nothing here</p>
        )}
      </div>
    </React.Fragment>
  );
}
