import { ExhibitView } from "@/components/exhibit-view";

export default function ExhibitPage({
  params,
}: {
  params: { trackId: string };
}) {
  // Fixture content is hardcoded to track "1" for now, regardless of trackId.
  void params;
  return <ExhibitView />;
}
