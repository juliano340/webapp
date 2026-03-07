export function formatBRLFromCents(valueInCents: number): string {
  return (valueInCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(value: Date): string {
  return value.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDate(value: Date): string {
  return value.toLocaleDateString("pt-BR", {
    dateStyle: "short",
  });
}
