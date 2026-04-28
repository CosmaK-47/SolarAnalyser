export default function Badge({ children, type = "blue" }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}