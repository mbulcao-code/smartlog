"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase-browser";

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export default function SetupDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SetupDetailContent />
    </Suspense>
  );
}

const VARIANT_COLORS = {
  A: { text: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   ring: "ring-blue-500"   },
  B: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", ring: "ring-purple-500" },
  C: { text: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  ring: "ring-green-500"  },
  D: { text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  ring: "ring-amber-500"  },
  E: { text: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   ring: "ring-cyan-500"   },
};

const VARIANT_LABELS = ["A", "B", "C", "D", "E"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function SetupDetailContent() {
  const router = useRouter();
  const params = useParams();
  const [lang] = useState(() => getLang());
  const pt = lang === "pt";

  const [setup, setSetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [token, setToken] = useState(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editConditions, setEditConditions] = useState([]);
  const [editStopInitial, setEditStopInitial] = useState("");
  const [editStopRules, setEditStopRules] = useState([]);
  const [editProfitTargets, setEditProfitTargets] = useState([]);
  const [lockedConditionIds, setLockedConditionIds] = useState(new Set());
  const [lockedMessage, setLockedMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load setup
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setToken(session.access_token);

      try {
        const res = await fetch(`/api/journal/setups/${params.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 404) { setNotFound(true); setLoading(false); return; }
        const data = await res.json();
        if (data.error) { setNotFound(true); setLoading(false); return; }
        setSetup(data);
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  function enterEditMode() {
    setEditName(setup.name);
    setEditConditions(
      (setup.conditions || []).map((c) => ({
        ...c,
        variants: c.variants?.length > 0
          ? c.variants.map((v) => ({ ...v }))
          : [
              { id: uid(), label: "A", description: c.variantA || "" },
              { id: uid(), label: "B", description: c.variantB || "" },
            ],
      }))
    );
    const sc = setup.stop_config || {};
    setEditStopInitial(sc.initial || setup.stop_strategy || "");
    setEditStopRules(sc.rules || []);
    const pc = setup.profit_config || {};
    setEditProfitTargets(
      pc.targets?.length > 0
        ? pc.targets.map((t) => ({ ...t, id: t.id || uid() }))
        : [{ id: uid(), size: "", description: "", isRunner: false }]
    );
    setLockedConditionIds(new Set());
    setLockedMessage(null);
    setEditing(true);
  }

  // ── Condition editing helpers ─────────────────────────────────────────────

  function addVariantToCondition(condId) {
    setEditConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        if (c.variants.length >= 5) return c;
        const nextLabel = VARIANT_LABELS[c.variants.length];
        return {
          ...c,
          variants: [...c.variants, { id: uid(), label: nextLabel, description: "" }],
        };
      })
    );
  }

  function updateVariantDescription(condId, variantId, value) {
    setEditConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        return {
          ...c,
          variants: c.variants.map((v) =>
            v.id === variantId ? { ...v, description: value } : v
          ),
        };
      })
    );
  }

  function removeVariant(condId, variantId) {
    setEditConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        const filtered = c.variants.filter((v) => v.id !== variantId);
        // Re-label A, B, C…
        return {
          ...c,
          variants: filtered.map((v, i) => ({ ...v, label: VARIANT_LABELS[i] })),
        };
      })
    );
  }

  function tryEditConditionText(condId) {
    setLockedConditionIds((prev) => new Set([...prev, condId]));
    setLockedMessage(condId);
  }

  // ── Stop rule helpers ─────────────────────────────────────────────────────

  function updateStopRule(index, value) {
    setEditStopRules((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addStopRule() {
    if (editStopRules.length < 2) setEditStopRules((prev) => [...prev, ""]);
  }

  function removeStopRule(index) {
    setEditStopRules((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Profit target helpers ─────────────────────────────────────────────────

  function updateTarget(id, field, value) {
    setEditProfitTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  }

  function addTarget() {
    if (editProfitTargets.length < 3) {
      setEditProfitTargets((prev) => [
        ...prev,
        { id: uid(), size: "", description: "", isRunner: false },
      ]);
    }
  }

  function removeTarget(id) {
    setEditProfitTargets((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Save edit ─────────────────────────────────────────────────────────────

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/journal/setups/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          conditions: editConditions,
          stop_config: {
            initial: editStopInitial.trim(),
            rules: editStopRules.filter(Boolean),
          },
          profit_config: {
            targets: editProfitTargets.map((t, i) => ({
              label: `T${i + 1}`,
              size: t.size,
              description: t.description,
              isRunner: t.isRunner,
            })),
          },
        }),
      });
      const data = await res.json();
      if (data.error === "condition_text_locked") {
        setLockedConditionIds((prev) => new Set([...prev, data.lockedConditionId]));
        setLockedMessage(data.lockedConditionId);
        setSaving(false);
        return;
      }
      if (data.error) throw new Error(data.error);
      setSetup(data.setup);
      setEditing(false);
    } catch (e) {
      alert(pt ? "Erro ao salvar. Tente novamente." : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/journal/setups/${params.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      router.push("/journal?setup=deleted");
    } catch (e) {
      alert(pt ? "Erro ao excluir." : "Failed to delete.");
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner />;

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 text-sm">{pt ? "Setup não encontrado." : "Setup not found."}</p>
        <button onClick={() => router.push("/journal")} className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
          ← {pt ? "Voltar ao diário" : "Back to journal"}
        </button>
      </div>
    );
  }

  // ── View mode ─────────────────────────────────────────────────────────────

  if (!editing) {
    const stopConfig = setup.stop_config || {};
    const profitConfig = setup.profit_config || {};

    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="px-6 py-5 border-b border-slate-800">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <button onClick={() => router.push("/journal")} className="text-slate-400 hover:text-white text-sm transition-colors">
              ← {pt ? "Diário" : "Journal"}
            </button>
            <span className="text-sm font-medium text-slate-300">{pt ? "Setup" : "Setup"}</span>
            <button
              onClick={enterEditMode}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
            >
              {pt ? "Editar" : "Edit"}
            </button>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-6 py-8">

          {/* Name */}
          <h1 className="text-2xl font-bold text-white mb-8">{setup.name}</h1>

          {/* Conditions */}
          {setup.conditions?.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                {pt ? "Condições" : "Conditions"}
              </p>
              <div className="flex flex-col gap-4">
                {setup.conditions.map((cond) => {
                  const variants = cond.variants?.length > 0
                    ? cond.variants
                    : [
                        { label: "A", description: cond.variantA || "" },
                        { label: "B", description: cond.variantB || "" },
                      ];
                  return (
                    <div key={cond.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                      <p className="text-sm text-slate-200 mb-3 leading-snug">{cond.text}</p>
                      <div className="flex flex-wrap gap-2">
                        {variants.map((v) => {
                          const col = VARIANT_COLORS[v.label] || VARIANT_COLORS.A;
                          return (
                            <span key={v.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${col.border} ${col.bg} ${col.text}`}>
                              <span className="font-bold">{v.label}</span>
                              {v.description && <span className="text-slate-300">{v.description}</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stop strategy */}
          {(stopConfig.initial || setup.stop_strategy) && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                {pt ? "Stop" : "Stop"}
              </p>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
                <p className="text-sm text-slate-200">{stopConfig.initial || setup.stop_strategy}</p>
                {stopConfig.rules?.map((rule, i) => (
                  <p key={i} className="text-xs text-slate-500 mt-1.5">→ {rule}</p>
                ))}
              </div>
            </div>
          )}

          {/* Profit targets */}
          {profitConfig.targets?.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                {pt ? "Alvos" : "Targets"}
              </p>
              <div className="flex flex-col gap-2">
                {profitConfig.targets.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800 bg-slate-900">
                    <div>
                      <span className="text-xs font-bold text-slate-400 mr-2">T{i + 1}</span>
                      {t.size && <span className="text-sm text-slate-300">{t.size}</span>}
                      {t.description && <span className="text-xs text-slate-500 ml-2">· {t.description}</span>}
                    </div>
                    {t.isRunner && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                        runner
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-3">
            <button
              onClick={() => router.push(`/journal/log/new`)}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
            >
              {pt ? "Usar este setup →" : "Use this setup →"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl border border-red-500/20 hover:border-red-500/50 text-red-500 hover:text-red-400 text-sm transition-colors"
            >
              {pt ? "Excluir setup" : "Delete setup"}
            </button>
          </div>
        </main>

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-white font-semibold mb-2">
                {pt ? "Excluir setup?" : "Delete setup?"}
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                {pt
                  ? "As operações já registradas com este setup não serão apagadas, mas perderão o vínculo com ele."
                  : "Trades already logged with this setup won't be deleted, but they'll lose their link to it."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {pt ? "Cancelar" : "Cancel"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {deleting ? "..." : pt ? "Excluir" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="px-6 py-5 border-b border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={() => { setEditing(false); setLockedMessage(null); }}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            {pt ? "Cancelar" : "Cancel"}
          </button>
          <span className="text-sm font-medium text-slate-300">{pt ? "Editar setup" : "Edit setup"}</span>
          <button
            onClick={handleSave}
            disabled={saving || !editName.trim()}
            className="text-sm px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-medium transition-colors"
          >
            {saving ? "..." : pt ? "Salvar" : "Save"}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">

        {/* Name */}
        <div className="mb-6">
          <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
            {pt ? "Nome do setup" : "Setup name"}
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Conditions — text locked, variants editable */}
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            {pt ? "Condições" : "Conditions"}
          </p>

          <div className="flex flex-col gap-5">
            {editConditions.map((cond) => (
              <div key={cond.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900">

                {/* Condition text — locked */}
                <div className="flex items-start gap-2 mb-3">
                  <p className="text-sm text-slate-300 flex-1 leading-snug">{cond.text}</p>
                  <button
                    onClick={() => tryEditConditionText(cond.id)}
                    className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
                    title={pt ? "Condição bloqueada" : "Condition locked"}
                  >
                    🔒
                  </button>
                </div>

                {/* Locked message */}
                {lockedMessage === cond.id && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-950/30 border border-amber-500/20">
                    <p className="text-xs text-amber-400 leading-relaxed">
                      {pt
                        ? "Comprometer-se com as condições tempo suficiente é essencial para aprendizado significativo. Você pode adicionar variantes, mas para alterar as condições, crie um novo setup com outro nome."
                        : "Committing to your conditions long enough is essential for meaningful learning. You can add variants, but to change conditions, create a new setup under a different name."}
                    </p>
                  </div>
                )}

                {/* Variants */}
                <div className="flex flex-col gap-2">
                  {cond.variants.map((v) => {
                    const col = VARIANT_COLORS[v.label] || VARIANT_COLORS.A;
                    return (
                      <div key={v.id} className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-5 flex-shrink-0 ${col.text}`}>{v.label}</span>
                        <input
                          type="text"
                          value={v.description}
                          onChange={(e) => updateVariantDescription(cond.id, v.id, e.target.value)}
                          placeholder={pt ? "Descrição..." : "Description..."}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-xs"
                        />
                        {cond.variants.length > 2 && (
                          <button
                            onClick={() => removeVariant(cond.id, v.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors text-sm"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {cond.variants.length < 5 && (
                  <button
                    onClick={() => addVariantToCondition(cond.id)}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    + {pt ? "Adicionar variante" : "Add variant"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stop strategy */}
        <div className="mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Stop</p>
          <input
            type="text"
            value={editStopInitial}
            onChange={(e) => setEditStopInitial(e.target.value)}
            placeholder={pt ? "Posicionamento inicial do stop..." : "Initial stop placement..."}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm mb-2"
          />
          {editStopRules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={rule}
                onChange={(e) => updateStopRule(i, e.target.value)}
                placeholder={pt ? `Regra ${i + 1}...` : `Rule ${i + 1}...`}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              />
              <button onClick={() => removeStopRule(i)} className="text-slate-600 hover:text-red-400 transition-colors">×</button>
            </div>
          ))}
          {editStopRules.length < 2 && (
            <button onClick={addStopRule} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              + {pt ? "Adicionar regra de mover stop" : "Add stop move rule"}
            </button>
          )}
        </div>

        {/* Profit targets */}
        <div className="mb-8">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            {pt ? "Alvos" : "Targets"}
          </p>
          <div className="flex flex-col gap-3">
            {editProfitTargets.map((target, i) => (
              <div key={target.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">T{i + 1}</span>
                  {editProfitTargets.length > 1 && (
                    <button onClick={() => removeTarget(target.id)} className="text-slate-600 hover:text-red-400 text-sm transition-colors">×</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={target.size}
                    onChange={(e) => updateTarget(target.id, "size", e.target.value)}
                    placeholder={pt ? "Tamanho (ex: 1/3)" : "Size (e.g. 1/3)"}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-xs"
                  />
                  <input
                    type="text"
                    value={target.description}
                    onChange={(e) => updateTarget(target.id, "description", e.target.value)}
                    placeholder={pt ? "Descrição..." : "Description..."}
                    className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none text-xs"
                  />
                </div>
                <button
                  onClick={() => updateTarget(target.id, "isRunner", !target.isRunner)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    target.isRunner
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      : "border-slate-700 text-slate-600 hover:text-slate-400"
                  }`}
                >
                  runner
                </button>
              </div>
            ))}
          </div>
          {editProfitTargets.length < 3 && (
            <button onClick={addTarget} className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              + {pt ? "Adicionar alvo" : "Add target"}
            </button>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !editName.trim()}
          className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {saving ? "..." : pt ? "Salvar alterações →" : "Save changes →"}
        </button>
      </main>
    </div>
  );
}
