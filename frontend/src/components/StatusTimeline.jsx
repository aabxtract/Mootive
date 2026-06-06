import { STATUS_FLOW } from "../constants";
import { formatDateTime } from "../formatters";

export default function StatusTimeline({
  currentStatus,
  history = [],
  flow = STATUS_FLOW,
}) {
  const currentIndex = flow.indexOf(currentStatus);
  const historyMap = history.reduce((acc, item) => {
    acc[item.status] = item.at;
    return acc;
  }, {});

  return (
    <div className="timeline">
      {flow.map((status, index) => {
        const done = currentIndex > index;
        const active = currentIndex === index;
        const state = done ? "done" : active ? "active" : "pending";

        return (
          <div key={status} className={`tl-step ${state}`}>
            <div className="tl-dot" />
            <div>
              <div className="tl-label">{status}</div>
              <div className="tl-time">{formatDateTime(historyMap[status])}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
