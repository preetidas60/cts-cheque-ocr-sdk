interface TopBarProps {
  title: string;
  onLogout?: () => void;
}

export default function TopBar({ title, onLogout }: TopBarProps) {
  return (
    <div className="top-blue">
      <div className="title">{title}</div>
      <button className="logout" type="button" onClick={onLogout}>
        Log Out
      </button>
    </div>
  );
}
