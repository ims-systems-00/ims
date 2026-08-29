import { createColumnHelper } from "@tanstack/react-table";
import {
  Button,
  Card,
  CardBody,
  Col,
  DrawerOpener,
  DrawerRight,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Row,
  UncontrolledDropdown,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { PiDotsThreeOutlineVertical } from "react-icons/pi";
import { RiDeleteBinLine, RiEdit2Line } from "react-icons/ri";
import CellEditableSelect from "../../../components/CellEditableSelect";
import CellEditableText from "../../../components/CellEditableText";
import SearchItem from "../../../components/SearchItem";
import Table from "../../../components/Table";
import CC_CONSTANTS from "../../../constants";
import { useCategory } from "../stores/categoryStore";
import CategoryCalculationForm from "./CategoryCalculationForm";
import { useCategoryCalculation } from "./store";
import { RiCodeView } from "react-icons/ri";
import Drawer from "./drawer/Index";
import PaginationNumbered from "../../../components/PaginationNumbered";
import TourStep from "../../../components/TourStep";
import { MONTH_FULL_NAMES } from "./dto/categoryCalculation.dto";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";
const columnHelper = createColumnHelper();

function EditSupplierName({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          supplierName: changes,
        })
      }
    />
  );
}
function EditMeterNumber({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          meterNumber: changes,
        })
      }
    />
  );
}
function EditInvoiceNumber({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          invoiceNumber: changes,
        })
      }
    />
  );
}
function EditCombinedActivityReference({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(value) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          combinedActivityReference: value,
        })
      }
    />
  );
}
function EditMonth({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          reportingMonth: changes,
        })
      }
    />
  );
}
function EditUOM({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          uom: changes,
        })
      }
    />
  );
}

function EditGHGConversionFactor({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(value) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          ghgConversionFactor: value,
        })
      }
    />
  );
}

function EditPurchasedElectricityCoal({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          purchasedElectricityCoal: changes,
        })
      }
    />
  );
}

function EditPurchasedElectricityNaturalGas({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          purchasedElectricityNaturalGas: changes,
        })
      }
    />
  );
}

function EditPurchasedElectricityNuclear({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          purchasedElectricityNuclear: changes,
        })
      }
    />
  );
}

function EditPurchasedElectricityRenewables({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          purchasedElectricityRenewables: changes,
        })
      }
    />
  );
}

function EditPurchasedElectricityOther({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          purchasedElectricityOther: changes,
        })
      }
    />
  );
}
function EditSource({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          source: changes,
        })
      }
    />
  );
}
function EditSourceLink({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          sourceLink: changes,
        })
      }
    />
  );
}
function EditSourceNotes({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          sourceNotes: changes,
        })
      }
    />
  );
}
function EditGrade({ row, getValue }) {
  const { updateCategoryCalculationAndModifyInTheList } =
    useCategoryCalculation();
  return (
    <CellEditableSelect
      options={Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map((v) => ({
        value: v,
        label: v,
      }))}
      defaultValue={{ value: getValue(), label: getValue() }}
      onSave={(changes) =>
        updateCategoryCalculationAndModifyInTheList(row.original._id, {
          grade: changes.value,
        })
      }
    />
  );
}

const columns = [
  columnHelper.accessor("customReference", {
    header: "Reference",
  }),
  // columnHelper.accessor("supplierName", {
  //   header: "Maker name",
  // }),
  // columnHelper.accessor("meterNumber", {
  //   header: "Meter Number",
  // }),
  // columnHelper.accessor("invoiceNumber", {
  //   header: "Invoice Number",
  // }),
  columnHelper.accessor("reportingYear", {
    header: "Reporting year",
  }),
  columnHelper.accessor("reportingMonth", {
    header: "Reporting month",
  }),
  // columnHelper.accessor("calculationMethod", {
  //   header: "Calculation method",
  // }),
  columnHelper.accessor("activity", {
    header: "Activity",
  }),
  columnHelper.accessor("unit", {
    header: "Unit",
  }),
  columnHelper.accessor("amount", {
    header: "Amount",
  }),
  // columnHelper.accessor("activityDataGrade", {
  //   header: "Activiy data grade",
  // }),
  // automated columns
  // columnHelper.accessor("dataQualityEmissionFactorGrade", {
  //   header: "Emission factor grade",
  // }),
  // columnHelper.accessor("dataQualityEmissionFactorScore", {
  //   header: "Emission facor score",
  // }),
  // columnHelper.accessor("dataQualityEmissionFactorWeightedScore", {
  //   header: "Emission factor weighted score",
  // }),
  columnHelper.accessor("ghgCo2eEmission", {
    header: (
      <span>
        <GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} /> emission
      </span>
    ),
  }),

  // columnHelper.accessor("ghgCo2Emission", {
  //   header: "CO2 emission",
  // }),
  // columnHelper.accessor("ghgCh4Emission", {
  //   header: "CH4 emission",
  // }),
  // columnHelper.accessor("ghgN2oEmission", {
  //   header: "N2O emission",
  // }),
  // columnHelper.accessor("ghgNf3Emission", {
  //   header: "NF3 emission",
  // }),
  // columnHelper.accessor("ghgHfcEmission", {
  //   header: "HFC emission",
  // }),
  // columnHelper.accessor("ghgPfcEmission", {
  //   header: "PFC emission",
  // }),
  // columnHelper.accessor("ghgSf6Emission", {
  //   header: "SF6 emission",
  // }),
  // columnHelper.accessor("ghgBiogenicCo2Emission", {
  //   header: "Biogenic CO2 emission",
  // }),
  // columnHelper.accessor("ghgWellToTankCo2eEmission", {
  //   header: "Well to tank CO2e emission",
  // }),
  // columnHelper.accessor("secrToInclude", {
  //   header: "SECR to include",
  // }),
  // columnHelper.accessor("secrEnergy", {
  //   header: "SECR energy",
  // }),
  // columnHelper.accessor("emmisionFactorKgCo2ePerUnit", {
  //   header: "EF kgCO2e/unit",
  // }),

  // columnHelper.accessor("emmisionFactorNote", {
  //   header: "EF notes",
  // }),
  // columnHelper.accessor("emmisionFactorSource", {
  //   header: "EF source",
  // }),
  columnHelper.accessor("", {
    id: "actions",
    maxSize: 50, // has to be exactly 50
    header: ({ table }) => <div className="mt-row-actions"></div>,
    cell: RowActions,
  }),
];

