import { useState, useEffect } from 'react';

interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

interface ContributionsData {
  contributions: ContributionDay[];
  total: Record<string, number>;
}

// Green color levels for contributions (readable on dark background)
const CONTRIB_COLORS = [
  '#161b22',   // Level 0 - no contributions (dark gray)
  '#0e4429',   // Level 1 - 1-2 commits (dark green)
  '#006d32',   // Level 2 - 3-9 commits (medium green)
  '#26a641',   // Level 3 - 10-13 commits (bright green)
  '#39d353',   // Level 4 - 14+ commits (neon green)
];

// Custom level based on commit count (not GitHub's algorithm)
const getLevelFromCount = (count: number): number => {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 9) return 2;
  if (count <= 13) return 3;
  return 4;
};

export const GitHubContributions = ({ username }: { username: string }) => {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [totalContributions, setTotalContributions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const response = await fetch(
          `https://github-contributions-api.jogruber.de/v4/${username}?y=last`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch contributions');
        }
        
        const data: ContributionsData = await response.json();
        
        // Flatten contributions array
        const flatContributions = data.contributions.flat();
        setContributions(flatContributions);
        
        // Get total for last year (the API returns lastYear as a key)
        setTotalContributions(data.total.lastYear || 0);
        setLoading(false);
      } catch (err) {
        setError('Failed to load contributions');
        setLoading(false);
      }
    };

    fetchContributions();
  }, [username]);

  // Group contributions by week for grid display
  const getWeeks = () => {
    const weeks: ContributionDay[][] = [];
    let currentWeek: ContributionDay[] = [];
    
      contributions.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const weeks = getWeeks();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  if (loading) {
    return (
      <div className="font-mono text-[#00FF00] text-sm">
        <span className="animate-pulse">[ LOADING_CONTRIBUTION_DATA... ]</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-mono text-[#FF0000] text-sm">
        [ ERROR: {error} ]
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-2 mb-4">
        <div className="text-[#39d353] font-mono text-[10px] sm:text-xs uppercase tracking-wider">
          [ GITHUB_CONTRIBUTIONS ]
        </div>
        <div className="text-[#39d353] font-mono text-[10px] sm:text-xs">
          TOTAL: <span className="text-white font-bold">{totalContributions}</span> COMMITS
        </div>
      </div>

      {/* Frame */}
      <div className="relative border border-[#26a641]/50 bg-[#0d1117] p-2 sm:p-4">
        {/* Corner brackets - hidden on mobile */}
        <div className="hidden sm:block absolute top-0 left-0 w-3 h-3 border-t border-l border-[#39d353]" />
        <div className="hidden sm:block absolute top-0 right-0 w-3 h-3 border-t border-r border-[#39d353]" />
        <div className="hidden sm:block absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#39d353]" />
        <div className="hidden sm:block absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#39d353]" />

        {/* Month labels - hidden on mobile */}
        <div className="hidden sm:flex mb-2 ml-8">
          {months.map((month) => (
            <div 
              key={month} 
              className="text-[9px] font-mono text-[#8b949e] uppercase"
              style={{ width: `${100/12}%` }}
            >
              {month}
            </div>
          ))}
        </div>

        {/* Grid container */}
        <div className="flex">
          {/* Day labels - hidden on mobile */}
          <div className="hidden sm:flex flex-col justify-around mr-2 py-1">
            {['', 'MON', '', 'WED', '', 'FRI', ''].map((day, idx) => (
              <div key={idx} className="text-[8px] font-mono text-[#8b949e] h-[10px] flex items-center">
                {day}
              </div>
            ))}
          </div>

          {/* Contribution grid - smaller cells on mobile */}
          <div className="flex gap-[1px] sm:gap-[2px] flex-wrap sm:flex-nowrap">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[1px] sm:gap-[2px]">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="w-[6px] h-[6px] sm:w-[10px] sm:h-[10px] rounded-sm hover:ring-1 hover:ring-[#39d353] transition-all cursor-pointer group relative"
                    style={{ 
                      backgroundColor: CONTRIB_COLORS[getLevelFromCount(day.count)] || CONTRIB_COLORS[0],
                      boxShadow: day.count > 2 ? `0 0 ${getLevelFromCount(day.count) * 2}px ${CONTRIB_COLORS[getLevelFromCount(day.count)]}40` : 'none'
                    }}
                    title={`${day.date}: ${day.count} contributions`}
                  >
                    {/* Tooltip - desktop only */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden sm:group-hover:block z-50">
                      <div className="bg-[#1c2128] border border-[#30363d] rounded px-2 py-1 text-[10px] font-mono text-white whitespace-nowrap shadow-lg">
                        <div className="text-[#39d353] font-bold">{day.date}</div>
                        <div>{day.count} contributions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend - show only 4 levels (merged) */}
        <div className="flex items-center justify-end gap-1 sm:gap-2 mt-2 sm:mt-4 pt-2 border-t border-[#30363d]">
          <span className="text-[8px] sm:text-[9px] font-mono text-[#8b949e]">Less</span>
          {CONTRIB_COLORS.slice(0, 4).map((color: string, i: number) => (
            <div
              key={i}
              className="w-[8px] h-[8px] sm:w-[10px] sm:h-[10px] rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-[8px] sm:text-[9px] font-mono text-[#8b949e]">More</span>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex justify-between mt-2">
        <div className="text-[9px] font-mono text-[#8b949e]">
          github.com/{username}
        </div>
        <div className="text-[9px] font-mono text-[#39d353]">
          LIVE DATA
        </div>
      </div>
    </div>
  );
};
