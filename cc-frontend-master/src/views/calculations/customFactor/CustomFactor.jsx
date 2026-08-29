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
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { PiDotsThreeOutlineVertical } from "react-icons/pi";
import { RiDeleteBinLine, RiEdit2Line } from "react-icons/ri";
import CellEditableSelect from "../../../components/CellEditableSelect";
import CellEditableText from "../../../components/CellEditableText";
import PaginationNumbered from "../../../components/PaginationNumbered";
import SearchItem from "../../../components/SearchItem";
import Table from "../../../components/Table";
import CC_CONSTANTS from "../../../constants";
import useApplicableCalculationField, {
  CALCULATION_FIELD_NAMES,
} from "../../../hooks/useApplicableCalculationField";
import { useCategory } from "../stores/categoryStore";
import CustomFactorForm from "./CustomFactorForm";
import { useCustomFactor } from "./store";
import TourStep from "../../../components/TourStep";
const columnHelper = createColumnHelper();

function EditCombinedActivityReference({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(value) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          combinedActivityReference: value,
        })
      }
    />
  );
}

function EditUOM({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          uom: changes,
        })
      }
    />
  );
}

function EditGHGConversionFactor({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(value) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          ghgConversionFactor: value,
        })
      }
    />
  );
}

function EditPurchasedElectricityCoal({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          purchasedElectricityCoal: changes,
        })
      }
    />
  );
}

function EditPurchasedElectricityNaturalGas({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          purchasedElectricityNaturalGas: changes,
        })
      }
    />
  );
}

function EditPurchasedElectricityNuclear({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          purchasedElectricityNuclear: changes,
        })
      }
    />
  );
}

function EditPurchasedElectricityRenewables({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          purchasedElectricityRenewables: changes,
        })
      }
    />
  );
}

function EditPurchasedElectricityOther({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      type="number"
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          purchasedElectricityOther: changes,
        })
      }
    />
  );
}
function EditSource({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          source: changes,
        })
      }
    />
  );
}
function EditSourceLink({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          sourceLink: changes,
        })
      }
    />
  );
}
function EditSourceNotes({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          sourceNotes: changes,
        })
      }
    />
  );
}
function EditGrade({ row, getValue }) {
  const { updateCustomFactorAndModifyInTheList } = useCustomFactor();
  return (
    <CellEditableSelect
      options={Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map((v) => ({
        value: v,
        label: v,
      }))}
      defaultValue={{ value: getValue(), label: getValue() }}
      onSave={(changes) =>
        updateCustomFactorAndModifyInTheList(row.original._id, {
          grade: changes.value,
        })
      }
    />
  );
}

const columns = [
  columnHelper.accessor("reference", {
    header: "Reference",
  }),
  columnHelper.accessor("combinedActivityReference", {
    header: "Activity",
    cell: EditCombinedActivityReference,
  }),
  columnHelper.accessor("uom", {
    header: "Unit of meanurement",
    cell: EditUOM,
  }),
  columnHelper.accessor("ghgConversionFactor", {
    header: "KG CO2e/Unit",
    cell: EditGHGConversionFactor,
  }),
  columnHelper.accessor("purchasedElectricityCoal", {
    header: "Purchased electectricity (Coal)",
    cell: EditPurchasedElectricityCoal,
  }),
  columnHelper.accessor("purchasedElectricityNaturalGas", {
    header: "Purchased electectricity (Natural gas)",
    cell: EditPurchasedElectricityNaturalGas,
  }),
  columnHelper.accessor("purchasedElectricityNuclear", {
    header: "Purchased electectricity (Nuclear)",
    cell: EditPurchasedElectricityNuclear,
  }),
  columnHelper.accessor("purchasedElectricityRenewables", {
    header: "Purchased electectricity (Renewable)",
    cell: EditPurchasedElectricityRenewables,
  }),
  columnHelper.accessor("purchasedElectricityOther", {
    header: "Purchased electectricity (Other)",
    cell: EditPurchasedElectricityOther,
  }),
  columnHelper.accessor("source", {
    header: "Source",
    cell: EditSource,
  }),
  columnHelper.accessor("sourceLink", {
    header: "Source link",
    cell: EditSourceLink,
  }),
  columnHelper.accessor("sourceNotes", {
    header: "Source notes",
    cell: EditSourceNotes,
  }),
  columnHelper.accessor("grade", {
    header: "Grade",
    cell: EditGrade,
  }),
  columnHelper.accessor("", {
    id: "actions",
    maxSize: 50, // has to be exactly 50
    header: ({ table }) => <div className="mt-row-actions"></div>,
    cell: RowActions,
  }),
];

