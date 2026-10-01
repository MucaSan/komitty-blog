export function Logo({ size = 48 }: { size?: number }) {
  return (
    <img
      src="/komitty-logo.png"
      width={size}
      height={size}
      alt="komitty"
      draggable={false}
      style={{ display: "block" }}
    />
  );
}
