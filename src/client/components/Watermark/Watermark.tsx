interface WatermarkProps {
  lines: string[];
}

export default function Watermark({ lines }: WatermarkProps) {
  return (
    <div className="watermark">
      {lines.map((line, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={index}>{line}</span>
      ))}
    </div>
  );
}
