import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import {
  Input,
  Select,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from "@ims-systems-00/ims-ui-kit";
import React, { useState } from "react";
import PerfectScrollbar from "react-perfect-scrollbar";
import { PiDotsThreeOutlineVertical } from "react-icons/pi";

const defaultData = [
  {
    locationRef: "LOC-12345",
    address: "123 Main St",
    province: "England",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-0",
  },
  {
    locationRef: "LOC-67890",
    address: "456 Elm St",
    province: "Scotland",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-1",
  },
  {
    locationRef: "LOC-13579",
    address: "789 Oak St",
    province: "Wales",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-2",
  },
  {
    locationRef: "LOC-24680",
    address: "1011 Pine St",
    province: "Northern Ireland",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-3",
  },
  {
    locationRef: "LOC-11111",
    address: "1213 Maple St",
    province: "England",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-4",
  },
  {
    locationRef: "LOC-22222",
    address: "1415 Birch St",
    province: "Scotland",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-5",
  },
  {
    locationRef: "LOC-33333",
    address: "1617 Cedar St",
    province: "Wales",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-6",
  },
  {
    locationRef: "LOC-44444",
    address: "1819 Fir St",
    province: "Northern Ireland",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-7",
  },
  {
    locationRef: "LOC-55555",
    address: "2021 Walnut St",
    province: "England",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-8",
  },
  {
    locationRef: "LOC-66666",
    address: "2223 Chestnut St",
    province: "Scotland",
    descriptionOfActivities: "Description of activities",
    GHGAssessmentInclusion: "included",
    comment: "Optional comment",
    reference: "LOC-9",
  },
];
const columnHelper = createColumnHelper();
function EditableTextCell({ getValue }) {
  const [value, setValue] = useState(getValue());
  return <Input value={value} onChange={(e) => setValue(e.target.value)} />;
}
function EditableSelectCell({ getValue }) {
  const [value, setValue] = useState({ label: "Select", value: null });
  return (
    <Select
      value={value}
      options={[
        {
          label: "Scotland",
          value: "Scotland",
        },
        {
          label: "England",
          value: "England",
        },
        {
          label: "Wales",
          value: "Wales",
        },
        {
          label: "Northern Ireland",
          value: "Northern Ireland",
        },
      ]}
      onChange={(e) => {
        setValue(e);
      }}
    />
  );
}
// const columnsHeaderGroup = [
//   columnHelper.group({
//     id: "hello",
//     header: () => <span>Hello</span>,
//     columns: [
//       columnHelper.accessor("firstName", {
//         cell: EditableTextCell,
//         footer: (props) => props.column.id,
//       }),
//       columnHelper.accessor((row) => row.lastName, {
//         id: "lastName",
//         cell: (info) => info.getValue(),
//         header: () => <span>Last Name</span>,
//         footer: (props) => props.column.id,
//       }),
//     ],
//   }),
//   columnHelper.group({
//     header: "Info",
//     footer: (props) => props.column.id,
//     columns: [
//       columnHelper.accessor("age", {
//         header: () => "Age",
//         footer: (props) => props.column.id,
//       }),
//       columnHelper.group({
//         header: "More Info",
//         columns: [
//           columnHelper.accessor("visits", {
//             header: () => <span>Visits</span>,
//             footer: (props) => props.column.id,
//           }),
//           columnHelper.accessor("status", {
//             header: "Status",
//             footer: (props) => props.column.id,
//           }),
//           columnHelper.accessor("progress", {
//             header: "Profile Progress",
//             footer: (props) => props.column.id,
//           }),
//         ],
//       }),
//     ],
//   }),
// ];

function IndeterminateCheckbox({ indeterminate, className = "", ...rest }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (typeof indeterminate === "boolean") {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate, rest.checked]);
  return (
    <Input
      className={"mt-row-selector"}
      type="checkbox"
      innerRef={ref}
      {...rest}
    />
  );
}

const columns = [
  columnHelper.accessor("", {
    id: "select",
    maxSize: 50, // has to be exactly 50
    header: ({ table }) => (
      <IndeterminateCheckbox
        {...{
          checked: table.getIsAllRowsSelected(),
          indeterminate: table.getIsSomeRowsSelected(),
          onChange: table.getToggleAllRowsSelectedHandler(),
        }}
      />
    ),
    cell: ({ row }) => (
      <IndeterminateCheckbox
        {...{
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          indeterminate: row.getIsSomeSelected(),
          onChange: row.getToggleSelectedHandler(),
        }}
      />
    ),
  }),
  columnHelper.accessor("locationRef", {
    header: () => <span>Location reference</span>,
    cell: EditableTextCell,
    footer: (props) => props.column.id,
  }),
  columnHelper.accessor("address", {
    header: () => <span>Address</span>,
    cell: EditableTextCell,
    footer: (props) => props.column.id,
  }),
  columnHelper.accessor("descriptionOfActivities", {
    header: () => "Activities",
    footer: (props) => props.column.id,
  }),
  columnHelper.accessor("GHGAssessmentInclusion", {
    header: () => <span>GHG Assessment</span>,
    footer: (props) => props.column.id,
  }),
  columnHelper.accessor("provice", {
    header: "Province",
    cell: EditableSelectCell,
    footer: (props) => props.column.id,
  }),
  columnHelper.accessor("comment", {
    header: "Comments",
    footer: (props) => props.column.id,
  }),
  columnHelper.accessor("", {
    id: "actions",
    maxSize: 50, // has to be exactly 50
    header: ({ table }) => <div className="mt-row-actions"></div>,
    cell: ({ row }) => (
      <UncontrolledDropdown className="mt-row-actions">
        <DropdownToggle size="sm" outline className="border-0">
          <PiDotsThreeOutlineVertical />
        </DropdownToggle>
        <DropdownMenu>
          <DropdownItem onClick={() => {}}>Download SVG</DropdownItem>
          <DropdownItem onClick={() => {}}>Download PNG</DropdownItem>
        </DropdownMenu>
      </UncontrolledDropdown>
    ),
  }),
];
function MainTable() {
  const [data] = React.useState(() => [...defaultData]);
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    columnResizeMode: "onChange",
    columnResizeDirection: "ltr",
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      size: 300,
      minSize: 150,
    },
  });
  return (
    <div className={"main-table "}>
      <PerfectScrollbar>
        <table
          {...{
            className: "mt-table",
            style: {
              width: table.getCenterTotalSize(),
            },
          }}
        >
          <thead className="mt-thead -header">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="mt-tr">
                {headerGroup.headers.map((header, key) => (
                  <th
                    key={header.id}
                    {...{
                      colSpan: header.colSpan,
                      className: classNames("mt-th  mt-resizable-header", {
                        "-cursor-pointer": header.column.getCanSort(),
                      }),
                      style: {
                        width: header.getSize(),
                      },
                    }}
                  >
                    <div className="mt-resizable-header-content">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </div>
                    <div
                      {...{
                        onDoubleClick: () => {},
                        onMouseDown: header.getResizeHandler(),
                        onTouchStart: header.getResizeHandler(),
                        className: "col-resizer",
                      }}
                    >
                      <div className="h-100 col-sepration-indicator"></div>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="mt-tbody">
            {table.getRowModel().rows.map((row, i) => (
              <tr key={row.id} className="mt-tr">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    {...{
                      style: {
                        width: cell.column.getSize(),
                      },
                      className: "mt-td",
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </PerfectScrollbar>
    </div>
  );
}

function Locations() {
  return (
    <React.Fragment>
      <MainTable />
    </React.Fragment>
  );
}

export default Locations;
