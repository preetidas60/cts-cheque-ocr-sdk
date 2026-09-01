import type { BatchStat } from "../../types";

interface BatchStatsProps {
  stats: BatchStat[];
}

export default function BatchStats({ stats }: BatchStatsProps) {
  return (
    <div className="batch-stats">
      {stats.map((stat) => (
        <div className="stat" key={stat.label}>
          <div className="label">{stat.label}</div>
          <div className={`value${stat.tone ? ` ${stat.tone}` : ""}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
