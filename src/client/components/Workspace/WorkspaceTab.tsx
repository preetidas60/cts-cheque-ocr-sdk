interface WorkspaceTabProps {
  label: string;
  onClose?: () => void;
}

export default function WorkspaceTab({ label, onClose }: WorkspaceTabProps) {
  return (
    <div className="tab">
      {label}
      <span className="close" onClick={onClose}>
        ×
      </span>
    </div>
  );
}
