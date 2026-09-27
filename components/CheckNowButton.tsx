export default function CheckNowButton() {
  return (
    <div className="check-sunburst">
      <button className="check-now-button" type="button" disabled aria-label="CHECK NOW" title="Prototype preview only">
        <span>CHECK<br />NOW</span>
      </button>
      <span className="sr-only">Prototype preview only. Manual checks are not available yet.</span>
    </div>
  );
}
