interface ChequeViewerProps {
  imageSrc: string;
}

export default function ChequeViewer({ imageSrc }: ChequeViewerProps) {
  return (
    <div className="cheque-window">
      <div className="cheque-img-wrap" id="chequeImgWrap">
        <img
          id="chequeImage"
          className="cheque-img"
          src={imageSrc}
          alt="Cheque Image"
        />
      </div>
    </div>
  );
}
