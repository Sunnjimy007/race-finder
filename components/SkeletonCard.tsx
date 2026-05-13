export default function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#12263A] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-xl p-4 animate-pulse">
      <div className="flex gap-4">
        {/* Date block skeleton */}
        <div className="flex-shrink-0 bg-[#F1F5F9] dark:bg-[#000000] border border-[#CBD5E1] dark:border-[#1D3A58] rounded-lg w-[58px] h-[76px]" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-3">
          {/* Tags */}
          <div className="flex gap-1.5">
            <div className="h-6 w-16 bg-[#E2E8F0] dark:bg-[#1D3A58] rounded-full" />
          </div>
          {/* Title */}
          <div className="h-6 bg-[#E2E8F0] dark:bg-[#1D3A58] rounded w-3/4" />
          {/* Location */}
          <div className="h-4 bg-[#E2E8F0] dark:bg-[#1D3A58] rounded w-2/5" />
          {/* Description lines */}
          <div className="space-y-1.5">
            <div className="h-3 bg-[#E2E8F0] dark:bg-[#1D3A58] rounded w-full" />
            <div className="h-3 bg-[#E2E8F0] dark:bg-[#1D3A58] rounded w-5/6" />
            <div className="h-3 bg-[#E2E8F0] dark:bg-[#1D3A58] rounded w-4/6" />
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="h-6 bg-[#E2E8F0] dark:bg-[#1D3A58] rounded w-16" />
            <div className="h-10 bg-[#E2E8F0] dark:bg-[#1D3A58] rounded-lg w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}
