import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  HybridSearchResponse,
  SearchApiService,
} from "./core/search-api.service";
import { HighlightPipe } from "./shared/highlight.pipe";

@Component({
  selector: "app-root",
  imports: [FormsModule, HighlightPipe],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {

  readonly categories = [
    { value: "", label: "All categories" },
    { value: "cs.AI", label: "Artificial Intelligence" },
    { value: "cs.CL", label: "Computation and Language" },
    { value: "cs.CR", label: "Cryptography and Security" },
    { value: "cs.CV", label: "Computer Vision" },
    { value: "cs.DB", label: "Databases" },
    { value: "cs.IR", label: "Information Retrieval" },
    { value: "cs.LG", label: "Machine Learning" },
    { value: "cs.NE", label: "Neural and Evolutionary Computing" },
  ];

  query = "";
  selectedCategory = "";
  isLoading = false;
  errorMessage = "";
  response: HybridSearchResponse | null = null;

  constructor(private readonly searchApi: SearchApiService) {}

  search(page = 1): void {
    const cleanQuery = this.query.trim();

    if (!cleanQuery) {
      this.errorMessage = "Enter a search query first.";
      return;
    }

    this.isLoading = true;
    this.errorMessage = "";

    this.searchApi
      .searchHybrid(cleanQuery, this.selectedCategory, page)
      .subscribe({
        next: (response) => {
          this.response = response;
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage =
            "Search failed. Confirm that the Express API is running.";
          this.isLoading = false;
        },
      });
  }

  clearSearch(): void {
    this.query = "";
    this.selectedCategory = "";
    this.response = null;
    this.errorMessage = "";
  }

  formatScore(score: number): string {
    return score.toFixed(4);
  }
}