const TOOLS = ["B", "F", "↯", "⌕", "◉", "◈"] as const;

export default function SideTools() {
  return (
    <div className="side-tools">
      {TOOLS.map((tool) => (
        <div className="tool" key={tool}>
          {tool}
        </div>
      ))}
      <div className="tool black">N</div>
    </div>
  );
}
