import type { MessageRow } from "../../types";

interface MessagesPanelProps {
  rows: MessageRow[];
}

export default function MessagesPanel({ rows }: MessagesPanelProps) {
  return (
    <div className="messages">
      <div className="msg-head">
        <div>Message</div>
        <div>From</div>
        <div>Time</div>
      </div>

      {rows.map((row, index) => (
        <div className="msg-row" key={`${row.from}-${index}`}>
          <div className="message">{row.message}</div>
          <div className="from">{row.from}</div>
          <div className="time">{row.time}</div>
        </div>
      ))}
    </div>
  );
}
