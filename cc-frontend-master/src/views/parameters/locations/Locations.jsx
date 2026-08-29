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
import NoParamsGuard from "../NoParamsGuard";
import LocationForm from "./LocationForm";
import { useLocationParameter } from "./store";
import CC_CONSTANTS from "../../../constants";
import CellEditableSelectPlace from "../../../components/CellEditablePlaceSelect";
import PaginationNumbered from "../../../components/PaginationNumbered";
import Drawer from "./drawer/Index";
import { RiCodeView } from "react-icons/ri";
import TourStep from "../../../components/TourStep";

const columnHelper = createColumnHelper();

function EditCellLocationRef({ row, getValue }) {
  const { updateLocationAndModifyInTheList } = useLocationParameter();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(value) =>
        updateLocationAndModifyInTheList(row.original._id, {
          locationRef: value,
        })
      }
    />
  );
}

function EditCellAddress({ row, getValue }) {
  const { updateLocationAndModifyInTheList } = useLocationParameter();
  return (
    <CellEditableSelectPlace
      defaultValue={{ value: getValue(), label: getValue() }}
      onSave={(changes) =>
        updateLocationAndModifyInTheList(row.original._id, {
          addressInMap: changes.value,
        })
      }
    />
  );
}

function EditCellActivities({ row, getValue }) {
  const { updateLocationAndModifyInTheList } = useLocationParameter();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(value) =>
        updateLocationAndModifyInTheList(row.original._id, {
          descriptionOfActivities: value,
        })
      }
    />
  );
}

function EditCellGhgAssessmentInclusion({ row, getValue }) {
  const { updateLocationAndModifyInTheList } = useLocationParameter();
  return (
    <CellEditableSelect
      options={Object.values(CC_CONSTANTS.CC_GHG_INCLUSION_ASSESSMENT).map(
        (v) => ({ value: v, label: v })
      )}
      defaultValue={{ value: getValue(), label: getValue() }}
      onSave={(changes) =>
        updateLocationAndModifyInTheList(row.original._id, {
          ghgAssessmentInclusion: changes.value,
        })
      }
    />
  );
}

function EditCellComment({ row, getValue }) {
  const { updateLocationAndModifyInTheList } = useLocationParameter();
  return (
    <CellEditableText
      defaultValue={getValue()}
      onSave={(value) =>
        updateLocationAndModifyInTheList(row.original._id, {
          comment: value,
        })
      }
    />
  );
}

const columns = [
  // columnHelper.accessor("reference", {
  //   header: "reference",
  // }),
  columnHelper.accessor("locationRef", {
    header: "Location Name",
    cell: EditCellLocationRef,
  }),
  columnHelper.accessor(
    (row) => {
      if (row.addressInMap) return row.addressInMap;
      return [
        row.addressBuilding,
        row.addressStreet,
        row.addressCity,
        row.addressPostCode,
        row.addressStateProvince,
        row.addressCountry,
      ]
        .filter(Boolean)
        .join(", ");
    },
    {
      header: "Address",
      cell: EditCellAddress,
    }
  ),
  columnHelper.accessor("descriptionOfActivities", {
    header: "Activities",
    cell: EditCellActivities,
  }),
  columnHelper.accessor("ghgAssessmentInclusion", {
    header: "GHG Assessment Inclusion",
    cell: EditCellGhgAssessmentInclusion,
  }),
  columnHelper.accessor("comment", {
    header: "Comments",
    cell: EditCellComment,
  }),
  columnHelper.accessor("", {
    id: "actions",
    maxSize: 50, // has to be exactly 50
    header: ({ table }) => <div className="mt-row-actions"></div>,
    cell: RowActions,
  }),
];

