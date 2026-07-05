"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CheckoutFlow } from "@/components/consumer/checkout-flow";
import { OrderLegTracker } from "@/components/order-leg-tracker";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageUpload, type ImageData } from "@/components/ui/image-upload";
import { createResaleListingAction, startLeg, completeLeg, type IncomingOrder } from "@/lib/products/actions";
import { confirmReceiptAction, cancelOrderAction, forceCompletePayment } from "@/lib/orders/actions";

type ProductItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  pricePerUnit: string;
  quantityAvailable: number;
  sellerName: string;
};

type ServiceProvider = {
  id: string;
  name: string;
  role: string;
};

type OrderLeg = {
  id: string;
  roleLabel: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  isPaid?: boolean;
  amount: string;
  timestamp?: string;
  assignee?: string;
};

type SourcingOrder = {
  orderId: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  createdAt: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  isFullyCompleted: boolean;
  isAlreadyListed: boolean;
  legs: OrderLeg[];
};

type ResaleListing = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  pricePerUnit: string;
  quantityAvailable: number;
  status: string | null;
  externallySourced: boolean | null;
  sourceOrderId: string | null;
  createdAt: string;
  cost: string;
  revenue: string;
  margin: string;
  marginRaw: number | null;
};

type RetailerDashboardClientProps = {
  products: ProductItem[];
  serviceProviders: {
    processors: ServiceProvider[];
    packers: ServiceProvider[];
    agents: ServiceProvider[];
  };
  sourcingOrders: SourcingOrder[];
  resaleListings: ResaleListing[];
  incomingOrders: IncomingOrder[];
};

const mainTabs = [
  { id: "sourcing", label: "Sourcing (Buy Stock)" },
  { id: "resale", label: "Resale (Sell Stock)" },
] as const;

const sourcingTabs = [
  { id: "browse", label: "Marketplace" },
  { id: "purchases", label: "My Sourcing Purchases" },
] as const;

const resaleTabs = [
  { id: "inventory", label: "My Resale Inventory" },
  { id: "orders", label: "Orders Received" },
] as const;

const overallBadgeVariant: Record<
  string,
  "neutral" | "success" | "warning" | "error"
