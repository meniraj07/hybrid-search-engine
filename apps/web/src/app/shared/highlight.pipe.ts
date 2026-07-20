import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "highlight",
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  transform(value: string, query: string): string {
    if (!value || !query.trim()) {
      return value;
    }

    const terms = [
      ...new Set(
        query
          .trim()
          .split(/\s+/)
          .filter(Boolean),
      ),
    ];

    const escapedTerms = terms.map((term) =>
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );

    const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");

    return value.replace(pattern, "<mark>$1</mark>");
  }
}