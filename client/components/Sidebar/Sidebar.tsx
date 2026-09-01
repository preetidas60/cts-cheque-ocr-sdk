import { useState } from "react";
import type { TreeNode } from "../../types";
import TreeRow from "./TreeRow";

interface SidebarProps {
  tree: TreeNode[];
  /** Notified with a node's id whenever any row is clicked (e.g. to drive workspace navigation). */
  onSelectNode?: (id: string) => void;
}

export default function Sidebar({ tree, onSelectNode }: SidebarProps) {
  const initiallyActive = tree.find((n) => n.kind === "sub" && n.active)?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(initiallyActive);

  const handleSelect = (id: string) => {
    const node = tree.find((n) => n.id === id);
    // Only "sub" rows carry the persistent active/highlight state,
    // matching the original script.js behaviour.
    if (node?.kind === "sub") {
      setActiveId(id);
    }
    onSelectNode?.(id);
  };

  return (
    <aside className="sidebar">
      <div className="menu-title">Menu</div>

      <div className="fast">
        <label>Fast Access :</label>
        <input type="text" />
      </div>

      <div className="tree">
        {tree.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            isActive={node.id === activeId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </aside>
  );
}
