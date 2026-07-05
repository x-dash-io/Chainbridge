"use client";

import { useActionState, useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductForm } from "./product-form";
import { delistProduct, type ProductActionState } from "@/app/(dashboard)/producer/actions";

type ProductItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  pricePerUnit: string;
  quantityAvailable: number;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  status: string;
};

type ProductListProps = {
  products: ProductItem[];
};

const initialState: ProductActionState = null;

function ProductCard({
  product,
  onEdit,
  statusOverride,
  onStatusChange,
}: {
  product: ProductItem;
  onEdit: () => void;
  statusOverride?: string;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [delistState, delistAction, delistPending] = useActionState(
    delistProduct,
    initialState,
  );

  const displayStatus = statusOverride ?? product.status;

  useEffect(() => {
    if (delistState?.success) onStatusChange(product.id, "delisted");
  }, [delistState, product.id, onStatusChange]);

  const statusVariant: "success" | "warning" | "neutral" =
    displayStatus === "active"
      ? "success"
      : displayStatus === "sold_out"
        ? "warning"
        : "neutral";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{product.name}</CardTitle>
            {product.category && (
              <span className="text-sm text-muted">{product.category}</span>
            )}
          </div>
          <StatusBadge variant={statusVariant}>{displayStatus}</StatusBadge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted">
            Price:{" "}
            <span className="font-medium text-foreground">
              KES {product.pricePerUnit}/{product.unit || "unit"}
            </span>
          </span>
          <span className="text-muted">
            Available:{" "}
            <span className="font-medium text-foreground">
              {product.quantityAvailable} {product.unit || "units"}
            </span>
          </span>
        </div>
        {product.description && (
          <p className="mt-2 text-sm text-muted line-clamp-2">
            {product.description}
          </p>
        )}
        {delistState?.error && (
          <p className="mt-2 text-xs text-destructive">{delistState.error}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
        {product.status === "active" && (
          <form action={delistAction}>
            <input type="hidden" name="productId" value={product.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={delistPending}
            >
              {delistPending ? "Delisting\u2026" : "Delist"}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}

export function ProductList({ products }: ProductListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  const getStatus = (p: ProductItem) => statusMap[p.id] ?? p.status;

  const onStatusChange = useCallback((id: string, status: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  }, []);

  const active = products.filter((p) => getStatus(p) === "active");
  const inactive = products.filter((p) => getStatus(p) !== "active");

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products yet"
        message="Post your first product to start selling on Chainbridge."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {active.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-[0.05em]">
            Active listings
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((product) =>
              editingId === product.id ? (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle>Edit {product.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProductForm
                      product={{
                        productId: product.id,
                        name: product.name,
                        category: product.category || "",
                        unit: product.unit || "",
                        pricePerUnit: product.pricePerUnit,
                        quantityAvailable: String(product.quantityAvailable),
                        description: product.description || "",
                        imageUrl: product.imageUrl || "",
                        imagePublicId: product.imagePublicId || "",
                      }}
                      onSuccess={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </CardContent>
                </Card>
              ) : (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={() => setEditingId(product.id)}
                  statusOverride={statusMap[product.id]}
                  onStatusChange={onStatusChange}
                />
              ),
            )}
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-[0.05em]">
            Past listings
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {inactive.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => setEditingId(product.id)}
                statusOverride={statusMap[product.id]}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
