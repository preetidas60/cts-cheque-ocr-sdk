import logo from "../../assets/logo.png";

interface InfoBarProps {
  userId: string;
  lastLogin: string;
  clearingDate: string;
  group: string;
}

export default function InfoBar({
  userId,
  lastLogin,
  clearingDate,
  group,
}: InfoBarProps) {
  return (
    <div className="info-bar">
      <div>{userId}</div>
      <div>Last logged in on : {lastLogin}</div>
      <div className="clearing">Current Clearing Date : {clearingDate}</div>
      <div>Group : {group}</div>
      <div className="bank-logo">
        <img src={logo} alt="HDFC BANK" />
      </div>
    </div>
  );
}
