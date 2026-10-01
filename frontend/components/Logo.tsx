export function Logo({ size = 48 }: { size?: number }) {
  return (
    <img
      src="/komitty-logo.png"
      width={size}
      height={size}
      alt="Komitty"
      draggable={false}
      style={{ display: "block" }}
    />
  );
}
