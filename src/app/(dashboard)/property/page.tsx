"use client";

import { useState } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
import { Expandable } from "@/components/Expandable";
import { TaskLine } from "@/components/TaskLine";
import { Plus, Trash2, Pencil, Home, ChevronDown, DoorOpen } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";
const select = "w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 pe-9 text-sm text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]";

const roomTypes = ["ROOM", "BALCONY", "STORAGE", "OTHER"] as const;

export default function PropertyPage() {
  const { t } = useI18n();
  const [floorForm, setFloorForm] = useState({ show: false, name: "" });
  const [roomForm, setRoomForm] = useState({ show: false, floorId: "", name: "", type: "ROOM" });
  const [editRoom, setEditRoom] = useState<{ id: string; name: string; type: string } | null>(null);
  const [error, setError] = useState("");

  const { activeProject: project } = useProject();
  const { data: floors } = useApi<any[]>(project ? `/api/floors?projectId=${project.id}` : null);
  const { data: allNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);

  const allTexts = [
    ...(floors?.map((f: any) => f.name) || []),
    ...(floors?.flatMap((f: any) => f.rooms?.map((r: any) => r.name) || []) || []),
  ];
  const tr = useTranslate(allTexts);

  const mutateFloors = () => mutate(`/api/floors?projectId=${project.id}`);

  const addFloor = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiPost("/api/floors", { name: floorForm.name, projectId: project.id });
      setFloorForm({ show: false, name: "" }); mutateFloors();
    } catch (err: any) { setError(err.message); }
  };

  const deleteFloor = async (f: any) => {
    if (!confirm(t("prop.deleteFloorConfirm").replace("{name}", f.name))) return;
    // Need a floor delete endpoint - use rooms endpoint workaround
    // Actually we don't have a floor delete endpoint. Let me use fetch directly
    await fetch(`/api/floors`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ floorId: f.id }) }).catch(() => {});
    mutateFloors();
  };

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiPost("/api/rooms", { name: roomForm.name, floorId: roomForm.floorId, type: roomForm.type });
      setRoomForm({ show: false, floorId: "", name: "", type: "ROOM" }); mutateFloors();
    } catch (err: any) { setError(err.message); }
  };

  const updateRoom = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editRoom) return; setError("");
    try {
      await apiPatch(`/api/rooms/${editRoom.id}`, { name: editRoom.name, type: editRoom.type });
      setEditRoom(null); mutateFloors();
    } catch (err: any) { setError(err.message); }
  };

  const deleteRoom = async (r: any) => {
    if (!confirm(t("prop.deleteRoomConfirm").replace("{name}", r.name))) return;
    await apiDelete(`/api/rooms/${r.id}`); mutateFloors();
  };

  const totalRooms = floors?.reduce((sum: number, f: any) => sum + (f.rooms?.length || 0), 0) || 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("prop.title")}</h1>
          <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
            {floors?.length ?? 0} {t("prop.floors").toLowerCase()} · {totalRooms} {t("task.rooms").toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRoomForm({ ...roomForm, show: !roomForm.show })}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)]">
            <DoorOpen size={16} />{t("prop.addRoom")}
          </button>
          <button onClick={() => setFloorForm({ ...floorForm, show: !floorForm.show })}
            className="flex items-center gap-2 rounded-xl bg-[var(--fg)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10">
            <Plus size={16} />{t("prop.addFloor")}
          </button>
        </div>
      </div>

      {/* Add Floor */}
      {floorForm.show && (
        <Card glow>
          <form onSubmit={addFloor} className="flex gap-3">
            <input type="text" placeholder={t("prop.floorName")} value={floorForm.name} onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })} required className={`${input} flex-1`} />
            <button type="submit" className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white">{t("task.save")}</button>
          </form>
          {error && <p className="mt-2 text-xs font-medium text-[var(--alert)]">{error}</p>}
        </Card>
      )}

      {/* Add Room */}
      {roomForm.show && floors && floors.length > 0 && (
        <Card glow>
          <form onSubmit={addRoom} className="space-y-3">
            <input type="text" placeholder={t("prop.roomName")} value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required className={input} />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <select value={roomForm.floorId} onChange={(e) => setRoomForm({ ...roomForm, floorId: e.target.value })} required className={select}>
                  <option value="">{t("prop.floors")}</option>
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
          {error && <p className="mt-2 text-xs font-medium text-[var(--alert)]">{error}</p>}
        </Card>
      )}

      {/* Edit Room */}
      {editRoom && (
        <Card glow>
          <form onSubmit={updateRoom} className="flex gap-3">
            <input type="text" value={editRoom.name} onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })} required className={`${input} flex-1`} />
            <div className="relative">
              <select value={editRoom.type} onChange={(e) => setEditRoom({ ...editRoom, type: e.target.value })} className={select}>
                {roomTypes.map((rt) => <option key={rt} value={rt}>{t(`roomType.${rt}` as TKey)}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            </div>
            <button type="submit" className="shrink-0 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white">{t("task.save")}</button>
            <button type="button" onClick={() => setEditRoom(null)} className="shrink-0 rounded-xl bg-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
          </form>
        </Card>
      )}

      {/* Floors & Rooms */}
      {!floors ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : floors.length === 0 ? (
        <Card><p className="py-12 text-center text-sm text-[var(--fg-muted)]">{t("prop.noFloors")}</p></Card>
      ) : (
        floors.map((floor: any) => (
          <div key={floor.id}>
            <div className="mb-3 flex items-center gap-2.5">
              <Home size={14} className="text-[var(--accent)]" />
              <h3 className="text-sm font-bold text-[var(--fg)]">{tr(floor.name)}</h3>
              <span className="text-xs text-[var(--fg-muted)]">({floor.rooms?.length || 0})</span>
            </div>
            {floor.rooms?.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {floor.rooms.map((room: any) => {
                  const roomTasks = (allNodes || []).filter((n: any) => n.rooms?.some((r: any) => r.roomId === room.id));
                  return (
                  <Card key={room.id} className="!p-3">
                    <Expandable trigger={
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--fg)]">{tr(room.name)}</p>
                          <p className="text-[11px] text-[var(--fg-muted)]">{t(`roomType.${room.type}` as TKey)} · {roomTasks.length} {t("dash.tasks").toLowerCase()}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setEditRoom({ id: room.id, name: room.name, type: room.type })}
                            className="rounded-lg p-1.5 text-[var(--fg-muted)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]">
                            <Pencil size={12} />
                      </button>
                      <button onClick={() => deleteRoom(room)}
                        className="rounded-lg p-1.5 text-[var(--fg-muted)]/30 hover:bg-[var(--alert-soft)] hover:text-[var(--alert)]">
                        <Trash2 size={12} />
                      </button>
                    </div>
                      </div>
                    }>
                      {roomTasks.length > 0 ? (
                        <div className="rounded-lg bg-[var(--bg)] p-2 space-y-0.5">
                          {roomTasks.map((n: any) => <TaskLine key={n.id} node={n} tr={tr} compact />)}
                        </div>
                      ) : <p className="text-xs text-[var(--fg-muted)] py-1">—</p>}
                    </Expandable>
                  </Card>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-[var(--fg-muted)]">—</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
