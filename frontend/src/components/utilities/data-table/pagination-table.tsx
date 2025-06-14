'use client';

import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Table } from '@tanstack/react-table';

type PaginationTableProps<TData> = {
  table: Table<TData>;
};

type PaginationItemRenderProps = {
  currentPage: number;
  totalPages: number;
  handleClick: (page: number) => void;
};

const PaginationItemRender = ({
  currentPage,
  totalPages,
  handleClick,
}: PaginationItemRenderProps) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  console.log(pages);
  if (pages.length >= 3) {
    const sliced_pages = pages.slice(
      currentPage - 2,
      currentPage + 1
    );
    const paginations =
      sliced_pages.length > 0 ? sliced_pages : [1, 2, 3];
    return (
      <>
        {currentPage >= 3 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
        {paginations.map((page, index) => (
          <PaginationItem key={`page_${index}`}>
            <PaginationLink
              onClick={(e) => handleClick(page - 1)}
              isActive={page === currentPage}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        {currentPage < pages.length - 1 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
      </>
    );
  } else {
    return (
      <>
        {pages.map((page, index) => (
          <PaginationItem key={`page_${index}`}>
            <PaginationLink
              onClick={(e) => handleClick(page - 1)}
              isActive={page === currentPage}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
      </>
    );
  }
};

export const PaginationTable = <TData,>({
  table,
}: PaginationTableProps<TData>) => {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const handleItemOnClick = (page: number) => {
    table.setPageIndex(page);
  };
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          />
        </PaginationItem>
        <PaginationItemRender
          currentPage={currentPage}
          totalPages={totalPages}
          handleClick={handleItemOnClick}
        />
        <PaginationItem>
          <PaginationNext
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
