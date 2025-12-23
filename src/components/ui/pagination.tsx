import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  // Generate page numbers with ellipsis for large page counts
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage <= 3) {
        // Near the beginning
        for (let i = 2; i <= Math.min(4, totalPages - 1); i++) {
          pages.push(i)
        }
        pages.push('...')
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('...')
        for (let i = Math.max(totalPages - 3, 2); i < totalPages; i++) {
          pages.push(i)
        }
      } else {
        // In the middle
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) {
    return null
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {/* First page */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronsLeft className="h-3.5 w-3.5" />
      </Button>

      {/* Previous page */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {/* Page numbers */}
      {pageNumbers.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-sm text-gray-400">
              ...
            </span>
          )
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page as number)}
            className="h-8 w-8 p-0 text-sm"
          >
            {page}
          </Button>
        )
      })}

      {/* Next page */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>

      {/* Last page */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronsRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
