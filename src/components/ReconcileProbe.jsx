// Throwaway probe to dogfood the manifest auto-reconcile bot's new-feature path.
// Safe to delete; not imported anywhere in the app.
export default function ReconcileProbe() {
  return <div data-testid="reconcile-probe">reconcile probe ok</div>;
}
