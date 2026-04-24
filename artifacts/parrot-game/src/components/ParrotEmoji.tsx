interface ParrotEmojiProps {
  size?: number;
  className?: string;
  flipped?: boolean;
}

export default function ParrotEmoji({ size = 48, className = "", flipped = false }: ParrotEmojiProps) {
  return (
    <span
      className={className}
      style={{
        fontSize: size,
        display: "inline-block",
        transform: flipped ? "scaleX(-1)" : "none",
        lineHeight: 1,
      }}
    >
      🦜
    </span>
  );
}
