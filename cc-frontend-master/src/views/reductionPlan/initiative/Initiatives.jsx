import { createColumnHelper } from "@tanstack/react-table";
import {
  Badge,
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
import { RiCodeView, RiDeleteBinLine, RiEdit2Line } from "react-icons/ri";
import CellEditableText from "../../../components/CellEditableText";
import PaginationNumbered from "../../../components/PaginationNumbered";
import SearchItem from "../../../components/SearchItem";
import Table from "../../../components/Table";
import TourStep from "../../../components/TourStep";
import InitiativeForm from "./InitiativeForm";
import Drawer from "./drawer/Index";
import { useInitiatives } from "./store";
import { useInitiativeConfig } from "../store";
import moment from "moment";
const columnHelper = createColumnHelper();

function RowActions({ row }) {
  const { viewInitiatve, deleteInitiativeFromList } = useInitiatives();
  return (
    <UncontrolledDropdown className="mt-row-actions">
      <DropdownToggle size="sm" outline className="border-0">
        <PiDotsThreeOutlineVertical />
      </DropdownToggle>
      <DropdownMenu>
        <DrawerOpener
          drawerId="update-form"
          onClose={() => {
            viewInitiatve(null);
          }}
        >
          <DropdownItem
            onClick={() => {
              viewInitiatve(row.original);
            }}
          >
            <RiEdit2Line /> Edit
          </DropdownItem>
        </DrawerOpener>
        <DrawerOpener
          drawerId="data-details"
          onClose={() => {
            viewInitiatve(null);
          }}
        >
          <DropdownItem
            onClick={() => {
              viewInitiatve(row.original);
            }}
          >
            <RiCodeView /> View
          </DropdownItem>
        </DrawerOpener>
        <DropdownItem
          onClick={() => {
            deleteInitiativeFromList(row.original._id);
          }}
        >
          <RiDeleteBinLine /> Delete
        </DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  );
}

function PriorityCell({ getValue }) {
  let fade = "warning";
  let priority = getValue();
  if (priority === "Critical") fade = "danger";
  if (priority === "High") fade = "danger";
  if (priority === "Medium") fade = "warning";
  if (priority === "Low") fade = "success";
  return <Badge fade={fade}>{priority}</Badge>;
}

function DateCompletedCell({ getValue }) {
  let implementedAt = getValue();
  if (implementedAt) return `${moment(implementedAt).format("DD/MM/YYYY")}`;
  return <Badge fade={"danger"}>Not complete</Badge>;
}
function DateIdentifiedCell({ getValue }) {
  let identifiedAt = getValue();
  if (identifiedAt) return `${moment(identifiedAt).format("DD/MM/YYYY")}`;
  return <Badge fade={"danger"}>-</Badge>;
}

const columns = [
  columnHelper.accessor("reference", {
    header: "Reference",
  }),
  columnHelper.accessor("title", {
    header: "Title",
    minSize: 500,
  }),
  columnHelper.accessor("implementedAt", {
    header: "Date Completed",
    cell: DateCompletedCell,
  }),
  columnHelper.accessor("identifiedAt", {
    header: "Date Identified",
    cell: DateIdentifiedCell,
  }),
  columnHelper.accessor("priority", {
    header: "Priority",
    cell: PriorityCell,
  }),
  columnHelper.accessor("", {
    id: "actions",
    maxSize: 50, // has to be exactly 50
    header: ({ table }) => <div className="mt-row-actions"></div>,
    cell: RowActions,
  }),
];

function Initiatives() {
  let {
    pagination,
    queryHandler,
    initiatives,
    viewingInitiative,
    createInitiativeAndAddToList,
    updateInitiativeAndModifyInTheList,
  } = useInitiatives();
  const { year } = useInitiativeConfig();
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
                <TourStep stepId={"add-innitive-button"}>
                  <DrawerOpener drawerId="add-form">
                    <Button color={"primary"}>Add data</Button>
                  </DrawerOpener>
                </TourStep>
              </div>
            </Col>
          </Row>
          <TourStep stepId={"calculation-data-table"}>
            <Table
              data={initiatives.map((data) => ({
                id: data._id,
                ...data,
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
        <InitiativeForm
          onSubmit={async (data) => {
            await createInitiativeAndAddToList({
              title: data.title,
              description: data.description,
              priority: data.priority.value,
              implementedAt: data.implementedAt.date,
              identifiedAt: data.identifiedAt.date,
              potentialCoBenefits: data.potentialCoBenefits,
              potentialUnintendedConsequences: data.potentialUnintendedConsequences,
              attachments: [],
              assignedTo: [],
            });
          }}
        />
      </DrawerRight>
      <DrawerRight drawerId="update-form">
        <InitiativeForm
          initiative={viewingInitiative}
          onSubmit={async (data) => {
            await updateInitiativeAndModifyInTheList(viewingInitiative?._id, {
              title: data.title,
              description: data.description,
              implementedAt: data.implementedAt.date,
              identifiedAt: data.identifiedAt.date,
              priority: data.priority.value,
              potentialCoBenefits: data.potentialCoBenefits,
              potentialUnintendedConsequences: data.potentialUnintendedConsequences,
            });
          }}
        />
      </DrawerRight>
      <DrawerRight drawerId="data-details">{<Drawer />}</DrawerRight>
    </React.Fragment>
  );
}

export default Initiatives;
