"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Barcode,
  Check,
  CreditCard,
  CookingPot,
  Coffee,
  Cookie,
  Droplets,
  Egg,
  Minus,
  Milk,
  Package,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingBasket,
  ShoppingCart,
  ScanLine,
  Trash2,
  X,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { formatAFN } from "@/lib/format";
import { posSampleProducts } from "@/lib/pos-sample-data";

const productIcons = {
  Wheat,
  CookingPot,
  Coffee,
  Milk,
  Package,
  Egg,
  Cookie,
  Droplets,
};

const categories = ["all", "staples", "beverages", "dairy", "snacks", "household"];
const productById = new Map(posSampleProducts.map((product) => [product.id, product]));

export function PosTerminal() {
  const { t, numberLocale } = useLocale();
  const [mode, setMode] = useState("scan");
  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [notice, setNotice] = useState(null);
  const [customer, setCustomer] = useState("walkInCustomer");
  const [customName, setCustomName] = useState("");
  const [customWeight, setCustomWeight] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [receipt, setReceipt] = useState(null);
  const scannerRef = useRef(null);
  const cartRef = useRef(cart);
  const customItemCounterRef = useRef(0);

  useEffect(() => {
    if (mode === "scan" && window.matchMedia("(pointer: fine)").matches) {
      scannerRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    if (!checkoutOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") setCheckoutOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [checkoutOpen]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return posSampleProducts.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesSearch =
        !query ||
        [t(product.nameKey), product.sku, product.barcode]
          .some((value) => value.toLocaleLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [category, search, t]);

  const itemCount = cart.length;
  const subtotal = cart.reduce((total, item) => total + getLineTotal(item), 0);
  const received = Number(amountReceived);
  const changeDue = Math.max(0, received - subtotal);
  const customWeightValue = Number(customWeight);
  const customPriceValue = Number(customPrice);
  const customLineTotal =
    Number.isFinite(customWeightValue) &&
    Number.isFinite(customPriceValue) &&
    customWeightValue > 0 &&
    customPriceValue > 0
      ? Math.round(customWeightValue * customPriceValue)
      : 0;

  function getLineTotal(item) {
    return item.kind === "custom"
      ? item.lineTotal
      : productById.get(item.productId).price * item.quantity;
  }

  function replaceCart(nextCart) {
    cartRef.current = nextCart;
    setCart(nextCart);
  }

  function addToCart(product) {
    const currentCart = cartRef.current;
    const existing = currentCart.find(
      (item) => item.kind !== "custom" && item.productId === product.id,
    );

    if (product.stock <= (existing?.quantity ?? 0)) {
      setNotice({ type: "error", text: t("pos.stockLimit") });
      return;
    }

    const nextCart = existing
      ? currentCart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      : [...currentCart, { productId: product.id, quantity: 1 }];

    replaceCart(
      nextCart.map((item) =>
        item.kind === "custom"
          ? item
          : { ...item, id: item.productId },
      ),
    );
    setNotice({ type: "success", text: t("pos.itemAdded") });
  }

  function addCustomProduct(event) {
    event.preventDefault();
    const name = customName.trim();
    const weightKg = Number(customWeight);
    const pricePerKg = Number(customPrice);

    if (
      !name ||
      !Number.isFinite(weightKg) ||
      weightKg <= 0 ||
      !Number.isFinite(pricePerKg) ||
      pricePerKg <= 0
    ) {
      setNotice({ type: "error", text: t("pos.customProductInvalid") });
      return;
    }

    const id = `custom-${customItemCounterRef.current}`;
    customItemCounterRef.current += 1;
    replaceCart([
      ...cartRef.current,
      {
        id,
        kind: "custom",
        name,
        weightKg,
        pricePerKg,
        lineTotal: Math.round(weightKg * pricePerKg),
      },
    ]);
    setCustomName("");
    setCustomWeight("");
    setCustomPrice("");
    setNotice({ type: "success", text: t("pos.customItemAdded") });
  }

  function handleScan(event) {
    event.preventDefault();
    const scannedCode = barcode.trim().toLocaleLowerCase();

    if (!scannedCode) return;

    const product = posSampleProducts.find(
      (item) =>
        item.barcode.toLocaleLowerCase() === scannedCode ||
        item.sku.toLocaleLowerCase() === scannedCode,
    );

    if (!product) {
      setNotice({ type: "error", text: t("pos.barcodeNotFound") });
      setBarcode("");
      return;
    }

    addToCart(product);
    setBarcode("");
  }

  function changeQuantity(productId, amount) {
    const currentItem = cartRef.current.find((item) => item.id === productId);
    if (!currentItem) return;
    if (currentItem.kind === "custom") return;
    const product = productById.get(currentItem.productId);

    const nextQuantity = currentItem.quantity + amount;
    if (nextQuantity > product.stock) {
      setNotice({ type: "error", text: t("pos.stockLimit") });
      return;
    }

    const nextCart =
      nextQuantity <= 0
        ? cartRef.current.filter((item) => item.id !== productId)
        : cartRef.current.map((item) =>
            item.id === productId
              ? { ...item, quantity: nextQuantity }
              : item,
          );
    replaceCart(nextCart);
  }

  function removeFromCart(productId) {
    replaceCart(cartRef.current.filter((item) => item.id !== productId));
  }

  function beginCheckout() {
    setReceipt(null);
    setPaymentMethod("cash");
    setAmountReceived("");
    setCheckoutOpen(true);
  }

  function completeDemoSale() {
    if (paymentMethod === "cash" && (!Number.isFinite(received) || received < subtotal)) {
      setNotice({ type: "error", text: t("pos.insufficientCash") });
      return;
    }

    const timestamp = new Date();
    setReceipt({
      number: `DEMO-${timestamp.toISOString().replace(/\D/g, "").slice(0, 14)}`,
      amount: subtotal,
      count: itemCount,
      customer,
      paymentMethod,
      createdAt: timestamp.toISOString(),
      lines: cart.map((item) => {
        if (item.kind === "custom") {
          return {
            id: item.id,
            name: item.name,
            weightKg: item.weightKg,
            pricePerKg: item.pricePerKg,
            amount: item.lineTotal,
          };
        }

        const product = productById.get(item.productId);
        return {
          id: item.id,
          name: t(product.nameKey),
          quantity: item.quantity,
          unitPrice: product.price,
          amount: product.price * item.quantity,
        };
      }),
      amountReceived: paymentMethod === "cash" ? received : subtotal,
      change: paymentMethod === "cash" ? changeDue : 0,
    });
    replaceCart([]);
    setNotice(null);
  }

  function startNextSale() {
    setCheckoutOpen(false);
    setReceipt(null);
    setAmountReceived("");
    setBarcode("");
    requestAnimationFrame(() => scannerRef.current?.focus());
  }

  function money(amount) {
    return <span dir="ltr">{formatAFN(amount, numberLocale)}</span>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            {t("pos.demoMode")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
            {t("pos.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pos.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-xs font-medium text-foreground sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-warning" />
          {t("pos.demoBanner")}
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-4">
          <div className="flex w-fit max-w-full flex-wrap rounded-xl border border-border bg-surface p-1 shadow-soft" role="tablist" aria-label={t("pos.entryMethod")}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "scan"}
              onClick={() => setMode("scan")}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition ${mode === "scan" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface-muted"}`}
            >
              <ScanLine size={15} />
              {t("pos.scanMode")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "manual"}
              onClick={() => setMode("manual")}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition ${mode === "manual" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface-muted"}`}
            >
              <Search size={15} />
              {t("pos.manualMode")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "custom"}
              onClick={() => setMode("custom")}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition ${mode === "custom" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface-muted"}`}
            >
              <Plus size={15} />
              {t("pos.customMode")}
            </button>
          </div>

          {mode === "scan" ? (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-accent-soft via-surface to-surface px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary-foreground">
                    <Barcode size={21} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-foreground">{t("pos.scannerTitle")}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("pos.scannerHelp")}</p>
                  </div>
                </div>
                <form onSubmit={handleScan} className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="pos-barcode" className="sr-only">{t("pos.barcode")}</label>
                  <input
                    ref={scannerRef}
                    id="pos-barcode"
                    value={barcode}
                    onChange={(event) => setBarcode(event.target.value)}
                    placeholder={t("pos.barcodePlaceholder")}
                    autoComplete="off"
                    className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  <Button type="submit" className="h-12 px-5">
                    <ScanLine size={16} />
                    {t("pos.addScannedItem")}
                  </Button>
                </form>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {t("pos.sampleBarcode")} <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-foreground">200000000001</code>
                </p>
              </div>
            </Card>
          ) : mode === "manual" ? (
            <Card className="p-4 sm:p-5">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <label htmlFor="pos-product-search" className="sr-only">{t("pos.searchProducts")}</label>
                <input
                  id="pos-product-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("pos.searchPlaceholder")}
                  className="h-11 w-full rounded-xl border border-border bg-surface-muted ps-10 pe-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:bg-surface"
                />
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label={t("pos.filterCategory")}>
                {categories.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    aria-pressed={category === key}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${category === key ? "bg-accent text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {t(`pos.categories.${key}`)}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Package size={19} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{t("pos.customTitle")}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("pos.customDescription")}</p>
                </div>
              </div>
              <form onSubmit={addCustomProduct} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="pos-custom-name" className="mb-1.5 block text-xs font-medium text-foreground">{t("pos.customName")}</label>
                  <input
                    id="pos-custom-name"
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    maxLength={100}
                    required
                    placeholder={t("pos.customNamePlaceholder")}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pos-custom-weight" className="mb-1.5 block text-xs font-medium text-foreground">{t("pos.customWeight")}</label>
                    <div className="relative">
                      <input
                        id="pos-custom-weight"
                        type="number"
                        min="0.001"
                        step="0.001"
                        inputMode="decimal"
                        value={customWeight}
                        onChange={(event) => setCustomWeight(event.target.value)}
                        required
                        placeholder="0.500"
                        className="h-10 w-full rounded-lg border border-border bg-surface px-3 pe-12 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("pos.kilogram")}</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pos-custom-price" className="mb-1.5 block text-xs font-medium text-foreground">{t("pos.customPricePerKg")}</label>
                    <div className="relative">
                      <input
                        id="pos-custom-price"
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={customPrice}
                        onChange={(event) => setCustomPrice(event.target.value)}
                        required
                        placeholder="AFN"
                        className="h-10 w-full rounded-lg border border-border bg-surface px-3 pe-14 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">AFN/kg</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t("pos.customLineTotal")}</p>
                    <p className="mt-1 text-base font-bold text-foreground">{money(customLineTotal)}</p>
                  </div>
                  <Button type="submit" className="h-10">
                    <Plus size={15} />
                    {t("pos.addCustomProduct")}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {notice ? (
            <p
              role="status"
              aria-live="polite"
              className={`text-xs font-medium ${notice.type === "error" ? "text-red-600 dark:text-red-400" : "text-positive"}`}
            >
              {notice.text}
            </p>
          ) : null}

          {mode === "scan" ? (
            <section aria-labelledby="quick-add-heading">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 id="quick-add-heading" className="text-sm font-semibold text-foreground">{t("pos.quickAdd")}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t("pos.quickAddHint")}</p>
                </div>
                <button type="button" onClick={() => setMode("manual")} className="text-xs font-medium text-accent hover:underline">
                  {t("pos.browseCatalog")}
                </button>
              </div>
              <ProductGrid products={posSampleProducts.slice(0, 4)} onAdd={addToCart} t={t} money={money} />
            </section>
          ) : mode === "manual" ? (
            <section aria-label={t("pos.products")}>
              {visibleProducts.length ? (
                <ProductGrid products={visibleProducts} onAdd={addToCart} t={t} money={money} />
              ) : (
                <Card className="px-5 py-12 text-center">
                  <Package className="mx-auto text-muted-foreground" size={26} />
                  <p className="mt-3 text-sm font-medium text-foreground">{t("pos.noProducts")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("pos.changeSearch")}</p>
                </Card>
              )}
            </section>
          ) : null}
        </main>

        <aside className="xl:sticky xl:top-5">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <ShoppingCart size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{t("pos.cart")}</h2>
                  <p className="text-[11px] text-muted-foreground">{itemCount} {t("common.items")}</p>
                </div>
              </div>
              {cart.length ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => replaceCart([])}>
                  <Trash2 size={13} />
                  {t("pos.clearCart")}
                </Button>
              ) : null}
            </div>

            <div className="border-b border-border px-4 py-3">
              <label htmlFor="pos-customer" className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{t("pos.customer")}</label>
              <select
                id="pos-customer"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="walkInCustomer">{t("sample.walkInCustomer")}</option>
                <option value="ahmadRahimi">{t("sample.ahmadRahimi")}</option>
                <option value="fatimaSediqi">{t("sample.fatimaSediqi")}</option>
              </select>
            </div>

            <div className="max-h-[360px] min-h-[180px] divide-y divide-border overflow-y-auto px-4">
              {cart.length ? cart.map((item) => {
                const custom = item.kind === "custom";
                const product = custom ? null : productById.get(item.productId);
                const name = custom ? item.name : t(product.nameKey);
                const Icon = custom ? Package : productIcons[product.icon];
                const color = custom
                  ? "bg-accent-soft text-accent"
                  : product.color;

                return (
                  <div key={item.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="line-clamp-2 text-xs font-medium leading-5 text-foreground">{name}</p>
                            {custom ? (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                <span dir="ltr">{new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 3 }).format(item.weightKg)}</span> {t("pos.kilogram")} × {money(item.pricePerKg)}/{t("pos.kilogram")}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            aria-label={`${t("pos.removeItem")}: ${name}`}
                            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-surface-muted hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {custom ? (
                            <span className="text-[11px] text-muted-foreground">{t("pos.weightedItem")}</span>
                          ) : (
                            <div className="inline-flex items-center rounded-lg border border-border">
                              <button
                                type="button"
                                aria-label={`${t("pos.decreaseQuantity")}: ${name}`}
                                onClick={() => changeQuantity(item.id, -1)}
                                className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="min-w-7 text-center text-xs font-semibold text-foreground">{item.quantity}</span>
                              <button
                                type="button"
                                aria-label={`${t("pos.increaseQuantity")}: ${name}`}
                                onClick={() => changeQuantity(item.id, 1)}
                                className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          )}
                          <span className="text-xs font-semibold text-foreground">{money(getLineTotal(item))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center px-4 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                    <ShoppingBasket size={20} />
                  </span>
                  <p className="mt-3 text-xs font-medium text-foreground">{t("pos.emptyCart")}</p>
                  <p className="mt-1 max-w-[220px] text-[11px] leading-5 text-muted-foreground">{t("pos.emptyCartHint")}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-border bg-surface-muted/50 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("pos.subtotal")}</span>
                <span className="font-medium text-foreground">{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold text-foreground">{t("pos.total")}</span>
                <span className="text-lg font-bold tracking-tight text-foreground">{money(subtotal)}</span>
              </div>
              <Button type="button" className="h-11 w-full" disabled={!cart.length} onClick={beginCheckout}>
                <ReceiptText size={16} />
                {t("pos.reviewCheckout")}
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {checkoutOpen ? (
        <CheckoutDialog
          t={t}
          money={money}
          numberLocale={numberLocale}
          subtotal={subtotal}
          itemCount={itemCount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          amountReceived={amountReceived}
          setAmountReceived={setAmountReceived}
          received={received}
          changeDue={changeDue}
          receipt={receipt}
          onComplete={completeDemoSale}
          onStartNext={startNextSale}
          onClose={() => setCheckoutOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ProductGrid({ products, onAdd, t, money }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {products.map((product) => {
        const Icon = productIcons[product.icon];

        return (
          <Card key={product.id} className="group flex min-h-[148px] flex-col justify-between p-4 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${product.color}`}>
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${product.stock <= 10 ? "bg-warning-soft text-foreground" : "bg-surface-muted text-muted-foreground"}`}>
                {product.stock} {t("pos.inStock")}
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-xs font-semibold leading-5 text-foreground">{t(product.nameKey)}</h3>
                <p className="mt-1 text-sm font-bold text-foreground">{money(product.price)}</p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(product)}
                aria-label={`${t("pos.addToCart")}: ${t(product.nameKey)}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Plus size={17} />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function CheckoutDialog({
  t,
  money,
  numberLocale,
  subtotal,
  itemCount,
  paymentMethod,
  setPaymentMethod,
  amountReceived,
  setAmountReceived,
  received,
  changeDue,
  receipt,
  onComplete,
  onStartNext,
  onClose,
}) {
  const paymentOptions = [
    { key: "cash", icon: Banknote },
    { key: "card", icon: CreditCard },
    { key: "mobile", icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-checkout-title"
        onClick={(event) => event.stopPropagation()}
        className={`my-auto w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-6 ${receipt ? "pos-bill" : ""}`}
      >
        {receipt ? (
          <div className="text-center">
            <div className="pos-print-hide">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-positive-soft text-positive">
              <Check size={23} />
              </span>
              <h2 id="pos-checkout-title" className="mt-4 text-lg font-semibold text-foreground">{t("pos.receiptComplete")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("pos.receiptNumber")}: <span className="font-mono text-foreground">{receipt.number}</span></p>
            </div>
            <div className="pos-bill-panel mt-5 rounded-xl bg-surface-muted p-4 text-start">
              <div className="border-b border-border pb-3 text-center">
                <h2 className="text-base font-bold text-foreground">{t("store.name")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("pos.billTitle")}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{t("pos.receiptNumber")}: <span className="font-mono text-foreground">{receipt.number}</span></p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Intl.DateTimeFormat(numberLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.createdAt))}
                </p>
              </div>
              <div className="flex justify-between py-3 text-xs text-muted-foreground">
                <span>{t("pos.customer")}</span>
                <span className="text-foreground">{t(`sample.${receipt.customer}`)}</span>
              </div>
              <div className="border-y border-border py-2">
                {receipt.lines.map((line) => (
                  <div key={line.id} className="flex justify-between gap-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{line.name}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {line.weightKg
                          ? <><span dir="ltr">{new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 3 }).format(line.weightKg)}</span> {t("pos.kilogram")} × {money(line.pricePerKg)}/{t("pos.kilogram")}</>
                          : <><span dir="ltr">{line.quantity}</span> × {money(line.unitPrice)}</>}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-foreground">{money(line.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("pos.paymentMethod")}</span>
                  <span className="text-foreground">{t(`pos.paymentMethods.${receipt.paymentMethod}`)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("pos.amountPaid")}</span>
                  <span className="text-foreground">{money(receipt.amountReceived)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-sm font-bold text-foreground">
                  <span>{t("pos.total")}</span>
                  <span>{money(receipt.amount)}</span>
                </div>
                {receipt.change > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("pos.changeDue")}</span>
                    <span className="text-foreground">{money(receipt.change)}</span>
                  </div>
                ) : null}
              </div>
              <p className="mt-4 border-t border-border pt-3 text-center text-[10px] font-medium text-foreground">{t("pos.receiptNotSaved")}</p>
            </div>
            <div className="pos-print-hide mt-5 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => window.print()}>
                <Printer size={15} />
                {t("pos.printBill")}
              </Button>
              <Button type="button" className="flex-1" onClick={onStartNext}>
                <ShoppingCart size={15} />
                {t("pos.startNextSale")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="pos-checkout-title" className="text-lg font-semibold text-foreground">{t("pos.checkoutTitle")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{itemCount} {t("common.items")}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={t("pos.close")} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted">
                <X size={17} />
              </button>
            </div>
            <p className="mt-4 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-xs leading-5 text-foreground">{t("pos.checkoutWarning")}</p>
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-foreground">{t("pos.paymentMethod")}</p>
              <div className="grid grid-cols-3 gap-2">
                {paymentOptions.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={paymentMethod === key}
                    onClick={() => setPaymentMethod(key)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-[11px] font-medium transition ${paymentMethod === key ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-muted-foreground hover:bg-surface-muted"}`}
                  >
                    <Icon size={17} />
                    {t(`pos.paymentMethods.${key}`)}
                  </button>
                ))}
              </div>
            </div>
            {paymentMethod === "cash" ? (
              <div className="mt-4">
                <label htmlFor="pos-cash-received" className="mb-1.5 block text-xs font-medium text-foreground">{t("pos.amountReceived")}</label>
                <input
                  id="pos-cash-received"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  value={amountReceived}
                  onChange={(event) => setAmountReceived(event.target.value)}
                  placeholder={t("pos.enterAmount")}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setAmountReceived(String(subtotal))} className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground">{t("pos.exactAmount")}</button>
                  <button type="button" onClick={() => setAmountReceived(String(subtotal + 500))} className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground">+500 AFN</button>
                </div>
                {received >= subtotal ? (
                  <div className="mt-3 flex justify-between rounded-lg bg-positive-soft px-3 py-2 text-xs">
                    <span className="text-foreground">{t("pos.changeDue")}</span>
                    <span className="font-semibold text-foreground">{money(changeDue)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-semibold text-foreground">{t("pos.total")}</span>
              <span className="text-xl font-bold text-foreground">{money(subtotal)}</span>
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>{t("pos.cancel")}</Button>
              <Button
                type="button"
                className="flex-1"
                disabled={paymentMethod === "cash" && (!Number.isFinite(received) || received < subtotal)}
                onClick={onComplete}
              >
                <Check size={15} />
                {t("pos.completeDemoSale")}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
