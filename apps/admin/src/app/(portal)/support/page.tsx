// Support: help requests and feedback. There is no way to send one from the lab yet.
import { Empty } from "@/components/bits";
import { TopBar } from "@/components/topbar";
import { staffMe } from "@/lib/api";

export default async function SupportPage() {
  const me = await staffMe();
  return (
    <>
      <TopBar page="Support" environment={me.ok ? me.data.environment : null} />
      <div className="ad-body">
        <Empty title="No help requests yet">
          The lab has no help or feedback form yet, so nothing arrives here. When it does, each
          request shows its status and replies, with the attempt attached only when the person
          allowed it.
        </Empty>
      </div>
    </>
  );
}