function RowActions({ row }) {
  const { viewLocation, deleteLocationFromList } = useLocationParameter();
  return (
    <UncontrolledDropdown className="mt-row-actions">
      <DropdownToggle size="sm" outline className="border-0">
        <PiDotsThreeOutlineVertical />
      </DropdownToggle>
      <DropdownMenu>
        <DrawerOpener
          drawerId="update-location-form"
          onClose={() => {
            viewLocation(null);
          }}
        >
          <DropdownItem
            onClick={() => {
              viewLocation(row.original);
            }}
          >
            <RiEdit2Line /> Edit details
          </DropdownItem>
        </DrawerOpener>
        <DrawerOpener
          drawerId="data-details"
          onClose={() => {
            viewLocation(null);
          }}
        >
          <DropdownItem
            onClick={() => {
              viewLocation(row.original);
            }}
          >
            <RiCodeView /> View
          </DropdownItem>
        </DrawerOpener>
        <DropdownItem
          onClick={() => {
            deleteLocationFromList(row.original._id);
          }}
        >
          <RiDeleteBinLine /> Delete
        </DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  );
}

function Locations() {
  let {
    pagination,
    queryHandler,
    locations,
    viewingLocation,
    createLocationAndAddToList,
    updateLocationAndModifyInTheList,
  } = useLocationParameter();
  return (
    <NoParamsGuard>
      <Card className="rounded-3 border-0">
        <CardBody>
          <Row className={"mb-2"}>
            <Col md="4">
              <SearchItem
                placeholder="Search location..."
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
                <TourStep stepId={"add-location-button"}>
                  <DrawerOpener drawerId="add-location-form">
                    <Button color={"primary"}>Create a location</Button>
                  </DrawerOpener>
                </TourStep>
              </div>
            </Col>
          </Row>
          <TourStep stepId={"locations-data-table"}>
            <Table
              data={locations.map((location) => ({
                _id: location._id,
                locationRef: location.locationRef,
                addressInMap: location.addressInMap || null,
                addressBuilding: location.addressBuilding || null,
                addressStreet: location.addressStreet || null,
                addressCity: location.addressCity || null,
                addressPostCode: location.addressPostCode || null,
                addressStateProvince: location.addressStateProvince || null,
                addressCountry: location.addressCountry || null,
                descriptionOfActivities: location.descriptionOfActivities,
                ghgAssessmentInclusion: location.ghgAssessmentInclusion,
                comment: location.comment,
                lat: location.lat,
                lng: location.lng,
                reference: location.reference,
              }))}
              columns={columns}
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

      <DrawerRight drawerId="add-location-form">
        <LocationForm
          onSubmit={async (data) => {
            await createLocationAndAddToList({
              locationRef: data.locationRef,
              addressInMap: data.addressInMap.value,
              addressBuilding: data.addressBuilding,
              addressStreet: data.addressStreet,
              addressCity: data.addressCity,
              addressPostCode: data.addressPostCode,
              addressStateProvince: data.addressStateProvince,
              addressCountry: data.addressCountry,
              descriptionOfActivities: data.descriptionOfActivities,
              ghgAssessmentInclusion: data.ghgAssessmentInclusion.value,
              comment: data.comment,
            });
          }}
        />
      </DrawerRight>
      <DrawerRight drawerId="update-location-form">
        <LocationForm
          location={viewingLocation}
          onSubmit={async (data) => {
            await updateLocationAndModifyInTheList(viewingLocation._id, {
              locationRef: data.locationRef,
              addressInMap: data.addressInMap.value,
              addressBuilding: data.addressBuilding,
              addressStreet: data.addressStreet,
              addressCity: data.addressCity,
              addressPostCode: data.addressPostCode,
              addressStateProvince: data.addressStateProvince,
              addressCountry: data.addressCountry,
              descriptionOfActivities: data.descriptionOfActivities,
              ghgAssessmentInclusion: data.ghgAssessmentInclusion.value,
              comment: data.comment,
            });
          }}
        />
      </DrawerRight>
      <DrawerRight drawerId="data-details">
        <Drawer />
      </DrawerRight>
    </NoParamsGuard>
  );
}

export default Locations;
