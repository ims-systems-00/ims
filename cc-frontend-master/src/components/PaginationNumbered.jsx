import React, { useMemo } from "react";
import { Pagination, PaginationItem, PaginationLink } from "@ims-systems-00/ims-ui-kit";
const DOTS = "...";
const range = (start, end) => {
  let length = end - start + 1;
  return Array.from({ length }, (_, idx) => idx + start);
};
const usePageRange = ({
  totalResults,
  size,
  siblingCount = 1,
  currentPage,
}) => {
  const paginationRange = useMemo(() => {
    const totalPageCount = Math.ceil(totalResults / size);
    const totalPageNumbers = siblingCount + 5;
    if (totalPageNumbers >= totalPageCount) {
      return range(1, totalPageCount);
    }
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPageCount
    );
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;
    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;
    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = range(1, leftItemCount);
      return [...leftRange, DOTS, totalPageCount];
    }
    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = range(
        totalPageCount - rightItemCount + 1,
        totalPageCount
      );
      return [firstPageIndex, DOTS, ...rightRange];
    }
    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }
  }, [totalResults, size, siblingCount, currentPage]);

  return paginationRange;
};

const PaginationNumbered = ({
  totalResults = 0,
  siblingCount = 1,
  currentPage = 1,
  size = 5,
  containerClassName = "",
  onPageChange = () => {},
}) => {
  const pageRange = usePageRange({
    currentPage,
    totalResults,
    siblingCount,
    size,
  });
  let lastPage = pageRange[pageRange.length - 1];
  if (currentPage === 0 || pageRange.length < 2) {
    return null;
  }
  const onNext = () => {
    if (currentPage === lastPage) return;
    onPageChange && onPageChange(currentPage + 1);
  };

  const onPrevious = () => {
    if (currentPage === 1) return;
    onPageChange && onPageChange(currentPage - 1);
  };
  return (
    <Pagination className={containerClassName}>
      <PaginationItem onClick={onPrevious} className="mx-1">
        <PaginationLink>«</PaginationLink>
      </PaginationItem>
      {pageRange.map((pageNumber, i) => {
        if (pageNumber === DOTS)
          return (
            <PaginationItem key={DOTS + i} className="mx-1">
              <PaginationLink>&#8230;</PaginationLink>
            </PaginationItem>
          );
        return (
          <PaginationItem
            key={pageNumber}
            active={currentPage === pageNumber}
            className="mx-1"
            onClick={() => onPageChange(pageNumber)}
          >
            <PaginationLink>{pageNumber}</PaginationLink>
          </PaginationItem>
        );
      })}
      <PaginationItem onClick={onNext} className="mx-1">
        <PaginationLink>»</PaginationLink>
      </PaginationItem>
    </Pagination>
  );
};

export default PaginationNumbered;
