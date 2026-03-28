"use client";

import { useState, useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
import { Expandable } from "@/components/Expandable";
import { TaskLine } from "@/components/TaskLine";
import { Plus, Trash2, Pencil, X, Home, ChevronDown, DoorOpen } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";
const select = "w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 pe-9 text-sm text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]";

const roomTypes = ["ROOM", "BALCONY", "STORAGE", "OTHER"] as const;

export default function PropertyPage() {
  const { t, lang } = useI18n();
  const [floorForm, setFloorForm] = useState({ show: false, name: "" });
  const [roomForm, setRoomForm] = useState({ show: false, floorId: "", name: "", type: "ROOM" });
  const [editRoom, setEditRoom] = useState<{ id: string; name: string; type: string } | null>(null);
  const [error, setError] = useState("");

  const { activeProject: project } = useProject();
  const { data: floors } = useApi<any[]>(project ? `/api/floors?projectId=${project.id}` : null);
  const { data: allNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);

  const allTexts = useMemo(() => [
    ...(floors?.map((f: any) => f.name) || []),
    ...(floors?.flatMap((f: any) => f.rooms?.map((r: any) => r.name) || []) || []),
    ...(allNodes?.map((n: any) => n.name) || []),
  ], [floors, allNodes]);
  const tr = useTranslate(allTexts);
  const fmt = (n: number) => new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

  const mutateFloors = () => mutate(`/api/floors?projectId=${project.id}`);

  const addFloor = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try { await apiPost("/api/floors", { name: floorForm.name, projectId: project.id }); setFloorForm({ show: false, name: "" }); mutateFloors(); } catch (err: any) { setError(err.message); }
  };

  const deleteFloor = async (f: any) => {
    if (!confirm(t("prop.deleteFloorConfirm").replace("{name}", f.name))) return;
    try {
      await apiDelete(`/api/floors`, { floorId: f.id });
    } catch (err: any) { setError(err.message); }
    mutateFloors();
  };

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try { await apiPost("/api/rooms", { name: roomForm.name, floorId: roomForm.floorId, type: roomForm.type }); setRoomForm({ show: false, floorId: "", name: "", type: "ROOM" }); mutateFloors(); } catch (err: any) { setError(err.message); }
  };

  const updateRoom = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editRoom) return; setError("");
    try { await apiPatch(`/api/rooms/${editRoom.id}`, { name: editRoom.name, type: editRoom.type }); setEditRoom(null); mutateFloors(); } catch (err: any) { setError(err.message); }
  };

  const deleteRoom = async (r: any) => {
    if (!confirm(t("prop.deleteRoomConfirm").replace("{name}", r.name))) return;
    await apiDelete(`/api/rooms/${r.id}`); mutateFloors();
  };

  // Compute room stats
  const getRoomTasks = (roomId: string) => (allNodes || []).filter((n: any) => n.rooms?.some((r: any) => r.roomId === roomId));
  const getRoomCost = (roomId: string) => {
    const tasks = getRoomTasks(roomId);
    const cost = tasks.reduce((s: number, n: any) => s + (Number(n.expectedCost) || 0), 0);
    const paid = tasks.reduce((s: number, n: any) => s + (Number(n._paid) || 0), 0);
    return { cost, paid, remaining: cost - paid, pct: cost > 0 ? Math.round((paid / cost) * 100) : 0, count: tasks.length };
  };

  const getFloorStats = (floor: any) => {
    const rooms = floor.rooms || [];
    let cost = 0, paid = 0, taskCount = 0;
    for (const room of rooms) {
      const s = getRoomCost(room.id);
      cost += s.cost; paid += s.paid; taskCount += s.count;
    }
    return { cost, paid, remaining: cost - paid, pct: cost > 0 ? Math.round((paid / cost) * 100) : 0, taskCount, roomCount: rooms.length };
  };

  const totalRooms = floors?.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0) || 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("prop.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{floors?.length ?? 0} {t("prop.floors").toLowerCase()} · {totalRooms} {t("task.rooms").toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRoomForm({ ...roomForm, show: !roomForm.show })}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)]">
            <DoorOpen size={16} />{t("prop.addRoom")}
          </button>
          <button onClick={() => setFloorForm({ ...floorForm, show: !floorForm.show })}
            className="flex items-center gap-2 rounded-xl bg-[var(--fg)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10">
            <Plus size={16} />{t("prop.addFloor")}
          </button>
        </div>
      </div>

      {floorForm.show && (
        <Card glow>
          <form onSubmit={addFloor} className="flex gap-3">
            <input type="text" placeholder={t("prop.floorName")} value={floorForm.name} onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })} required className={`${input} flex-1`} />
            <button type="submit" className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white">{t("task.save")}</button>
          </form>
          {error && <p className="mt-2 text-xs font-medium text-[var(--alert)]">{error}</p>}
        </Card>
      )}

      {roomForm.show && floors && floors.length > 0 && (
        <Card glow>
          <form onSubmit={addRoom} className="space-y-3">
            <input type="text" placeholder={t("prop.roomName")} value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required className={input} />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <select value={roomForm.floorId} onChange={(e) => setRoomForm({ ...roomForm, floorId: e.target.value })} required className={select}>
                  <option value="">{t("prop.selectFloor")}</option>
                  {floors.map((f: any) => <option key={f.id} value={f.id}>{tr(f.name)}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              </div>
              <div className="relative">
                <select value={roomForm.type} onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })} className={select}>
                  {roomTypes.map((rt) => <option key={rt} value={rt}>{t(`roomType.${rt}` as TKey)}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              </div>
            </div>
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white">{t("task.save")}</button>
          </form>
        </Card>
      )}

      {!floors ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : floors.length === 0 ? (
        <Card><p className="py-12 text-center text-sm text-[var(--fg-muted)]">{t("prop.noFloors")}</p></Card>
      ) : (
        floors.map((floor: any) => {
          const floorStats = getFloorStats(floor);
          return (
            <div key={floor.id} className="space-y-2">
              {/* Floor header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Home size={16} className="text-[var(--accent)]" />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--fg)]">{tr(floor.name)}</h3>
                    <p className="text-[11px] text-[var(--fg-muted)]">
                      {floorStats.roomCount} {t("task.rooms").toLowerCase()} · {floorStats.taskCount} {t("dash.tasks").toLowerCase()}
                      {floorStats.cost > 0 && <> · {fmt(floorStats.cost)}</>}
                    </p>
                  </div>
                </div>
                {floorStats.cost > 0 && (
                  <div className="text-end text-[11px]">
                    <span className="text-[var(--success)] font-semibold">{fmt(floorStats.paid)}</span>
                    <span className="text-[var(--fg-muted)]"> / {fmt(floorStats.cost)}</span>
                    {floorStats.remaining > 0 && <p className="text-[10px] font-semibold text-[var(--alert)]">{fmt(floorStats.remaining)} {t("task.left")}</p>}
                  </div>
                )}
              </div>

              {/* Floor progress bar */}
              {floorStats.cost > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(floorStats.pct, 100)}%`, background: "linear-gradient(90deg, var(--success), #78B080)" }} />
                </div>
              )}

              {/* Rooms */}
              {floor.rooms?.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {floor.rooms.map((room: any) => {
                    const roomStats = getRoomCost(room.id);
                    const roomTasks = getRoomTasks(room.id);
                    return (
                      <Card key={room.id} className="!p-3">
                        {editRoom?.id === room.id ? (
                          /* ── Inline edit ── */
                          <form onSubmit={updateRoom} className="space-y-2">
                            <button type="button" onClick={() => setEditRoom(null)} className="flex w-full items-center justify-between rounded-lg px-1 py-1 -mx-1 transition-colors hover:bg-[var(--border-subtle)]">
                              <div className="flex items-center gap-2">
                                <DoorOpen size={14} className="text-[var(--accent)]" />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("crud.edit")}</p>
                              </div>
                              <X size={14} className="text-[var(--fg-muted)]" />
                            </button>
                            <input type="text" value={editRoom!.name} onChange={(e) => setEditRoom({ id: editRoom!.id, name: e.target.value, type: editRoom!.type })} required className={input} autoFocus />
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <select value={editRoom!.type} onChange={(e) => setEditRoom({ id: editRoom!.id, name: editRoom!.name, type: e.target.value })} className={select}>
                                  {roomTypes.map((rt) => <option key={rt} value={rt}>{t(`roomType.${rt}` as TKey)}</option>)}
                                </select>
                                <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                              </div>
                              <button type="submit" className="shrink-0 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white">{t("task.save")}</button>
                              <button type="button" onClick={() => setEditRoom(null)} className="shrink-0 rounded-xl bg-[var(--border-subtle)] px-4 py-2.5 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
                            </div>
                          </form>
                        ) : (
                          /* ── Normal display ── */
                          <Expandable trigger={
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <DoorOpen size={14} className="shrink-0 text-[var(--accent)]" />
                                  <p className="truncate text-sm font-semibold text-[var(--fg)]">{tr(room.name)}</p>
                                  <span className="rounded bg-[var(--border-subtle)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--fg-muted)]">{t(`roomType.${room.type}` as TKey)}</span>
                                </div>
                                <p className="mt-0.5 ms-5 text-[11px] text-[var(--fg-muted)]">
                                  {roomStats.count} {t("dash.tasks").toLowerCase()}
                                  {roomStats.cost > 0 && <> · <span className="text-[var(--success)]">{fmt(roomStats.paid)}</span> / {fmt(roomStats.cost)}</>}
                                  {roomStats.remaining > 0 && <> · <span className="text-[var(--alert)]">{fmt(roomStats.remaining)} {t("task.left")}</span></>}
                                </p>
                                {roomStats.cost > 0 && (
                                  <div className="mt-1.5 ms-5 h-1 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
                                    <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${Math.min(roomStats.pct, 100)}%` }} />
                                  </div>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => editRoom?.id === room.id ? setEditRoom(null) : setEditRoom({ id: room.id, name: room.name, type: room.type })} className={`rounded-lg p-1.5 transition-all ${editRoom?.id === room.id ? "bg-[var(--accent)] text-white hover:bg-[var(--alert)]" : "text-[var(--fg-muted)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"}`}>
                                  {editRoom?.id === room.id ? <X size={12} /> : <Pencil size={12} />}
                                </button>
                                <button onClick={() => deleteRoom(room)} className="rounded-lg p-1.5 text-[var(--fg-muted)]/30 hover:bg-[var(--alert-soft)] hover:text-[var(--alert)]"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          }>
                            {roomTasks.length > 0 ? (
                              <div className="rounded-lg bg-[var(--bg)] p-2 space-y-0.5">
                                {roomTasks.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}
                              </div>
                            ) : <p className="text-xs text-[var(--fg-muted)] py-1">—</p>}
                          </Expandable>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-[var(--fg-muted)]">—</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
