interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  return (
    <button
      className={`scroll-to-bottom ${visible ? 'visible' : ''}`}
      onClick={onClick}
      title="Scroll to bottom"
    >
      <i className="fas fa-arrow-down"></i>
    </button>
  );
}
