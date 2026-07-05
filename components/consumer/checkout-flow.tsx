"use client";

import { useState, useActionState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createOrderAction } from "@/lib/orders/actions";

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

type Props = {
  products: ProductItem[];
  serviceProviders: {
    processors: ServiceProvider[];
    packers: ServiceProvider[];
    agents: ServiceProvider[];
  };
  onOrderCreated: (orderId: string) => void;
};

type Step = "product" | "services" | "review" | "payment" | "paid";

export function CheckoutFlow({ products, serviceProviders, onOrderCreated }: Props) {
  const [step, setStep] = useState<Step>("product");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [processor, setProcessor] = useState<string>("");
  const [processorAmount, setProcessorAmount] = useState(30);
  const [packer, setPacker] = useState<string>("");
  const [packerAmount, setPackerAmount] = useState(15);
  const [agent, setAgent] = useState<string>("");
  const [agentAmount, setAgentAmount] = useState(25);

  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);

  const [state, formAction, pending] = useActionState(createOrderAction, null);

  const productAmount = selectedProduct
    ? parseFloat(selectedProduct.pricePerUnit) * quantity
    : 0;

  const serviceTotal =
    (processor ? processorAmount : 0) +
    (packer ? packerAmount : 0) +
    (agent ? agentAmount : 0);

  const total = productAmount + serviceTotal;

  useEffect(() => {
    if (state?.orderId) {
      setCreatedOrderId(state.orderId);
      setStep("payment");
    }
  }, [state?.orderId]);

  const handlePay = useCallback(async () => {
    if (!createdOrderId) return;
    setPaymentPending(true);
    setPaymentError(null);
    try {
      const res = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: createdOrderId, phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error ?? "Payment failed. Please try again.");
        return;
      }
      setStep("paid");
      onOrderCreated(createdOrderId);
    } catch {
      setPaymentError("Network error. Please try again.");
    } finally {
      setPaymentPending(false);
    }
  }, [createdOrderId, phoneNumber, onOrderCreated]);

  const allSteps: Step[] = ["product", "services", "review", "payment"];
  const stepLabels: Record<Step, string> = {
    product: "Product",
    services: "Services",
    review: "Review",
    payment: "Payment",
    paid: "Paid",
  };
  const stepIndex = allSteps.indexOf(step);

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicators */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {allSteps.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium shrink-0",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : stepIndex > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "capitalize",
                step === s ? "font-medium text-foreground" : "text-muted",
              )}
            >
              {stepLabels[s]}
            </span>
            {i < allSteps.length - 1 && <span className="text-muted">/</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Select product */}
      {step === "product" && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Select a product
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card
                key={product.id}
                  className={cn(
                    "cursor-pointer transition-all duration-150",
                    selectedProduct?.id === product.id
                      ? "border-primary ring-1 ring-primary"
                      : "hover:border-border/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]",
                  )}
                onClick={() => {
                  setSelectedProduct(product);
                }}
              >
                <CardHeader>
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  {product.category && (
                    <CardDescription>{product.category}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <p className="text-sm text-muted">
                    Supplied by {product.sellerName}
                  </p>
                  <p className="text-lg font-semibold text-primary">
                    KES {product.pricePerUnit}
                    {product.unit && <span className="text-sm text-muted"> / {product.unit}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {product.quantityAvailable} available
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedProduct && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedProduct.name} — Quantity
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={selectedProduct.quantityAvailable}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.min(
                        parseInt(e.target.value) || 1,
                        selectedProduct.quantityAvailable,
                      ))
                    }
                  />
                  <p className="mt-1 text-xs text-muted">
                    Max: {selectedProduct.quantityAvailable} | Subtotal: KES{" "}
                    {productAmount.toFixed(2)}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setStep("services")}>
                  Continue to services
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Select optional legs */}
      {step === "services" && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Optional services
          </h2>
          <p className="text-sm text-muted">
            Select optional processing, packing, or delivery services for your
            order. These are not required — skip what you do not need.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <ServiceCard
              title="Processing"
              providers={serviceProviders.processors}
              selectedId={processor}
              onSelect={setProcessor}
              amount={processorAmount}
              onAmountChange={setProcessorAmount}
            />
            <ServiceCard
              title="Packing"
              providers={serviceProviders.packers}
              selectedId={packer}
              onSelect={setPacker}
              amount={packerAmount}
              onAmountChange={setPackerAmount}
            />
            <ServiceCard
              title="Delivery"
              providers={serviceProviders.agents}
              selectedId={agent}
              onSelect={setAgent}
              amount={agentAmount}
              onAmountChange={setAgentAmount}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="secondary" onClick={() => setStep("product")} className="w-full sm:w-auto">
              Back
            </Button>
            <Button onClick={() => setStep("review")} className="w-full sm:w-auto">
              Review order
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review + Confirm */}
      {step === "review" && selectedProduct && (
        <form action={formAction} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Review your order
          </h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span>
                  {selectedProduct.name} × {quantity}
                </span>
                <span className="font-medium">
                  KES {productAmount.toFixed(2)}
                </span>
              </div>

              {processor && (
                <div className="flex justify-between text-sm">
                  <span>Processing</span>
                  <span className="font-medium">
                    KES {processorAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {packer && (
                <div className="flex justify-between text-sm">
                  <span>Packing</span>
                  <span className="font-medium">
                    KES {packerAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {agent && (
                <div className="flex justify-between text-sm">
                  <span>Delivery</span>
                  <span className="font-medium">
                    KES {agentAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    KES {total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <input type="hidden" name="productId" value={selectedProduct.id} />
          <input type="hidden" name="quantity" value={quantity} />

          {processor && (
            <>
              <input type="hidden" name="processorId" value={processor} />
              <input
                type="hidden"
                name="processorAmount"
                value={processorAmount}
              />
            </>
          )}
          {packer && (
            <>
              <input type="hidden" name="packerId" value={packer} />
              <input
                type="hidden"
                name="packerAmount"
                value={packerAmount}
              />
            </>
          )}
          {agent && (
            <>
              <input type="hidden" name="agentId" value={agent} />
              <input
                type="hidden"
                name="agentAmount"
                value={agentAmount}
              />
            </>
          )}

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="secondary" onClick={() => setStep("services")} className="w-full sm:w-auto">
              Back
            </Button>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Creating order..." : "Confirm & Place Order"}
            </Button>
          </div>
        </form>
      )}

      {/* Step 4: Payment */}
      {step === "payment" && createdOrderId && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Complete Payment
          </h2>
          <p className="text-sm text-muted">
            Pay KES {total.toFixed(2)} via M-Pesa to confirm your order.
          </p>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">M-Pesa Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="2547XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  pattern="^2547\d{8}$"
                />
                <p className="text-xs text-muted">
                  Enter your Safaricom number starting with 254 (e.g., 254712345678).
                  You will receive an STK prompt on this number.
                </p>
              </div>

              {paymentError && (
                <p className="text-sm text-destructive">{paymentError}</p>
              )}

              <Button
                type="button"
                variant="primary"
                disabled={
                  paymentPending || !phoneNumber.match(/^2547\d{8}$/)
                }
                onClick={handlePay}
                className="w-full sm:w-auto"
              >
                {paymentPending
                  ? "Sending STK push\u2026"
                  : `Pay KES ${total.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Paid */}
      {step === "paid" && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-badge-success-bg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-8 w-8 text-badge-success-fg"
              aria-hidden
            >
              <path
                d="M6 12l4 4 8-8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xl font-semibold text-foreground">
              Payment Initiated
            </p>
            <p className="text-sm text-muted">
              Check your phone for the M-Pesa STK prompt and enter your PIN to
              complete the payment. Your order will be processed once confirmed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  title,
  providers,
  selectedId,
  onSelect,
  amount,
  onAmountChange,
}: {
  title: string;
  providers: ServiceProvider[];
  selectedId: string;
  onSelect: (id: string) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
}) {
  const enabled = selectedId !== "";

  return (
    <Card
      className={cn(
        "transition-all duration-150",
        enabled && "border-primary ring-1 ring-primary",
      )}
    >
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {providers.length > 0 ? (
          <Select
            options={[
              { value: "", label: `Skip ${title.toLowerCase()}` },
              ...providers.map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
            value={selectedId}
            onChange={(val) => {
              onSelect(val);
            }}
            placeholder={`Skip ${title.toLowerCase()}`}
          />
        ) : (
          <p className="text-xs text-muted">No providers available</p>
        )}

        {enabled && providers.length > 0 && (
          <div>
            <Label htmlFor={`${title}-amount`}>Amount (KES)</Label>
            <Input
              id={`${title}-amount`}
              type="number"
              min={1}
              value={amount}
              onChange={(e) =>
                onAmountChange(parseInt(e.target.value) || 0)
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}


