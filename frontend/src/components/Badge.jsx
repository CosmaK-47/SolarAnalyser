export default function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-800",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded ${tones[tone]}`}>
      {children}
    </span>
  );
}