> = {
  pending: "neutral",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

export function RetailerDashboardClient({
  products,
  serviceProviders,
  sourcingOrders,
  resaleListings,
  incomingOrders,
}: RetailerDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"sourcing" | "resale">("sourcing");
  const [sourcingSubTab, setSourcingSubTab] = useState<"browse" | "purchases">("browse");
  const [resaleSubTab, setResaleSubTab] = useState<"inventory" | "orders">("inventory");
  const router = useRouter();

  // Poll for fresh order statuses every 20s
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);

  const [cancelState, cancelAction, cancelPending] = useActionState(cancelOrderAction, null);

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [externallySourced, setExternallySourced] = useState(false);
  const [sourceOrderId, setSourceOrderId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [quantityAvailable, setQuantityAvailable] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [description, setDescription] = useState("");
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [state, formAction, pending] = useActionState(createResaleListingAction, null);

  // When form submission is successful, reset and hide form
  useEffect(() => {
    if (state?.success) {
      setShowCreateForm(false);
      setName("");
      setCategory("");
      setUnit("");
      setPricePerUnit("");
      setQuantityAvailable("");
      setPurchaseCost("");
      setDescription("");
      setImageData(null);
      setSourceOrderId("");
      setExternallySourced(false);
      router.refresh();
    }
  }, [state, router]);

  const handleOrderCreated = (_orderId: string) => {
    setSourcingSubTab("purchases");
  };

  const handleListForResale = (orderId: string, productName: string) => {
    // Pre-fill form fields based on sourcing order
    setSourceOrderId(orderId);
    setName(productName);
    setExternallySourced(false);

    // Switch to Resale tab and show form
    setActiveTab("resale");
    setShowCreateForm(true);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Main Tabs */}
      <div className="flex items-center border-b border-border">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-3 text-sm font-semibold tracking-wide transition-colors border-b-2 border-transparent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "text-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sourcing Tab Content */}
      {activeTab === "sourcing" && (
        <div className="flex flex-col gap-6">
          {/* Sourcing Sub-Tabs */}
          <div className="flex gap-2 p-1 bg-background/50 rounded-lg border border-border self-start">
            {sourcingTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourcingSubTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-xs font-medium rounded-md transition-all",
                  sourcingSubTab === tab.id
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.id === "purchases" && sourcingOrders.length > 0 && (
                  <span className="ml-2 rounded-full bg-badge-neutral-bg text-badge-neutral-fg px-1.5 py-0.5 text-[10px]">
                    {sourcingOrders.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {sourcingSubTab === "browse" && (
            <CheckoutFlow
              products={products}
              serviceProviders={serviceProviders}
              onOrderCreated={handleOrderCreated}
            />
          )}

          {sourcingSubTab === "purchases" && (
            <div className="flex flex-col gap-6">
              {sourcingOrders.length === 0 ? (
                <EmptyState
                  title="No sourcing orders found"
                  message="You can source stock by browsing active listings in the Marketplace tab."
                  className="border border-dashed border-border rounded-lg bg-card py-16"
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {sourcingOrders.map((order) => (
                    <Card
                      key={order.orderId}
                      className="border border-border/80 bg-card rounded-lg overflow-hidden transition-all duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]"
                    >
                      <CardHeader className="border-b border-border/40 py-3 px-5 bg-background/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <CardTitle className="text-sm font-semibold text-foreground truncate">
                              {order.productName}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted">
                              Qty: {order.quantity} &middot; Total: KES {order.totalAmount}
                            </CardDescription>
                          </div>
                          <StatusBadge variant={overallBadgeVariant[order.status]}>
                            {order.status.replace("_", " ")}
                          </StatusBadge>
                        </div>
                      </CardHeader>
                      <CardContent className="py-4 px-5 flex flex-col gap-4">
                        <OrderLegTracker legs={order.legs} />

                        {order.isFullyCompleted ? (
                          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/30 px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-foreground">
                                Order Complete
                              </span>
                              <span className="text-xs text-muted">
                                All legs fulfilled
                              </span>
                            </div>
                            {order.isAlreadyListed ? (
                              <StatusBadge variant="success">Listed for Resale</StatusBadge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleListForResale(order.orderId, order.productName)
                                }
                              >
                                List for Resale
                              </Button>
                            )}
                          </div>
                        ) : (
                          <>
                            {order.legs.some((l) => l.status === "completed" && !l.isPaid) && (
                              <div className="flex flex-col gap-2">
                                {order.legs.map((leg) =>
                                  leg.status === "completed" && !leg.isPaid ? (
                                    <LegConfirmRow key={leg.id} leg={leg} />
                                  ) : null,
                                )}
                              </div>
                            )}

                            {order.status === "pending" &&
                              order.legs.every(
                                (l) => l.status === "pending" || l.status === "assigned",
                              ) && (
                                <form
                                  action={cancelAction}
                                  onSubmit={(e) => {
                                    if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
                                      e.preventDefault();
                                    }
                                  }}
                                >
                                  <input type="hidden" name="orderId" value={order.orderId} />
                                  <Button
                                    type="submit"
                                    variant="destructive"
                                    size="sm"
                                    disabled={cancelPending}
                                    className="w-full cursor-pointer"
                                  >
                                    {cancelPending ? "Cancelling\u2026" : "Cancel Order"}
                                  </Button>
                                  {cancelState?.error && (
                                    <p className="mt-1 text-xs text-destructive">{cancelState.error}</p>
                                  )}
                                </form>
                              )}
                          </>
                        )}

                        <div className="text-xs text-muted border-t border-border/40 pt-3">
                          Ordered {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resale Tab Content */}
      {activeTab === "resale" && (
        <div className="flex flex-col gap-6">
          {/* Resale Sub-Tabs */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex gap-2 p-1 bg-background/50 rounded-lg border border-border">
              {resaleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setResaleSubTab(tab.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-medium rounded-md transition-all",
                    resaleSubTab === tab.id
                      ? "bg-card text-foreground shadow-sm border border-border/50"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {resaleSubTab === "inventory" && !showCreateForm && (
              <Button
                onClick={() => {
                  setShowCreateForm(true);
                  setSourceOrderId("");
                  setName("");
                  setExternallySourced(false);
                }}
                className="font-medium cursor-pointer"
              >
                + Add Resale Listing
              </Button>
            )}
          </div>

          {/* Inventory View */}
          {resaleSubTab === "inventory" && (
            <>
              {showCreateForm ? (
                <Card className="border border-border/80 bg-card rounded-lg max-w-2xl">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-foreground">
                      Create Resale Listing
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Fill in the details to list stock for resale to platform consumers.
                    </CardDescription>
                  </CardHeader>
                  <form action={formAction}>
                    <CardContent className="flex flex-col gap-4">
                      {/* Validation Error Banner */}
                      {state?.error && (
                        <div className="rounded-md bg-badge-error-bg p-3 border border-badge-error-fg/10">
                          <p className="text-sm font-semibold text-badge-error-fg">{state.error}</p>
                        </div>
                      )}

                      {/* Sourcing Checkbox */}
                      <div className="flex items-center gap-2 py-2 border-b border-border/40">
                        <input
                          type="checkbox"
                          id="externallySourced"
                          name="externallySourced"
                          checked={externallySourced}
                          onChange={(e) => {
                            setExternallySourced(e.target.checked);
                            if (e.target.checked) {
                              setSourceOrderId("");
                            }
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                        <Label
                          htmlFor="externallySourced"
                          className="text-sm font-medium cursor-pointer text-foreground"
                        >
                          This stock is externally sourced (not purchased on Chainbridge)
                        </Label>
                      </div>

                      {/* Source Order ID */}
                      {!externallySourced && (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="sourceOrderId" className="text-sm font-medium text-foreground">
                            Source Order ID <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="sourceOrderId"
                            name="sourceOrderId"
                            required
                            value={sourceOrderId}
                            onChange={(e) => setSourceOrderId(e.target.value)}
                            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                            className="bg-background text-sm"
                          />
                          <p className="text-xs text-muted">
                            Must refer to a completed platform order. You can pre-fill this by clicking "List for Resale" next to a completed purchase in the Sourcing tab.
                          </p>
                        </div>
                      )}

                      {/* Purchase Cost (for externally sourced stock) */}
                      {externallySourced && (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="purchaseCost" className="text-sm font-medium text-foreground">
                            Purchase Cost <span className="text-xs text-muted">(optional)</span>
                          </Label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
                              KES
                            </span>
                            <Input
                              id="purchaseCost"
                              name="purchaseCost"
                              type="number"
                              min="0"
                              step="0.01"
                              value={purchaseCost}
                              onChange={(e) => setPurchaseCost(e.target.value)}
                              placeholder="e.g. 3000"
                              className="bg-background text-sm pl-14"
                            />
                          </div>
                          <p className="text-xs text-muted">
                            What you paid to acquire this stock. Used to calculate your profit margin.
                          </p>
                        </div>
                      )}

                      {/* Product Name */}
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="name" className="text-sm font-medium text-foreground">
                          Product Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Organic Maize Grain"
                          className="bg-background text-sm"
                        />
                      </div>

                      {/* Category & Unit */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="category" className="text-sm font-medium text-foreground">
                            Category <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="category"
                            name="category"
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="e.g. Grains"
                            className="bg-background text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="unit" className="text-sm font-medium text-foreground">
                            Unit <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="unit"
                            name="unit"
                            required
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="e.g. 90kg Bag"
                            className="bg-background text-sm"
                          />
                        </div>
                      </div>

                      {/* Price & Quantity */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="pricePerUnit" className="text-sm font-medium text-foreground">
                            Price per Unit (KES) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="pricePerUnit"
                            name="pricePerUnit"
                            type="number"
                            min="1.00"
                            step="0.01"
                            required
                            value={pricePerUnit}
                            onChange={(e) => setPricePerUnit(e.target.value)}
                            placeholder="e.g. 4500"
                            className="bg-background text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="quantityAvailable" className="text-sm font-medium text-foreground">
                            Quantity Available <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="quantityAvailable"
                            name="quantityAvailable"
                            type="number"
                            min="1"
                            required
                            value={quantityAvailable}
                            onChange={(e) => setQuantityAvailable(e.target.value)}
                            placeholder="e.g. 10"
                            className="bg-background text-sm"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="description" className="text-sm font-medium text-foreground">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter optional listing details..."
                          rows={3}
                          className="bg-background text-sm"
                        />
                      </div>

                      <input type="hidden" name="imageUrl" value={imageData?.imageUrl ?? ""} />
                      <input type="hidden" name="imagePublicId" value={imageData?.imagePublicId ?? ""} />

                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium text-foreground">
                          Product photo
                        </Label>
                        <ImageUpload value={imageData} onChange={setImageData} />
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-3 justify-end border-t border-border/40 pt-4 mt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowCreateForm(false)}
                        className="cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={pending} className="cursor-pointer">
                        {pending ? "Listing..." : "Publish Listing"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-background/40">
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">
                          Product details
                        </th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">
                          Status
                        </th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">
                          Sourcing origin
                        </th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">
                          Sourcing cost
                        </th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">
                          Resale revenue
                        </th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {resaleListings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center">
                            <EmptyState
                              title="No resale listings yet"
                              message='Click "+ Add Resale Listing" to create your first one.'
                            />
                          </td>
                        </tr>
                      ) : (
                        resaleListings.map((listing) => {
                          const isMarginNegative =
                            listing.marginRaw !== null && listing.marginRaw < 0;
                          const isMarginPositive =
                            listing.marginRaw !== null && listing.marginRaw > 0;

                          return (
                            <tr key={listing.id} className="hover:bg-background/20 transition-colors">
                              <td className="p-4">
                                <div className="font-semibold text-foreground text-sm">
                                  {listing.name}
                                </div>
                                <div className="text-xs text-muted mt-0.5">
                                  Category: {listing.category} | Qty: {listing.quantityAvailable} ({listing.unit})
                                </div>
                              </td>
                              <td className="p-4">
                                <StatusBadge
                                  variant={listing.status === "active" ? "success" : "error"}
                                >
                                  {listing.status}
                                </StatusBadge>
                              </td>
                              <td className="p-4 text-sm font-medium">
                                {listing.externallySourced ? (
                                  <span className="text-xs text-muted-foreground font-normal">
                                    External Stock
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-primary font-semibold">
                                      Order Traced
                                    </span>
                                    <span className="text-[10px] text-muted font-mono truncate max-w-[120px]">
                                      {listing.sourceOrderId}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-sm font-mono text-foreground font-medium">
                                {listing.cost}
                              </td>
                              <td className="p-4 text-sm font-mono text-foreground font-medium">
                                {listing.revenue}
                              </td>
                              <td
                                  className={cn(
                                    "p-4 text-sm font-mono font-semibold",
                                    isMarginPositive && "text-badge-success-fg",
                                    isMarginNegative && "text-badge-error-fg",
                                    !isMarginPositive && !isMarginNegative && "text-foreground",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded",
                                      isMarginPositive && "bg-badge-success-bg",
                                      isMarginNegative && "bg-badge-error-bg",
                                    )}
                                  >
                                    {listing.margin}
                                  </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Orders Received View */}
          {resaleSubTab === "orders" && (
            <div className="flex flex-col gap-4">
              {incomingOrders.length === 0 ? (
                <EmptyState
                  title="No orders received yet"
                  message="When a consumer places an order for one of your resale products, it will appear here."
                  className="border border-dashed border-border rounded-lg bg-card py-16"
                />
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {incomingOrders.map((order) => {
                    const legStatusVariant: "success" | "warning" | "neutral" | "error" =
                      order.rawSupplyLeg.status === "paid"
                        ? "success"
                        : order.rawSupplyLeg.status === "completed"
                          ? "success"
                          : order.rawSupplyLeg.status === "in_progress"
                            ? "warning"
                            : order.rawSupplyLeg.status === "cancelled"
                              ? "error"
                              : "neutral";

                    return (
                      <OrderReceivedCard key={order.orderId} order={order} legStatusVariant={legStatusVariant} />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderReceivedCard({
  order,
  legStatusVariant,
}: {
  order: IncomingOrder;
  legStatusVariant: "success" | "warning" | "neutral" | "error";
}) {
  const [startState, startAction, startPending] = useActionState(startLeg, null);
  const [completeState, completeAction, completePending] = useActionState(completeLeg, null);
  const [payState, payAction, payPending] = useActionState(forceCompletePayment, null);

  return (
    <Card className="border border-border/80 bg-card rounded-lg overflow-hidden transition-all duration-150 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]">
      <CardHeader className="border-b border-border/40 py-3 px-5 bg-background/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <CardTitle className="text-sm font-semibold text-foreground truncate">
              {order.productName}
            </CardTitle>
            <CardDescription className="text-xs text-muted">
              Ordered by {order.consumerName} &middot; Qty: {order.quantity}
            </CardDescription>
          </div>
          <StatusBadge variant={legStatusVariant}>
            {order.rawSupplyLeg.status === "paid"
              ? "Paid"
              : order.rawSupplyLeg.status.replace("_", " ")}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="py-4 px-5 flex flex-col gap-4">
        <OrderLegTracker legs={order.legs} />

        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border/40 pt-3 text-sm">
          <span className="text-muted">
            Total:{" "}
            <span className="font-medium text-foreground">
              KES {order.totalAmount}
            </span>
          </span>
            <span className="text-muted">
              Payment:{" "}
              {order.rawSupplyLeg.status === "cancelled" ? (
                <span className="font-medium text-muted">N/A</span>
              ) : order.paymentStatus === "failed" ? (
                <span className="font-medium text-destructive">Failed</span>
              ) : (
                <span className="font-medium text-foreground">
                  {order.paymentStatus ?? "Pending"}
                </span>
              )}
            </span>
          <span className="text-muted">
            Date:{" "}
            <span className="font-medium text-foreground">
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </span>
        </div>

        {(startState?.error || completeState?.error || payState?.error) && (
          <p className="text-xs text-destructive">{payState?.error ?? startState?.error ?? completeState?.error}</p>
        )}

        {order.rawSupplyLeg.status !== "cancelled" && (
          <>
            {order.paymentStatus === "initiated" && (
              <form action={payAction}>
                <input type="hidden" name="orderId" value={order.orderId} />
                <Button type="submit" variant="primary" disabled={payPending} className="w-full cursor-pointer">
                  {payPending ? "Processing\u2026" : "Mark as Paid"}
                </Button>
              </form>
            )}

            {(order.rawSupplyLeg.status === "assigned" || order.rawSupplyLeg.status === "pending") && (
              <form action={startAction}>
                <input type="hidden" name="legId" value={order.rawSupplyLeg.id} />
                <Button type="submit" variant="accent" disabled={startPending} className="w-full cursor-pointer">
                  {startPending ? "Starting\u2026" : "Start Fulfilling"}
                </Button>
              </form>
            )}

            {order.rawSupplyLeg.status === "in_progress" && (
              <form action={completeAction}>
                <input type="hidden" name="legId" value={order.rawSupplyLeg.id} />
                <Button type="submit" variant="primary" disabled={completePending} className="w-full cursor-pointer">
                  {completePending ? "Completing\u2026" : "Mark Complete"}
                </Button>
              </form>
            )}

            {(order.rawSupplyLeg.status === "completed" || order.rawSupplyLeg.status === "paid") && (
              <p className="text-xs text-success font-medium text-center">Fulfilled</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LegConfirmRow({ leg }: { leg: OrderLeg }) {
  const [state, action, pending] = useActionState(confirmReceiptAction, null);

  if (leg.status === "completed" && !leg.isPaid) {
    return (
      <form action={action} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-border/60 bg-background/30 p-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {leg.roleLabel}
          </span>
          <span className="text-xs text-muted">{leg.amount}</span>
          {state?.error && (
            <span className="mt-1 text-xs text-destructive">{state.error}</span>
          )}
        </div>
        <input type="hidden" name="legId" value={leg.id} />
        <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto cursor-pointer">
          {pending ? "Confirming\u2026" : "Confirm & Release"}
        </Button>
      </form>
    );
  }

  return null;
}