function RowActions({ row }) {
  const { viewCategoryCalculation, deleteCategoryCalculationFromList } =
    useCategoryCalculation();
  return (
    <UncontrolledDropdown className="mt-row-actions">
      <DropdownToggle size="sm" outline className="border-0">
        <PiDotsThreeOutlineVertical />
      </DropdownToggle>
      <DropdownMenu>
        <DrawerOpener
          drawerId="update-form"
          onClose={() => {
            viewCategoryCalculation(null);
          }}
        >
          <DropdownItem
            onClick={() => {
              viewCategoryCalculation(row.original);
            }}
          >
            <RiEdit2Line /> Edit
          </DropdownItem>
        </DrawerOpener>
        <DrawerOpener
          drawerId="data-details"
          onClose={() => {
            viewCategoryCalculation(null);
          }}
        >
          <DropdownItem
            onClick={() => {
              viewCategoryCalculation(row.original);
            }}
          >
            <RiCodeView /> View
          </DropdownItem>
        </DrawerOpener>
        <DropdownItem
          onClick={() => {
            deleteCategoryCalculationFromList(row.original._id);
          }}
        >
          <RiDeleteBinLine /> Delete
        </DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  );
}

function CategoryCalculation() {
  let {
    pagination,
    queryHandler,
    categoryCalculations,
    viewingCategoryCalculation,
    createCategoryCalculationAndAddToList,
    updateCategoryCalculationAndModifyInTheList,
  } = useCategoryCalculation();
  const { category, scope, scopeName } = useCategory();
  return (
    <React.Fragment>
      <Card className="rounded-3 border-0">
        <CardBody>
          <Row className={"mb-2"}>
            <Col md="4">
              <SearchItem
                placeholder="Search calculation..."
                onSearch={(keywords) => {
                  queryHandler.handleSearch({
                    value: {
                      clientSearch: keywords,
                    },
                  });
                }}
              >
                <HiOutlineLocationMarker />
              </SearchItem>
            </Col>
            <Col md="8">
              <div className="d-flex justify-content-end">
                <TourStep stepId={"add-calculation-button"}>
                  <DrawerOpener drawerId="add-form">
                    <Button color={"primary"}>Add data</Button>
                  </DrawerOpener>
                </TourStep>
              </div>
            </Col>
          </Row>
          <TourStep stepId={"calculation-data-table"}>
            <Table
              data={categoryCalculations.map((c) => ({
                ...c,
                id: c._id,
                reportingMonth: MONTH_FULL_NAMES[c.reportingMonth],
              }))}
              columns={columns}
              defaultSize={200}
            />
          </TourStep>

          <PaginationNumbered
            containerClassName="pull-right my-2"
            totalResults={pagination.totalResults}
            currentPage={pagination.currentPage}
            size={pagination.size}
            onPageChange={function (page) {
              queryHandler.handlePagination(page);
            }}
          />
        </CardBody>
      </Card>
      <DrawerRight drawerId="add-form">
        {category && (
          <CategoryCalculationForm
            category={category}
            onSubmit={async (data) => {
              await createCategoryCalculationAndAddToList({
                category,
                scope,
                scopeName,
                location: data.location.value,
                customReference: data.customReference,
                reportingYear: data.reportingYear?.value,
                reportingMonth: data.reportingMonth?.value,
                calculationMethod: data.calculationMethod?.value,
                activity: data.activity?.value,
                unit: data.unit?.value,
                customFactorId: data.customFactorId?.value,
                supplierName: data.supplierName,
                invoiceNumber: data.invoiceNumber,
                meterNumber: data.meterNumber,
                amount: Number(data.amount),
                activityDataGrade: data.activityDataGrade?.value,
              });
            }}
          />
        )}
      </DrawerRight>
      <DrawerRight drawerId="update-form">
        {category && (
          <CategoryCalculationForm
            category={category}
            categoryCalculation={viewingCategoryCalculation}
            onSubmit={async (data) => {
              await updateCategoryCalculationAndModifyInTheList(
                viewingCategoryCalculation?._id,
                {
                  category,
                  scope,
                  scopeName,
                  location: data.location.value,
                  customReference: data.customReference,
                  reportingYear: data.reportingYear?.value,
                  reportingMonth: data.reportingMonth?.value,
                  calculationMethod: data.calculationMethod?.value,
                  activity: data.activity?.value,
                  unit: data.unit?.value,
                  customFactorId: data.customFactorId?.value,
                  supplierName: data.supplierName,
                  invoiceNumber: data.invoiceNumber,
                  meterNumber: data.meterNumber,
                  amount: Number(data.amount),
                  activityDataGrade: data.activityDataGrade?.value,
                }
              );
            }}
          />
        )}
      </DrawerRight>
      <DrawerRight drawerId="data-details">
        {category && <Drawer />}
      </DrawerRight>
    </React.Fragment>
  );
}

export default CategoryCalculation;
