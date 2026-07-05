"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload, type ImageData } from "@/components/ui/image-upload";
import { postProduct, updateProduct, type ProductActionState } from "@/app/(dashboard)/producer/actions";
import { cn } from "@/lib/utils";

type ProductFormData = {
  productId?: string;
  name: string;
  category: string;
  unit: string;
  pricePerUnit: string;
  quantityAvailable: string;
  description: string;
  imageUrl: string;
  imagePublicId?: string;
};

type ProductFormProps = {
  product?: ProductFormData;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const initialState: ProductActionState = null;

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEditing = !!product?.productId;
  const action = isEditing ? updateProduct : postProduct;
  const formRef = useRef<HTMLFormElement>(null);

  const [imageData, setImageData] = useState<ImageData | null>(
    product?.imageUrl ? { imageUrl: product.imageUrl, imagePublicId: product.imagePublicId ?? "" } : null,
  );

  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state?.success, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      {product?.productId && (
        <input type="hidden" name="productId" value={product.productId} />
      )}

      <input type="hidden" name="imageUrl" value={imageData?.imageUrl ?? ""} />
      <input type="hidden" name="imagePublicId" value={imageData?.imagePublicId ?? ""} />

      {state?.error && !state?.fieldErrors && (
        <p className="rounded-[var(--radius)] border border-badge-error-bg bg-badge-error-bg px-4 py-2 text-sm text-badge-error-fg">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Product name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={product?.name}
          placeholder="e.g. Premium Kenyan Maize"
          required
        />
        {state?.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            defaultValue={product?.category}
            placeholder="e.g. Grains"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            name="unit"
            defaultValue={product?.unit}
            placeholder="e.g. kg, bunch, piece"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pricePerUnit">Price per unit (KES)</Label>
          <Input
            id="pricePerUnit"
            name="pricePerUnit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.pricePerUnit}
            placeholder="e.g. 150"
            required
          />
          {state?.fieldErrors?.pricePerUnit && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.pricePerUnit[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantityAvailable">Quantity available</Label>
          <Input
            id="quantityAvailable"
            name="quantityAvailable"
            type="number"
            step="1"
            min="0"
            defaultValue={product?.quantityAvailable}
            placeholder="e.g. 500"
            required
          />
          {state?.fieldErrors?.quantityAvailable && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.quantityAvailable[0]}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={product?.description}
          placeholder="Describe your product — quality, harvest date, growing region..."
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Product photo</Label>
        <ImageUpload
          value={imageData}
          onChange={setImageData}
          productId={product?.productId}
        />
      </div>

      <div className={cn("flex gap-3", onCancel ? "justify-between" : "justify-end")}>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving\u2026" : isEditing ? "Update product" : "Post product"}
        </Button>
      </div>
    </form>
  );
}
