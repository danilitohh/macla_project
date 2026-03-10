import { useEffect, useMemo, useState } from "react";
import { categories } from "../data/products";
import type { Announcement, Category, Product, DiscountCode } from "../types";
import {
  createAdminAnnouncement,
  createAdminProduct,
  deleteAdminAnnouncement,
  deleteAdminProduct,
  getAdminAnnouncements,
  getAdminProducts,
  getAdminDiscounts,
  updateAdminAnnouncement,
  updateAdminProduct,
  upsertAdminDiscount,
  deleteAdminDiscount,
  getProducts as getPublicProducts,
} from "../services/catalogService";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency } from "../utils/format";

const asList = (value: string, { allowComma = true } = {}) =>
  value
    .split(allowComma ? /\n|,/ : /\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const toMultiline = (items?: string[]) =>
  items && items.length ? items.join("\n") : "";

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const parseBenefitsInput = (value: string) =>
  splitLines(value).map((line) => {
    const [emoji, title, description, image] = line
      .split("|")
      .map((part) => part.trim());
    return {
      emoji: emoji || undefined,
      title: title || "Beneficio",
      description: description || "",
      image: image || undefined,
    };
  });

const parseHowToInput = (value: string) =>
  splitLines(value).map((line) => {
    const [title, image] = line.split("|").map((part) => part.trim());
    return { title: title || "Paso", image: image || undefined };
  });

const parseFaqsInput = (value: string) =>
  splitLines(value).map((line) => {
    const [question, answer] = line.split("|").map((part) => part.trim());
    return { question: question || "Pregunta", answer: answer || "" };
  });

const parseDetailsInput = (value: string) =>
  splitLines(value).map((line) => {
    const [icon, title, description] = line
      .split("|")
      .map((part) => part.trim());
    return {
      icon: icon || undefined,
      title: title || "Detalle",
      description: description || "",
    };
  });

const parseAccordionInput = (value: string) =>
  splitLines(value).map((line) => {
    const [title, itemsRaw] = line.split("|").map((part) => part.trim());
    const items = (itemsRaw || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
    return { title: title || "Sección", items };
  });

const parseReferenceBullets = (value: string) =>
  splitLines(value).map((line) => {
    const [title, description] = line.split("|").map((part) => part.trim());
    return { title: title || "Punto", description: description || "" };
  });

const toLines = {
  benefits: (
    items?: {
      emoji?: string;
      title?: string;
      description?: string;
      image?: string;
    }[],
  ) =>
    items && items.length
      ? items
          .map((item) =>
            [
              item.emoji ?? "",
              item.title ?? "",
              item.description ?? "",
              item.image ?? "",
            ].join(" | "),
          )
          .join("\n")
      : "",
  howTo: (items?: { title?: string; image?: string }[]) =>
    items && items.length
      ? items
          .map((item) => [item.title ?? "", item.image ?? ""].join(" | "))
          .join("\n")
      : "",
  faqs: (items?: { question?: string; answer?: string }[]) =>
    items && items.length
      ? items
          .map((item) => [item.question ?? "", item.answer ?? ""].join(" | "))
          .join("\n")
      : "",
  details: (
    items?: { icon?: string; title?: string; description?: string }[],
  ) =>
    items && items.length
      ? items
          .map((item) =>
            [item.icon ?? "", item.title ?? "", item.description ?? ""].join(
              " | ",
            ),
          )
          .join("\n")
      : "",
  accordion: (items?: { title?: string; items?: string[] }[]) =>
    items && items.length
      ? items
          .map((item) =>
            [item.title ?? "", (item.items || []).join("; ")].join(" | "),
          )
          .join("\n")
      : "",
  referenceBullets: (items?: { title?: string; description?: string }[]) =>
    items && items.length
      ? items
          .map((item) => [item.title ?? "", item.description ?? ""].join(" | "))
          .join("\n")
      : "",
};

const MAX_MEDIA_MB = 50;

type ProductFormState = {
  name: string;
  description: string;
  category: Category;
  price: string;
  stock: string;
  images: string;
  features: string;
  benefits: string;
  howTo: string;
  faqs: string;
  details: string;
  accordion: string;
  referenceHeadline: string;
  referenceTagline: string;
  referenceBefore: string;
  referenceAfter: string;
  referenceBullets: string;
  bannerLeft: string;
  bannerRight: string;
};

type DiscountFormState = {
  code: string;
  type: "percent" | "flat" | "shipping";
  percent: string;
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  label: string;
  isActive: boolean;
};

const defaultProductForm: ProductFormState = {
  name: "",
  description: "",
  category: categories[0]?.id || "planchas",
  price: "0",
  stock: "0",
  images: "",
  features: "",
  benefits: "",
  howTo: "",
  faqs: "",
  details: "",
  accordion: "",
  referenceHeadline: "",
  referenceTagline: "",
  referenceBefore: "",
  referenceAfter: "",
  referenceBullets: "",
  bannerLeft: "",
  bannerRight: "",
};

const defaultDiscountForm: DiscountFormState = {
  code: "",
  type: "percent",
  percent: "10",
  value: "0",
  minSubtotal: "0",
  maxDiscount: "0",
  label: "",
  isActive: true,
};

const defaultAnnouncementForm: Record<string, string> = {
  title: "",
  description: "",
  ctaLabel: "",
  ctaUrl: "",
  imageUrl: "",
  sortOrder: "0",
};

const AdminPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [productForm, setProductForm] =
    useState<ProductFormState>(defaultProductForm);
  const [announcementForm, setAnnouncementForm] = useState<
    Record<string, string>
  >(defaultAnnouncementForm);
  const [discountForm, setDiscountForm] =
    useState<DiscountFormState>(defaultDiscountForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    string | null
  >(null);
  const [editingDiscountCode, setEditingDiscountCode] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const pageSize = 10;

  const readFilesAsDataUrls = async (
    input: File[] | FileList | null,
  ): Promise<string[]> => {
    const files = input ? Array.from(input) : [];
    if (!files.length) return [];
    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve(typeof reader.result === "string" ? reader.result : "");
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          }),
      ),
    );
    return dataUrls.filter(Boolean);
  };

  const appendTemplateLine = (value: string, line: string) => {
    const trimmed = value.trim();
    return trimmed ? `${trimmed}\n${line}` : line;
  };

  const activeAnnouncements = useMemo(
    () => announcements.filter((item) => item.isActive),
    [announcements],
  );

  const parsedMedia = useMemo(
    () => asList(productForm.images, { allowComma: false }),
    [productForm.images],
  );

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term),
    );
  }, [products, productSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(productPage, totalPages);
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [remoteProducts, remoteAnnouncements, remoteDiscounts] =
          await Promise.all([
            getAdminProducts().catch(async (err) => {
              console.warn(
                "[AdminPage] admin products fallback -> public",
                err,
              );
              const publicProducts = await getPublicProducts();
              return publicProducts;
            }),
            getAdminAnnouncements(),
            getAdminDiscounts().catch(() => []),
          ]);
        if (!isMounted) return;
        setProducts(remoteProducts);
        setAnnouncements(remoteAnnouncements);
        setDiscounts(remoteDiscounts);
      } catch (error) {
        console.error("[AdminPage] Error loading admin data", error);
        if (!isMounted) return;
        setFeedback("No pudimos cargar todos los datos. Intenta actualizar.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetProductForm = () => {
    setProductForm(defaultProductForm);
    setEditingProductId(null);
  };

  const resetDiscountForm = () => {
    setDiscountForm(defaultDiscountForm);
    setEditingDiscountCode(null);
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm(defaultAnnouncementForm);
    setEditingAnnouncementId(null);
  };

  const extractErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object") {
      const err = error as { message?: string; data?: { message?: string } };
      return err.data?.message || err.message || fallback;
    }
    return fallback;
  };

  const handleProductSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    try {
      const description = productForm.description.trim();
      const shortDescription =
        description.slice(0, 140) || description || productForm.name.trim();
      const generatedId = productForm.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const content: Partial<Product["content"]> = {};

      const benefits = parseBenefitsInput(productForm.benefits);
      if (benefits.length) content.benefits = benefits;

      const howTo = parseHowToInput(productForm.howTo);
      if (howTo.length) content.howTo = howTo;

      const faqs = parseFaqsInput(productForm.faqs);
      if (faqs.length) content.faqs = faqs;

      const details = parseDetailsInput(productForm.details);
      if (details.length) content.details = details;

      const accordion = parseAccordionInput(productForm.accordion);
      if (accordion.length) content.accordion = accordion;

      const referenceBullets = parseReferenceBullets(
        productForm.referenceBullets,
      );
      const referenceExists =
        productForm.referenceHeadline ||
        productForm.referenceTagline ||
        productForm.referenceBefore ||
        productForm.referenceAfter ||
        productForm.bannerLeft ||
        productForm.bannerRight ||
        referenceBullets.length > 0;
      if (referenceExists) {
        content.reference = {
          headline: productForm.referenceHeadline || undefined,
          tagline: productForm.referenceTagline || undefined,
          beforeImage: productForm.referenceBefore || undefined,
          afterImage: productForm.referenceAfter || undefined,
          bannerLeft: productForm.bannerLeft || undefined,
          bannerRight: productForm.bannerRight || undefined,
          bullets: referenceBullets.length ? referenceBullets : undefined,
        };
      }

      const payload: Partial<Product> = {
        id: editingProductId || generatedId,
        name: productForm.name.trim(),
        shortDescription,
        description,
        category: productForm.category,
        price: Number(productForm.price) || 0,
        stock: Number(productForm.stock) || 0,
        currency: "COP",
        images: asList(productForm.images, { allowComma: false }),
        features: asList(productForm.features),
        content: Object.keys(content).length ? content : undefined,
        tags: [],
        isActive: true,
      };

      const saved = editingProductId
        ? await updateAdminProduct(editingProductId, payload)
        : await createAdminProduct(payload);

      setProducts((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setFeedback(`Producto "${saved.name}" guardado`);
      resetProductForm();
    } catch (error) {
      console.error("[AdminPage] Error saving product", error);
      setFeedback(
        extractErrorMessage(
          error,
          "No pudimos guardar el producto. Revisa los campos e inténtalo de nuevo.",
        ),
      );
    }
  };

  const handleAnnouncementSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    try {
      const payload: Partial<Announcement> = {
        id:
          editingAnnouncementId ||
          announcementForm.title
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/g, "-")
            .replace(/^-+|-+$/g, ""),
        title: announcementForm.title.trim(),
        description: announcementForm.description.trim(),
        ctaLabel: announcementForm.ctaLabel || null,
        ctaUrl: announcementForm.ctaUrl || null,
        imageUrl: announcementForm.imageUrl || null,
        sortOrder: Number(announcementForm.sortOrder) || 0,
        isActive: true,
      };

      const saved = editingAnnouncementId
        ? await updateAdminAnnouncement(editingAnnouncementId, payload)
        : await createAdminAnnouncement(payload);

      setAnnouncements((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === saved.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setFeedback(`Anuncio "${saved.title}" guardado`);
      resetAnnouncementForm();
    } catch (error) {
      console.error("[AdminPage] Error saving announcement", error);
      setFeedback(
        extractErrorMessage(
          error,
          "No pudimos guardar el anuncio. Intenta nuevamente.",
        ),
      );
    }
  };

  const handleDiscountSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    try {
      const payload: DiscountCode = {
        code: discountForm.code.trim().toUpperCase(),
        type: discountForm.type,
        percent_value: Number(discountForm.percent) || 0,
        value_cents: Number(discountForm.value) || 0,
        min_subtotal_cents: Number(discountForm.minSubtotal) || 0,
        max_discount_cents: Number(discountForm.maxDiscount) || 0,
        label: discountForm.label.trim() || null,
        is_active: discountForm.isActive,
      };
      const saved = await upsertAdminDiscount(payload);
      setDiscounts((prev) => {
        const existing = prev.findIndex((d) => d.code === saved.code);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setFeedback(`Código ${saved.code} guardado`);
      resetDiscountForm();
    } catch (error) {
      console.error("[AdminPage] Error saving discount", error);
      setFeedback(extractErrorMessage(error, "No pudimos guardar el código."));
    }
  };

  const startEditDiscount = (discount: DiscountCode) => {
    setEditingDiscountCode(discount.code);
    setDiscountForm({
      code: discount.code,
      type: discount.type as DiscountFormState["type"],
      percent: String(discount.percent_value ?? 0),
      value: String(discount.value_cents ?? 0),
      minSubtotal: String(discount.min_subtotal_cents ?? 0),
      maxDiscount: String(discount.max_discount_cents ?? 0),
      label: discount.label || "",
      isActive: Boolean(discount.is_active),
    });
  };

  const handleDeleteDiscount = async (code: string) => {
    if (!window.confirm(`Eliminar el código ${code}?`)) return;
    await deleteAdminDiscount(code);
    setDiscounts((prev) => prev.filter((d) => d.code !== code));
    if (editingDiscountCode === code) {
      resetDiscountForm();
    }
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      images: product.images.join("\n"),
      features: toMultiline(product.features),
      benefits: toLines.benefits(product.content?.benefits),
      howTo: toLines.howTo(product.content?.howTo),
      faqs: toLines.faqs(product.content?.faqs),
      details: toLines.details(product.content?.details),
      accordion: toLines.accordion(product.content?.accordion),
      referenceHeadline: product.content?.reference?.headline || "",
      referenceTagline: product.content?.reference?.tagline || "",
      referenceBefore: product.content?.reference?.beforeImage || "",
      referenceAfter: product.content?.reference?.afterImage || "",
      referenceBullets: toLines.referenceBullets(
        product.content?.reference?.bullets,
      ),
      bannerLeft: product.content?.reference?.bannerLeft || "",
      bannerRight: product.content?.reference?.bannerRight || "",
    });
  };

  const startEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementForm({
      title: announcement.title,
      description: announcement.description,
      ctaLabel: announcement.ctaLabel || "",
      ctaUrl: announcement.ctaUrl || "",
      imageUrl: announcement.imageUrl || "",
      sortOrder: String(announcement.sortOrder),
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (
      !window.confirm(
        "¿Eliminar este producto? Esta acción no se puede deshacer.",
      )
    )
      return;
    await deleteAdminProduct(productId);
    setProducts((prev) => prev.filter((item) => item.id !== productId));
    if (editingProductId === productId) {
      resetProductForm();
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!window.confirm("¿Eliminar este anuncio?")) return;
    await deleteAdminAnnouncement(announcementId);
    setAnnouncements((prev) =>
      prev.filter((item) => item.id !== announcementId),
    );
    if (editingAnnouncementId === announcementId) {
      resetAnnouncementForm();
    }
  };

  const removeMediaAt = (index: number) => {
    setProductForm((prev) => {
      const next = asList(prev.images, { allowComma: false });
      next.splice(index, 1);
      return { ...prev, images: next.join("\n") };
    });
  };

  return (
    <div className="page">
      <section className="section section--intro">
        <div className="container">
          <h1>Panel admin MACLA</h1>
          <p>
            Gestiona anuncios destacados y catálogo de productos. Usuario:{" "}
            {user?.email}
          </p>
          <p className="muted">
            Carga imágenes desde tu equipo (se guardan como data URL) y define
            el destino del botón en cada anuncio.
          </p>
          {feedback && <p className="muted">{feedback}</p>}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Anuncios destacados</h2>
          {loading ? (
            <p>Cargando anuncios…</p>
          ) : (
            <div className="admin-grid">
              <div className="card card--form">
                <h3>
                  {editingAnnouncementId ? "Editar anuncio" : "Crear anuncio"}
                </h3>
                <form className="form" onSubmit={handleAnnouncementSubmit}>
                  <label>
                    Título
                    <input
                      type="text"
                      required
                      value={announcementForm.title}
                      onChange={(event) =>
                        setAnnouncementForm({
                          ...announcementForm,
                          title: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Descripción
                    <textarea
                      required
                      value={announcementForm.description}
                      onChange={(event) =>
                        setAnnouncementForm({
                          ...announcementForm,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Texto botón
                    <input
                      type="text"
                      value={announcementForm.ctaLabel}
                      onChange={(event) =>
                        setAnnouncementForm({
                          ...announcementForm,
                          ctaLabel: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    URL botón
                    <input
                      type="text"
                      value={announcementForm.ctaUrl}
                      onChange={(event) =>
                        setAnnouncementForm({
                          ...announcementForm,
                          ctaUrl: event.target.value,
                        })
                      }
                      placeholder="https://destino.com o /ruta-interna"
                    />
                    <p className="muted">
                      Define a dónde lleva el botón (URL externa o ruta interna
                      de la tienda).
                    </p>
                  </label>
                  <label>
                    Imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const urls = await readFilesAsDataUrls(
                          event.target.files,
                        );
                        if (!urls.length) return;
                        const [first] = urls;
                        setAnnouncementForm((prev) => ({
                          ...prev,
                          imageUrl: first,
                        }));
                        event.target.value = "";
                      }}
                    />
                    <p className="muted">
                      Sube una imagen (se guarda como data URL en el anuncio).
                    </p>
                  </label>
                  <label>
                    Orden
                    <input
                      type="number"
                      value={announcementForm.sortOrder}
                      onChange={(event) =>
                        setAnnouncementForm({
                          ...announcementForm,
                          sortOrder: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="form__actions">
                    <button type="submit" className="btn btn--primary">
                      {editingAnnouncementId
                        ? "Actualizar anuncio"
                        : "Crear anuncio"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={resetAnnouncementForm}
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
              <div>
                <h3>Listado ({announcements.length})</h3>
                <ul className="list">
                  {announcements.map((announcement) => (
                    <li key={announcement.id} className="list__item">
                      <div>
                        <strong>{announcement.title}</strong>{" "}
                        {announcement.isActive ? "" : "(inactivo)"}
                        <p className="muted">{announcement.description}</p>
                      </div>
                      <div className="list__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => startEditAnnouncement(announcement)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--link"
                          onClick={() =>
                            handleDeleteAnnouncement(announcement.id)
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Productos</h2>
          {loading ? (
            <p>Cargando productos…</p>
          ) : (
            <div className="admin-grid">
              <div className="card card--form">
                <h3>
                  {editingProductId ? "Editar producto" : "Crear producto"}
                </h3>
                <form className="form" onSubmit={handleProductSubmit}>
                  <label>
                    Nombre
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          name: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Descripción
                    <textarea
                      required
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="form__row">
                    <label className="form__row-item">
                      Categoría
                      <select
                        value={productForm.category}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            category: event.target.value as Category,
                          })
                        }
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form__row-item">
                      Precio (COP)
                      <input
                        type="number"
                        value={productForm.price}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            price: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="form__row-item">
                      Stock
                      <input
                        type="number"
                        value={productForm.stock}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            stock: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Galería (imágenes y videos)
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={async (event) => {
                        const selected = Array.from(
                          event.target.files ?? [],
                        ) as File[];
                        const [valid, skipped] = selected.reduce<
                          [File[], File[]]
                        >(
                          (acc, file) => {
                            if (file.size <= MAX_MEDIA_MB * 1024 * 1024)
                              acc[0].push(file);
                            else acc[1].push(file);
                            return acc;
                          },
                          [[], []],
                        );
                        if (skipped.length) {
                          setFeedback(
                            `Saltamos ${skipped.length} archivo(s) por exceder ${MAX_MEDIA_MB}MB. Súbelos comprimidos o como enlace.`,
                          );
                        }
                        const urls = await readFilesAsDataUrls(valid);
                        if (!urls.length) return;
                        setProductForm((prev) => {
                          const next = [
                            ...asList(prev.images, { allowComma: false }),
                            ...urls,
                          ];
                          return { ...prev, images: next.join("\n") };
                        });
                        event.target.value = "";
                      }}
                    />
                    <p className="muted">
                      Sube varias a la vez; se guardan como data URL o ruta
                      pública.
                    </p>
                    {parsedMedia.length > 0 && (
                      <div className="media-list">
                        {parsedMedia.map((src, index) => {
                          const isVideo =
                            /^data:video\//i.test(src) ||
                            /\.(mp4|webm|ogg)(\?.*)?$/i.test(src);
                          return (
                            <div key={`${src}-${index}`} className="media-chip">
                              <span>
                                {isVideo ? "Video" : "Imagen"} {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMediaAt(index)}
                                aria-label="Eliminar adjunto"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        <p className="muted">
                          Total adjuntos: {parsedMedia.length}
                        </p>
                      </div>
                    )}
                  </label>
                  <label>
                    Características (una por línea)
                    <textarea
                      value={productForm.features}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          features: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="form__group">
                    <p className="muted">
                      Secciones opcionales de la página de producto. Déjalas
                      vacías si no quieres mostrarlas.
                    </p>
                    <label>
                      Beneficios (formato: emoji | título | descripción |
                      imagen)
                      <textarea
                        placeholder="✨ | Brillo inmediato | Protege la fibra capilar | https://..."
                        value={productForm.benefits}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            benefits: event.target.value,
                          })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const [url] = await readFilesAsDataUrls([file]);
                          if (!url) return;
                          setProductForm((prev) => ({
                            ...prev,
                            benefits: appendTemplateLine(
                              prev.benefits,
                              `✨ | Título | Descripción | ${url}`,
                            ),
                          }));
                          event.target.value = "";
                        }}
                      />
                      <p className="muted">
                        Sube una imagen y añadiremos la línea con el formato
                        correcto; luego edita emoji/título/descripcion.
                      </p>
                    </label>
                    <label>
                      Cómo usar (formato: título | imagen)
                      <textarea
                        placeholder="Paso 1: Secar con toalla | https://..."
                        value={productForm.howTo}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            howTo: event.target.value,
                          })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const [url] = await readFilesAsDataUrls([file]);
                          if (!url) return;
                          setProductForm((prev) => ({
                            ...prev,
                            howTo: appendTemplateLine(
                              prev.howTo,
                              `Paso | ${url}`,
                            ),
                          }));
                          event.target.value = "";
                        }}
                      />
                      <p className="muted">
                        También puedes subir video corto; se guardará como data
                        URL listo para usar.
                      </p>
                    </label>
                    <label>
                      FAQs (formato: pregunta | respuesta)
                      <textarea
                        placeholder="¿Cómo se limpia? | Usa paño húmedo con el equipo apagado."
                        value={productForm.faqs}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            faqs: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Detalles (formato: icono | título | descripción)
                      <textarea
                        placeholder="✨ | Marca MACLA | Rosa cerámico"
                        value={productForm.details}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            details: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Acordeones (formato: título | item1; item2; item3)
                      <textarea
                        placeholder="Seguridad | Apagado automático; Protección contra sobrecalentamiento"
                        value={productForm.accordion}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            accordion: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Referencia (antes)
                      <input
                        type="text"
                        placeholder="/before.png o URL"
                        value={productForm.referenceBefore}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            referenceBefore: event.target.value,
                          })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const [url] = await readFilesAsDataUrls([file]);
                          if (!url) return;
                          setProductForm((prev) => ({
                            ...prev,
                            referenceBefore: url,
                          }));
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <label>
                      Referencia (después)
                      <input
                        type="text"
                        placeholder="/after.png o URL"
                        value={productForm.referenceAfter}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            referenceAfter: event.target.value,
                          })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const [url] = await readFilesAsDataUrls([file]);
                          if (!url) return;
                          setProductForm((prev) => ({
                            ...prev,
                            referenceAfter: url,
                          }));
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <label>
                      Referencia (bullets: título | descripción)
                      <textarea
                        placeholder="Seca y alisa | Combina flujo de aire con placas..."
                        value={productForm.referenceBullets}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            referenceBullets: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Referencia (titular)
                      <input
                        type="text"
                        value={productForm.referenceHeadline}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            referenceHeadline: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Referencia (tagline)
                      <input
                        type="text"
                        value={productForm.referenceTagline}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            referenceTagline: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Banner izquierdo (opcional)
                      <input
                        type="text"
                        placeholder="/uploads/banner-left.png"
                        value={productForm.bannerLeft}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            bannerLeft: event.target.value,
                          })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const [url] = await readFilesAsDataUrls([file]);
                          if (!url) return;
                          setProductForm((prev) => ({
                            ...prev,
                            bannerLeft: url,
                          }));
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <label>
                      Banner derecho (opcional)
                      <input
                        type="text"
                        placeholder="/uploads/banner-right.png"
                        value={productForm.bannerRight}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            bannerRight: event.target.value,
                          })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const [url] = await readFilesAsDataUrls([file]);
                          if (!url) return;
                          setProductForm((prev) => ({
                            ...prev,
                            bannerRight: url,
                          }));
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div className="form__actions">
                    <button type="submit" className="btn btn--primary">
                      {editingProductId
                        ? "Actualizar producto"
                        : "Crear producto"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={resetProductForm}
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
              <div className="card">
                <div className="list__header">
                  <h3>Listado ({filteredProducts.length})</h3>
                  <input
                    type="search"
                    placeholder="Buscar por nombre, categoría o descripción"
                    value={productSearch}
                    onChange={(event) => {
                      setProductSearch(event.target.value);
                      setProductPage(1);
                    }}
                  />
                </div>
                <ul className="list">
                  {pagedProducts.map((product) => (
                    <li key={product.id} className="list__item">
                      <div>
                        <strong>{product.name}</strong>{" "}
                        <span className="badge badge--muted">
                          {product.category}
                        </span>{" "}
                        <span className="muted">Stock: {product.stock}</span>
                      </div>
                      <div className="list__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => startEditProduct(product)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--link"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="pagination">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={currentPage <= 1}
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <span className="muted">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setProductPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section section--light">
        <div className="container">
          <h3>Anuncio activo</h3>
          {activeAnnouncements.length === 0 && (
            <p className="muted">No hay anuncios activos.</p>
          )}
          {activeAnnouncements.map((announcement) => (
            <div key={announcement.id} className="card">
              <p className="badge badge--muted">
                {announcement.badge || "Destacado"}
              </p>
              <h4>{announcement.title}</h4>
              <p>{announcement.description}</p>
              {announcement.ctaUrl && (
                <p className="muted">
                  CTA: {announcement.ctaLabel || "Ver más"} →{" "}
                  {announcement.ctaUrl}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="section section--light">
        <div className="container">
          <h2>Códigos de descuento</h2>
          {loading ? (
            <p>Cargando descuentos…</p>
          ) : (
            <div className="admin-grid">
              <div className="card card--form">
                <h3>
                  {editingDiscountCode ? "Editar código" : "Crear código"}
                </h3>
                <form className="form" onSubmit={handleDiscountSubmit}>
                  <label>
                    Código
                    <input
                      type="text"
                      required
                      value={discountForm.code}
                      onChange={(event) =>
                        setDiscountForm({
                          ...discountForm,
                          code: event.target.value.toUpperCase(),
                        })
                      }
                    />
                  </label>
                  <label>
                    Tipo
                    <select
                      value={discountForm.type}
                      onChange={(event) =>
                        setDiscountForm({
                          ...discountForm,
                          type: event.target.value as DiscountFormState["type"],
                        })
                      }
                    >
                      <option value="percent">Porcentaje</option>
                      <option value="flat">Valor fijo</option>
                      <option value="shipping">Descuento envío</option>
                    </select>
                  </label>
                  {discountForm.type === "percent" ? (
                    <label>
                      % Descuento
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={discountForm.percent}
                        onChange={(event) =>
                          setDiscountForm({
                            ...discountForm,
                            percent: event.target.value,
                          })
                        }
                      />
                    </label>
                  ) : (
                    <label>
                      Valor en pesos
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={discountForm.value}
                        onChange={(event) =>
                          setDiscountForm({
                            ...discountForm,
                            value: event.target.value,
                          })
                        }
                      />
                    </label>
                  )}
                  <label>
                    Subtotal mínimo (COP)
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={discountForm.minSubtotal}
                      onChange={(event) =>
                        setDiscountForm({
                          ...discountForm,
                          minSubtotal: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Tope de descuento (COP, opcional)
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={discountForm.maxDiscount}
                      onChange={(event) =>
                        setDiscountForm({
                          ...discountForm,
                          maxDiscount: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Etiqueta (opcional)
                    <input
                      type="text"
                      value={discountForm.label}
                      onChange={(event) =>
                        setDiscountForm({
                          ...discountForm,
                          label: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={discountForm.isActive}
                      onChange={(event) =>
                        setDiscountForm({
                          ...discountForm,
                          isActive: event.target.checked,
                        })
                      }
                    />
                    <span>Activo</span>
                  </label>
                  <div className="form__actions">
                    <button type="submit" className="btn btn--primary">
                      {editingDiscountCode
                        ? "Actualizar código"
                        : "Crear código"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={resetDiscountForm}
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
              <div className="card">
                <div className="list__header">
                  <h3>Listado ({discounts.length})</h3>
                </div>
                <ul className="list">
                  {discounts.map((discount) => (
                    <li key={discount.code} className="list__item">
                      <div>
                        <strong>{discount.code}</strong>{" "}
                        <span className="badge badge--muted">
                          {discount.type === "percent"
                            ? `${discount.percent_value}%`
                            : formatCurrency(discount.value_cents || 0, "COP")}
                        </span>{" "}
                        {discount.label && (
                          <span className="muted">{discount.label}</span>
                        )}
                        {!discount.is_active && (
                          <span className="muted"> (inactivo)</span>
                        )}
                      </div>
                      <div className="muted">
                        Min:{" "}
                        {formatCurrency(
                          discount.min_subtotal_cents || 0,
                          "COP",
                        )}{" "}
                        · Tope:{" "}
                        {discount.max_discount_cents
                          ? formatCurrency(discount.max_discount_cents, "COP")
                          : "Sin tope"}
                      </div>
                      <div className="list__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => startEditDiscount(discount)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--link"
                          onClick={() => handleDeleteDiscount(discount.code)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                  {discounts.length === 0 && (
                    <li className="muted">No hay códigos creados.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminPage;
