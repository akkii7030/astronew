import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from "lucide-react";
import { load } from "@cashfreepayments/cashfree-js";
import { MobileShell } from "@/components/MobileShell";
import { useSession } from "@/hooks/use-session";
import { createRechargeOrder, confirmRechargeOrder, getWalletOverview } from "@/lib/cashfree.functions";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/wallet")({
  ssr: false,
  head: () => ({ meta: [{ title: "Wallet — Om Astro" }] }),
  beforeLoad: ({ location }) => requireAuth({ location }),
  component: WalletPage,
});

const presets = [100, 250, 500, 1000, 2000, 5000];

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function WalletPage() {
  const { user, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getWalletOverview);
  const createOrder = useServerFn(createRechargeOrder);
  const confirmOrder = useServerFn(confirmRechargeOrder);
  const [amount, setAmount] = useState(500);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !user) navigate({ to: "/auth", search: { redirect: "/wallet" } });
  }, [sessionLoading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchOverview(),
    enabled: !!user,
  });

  // Handle return from Cashfree hosted page (?order_id=...)
  useEffect(() => {
    if (!user) return;
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get("order_id");
    if (!orderId) return;
    url.searchParams.delete("order_id");
    window.history.replaceState({}, "", url.toString());
    confirmOrder({ data: { order_id: orderId } })
      .then((r) => {
        if (r.status === "success") toast.success("Recharge successful");
        else if (r.status === "failed") toast.error("Payment failed");
        else toast.info("Payment is being processed");
        qc.invalidateQueries({ queryKey: ["wallet"] });
      })
      .catch((e) => { console.error(e); toast.error("Could not verify payment"); });
  }, [user, confirmOrder, qc]);

  async function recharge() {
    if (!user) return;
    if (amount < 10) { toast.error("Minimum recharge is ₹10"); return; }
    setPaying(true);
    try {
      const { payment_session_id } = await createOrder({
        data: { amount_inr: amount, return_url: window.location.origin + "/wallet" },
      });
      const cashfree = await load({ mode: "production" });
      await cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: "_self" });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setPaying(false);
    }
  }

  if (sessionLoading || !user) {
    return <MobileShell><div className="p-10 text-center text-sm text-muted-foreground">Loading…</div></MobileShell>;
  }

  return (
    <MobileShell>
      <div className="space-y-5 px-5 pt-2">
        <h1 className="font-display text-2xl">Wallet</h1>

        <div className="relative overflow-hidden rounded-2xl gold-bg p-5 shadow-luxe">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <p className="text-xs uppercase tracking-widest opacity-80">Available balance</p>
          <p className="mt-2 font-display text-4xl">{isLoading ? "…" : rupees(data?.balance_paise ?? 0)}</p>
          <p className="mt-1 text-xs opacity-80">Recharge to start chatting with astrologers</p>
        </div>

        <section>
          <h2 className="font-display text-lg">Quick recharge</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {presets.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`card-luxe py-3 text-center text-sm font-semibold transition hover:shadow-luxe ${
                  amount === v ? "ring-2 ring-[var(--gold)]" : ""
                }`}
              >
                ₹{v}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm shadow-soft">
            <span className="text-muted-foreground">₹</span>
            <input
              type="number" min={10} max={100000}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Math.min(100000, Number(e.target.value) || 0)))}
              className="w-full bg-transparent outline-none"
            />
          </div>
          <button
            onClick={recharge} disabled={paying}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full gold-bg py-3 text-sm font-semibold shadow-luxe disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {paying ? "Starting payment…" : `Add ₹${amount}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Secure payments via Cashfree</p>
        </section>

        <section>
          <h2 className="font-display text-lg">Recent transactions</h2>
          <div className="mt-3 card-luxe divide-y divide-border">
            {(data?.transactions ?? []).length === 0 ? (
              <div className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ivory text-[var(--gold)]">
                  <WalletIcon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">No transactions yet</p>
                  <p className="text-xs text-muted-foreground">Your activity will appear here.</p>
                </div>
              </div>
            ) : (
              (data?.transactions ?? []).map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ivory text-[var(--gold)]">
                    {t.kind === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{t.note ?? (t.kind === "credit" ? "Recharge" : "Spend")}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()} · <span className="capitalize">{t.status}</span>
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${t.kind === "credit" ? "text-emerald-600" : "text-destructive"}`}>
                    {t.kind === "credit" ? "+" : "-"}{rupees(t.amount_paise)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