function RowActions({ row }) {
  const { viewCustomFactor, deleteCustomFactorFromList } = useCustomFactor();
  return (
    <UncontrolledDropdown className="mt-row-actions">
      <DropdownToggle size="sm" outline className="border-0">
        <PiDotsThreeOutlineVertical />
      </DropdownToggle>
      <DropdownMenu>
        <DrawerOpener
          drawerId="update-custom-factor-form"
          onClose={() => {
            viewCustomFactor(null);
          }}
        >
          <DropdownItem
            onClick={() => {
              viewCustomFactor(row.original);
            }}
          >
            <RiEdit2Line /> Edit details
          </DropdownItem>
        </DrawerOpener>
        <DropdownItem
          onClick={() => {
            deleteCustomFactorFromList(row.original._id);
          }}
        >
          <RiDeleteBinLine /> Delete
        </DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  );
}

function CustomFactor() {
  let {
    pagination,
    queryHandler,
    customFactors,
    viewingCustomFactor,
    createCustomFactorAndAddToList,
    updateCustomFactorAndModifyInTheList,
  } = useCustomFactor();
  const { category, scope } = useCategory();
  const { isApplicableFieldForCategory } = useApplicableCalculationField();
  return (
    <React.Fragment>
      <Card className="rounded-3 border-0">
        <CardBody>
          <Row className={"mb-2"}>
            <Col md="4">
              <SearchItem
                placeholder="Search custom factor..."
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
                <TourStep stepId={"add-custom-factor-button"}>
                  <DrawerOpener drawerId="add-custom-factor-form">
                    <Button color={"primary"}>Create a custom factor</Button>
                  </DrawerOpener>
                </TourStep>
              </div>
            </Col>
          </Row>
          <Table
            data={customFactors.map((c) => ({
              ...c,
            }))}
            columnVisibility={{
              [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_COAL]:
                isApplicableFieldForCategory(
                  category,
                  CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_COAL
                ),
              [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_NATURAL_GAS]:
                isApplicableFieldForCategory(
                  category,
                  CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_NATURAL_GAS
                ),

              [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_NUCLEAR]:
                isApplicableFieldForCategory(
                  category,
                  CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_NUCLEAR
                ),
              [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_RENEWABLES]:
                isApplicableFieldForCategory(
                  category,
                  CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_RENEWABLES
                ),
              [CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_OTHER]:
                isApplicableFieldForCategory(
                  category,
                  CALCULATION_FIELD_NAMES.PURCHASED_ELECTRICITY_OTHER
                ),
            }}
            columns={columns}
          />
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
      <DrawerRight drawerId="add-custom-factor-form">
        <TourStep stepId={"custom-factor-form-fields"}>
          <CustomFactorForm
            category={category}
            onSubmit={async (data) => {
              await createCustomFactorAndAddToList({
                category,
                scope,
                ...data,
                grade: data.grade.value,
              });
            }}
          />
        </TourStep>
      </DrawerRight>
      <DrawerRight drawerId="update-custom-factor-form">
        <CustomFactorForm
          category={category}
          customFactor={viewingCustomFactor}
          onSubmit={async (data) => {
            await updateCustomFactorAndModifyInTheList(
              viewingCustomFactor._id,
              {
                ...data,
                grade: data.grade.value,
              }
            );
          }}
        />
      </DrawerRight>
    </React.Fragment>
  );
}

export default CustomFactor;
