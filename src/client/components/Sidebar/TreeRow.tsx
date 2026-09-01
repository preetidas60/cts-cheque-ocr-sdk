import type { TreeNode } from "../../types";

interface TreeRowProps {
  node: TreeNode;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export default function TreeRow({ node, isActive, onSelect }: TreeRowProps) {
  if (node.kind === "divider") {
    return <div className="tree-divider" />;
  }

  const classNames = ["tree-row"];
  if (node.kind === "section") classNames.push("section");
  if (node.kind === "sub") classNames.push("sub");
  if (node.variant === "blue") classNames.push("blue");
  if (node.kind === "sub" && isActive) classNames.push("active");

  return (
    <div className={classNames.join(" ")} onClick={() => onSelect(node.id)}>
      {node.kind !== "sub" && (
        <span className="arrow">{node.expanded ? "▼" : "▶"}</span>
      )}
      {node.label}
    </div>
  );
}
