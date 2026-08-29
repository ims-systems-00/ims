import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import { Input } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import PerfectScrollbar from "react-perfect-scrollbar";

const columnHelper = createColumnHelper();
const VoidSpace = ({ minVoidspace = 3 }) => (
  <div style={{ height: minVoidspace * 100 }}></div>
);
const EmptyDataFallback = () => {
  return (
    <div className="p-5 d-flex justify-content-center align-items-center flex-column">
      <h4 className="mb-2">No results found.</h4>
      <p>Try adding some data or change filters.</p>
    </div>
  );
};
const MIN_DATA_LIMIT_FOR_VOID_SPACE = 3;
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
const selectionColumn = columnHelper.accessor("", {
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
});
function Table({
  data = [],
  columns = [],
  disableMultiSelection = true,
  disableColumnResize = false,
  defaultSize = 300,
  minSize = 150,
  columnVisibility = null,
  rowSelection = {},
  onRowSelectionChange = function () {},
  emptyResultsFallback = null,
}) {
  columns = disableMultiSelection
    ? [...columns]
    : [selectionColumn, ...columns];
  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      columnVisibility,
    },
    getRowId: (row) => row.id, // if deves provide id key in row data it will be picked here
    columnResizeMode: "onChange",
    columnResizeDirection: "ltr",
    enableRowSelection: true,
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      size: defaultSize,
      minSize,
    },
  });
  const [tbodyRef] = useAutoAnimate();
  let voidSpace = null;
  if (data.length < MIN_DATA_LIMIT_FOR_VOID_SPACE)
    voidSpace = (
      <VoidSpace
        minVoidspace={Math.abs(MIN_DATA_LIMIT_FOR_VOID_SPACE - data.length)}
      />
    );
  if (!data.length && !emptyResultsFallback)
    emptyResultsFallback = <EmptyDataFallback />;

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
                {headerGroup.headers.map((header) => (
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
                    {!disableColumnResize && (
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
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="mt-tbody" ref={tbodyRef}>
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
        {emptyResultsFallback}
        {voidSpace}
      </PerfectScrollbar>
    </div>
  );
}

export default Table;
