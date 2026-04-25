// app/(worker)/portfolio/page.tsx
// URL: /portfolio
// Workers manage their portfolio here — add before/after project photos
// with a title and category. Clients see these on the worker profile page.
//
// Image upload: currently uses URL inputs (paste a public image URL).
// Cloudinary drag-and-drop upload will replace this in Phase X.

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  createdAt: string;
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  category: z.string().min(1, "Category is required"),
  description: z.string().max(500).optional(),
  // Comma-separated URLs for now (will become file upload with Cloudinary)
  beforePhotoUrls: z.string().optional(),
  afterPhotoUrls: z.string().min(1, "Add at least one after photo URL"),
});

type FormData = z.infer<typeof schema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseUrls(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((u) => u.trim())
    .filter(Boolean);
}

// ─── Sub-component: portfolio item card ───────────────────────────────────────

function PortfolioCard({
  item,
  onDelete,
}: {
  item: PortfolioItem;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const thumb = item.afterPhotos[0] ?? item.beforePhotos[0];
  const cat = TRADE_CATEGORIES.find((t) => t.value === item.category);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/workers/portfolio/${item.id}`, {
      method: "DELETE",
    });
    if (res.ok) onDelete(item.id);
    else setDeleting(false);
  }

  return (
    <div className="card overflow-hidden p-0">
      {/* Thumbnail */}
      <div className="relative">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={item.title}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-40 bg-surface flex items-center justify-center">
            <span className="text-4xl" aria-hidden="true">🖼️</span>
          </div>
        )}
        {/* Before/After count badges */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {item.beforePhotos.length > 0 && (
            <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">
              {item.beforePhotos.length} before
            </span>
          )}
          {item.afterPhotos.length > 0 && (
            <span className="text-xs bg-primary/80 text-white px-2 py-0.5 rounded-full">
              {item.afterPhotos.length} after
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-text-primary text-sm truncate">{item.title}</p>
        <p className="text-xs text-text-secondary">
          {cat ? `${cat.emoji} ${cat.label}` : item.category}
        </p>
        {item.description && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Delete controls */}
        <div className="mt-3 flex gap-2">
          {confirmDelete ? (
            <>
              <Button
                variant="danger"
                size="sm"
                loading={deleting}
                onClick={handleDelete}
                className="flex-1"
              >
                Confirm delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-error hover:underline min-h-[36px]"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page component ─────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Load portfolio items
  useEffect(() => {
    fetch("/api/workers/portfolio")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/workers/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        category: data.category,
        description: data.description,
        beforePhotos: parseUrls(data.beforePhotoUrls ?? ""),
        afterPhotos: parseUrls(data.afterPhotoUrls),
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      showToast({ type: "error", message: json.error ?? "Failed to add item" });
      return;
    }

    setItems((prev) => [json, ...prev]);
    reset();
    setShowForm(false);
    showToast({ type: "success", message: "Portfolio item added!" });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast({ type: "success", message: "Item removed" });
  }

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-5 flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">My Portfolio</h1>
            <p className="text-blue-200 text-sm">{items.length} project{items.length !== 1 ? "s" : ""}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "+ Add Project"}
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* ── Add project form ──────────────────────────────────── */}
        {showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="card mb-5 flex flex-col gap-4"
          >
            <h2 className="font-semibold text-text-primary">New portfolio item</h2>

            {/* Notice about image upload */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
              <strong>Image upload coming in Phase X (Cloudinary).</strong>{" "}
              For now, paste the URL of a public image (e.g. from Unsplash or
              Google Drive). Enter multiple URLs on separate lines.
            </div>

            <Input
              label="Project title"
              placeholder="e.g. Bathroom plumbing repair in Tema"
              error={errors.title?.message}
              {...register("title")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Category</label>
              <select
                className={[
                  "w-full h-12 px-4 text-sm text-text-primary bg-white",
                  "border border-gray-300 rounded-xl",
                  "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
                  errors.category ? "border-error" : "",
                ].join(" ")}
                {...register("category")}
              >
                <option value="">Select trade category…</option>
                {TRADE_CATEGORIES.map(({ value, label, emoji }) => (
                  <option key={value} value={value}>
                    {emoji} {label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-sm text-error">{errors.category.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Description{" "}
                <span className="text-text-secondary font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Briefly describe the job…"
                className="w-full px-4 py-3 text-sm text-text-primary bg-white border border-gray-300 rounded-xl resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                {...register("description")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                Before photo URLs{" "}
                <span className="text-text-secondary font-normal">(optional, one per line)</span>
              </label>
              <textarea
                rows={2}
                placeholder={"https://example.com/before1.jpg\nhttps://example.com/before2.jpg"}
                className="w-full px-4 py-3 text-sm font-mono text-text-primary bg-white border border-gray-300 rounded-xl resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                {...register("beforePhotoUrls")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">
                After photo URLs{" "}
                <span className="text-error">*</span>{" "}
                <span className="text-text-secondary font-normal">(one per line)</span>
              </label>
              <textarea
                rows={2}
                placeholder={"https://example.com/after1.jpg"}
                className={[
                  "w-full px-4 py-3 text-sm font-mono text-text-primary bg-white",
                  "border rounded-xl resize-none focus:ring-2 focus:ring-primary/20 outline-none",
                  errors.afterPhotoUrls
                    ? "border-error focus:border-error"
                    : "border-gray-300 focus:border-primary",
                ].join(" ")}
                {...register("afterPhotoUrls")}
              />
              {errors.afterPhotoUrls && (
                <p className="text-sm text-error">{errors.afterPhotoUrls.message}</p>
              )}
            </div>

            <Button type="submit" fullWidth loading={isSubmitting}>
              Add to Portfolio
            </Button>
          </form>
        )}

        {/* ── Portfolio grid ────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="rounded-2xl overflow-hidden animate-pulse">
                <div className="w-full h-40 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3" aria-hidden="true">📷</p>
            <p className="font-semibold text-text-primary">No projects yet</p>
            <p className="text-sm text-text-secondary mt-1 max-w-xs mx-auto">
              Add before/after photos of your completed work. Clients use these
              to decide who to hire.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              Add First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <PortfolioCard key={item.id} item={item} onDelete={removeItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
