"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "ADMIN" | "OPERATOR";

type User = {
  id: number;
  username: string;
  role: Role;
};

type FeederType = {
  id: number;
  code: string;
  displayName: string;
  description?: string | null;
};

type Feeder = {
  id: number;
  label: string;
  feederType: FeederType;
  machineId?: number | null;
  machine?: { id: number; name: string } | null;
};

type Machine = {
  id: number;
  name: string;
  feeders: Feeder[];
};

type AuditLog = {
  id: number;
  action: string;
  details?: string | null;
  createdAt: string;
  user?: { id: number; username: string } | null;
  feeder?: { id: number; label: string } | null;
  machine?: { id: number; name: string } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [feeders, setFeeders] = useState<Feeder[]>([]);
  const [feederTypes, setFeederTypes] = useState<FeederType[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignSelection, setAssignSelection] = useState<Record<number, number>>({});
  const [newMachineName, setNewMachineName] = useState("");
  const [newFeederTypeId, setNewFeederTypeId] = useState<number | undefined>();
  const [newFeederQty, setNewFeederQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (!stored) {
      router.push("/login");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) return;
      try {
        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        const meData = await meRes.json();
        setUser(meData.user as User);

        await refreshData(token, meData.user.role);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token, router]);

  const refreshData = async (useToken: string, role: Role) => {
    setError("");
    const headers = { Authorization: `Bearer ${useToken}` };

    const [feedersRes, machinesRes] = await Promise.all([
      fetch("/api/feeders", { headers }),
      fetch("/api/machines", { headers }),
    ]);

    if (!feedersRes.ok || !machinesRes.ok) {
      setError("Failed to load data");
      return;
    }

    const feedersData = await feedersRes.json();
    const machinesData = await machinesRes.json();
    setFeeders(feedersData.feeders);
    setFeederTypes(feedersData.feederTypes);
    setMachines(machinesData.machines);

    if (role === "ADMIN") {
      const auditRes = await fetch("/api/audit", { headers });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.logs);
      }
    }
  };

  const freeFeeders = useMemo(
    () => feeders.filter((f) => !f.machineId),
    [feeders]
  );

  const freeStockByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const feeder of freeFeeders) {
      grouped[feeder.feederType.code] =
        (grouped[feeder.feederType.code] ?? 0) + 1;
    }
    return Object.entries(grouped)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [freeFeeders]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleAssign = async (machineId: number) => {
    const feederId = assignSelection[machineId];
    if (!feederId || !token) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/machines/${machineId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feederId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Assign failed");
      }
      if (user) {
        await refreshData(token, user.role);
      }
      setAssignSelection((prev) => ({ ...prev, [machineId]: 0 }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnassign = async (machineId: number, feederId: number) => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/machines/${machineId}/unassign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feederId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unassign failed");
      }
      if (user) {
        await refreshData(token, user.role);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddMachine = async () => {
    if (!newMachineName || !token) return;
    setBusy(true);
    try {
      const res = await fetch("/api/machines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newMachineName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create machine");
      }
      setNewMachineName("");
      if (user) {
        await refreshData(token, user.role);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddFeeders = async () => {
    if (!newFeederTypeId || !token) return;
    setBusy(true);
    try {
      const res = await fetch("/api/feeders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feederTypeId: newFeederTypeId, quantity: newFeederQty }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add feeders");
      }
      setNewFeederQty(1);
      if (user) {
        await refreshData(token, user.role);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              PCB Feeder Tracker
            </h1>
            <p className="text-sm text-slate-500">
              Logged in as {user.username} ({user.role})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Free Stock</h2>
              <span className="text-sm text-slate-500">
                {freeFeeders.length} feeders free
              </span>
            </div>
            {freeStockByType.length === 0 ? (
              <p className="text-sm text-slate-500">No free feeders.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {freeStockByType.map((item) => (
                  <div
                    key={item.code}
                    className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50"
                  >
                    <div className="text-sm font-semibold text-slate-800">
                      {item.code}
                    </div>
                    <div className="text-xs text-slate-500">{item.count} pcs</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Totals</h2>
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex justify-between">
                <span>Machines</span>
                <span className="font-semibold">{machines.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Feeders</span>
                <span className="font-semibold">{feeders.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Mounted</span>
                <span className="font-semibold">
                  {feeders.length - freeFeeders.length}
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Machines</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {machines.map((machine) => (
              <div
                key={machine.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {machine.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {machine.feeders.length} feeders mounted
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {machine.feeders.length === 0 ? (
                    <p className="text-sm text-slate-500">No feeders assigned.</p>
                  ) : (
                    machine.feeders.map((feeder) => (
                      <div
                        key={feeder.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {feeder.label}
                          </div>
                          <div className="text-xs text-slate-500">
                            {feeder.feederType.code}
                          </div>
                        </div>
                        <button
                          disabled={busy}
                          onClick={() => handleUnassign(machine.id, feeder.id)}
                          className="text-xs rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
                        >
                          Unassign
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {freeFeeders.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={assignSelection[machine.id] ?? 0}
                      onChange={(e) =>
                        setAssignSelection((prev) => ({
                          ...prev,
                          [machine.id]: Number(e.target.value),
                        }))
                      }
                    >
                      <option value={0}>Select a free feeder</option>
                      {freeFeeders.map((feeder) => (
                        <option key={feeder.id} value={feeder.id}>
                          {feeder.label} ({feeder.feederType.code})
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={busy || !assignSelection[machine.id]}
                      onClick={() => handleAssign(machine.id)}
                      className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {user.role === "ADMIN" && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Add Stock</h2>
              <div className="space-y-2">
                <label className="text-sm text-slate-600">Feeder type</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newFeederTypeId ?? ""}
                  onChange={(e) =>
                    setNewFeederTypeId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                >
                  <option value="">Select type</option>
                  {feederTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.code} — {ft.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600">Quantity</label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newFeederQty}
                  onChange={(e) => setNewFeederQty(Number(e.target.value))}
                />
              </div>
              <button
                disabled={busy || !newFeederTypeId}
                onClick={handleAddFeeders}
                className="w-full rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
              >
                Add to stock
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Create Machine</h2>
              <div className="space-y-2">
                <label className="text-sm text-slate-600">Machine name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  placeholder="Hanwha ..."
                />
              </div>
              <button
                disabled={busy || !newMachineName}
                onClick={handleAddMachine}
                className="w-full rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
              >
                Add machine
              </button>
            </div>
          </section>
        )}

        {user.role === "ADMIN" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Audit Log</h2>
              <span className="text-xs text-slate-500">Last 200 entries</span>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-500">No audit entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 text-left">Time</th>
                      <th className="py-2 text-left">User</th>
                      <th className="py-2 text-left">Action</th>
                      <th className="py-2 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 text-slate-600">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-slate-600">
                          {log.user?.username ?? "System"}
                        </td>
                        <td className="py-2 pr-3 font-semibold text-slate-800">
                          {log.action}
                        </td>
                        <td className="py-2 pr-3 text-slate-600">
                          {log.details || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
